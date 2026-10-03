import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';
import {apply,buildCost,movable} from '../src/game/commands';
import {initialState,budgets} from '../src/game/levels';
import type {State,DayResult} from '../src/game/types';
import {MapGesture,pointerIntent} from '../src/game/pointer';
import {supportsTier} from '../src/sim/network';
import {simulate} from '../src/sim/simulate';
import {copy,stageGoal,stageTitle} from '../src/content/copy/en';

// Execute the production registrations and refresh functions, leaving only DOM/renderer adapters mocked.
function sourceHandlers(){
 const text=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),source=ts.createSourceFile('main.ts',text,ts.ScriptTarget.ES2022,true);
 const functions=new Set(['mapUIVisible','clearCandidate','clearPreview','cancelGesture','candidateTile','insideMap','refresh','goal','refreshWorld']);
 const statements=source.statements.filter(statement=>{
  if(ts.isFunctionDeclaration(statement))return !!statement.name&&functions.has(statement.name.text);
  if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression))return false;
  const call=statement.expression;if(!ts.isPropertyAccessExpression(call.expression)||call.expression.name.text!=='addEventListener')return false;
  const target=call.expression.expression.getText(source),event=call.arguments[0];return ts.isStringLiteral(event)&&((target==='canvas'&&['pointerdown','pointerup'].includes(event.text))||(target==='app'&&event.text==='pointerdown'));
 });
 assert.equal(statements.length,functions.size+3);return ts.transpileModule(statements.map(statement=>statement.getText(source)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
}

function fixture(){
 const committed=initialState(),result=simulate(committed),command={type:'connect',a:'tv',b:'h1',tier:'LV'} as const,applied=apply(committed,command);assert.equal(applied.error,undefined);
 const canvasHandlers=new Map<string,(event:Record<string,unknown>)=>void>(),appHandlers=new Map<string,(event:Record<string,unknown>)=>void>(),captures=new Set<number>(),elements=new Map<string,{innerHTML:string;hidden:boolean;setAttribute:()=>void}>();
 const el=(id:string)=>{if(!elements.has(id))elements.set(id,{innerHTML:'',hidden:false,setAttribute:()=>{}});return elements.get(id)!};
 const canvas={dataset:{cursor:''},focus:()=>{},setAttribute:()=>{},setPointerCapture:(id:number)=>captures.add(id),hasPointerCapture:(id:number)=>captures.has(id),releasePointerCapture:(id:number)=>captures.delete(id),addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>canvasHandlers.set(name,handler)};
 const shown:{state:State;result:DayResult;timeline:DayResult;inspector:DayResult;confirm:boolean}={state:applied.state,result:simulate(applied.state),timeline:simulate(applied.state),inspector:simulate(applied.state),confirm:true};
 const world={reduced:false,paused:false,clearGhost:()=>{},highlightPort:()=>{},pickPort:()=> 'tv',pick:()=> 'tv',groundPoint:()=>({x:6,z:9}),tile:()=>({x:6,z:9}),draw:(state:State,day:DayResult)=>{shown.state=state;shown.result=day}};
 let previewCalls=0;
 const globals:Record<string,unknown>={state:committed,result,previewState:applied.state,previewResult:shown.result,pending:command,pendingError:'',candidate:undefined,candidateKey:'',lineStart:'tv',tool:'LV',selected:undefined,overlay:'',menuOpen:false,hidden:false,running:false,spaceHeld:false,spaceDragged:false,grabOrigin:undefined,cursor:72,gesture:new MapGesture(),canvas,app:{classList:{toggle:()=>{}},addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>appHandlers.set(name,handler)},world,document:{elementFromPoint:()=>canvas},el,copy,budgets,buildCost,movable,pointerIntent,supportsTier,stageGoal,stageTitle,save:{settings:{tips:false,reduced:false},stars:{}},icon:()=>'',coinValue:(value:string|number)=>String(value),time:()=> '18:00',goalMet:()=>false,teaching:()=>'',labels:()=>{},context:()=>{},hover:()=>{},header:()=>{},tray:()=>{},menu:()=>{},coach:()=>{},refreshOverlay:()=>{},measureLayout:()=>{},preview:()=>{previewCalls++}};
 globals.now=()=>((globals.previewResult??globals.result) as DayResult).steps[72];
 globals.refreshPlacement=()=>{shown.confirm=!!globals.pending};globals.timeline=()=>{shown.timeline=(globals.previewResult??globals.result) as DayResult};globals.inspector=()=>{shown.inspector=(globals.previewResult??globals.result) as DayResult};
 const context=createContext(globals);runInContext(sourceHandlers(),context);runInContext('refresh()',context);
 const pointer=(id:number)=>({pointerId:id,clientX:500+id*50,clientY:300,button:0,pointerType:'touch',shiftKey:false,target:canvas});
 const down=(id:number)=>canvasHandlers.get('pointerdown')!(pointer(id)),up=(id:number)=>canvasHandlers.get('pointerup')!(pointer(id));
 function restored(){assert.equal(globals.pending,undefined);assert.equal(globals.previewState,undefined);assert.equal(globals.previewResult,undefined);assert.equal(globals.lineStart,undefined);assert.equal(shown.state,committed);assert.equal(shown.result,result);assert.equal(shown.timeline,result);assert.equal(shown.inspector,result);assert.equal(shown.confirm,false);assert.match(el('coins').innerHTML,/15 \/ 15/);assert.equal(globals.state,committed);assert.equal(previewCalls,0);assert.equal(buildCost(committed),0)}
 assert.match(el('coins').innerHTML,/12 \/ 15/);assert.equal(shown.state.lines.length,2);
 return {down,up,restored,ui:()=>appHandlers.get('pointerdown')!({target:{tagName:'BUTTON'}})};
}

test('held valid connection then second touch restores committed scene and every preview view; releases do nothing',()=>{
 const view=fixture();view.down(1);view.down(2);view.restored();view.up(2);view.up(1);view.restored();
});

test('UI pointer cancellation restores the committed scene and budget; the captured release does nothing',()=>{
 const view=fixture();view.down(1);view.ui();view.restored();view.up(1);view.restored();
});
