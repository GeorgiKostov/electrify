import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';
import {apply,buildCost,movable,type Command} from '../src/game/commands';
import {initialState,addGrowth,budgets} from '../src/game/levels';
import type {State,DayResult} from '../src/game/types';
import {MapGesture,pointerIntent} from '../src/game/pointer';
import {draggedTile} from '../src/render/navigation';
import {toolsFor,focusTools,inferLesson,canRun} from '../src/game/progression';
import {supportsTier} from '../src/sim/network';
import {simulate} from '../src/sim/simulate';
import {copy,tr,stageGoal,stageTitle,power,energy,voltage} from '../src/content/copy/en';

// Use production event handlers and UI functions; mock only browser/Three adapters.
function sourceHandlers(){
 const text=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),source=ts.createSourceFile('main.ts',text,ts.ScriptTarget.ES2022,true);
 const functions=new Set(['commit','preview','placementCommand','candidateTile','insideMap','mapUIVisible','name','lineName','selectedObject','clearCandidate','clearPreview','stopRun','cancelGesture','commandGhost','context','hover','showOverlay','closeOverlay','startRun','header','teaching','goal','tray','options','refreshPlacement','graph','inspector','batteryEditor','evEditor','timeline','menu','coach','refreshWorld','labels','measureLayout','refresh']);
 const variables=new Set(['icon','coinValue','button','now','lesson','toolInfo','keyAction']);
 const statements=source.statements.filter(statement=>{
  if(ts.isFunctionDeclaration(statement))return !!statement.name&&functions.has(statement.name.text);
  if(ts.isVariableStatement(statement))return statement.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&variables.has(d.name.text));
  if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression))return false;
  const call=statement.expression,event=call.arguments[0];if(!event||!ts.isStringLiteral(event))return false;
  const target=ts.isPropertyAccessExpression(call.expression)?call.expression.expression.getText(source):ts.isIdentifier(call.expression)&&call.expression.text==='addEventListener'?'window':'';return ['app:click','app:pointerdown','canvas:pointerdown','canvas:pointermove','canvas:pointerup','canvas:pointercancel','canvas:lostpointercapture','canvas:pointerleave','canvas:wheel','window:keydown','window:keyup'].includes(`${target}:${event.text}`);
 });
 assert.equal(statements.length,functions.size+variables.size+11);
 return ts.transpileModule(statements.map(statement=>statement.getText(source)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
}

function fixture(state=initialState(),command?:Command,tool='LV',selected?:string){
 const result=simulate(state),applied=command?apply(state,command):undefined;
 const canvasHandlers=new Map<string,(event:Record<string,unknown>)=>void>(),captures=new Set<number>(),appHandlers=new Map<string,(event:Record<string,unknown>)=>void>(),keyHandlers=new Map<string,(event:Record<string,unknown>)=>void>(),classes=new Set<string>();
 const classList={toggle:(name:string,on:boolean)=>on?classes.add(name):classes.delete(name),add:(name:string)=>classes.add(name),remove:(name:string)=>classes.delete(name)};
 const focus:string[]=[],elements=new Map<string,ReturnType<typeof element>>();
 function element(id:string){return {innerHTML:'',hidden:false,dataset:{} as Record<string,string>,scrollLeft:0,disabled:false,style:{setProperty:()=>{}},classList,setAttribute:()=>{},toggleAttribute:()=>{},focus:()=>focus.push(id),getClientRects:()=>[{}],getBoundingClientRect:()=>id==='goal'?{bottom:150}:id==='bottom-area'?{left:442,top:210}:id==='camera-buttons'?{bottom:378,top:334}:{bottom:0,top:0,left:0},querySelector:()=>({toggleAttribute:()=>{},disabled:false})}}
 const el=(id:string)=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)!};
 const canvas={...el('world'),setPointerCapture:(id:number)=>captures.add(id),hasPointerCapture:(id:number)=>captures.has(id),releasePointerCapture:(id:number)=>captures.delete(id),addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>canvasHandlers.set(name,handler),closest:()=>undefined,tagName:'CANVAS'};
 const dialog={open:false,close:()=>{dialog.open=false}};
 const shown:{state:State;result:DayResult;selected?:string;grid:boolean;tier?:string;ghost?:{kind:string;valid:boolean};fit:number;picks:number;pans:number;zooms:number;edits:number;frame?:{left:number;top:number;width:number;height:number}}={state,result,grid:false,fit:0,picks:0,pans:0,zooms:0,edits:0};
 const world={paused:false,reduced:false,draw:(state:State,result:DayResult,_cursor:number,selected?:string)=>{shown.state=state;shown.result=result;shown.selected=selected},showGrid:(visible:boolean)=>{shown.grid=visible},showPorts:(_nodes:unknown,tier?:string)=>{shown.tier=tier},clearGhost:()=>{shown.ghost=undefined},highlightPort:()=>{},showGhost:(_x:number,_z:number,node:{kind:string},valid:boolean)=>{shown.ghost={kind:node.kind,valid}},showLineGhost:(_a:unknown,_b:unknown,valid:boolean)=>{shown.ghost={kind:'line',valid}},project:(x:number,z:number)=>({x:x*70,y:z*70}),pick:()=>{shown.picks++;return 'tv'},pickPort:(x:number)=>{shown.picks++;return x<550?'tv':'h1'},groundPoint:()=>({x:18,z:9}),tile:()=>({x:18,z:9}),panBetween:()=>{shown.pans++},pan:()=>{shown.pans++},scale:()=>{shown.zooms++},wheel:()=>{shown.zooms++},fit:()=>{shown.fit++},setFrame:(frame:typeof shown.frame)=>{shown.frame=frame}};
 const app={classList,addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>appHandlers.set(name,handler),querySelector:(selector:string)=>({focus:()=>focus.push(selector),getClientRects:()=>[{}]})};
 const globals:Record<string,unknown>={state,result,pending:command,pendingError:applied?.error??'',previewState:applied&&!applied.error?applied.state:undefined,previewResult:applied&&!applied.error?simulate(applied.state):undefined,tool,selected,lineStart:command?.type==='connect'?command.a:undefined,overlay:'',menuOpen:false,panel:'',hidden:false,running:false,expanded:false,speed:1,cursor:72,coachStep:0,spaceHeld:false,spaceDragged:false,spaceTarget:undefined,grabOrigin:undefined,candidate:undefined,candidateKey:'',portsState:undefined,portsTier:undefined,portsSource:undefined,showEarlierTools:false,fitRequested:false,layoutFrame:0,runFraction:0,runLast:0,menuHistory:[],returnFocus:null,introStarted:true,panTotal:0,undo:[],gesture:new MapGesture(),save:{settings:{tips:true,reduced:false,numbers:false,region:'eu'},lessons:{[state.stage]:inferLesson(state)},stars:{1:['Lights on','Thrifty']},coachSeen:true},app,canvas,dialog,world,el,document:{activeElement:canvas,elementFromPoint:()=>canvas},performance:{now:()=>2000},requestAnimationFrame:(callback:(time:number)=>void)=>{callback(0);return 1},cancelAnimationFrame:()=>{},innerWidth:1280,innerHeight:720,addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>keyHandlers.set(name,handler),apply,simulate,pointerIntent,draggedTile,buildCost,movable,budgets,toolsFor,focusTools,canRun,supportsTier,copy,tr,stageGoal,stageTitle,power,energy,voltage,time:()=> '18:00',goalMet:()=>false,starList:()=>[copy.lights,copy.thrifty],refreshOverlay:()=>{dialog.open=!!globals.overlay},advanceCoach:()=>{},setState:(next:State)=>{shown.edits++;globals.state=next;globals.result=simulate(next)},runFrame:()=>{}};
 const vm=createContext(globals);runInContext(sourceHandlers(),vm);runInContext('refresh()',vm);
 const click=(action:string)=>appHandlers.get('click')!({target:{closest:(selector:string)=>selector==='[data-action]'?{dataset:{action}}:null}});
 const key=(code:string,extra:Record<string,unknown>={})=>keyHandlers.get('keydown')!({code,key:code,target:canvas,preventDefault:()=>{},...extra});
 const escape=()=>key('Escape',{target:{tagName:'BUTTON'}});
 const pointer=(event:string,id:number,x:number,y=300)=>canvasHandlers.get(event)!({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch',shiftKey:false,target:canvas});
 const keyup=(code:string)=>keyHandlers.get('keyup')!({code,preventDefault:()=>{}});
 const refresh=()=>runInContext('refresh()',vm);
 const kept=()=>{assert.equal(globals.state,state);assert.equal(globals.pending,command);assert.equal(globals.tool,tool);assert.equal(globals.selected,selected);assert.equal(shown.fit,0)};
 const suppressed=()=>{assert.equal(el('placement').hidden,true);assert.equal(el('inspector').hidden,true);assert.equal(el('coach').hidden,true);assert.equal(el('labels').innerHTML,'');assert.equal(el('map-feedback').hidden,true);assert.equal(shown.grid,false);assert.equal(shown.tier,undefined);assert.equal(shown.ghost,undefined);assert.equal(shown.state,state);assert.equal(shown.result,result);assert.equal(shown.selected,undefined)};
 return {globals,shown,el,classes,focus,click,key,keyup,pointer,wheel:()=>canvasHandlers.get('wheel')!({deltaY:-100,deltaMode:0,clientX:500,clientY:300,preventDefault:()=>{}}),escape,refresh,kept,suppressed,run:(text:string)=>runInContext(text,vm)};
}

const validLine={type:'connect',a:'tv',b:'h1',tier:'LV'} as const;
test('Tasks → Resources → Escape restores a held line and its simulated scene without spending or fitting',()=>{
 const view=fixture(initialState(),validLine);assert.equal(view.shown.ghost?.valid,true);assert.equal(view.el('placement').hidden,false);
 const pendingState=view.globals.previewState,pendingResult=view.globals.previewResult;
 for(const action of ['tasks','resources']){view.click(action);view.suppressed();view.kept();assert.equal(view.el('menu').dataset.panel,action);assert.equal(view.classes.has('window-open'),true);assert.equal(view.classes.has('placing'),true);assert.equal(view.globals.previewState,pendingState);assert.equal(view.globals.previewResult,pendingResult)}
 assert.match(view.el('menu').innerHTML,/Coins left/);assert.match(view.el('menu').innerHTML,/Budget/);assert.doesNotMatch(view.el('menu').innerHTML,/Remove · Undo/);
 view.escape();view.kept();assert.equal(view.classes.has('window-open'),false);assert.equal(view.shown.state,pendingState);assert.equal(view.shown.result,pendingResult);assert.equal(view.el('placement').hidden,false);assert.equal(view.shown.grid,true);assert.equal(view.shown.tier,'LV');assert.equal(view.shown.ghost?.valid,true);assert.match(view.focus.at(-1)!,/resources/);
});

test('an invalid held line stays invalid after closing Resources; no hover leaks into the window',()=>{
 const command={...validLine,b:'tv'},view=fixture(initialState(),command);assert.ok(view.globals.pendingError);assert.equal(view.shown.ghost?.valid,false);
 view.click('resources');view.suppressed();view.run('hover({clientX:500,clientY:300})');assert.equal(view.shown.picks,0);view.click('close-panel');view.kept();assert.equal(view.shown.ghost?.valid,false);assert.equal(view.globals.previewState,undefined);assert.match(view.el('placement').innerHTML,/Choose two objects/);
});

test('held object placement and move restore their ghost after popover close',()=>{
 const stage=addGrowth(initialState(),2),placed=apply(stage,{type:'place',kind:'transformer',size:'S',x:18,z:9});assert.equal(placed.error,undefined);
 const cases:[State,Command,string,string|undefined][]=[[stage,{type:'place',kind:'transformer',size:'S',x:18,z:9},'transformerS',undefined],[placed.state,{type:'move',id:placed.state.nodes.at(-1)!.id,x:18,z:8},'move',placed.state.nodes.at(-1)!.id]];
 for(const [state,command,tool,selected] of cases){const view=fixture(state,command,tool,selected);assert.equal(view.shown.ghost?.kind,'transformer');view.click('tasks');view.suppressed();view.click('tasks');view.kept();assert.equal(view.el('placement').hidden,false);assert.equal(view.shown.ghost?.kind,'transformer');assert.equal(view.shown.ghost?.valid,true)}
});

test('selected inspection and labels return after Tasks without losing the selection',()=>{
 const view=fixture(initialState(),undefined,'select','tv');assert.equal(view.el('inspector').hidden,false);assert.ok(view.el('labels').innerHTML);
 view.click('tasks');view.suppressed();view.escape();view.kept();assert.equal(view.el('inspector').hidden,false);assert.equal(view.shown.selected,'tv');assert.ok(view.el('labels').innerHTML);assert.equal(view.el('coach').hidden,false);
});

test('full dialogs retain preview-cancel semantics and return the existing tool and selection',()=>{
 const view=fixture(initialState(),validLine,'LV','tv');view.click('menu');view.suppressed();assert.equal(view.globals.pending,undefined);assert.equal(view.globals.previewState,undefined);assert.equal(view.globals.tool,'LV');assert.equal(view.globals.selected,'tv');
 view.click('continue');assert.equal(view.shown.fit,0);assert.equal(view.globals.state,view.shown.state);assert.equal(view.shown.ghost,undefined);assert.equal(view.shown.tier,'LV');
});

test('Hide interface suppresses context and restores a held preview on Show interface',()=>{
 const view=fixture(initialState(),validLine);view.click('hide');view.suppressed();view.kept();assert.equal(view.classes.has('hidden-ui'),true);
 view.click('hide');view.kept();assert.equal(view.el('placement').hidden,false);assert.equal(view.shown.ghost?.valid,true);assert.equal(view.classes.has('hidden-ui'),false);
});

test('Run after a window shows day controls while hiding construction and clearing its preview',()=>{
 const applied=apply(initialState(),validLine);assert.equal(applied.error,undefined);const view=fixture(applied.state,undefined,'LV');view.click('tasks');view.click('close-panel');view.click('run');assert.equal(view.globals.running,true);assert.equal(view.classes.has('placing'),false);assert.equal(view.el('placement').hidden,true);assert.equal(view.el('inspector').hidden,true);assert.equal(view.el('coach').hidden,true);assert.equal(view.shown.grid,false);assert.equal(view.shown.tier,undefined);assert.match(view.el('timeline').innerHTML,/Pause/);assert.equal(view.shown.fit,0);
});

test('short landscape reserves the right tray horizontally and lower-left camera vertically',()=>{
 const view=fixture();view.globals.innerWidth=844;view.globals.innerHeight=390;view.refresh();assert.deepEqual({...view.shown.frame},{left:12,top:162,width:414,height:160});assert.equal(view.shown.fit,0);
});

test('expanded timeline owns teaching visibility and More tools starts from the first tile',()=>{
 const stage=addGrowth(addGrowth(initialState(),2),3),view=fixture(stage,undefined,'select');view.click('expand');assert.equal(view.classes.has('timeline-expanded'),true);view.click('expand');assert.equal(view.classes.has('timeline-expanded'),false);
 view.el('tray').scrollLeft=180;view.click('more-tools');assert.equal(view.el('tray').scrollLeft,0);
});


test('Menu → Hide interface routes line endpoints and placement taps to navigation without preview or Enter edits',()=>{
 for(const [state,tool] of [[initialState(),'LV'],[addGrowth(initialState(),2),'transformerS']] as const){
  const view=fixture(state,undefined,tool);view.click('menu');view.click('hide');
  for(const x of [500,600]){view.pointer('pointerdown',1,x);view.pointer('pointerup',1,x)}
  view.key('Enter');view.suppressed();view.kept();assert.equal(view.globals.pending,undefined);assert.equal(view.globals.lineStart,undefined);assert.equal(view.shown.picks,0);assert.equal(view.shown.edits,0);
  view.click('hide');view.kept();assert.equal(view.el('placement').hidden,false);assert.doesNotMatch(view.el('placement').innerHTML,/data-action="confirm"/);
 }
});

test('hidden held placement blocks confirmation, undo, arrow edits and direct preview/ghost while preserving navigation',()=>{
 const state=addGrowth(initialState(),2),command={type:'place',kind:'transformer',size:'S',x:18,z:9} as const,view=fixture(state,command,'transformerS');
 const pendingState=view.globals.previewState,pendingResult=view.globals.previewResult;view.globals.undo=[initialState()];view.click('hide');
 view.key('Enter');view.key('KeyZ',{key:'z',ctrlKey:true});view.key('ArrowRight');view.key('BracketRight');view.key('Space');view.keyup('Space');
 view.run("preview({type:'place',kind:'transformer',size:'S',x:18,z:8}); commandGhost(pending,pendingError); commit(pending)");
 view.pointer('pointerdown',1,500);view.pointer('pointermove',1,530);view.pointer('pointerup',1,530);view.wheel();view.key('Equal');
 view.suppressed();view.kept();assert.equal(view.globals.previewState,pendingState);assert.equal(view.globals.previewResult,pendingResult);assert.equal((view.globals.undo as State[]).length,1);assert.equal(view.shown.edits,0);assert.equal(view.globals.running,false);assert.equal(view.globals.cursor,72);assert.equal(view.shown.picks,0);assert.equal(view.shown.pans,2);assert.equal(view.shown.zooms,2);
 view.click('hide');view.kept();assert.equal(view.shown.state,pendingState);assert.equal(view.shown.ghost?.valid,true);assert.equal(view.el('placement').hidden,false);
});

test('hidden pinch, cancellation and Escape retain the held line and restore its source/ghost',()=>{
 const view=fixture(initialState(),validLine);view.click('hide');
 view.pointer('pointerdown',1,500);view.pointer('pointerdown',2,600);view.pointer('pointermove',2,630);view.pointer('pointerup',2,630);view.pointer('pointerup',1,500);
 view.pointer('pointerdown',3,500);view.pointer('pointercancel',3,500);view.suppressed();view.kept();assert.equal(view.globals.lineStart,'tv');assert.equal(view.shown.zooms,1);assert.equal(view.shown.edits,0);
 view.key('Escape');view.kept();assert.equal(view.globals.hidden,false);assert.equal(view.globals.lineStart,'tv');assert.equal(view.shown.ghost?.valid,true);assert.equal(view.el('placement').hidden,false);
});
