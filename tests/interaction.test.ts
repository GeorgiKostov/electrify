import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {apply,buildCost,movable} from '../src/game/commands';
import {addGrowth} from '../src/game/levels';
import {witnesses} from '../src/content/witnesses';
import {supportsTier} from '../src/sim/network';
import {MapGesture,pointerIntent} from '../src/game/pointer';
import {groundAt,panOffset,zoomAt,wheelFactor,draggedTile} from '../src/render/navigation';
import {World} from '../src/render/scene';

const solved=witnesses(),viewport={left:0,top:0,width:1280,height:720};
function camera(){const camera=new THREE.OrthographicCamera(-24,24,13.5,-13.5,.1,200);camera.position.set(39,30,36);camera.lookAt(12,0,9);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera}
function translate(camera:THREE.OrthographicCamera,offset:{x:number;z:number}){camera.position.x+=offset.x;camera.position.z+=offset.z;camera.updateMatrixWorld(true)}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`)}

test('tile commands reject fractions and nonfinite input atomically',()=>{
 const state=solved[2],id=state.nodes.find(n=>!n.locked&&n.kind==='transformer')!.id,before=structuredClone(state),cost=buildCost(state);
 for(const value of [NaN,Infinity,-Infinity,2.5])for(const axis of ['x','z'])for(const type of ['place','move'] as const){const position={x:17,z:9,[axis]:value},command=type==='place'?{type,kind:'transformer' as const,size:'L' as const,...position}:{type,id,...position};const result=apply(state,command);assert.equal(result.error,'Choose a whole tile');assert.equal(result.state,state);assert.deepEqual(state,before);assert.equal(buildCost(state),cost)}
});

test('occupied, boundary and restricted-field previews leave the layout and budget untouched',()=>{
 const state=solved[3],before=structuredClone(state);
 for(const command of [{type:'place',kind:'transformer',x:20,z:9,size:'L'},{type:'place',kind:'transformer',x:25,z:9,size:'L'},{type:'place',kind:'transformer',x:15,z:15,size:'L'},{type:'place',kind:'solar',x:5,z:9}] as const){const result=apply(state,command);assert.ok(result.error);assert.equal(result.state,state);assert.deepEqual(state,before);assert.equal(buildCost(result.state),buildCost(before))}
 const valid=apply(state,{type:'place',kind:'transformer',x:17,z:9,size:'L'});assert.equal(valid.error,undefined);assert.deepEqual(state,before);assert.equal(state.nextId,before.nextId);
});

test('moving a built transformer updates attached lengths and rejects excess LV reach atomically',()=>{
 const state=solved[1],tx=state.nodes.find(n=>!n.locked&&n.kind==='transformer')!,before=structuredClone(state);
 const valid=apply(state,{type:'move',id:tx.id,x:17,z:9});assert.equal(valid.error,undefined);assert.equal(valid.state.nodes.find(n=>n.id===tx.id)?.x,17);assert.equal(valid.state.lines.find(l=>l.a===tx.id&&l.b==='farm')?.length,3);assert.equal(valid.state.lines.find(l=>l.tier==='MV'&&(l.a===tx.id||l.b===tx.id))?.length,11);assert.deepEqual(valid.state.batteries,state.batteries);assert.deepEqual(state,before);
 const invalid=apply(state,{type:'move',id:tx.id,x:13,z:9});assert.match(invalid.error??'',/Too far/);assert.equal(invalid.state,state);assert.deepEqual(state,before);
});

test('authored objects and the depot transformer stay fixed; player kit near the depot can move',()=>{
 const state=solved[5],depot=state.nodes.find(n=>n.kind==='transformer'&&n.zone==='depot')!;
 assert.equal(movable(depot),false);assert.match(apply(state,{type:'move',id:depot.id,x:23,z:13}).error??'',/stays here/);
 const home=state.nodes.find(n=>n.kind==='home')!;assert.equal(movable(home),false);assert.equal(apply(state,{type:'move',id:home.id,x:3,z:7}).state,state);
 const entry=addGrowth(solved[4],6),placed=apply(entry,{type:'place',kind:'solar',x:21,z:16});assert.equal(placed.error,undefined);const solar=placed.state.nodes.at(-1)!;assert.equal(solar.zone,'depot');assert.equal(movable(solar),true);assert.equal(apply(placed.state,{type:'move',id:solar.id,x:22,z:16}).error,undefined);
});

test('port compatibility and connection candidates share the electrical validator',()=>{
 const state=solved[2],grid=state.nodes.find(n=>n.kind==='grid')!,home=state.nodes.find(n=>n.kind==='home')!,tx=state.nodes.find(n=>n.id==='tv')!;
 assert.equal(supportsTier(grid,'LV'),false);assert.equal(supportsTier(grid,'MV'),true);assert.equal(supportsTier(home,'MV'),false);assert.equal(supportsTier(tx,'LV'),true);assert.equal(supportsTier(tx,'MV'),true);
 assert.equal(apply(state,{type:'connect',a:grid.id,b:home.id,tier:'LV'}).error,'Needs matching voltage');assert.equal(apply(state,{type:'connect',a:tx.id,b:home.id,tier:'LV'}).error,'That would make a loop');
});

test('pan holds the picked ground point under the dragged cursor without clamping',()=>{
 const view=camera(),from={x:800,y:330},to={x:1070,y:470},anchor=groundAt(view,viewport,from)!;translate(view,panOffset(view,viewport,from,to));const after=groundAt(view,viewport,to)!;close(anchor.x,after.x);close(anchor.z,after.z);
 const world=Object.create(World.prototype) as World;world.camera=camera();world.panX=0;world.panZ=0;world.canvas={getBoundingClientRect:()=>viewport} as HTMLCanvasElement;for(let i=0;i<20;i++)world.panBetween(from,to);assert.ok(Math.abs(world.panX)>14||Math.abs(world.panZ)>12);const held=groundAt(world.camera,viewport,from)!;world.panBetween(from,to);const far=groundAt(world.camera,viewport,to)!;close(held.x,far.x);close(held.z,far.z);
});

test('zoom preserves the cursor ground anchor at normal and limit scales',()=>{
 const view=camera(),point={x:942,y:214},anchor=groundAt(view,viewport,point)!;
 for(const factor of [1.7,.45,100000,.000001,1.2]){zoomAt(view,viewport,factor,point);const after=groundAt(view,viewport,point)!;close(anchor.x,after.x);close(anchor.z,after.z);assert.ok(view.zoom>=.25&&view.zoom<=12)}
});

test('wheel magnitude and delta units produce proportional zoom',()=>{
 assert.ok(wheelFactor(2,0,720)>wheelFactor(100,0,720));close(wheelFactor(16,0,720),wheelFactor(1,1,720));close(wheelFactor(200,0,720),wheelFactor(200/720,2,720));close(wheelFactor(0,0,720),1);close(wheelFactor(100,0,720)*wheelFactor(-100,0,720),1);
});

test('pinch combines centroid pan and scale while preserving the ground anchor',()=>{
 const gesture=new MapGesture(),view=camera();gesture.begin(1,{x:500,y:300},'place');gesture.begin(2,{x:700,y:300},'place');const motion=gesture.move(2,{x:780,y:360})!;assert.equal(motion.pinch,true);const anchor=groundAt(view,viewport,motion.from)!;translate(view,panOffset(view,viewport,motion.from,motion.to));zoomAt(view,viewport,motion.factor,motion.to);const after=groundAt(view,viewport,motion.to)!;close(anchor.x,after.x);close(anchor.z,after.z);
 assert.equal(gesture.end(2,true),undefined);assert.equal(gesture.move(1,{x:505,y:304}),undefined);assert.equal(gesture.end(1,true),undefined);gesture.begin(3,{x:700,y:300},'place');assert.equal(gesture.end(3,true)?.intent,'place');
});

test('navigation overrides remain latched through release and a threshold includes the initial delta',()=>{
 const gesture=new MapGesture();gesture.begin(1,{x:10,y:10},'connect','tv');gesture.navigate();gesture.move(1,{x:13,y:13});const motion=gesture.move(1,{x:30,y:40})!;assert.deepEqual(motion.from,{x:10,y:10});assert.equal(gesture.end(1,true)?.intent,'pan');
 gesture.begin(2,{x:10,y:10},'pan','tv');assert.equal(gesture.end(2,true)?.intent,'pan');
});

test('cancelled, lost-capture and releases over UI cannot return an actionable press',()=>{
 const gesture=new MapGesture();for(const intent of ['place','move','connect'] as const){gesture.begin(1,{x:500,y:300},intent,'tv');gesture.move(1,{x:550,y:320});gesture.cancel();assert.equal(gesture.end(1,true),undefined);assert.equal(gesture.points.size,0);gesture.begin(2,{x:500,y:300},intent);assert.equal(gesture.end(2,false),undefined)}
});

test('a tall-object grab preserves the pickup offset until enough ground movement crosses a tile',()=>{
 const view=camera(),node={x:18,z:9},roof=new THREE.Vector3(node.x,2.2,node.z).project(view),point={x:(roof.x+1)*viewport.width/2,y:(1-roof.y)*viewport.height/2},start=groundAt(view,viewport,point)!;
 assert.notEqual(Math.round(start.x),node.x);assert.deepEqual(draggedTile(node,start,start),node);assert.deepEqual(draggedTile(node,start,{x:start.x+.1,z:start.z-.1}),node);assert.deepEqual(draggedTile(node,start,{x:start.x+1,z:start.z-2}),{x:19,z:7});
});

test('panel measurements cannot change projected object positions or view scale',()=>{
 const view=camera(),world=Object.create(World.prototype) as World;world.camera=view;world.canvas={getBoundingClientRect:()=>viewport} as HTMLCanvasElement;
 const before=[[1,9],[18,9],[23,13]].map(([x,z])=>world.project(x,z)),projection=[...view.projectionMatrix.elements];world.setFrame({left:36,top:180,width:850,height:390});world.setFrame({left:36,top:140,width:500,height:230});assert.deepEqual([[1,9],[18,9],[23,13]].map(([x,z])=>world.project(x,z)),before);assert.deepEqual(view.projectionMatrix.elements,projection);
});


test('Run day and navigation bindings always choose pan across active tools',()=>{
 const normal={button:0,space:false,shift:false,running:false};
 for(const tool of ['select','LV','MV','transformerS','solar','batteryQuick','move'])for(const node of [undefined,'fixed','movable'] as const)for(const override of [{running:true},{button:1},{button:2},{space:true},{shift:true}]){const intent=pointerIntent(tool,node,{...normal,...override}),gesture=new MapGesture();assert.equal(intent,'pan');gesture.begin(1,{x:400,y:300},intent);assert.equal(gesture.move(1,{x:500,y:350})?.pinch,false);assert.equal(gesture.end(1,true)?.intent,'pan')}
 assert.equal(pointerIntent('select','movable',normal),'move');assert.equal(pointerIntent('select','fixed',normal),'select');assert.equal(pointerIntent('LV','fixed',normal),'connect');assert.equal(pointerIntent('solar',undefined,normal),'place');
});
