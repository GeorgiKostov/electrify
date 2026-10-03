import test from 'node:test';
import assert from 'node:assert/strict';
import {apply} from '../src/game/commands';
import {initialState,addGrowth} from '../src/game/levels';
import {toolsFor,focusTools,inferLesson,learnFromState,learnFromDay,canRun,type Lesson} from '../src/game/progression';
import {newSave,loadSave,storeSave,restoreSave,recordCompletion,nextStageState,startNewCampaign,restoreCampaign,archivedCampaigns,saveKey,legacyKey,archiveKey,type StorageAccess} from '../src/game/save';
import {witnesses} from '../src/content/witnesses';
import {simulate} from '../src/sim/simulate';

const solved=witnesses();
function memory():StorageAccess&{data:Map<string,string>} {const data=new Map<string,string>();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value)}}}

test('fresh stage 1 exposes LV and rejects every later electrical capability centrally',()=>{
 const state=initialState();assert.deepEqual(toolsFor(state,[]),['LV']);assert.deepEqual(focusTools(state,[]),['LV']);assert.equal(canRun(state,[]),false);
 for(const command of [{type:'connect',a:'grid',b:'tv',tier:'MV'},{type:'place',kind:'transformer',x:2,z:4},{type:'place',kind:'solar',x:16,z:4},{type:'place',kind:'batteryQuick',x:15,z:15},{type:'upgrade',id:'tv'}] as const){const result=apply(state,command,[]);assert.equal(result.error,'Not unlocked yet');assert.deepEqual(result.state,state)}
 const connected=apply(state,{type:'connect',a:'tv',b:'h1',tier:'LV'},[]);assert.equal(connected.error,undefined);assert.equal(canRun(connected.state,learnFromState([],connected.state)),true);
});

test('stage 2 teaches transformer then MV without restricting the teaching milestone to coordinates',()=>{
 const entry=addGrowth(solved[0],2),lesson=inferLesson(entry);
 assert.deepEqual(focusTools(entry,lesson),['transformerS']);assert.ok(!toolsFor(entry,lesson).includes('MV'));
 assert.equal(apply(entry,{type:'connect',a:'grid',b:'tv',tier:'MV'},lesson).error,'Not unlocked yet');
 const placed=apply(entry,{type:'place',kind:'transformer',x:2,z:6,size:'S'},lesson);assert.equal(placed.error,undefined);
 const learned=learnFromState(lesson,placed.state);assert.ok(toolsFor(placed.state,learned).includes('MV'));assert.deepEqual(focusTools(placed.state,learned),['MV']);
 const removed=apply(placed.state,{type:'remove',id:placed.state.nodes.at(-1)!.id},learned);assert.equal(removed.error,undefined);assert.ok(toolsFor(removed.state,learned).includes('MV'));
 assert.ok(toolsFor(entry,learned).includes('MV'),'undoing the layout cannot undo learning');assert.deepEqual(focusTools(entry,learned),['transformerS'],'current guidance asks for the removed transformer again');
});

test('stage 5 opens Long only after connecting Quick and inspecting its day',()=>{
 const entry=addGrowth(solved[3],5);let lesson:Lesson=inferLesson(entry);
 assert.deepEqual(focusTools(entry,lesson),['batteryQuick']);assert.equal(apply(entry,{type:'place',kind:'batteryLong',x:17,z:15},lesson).error,'Not unlocked yet');
 const quick=apply(entry,{type:'place',kind:'batteryQuick',x:15,z:15},lesson);assert.equal(quick.error,undefined);lesson=learnFromState(lesson,quick.state);
 assert.ok(!toolsFor(quick.state,lesson).includes('batteryLong'));assert.deepEqual(learnFromDay(lesson,quick.state,simulate(quick.state)),lesson);
 const connected=apply(quick.state,{type:'connect',a:'th',b:quick.state.nodes.at(-1)!.id,tier:'LV'},lesson);assert.equal(connected.error,undefined);lesson=learnFromState(lesson,connected.state);
 assert.equal(apply(connected.state,{type:'place',kind:'batteryLong',x:17,z:15},lesson).error,'Not unlocked yet');
 lesson=learnFromDay(lesson,connected.state,simulate(connected.state));assert.ok(lesson.includes('quick-observed'));assert.equal(apply(connected.state,{type:'place',kind:'batteryLong',x:17,z:15},lesson).error,undefined);
 assert.ok(toolsFor(entry,lesson).includes('batteryLong'),'removing Quick or undoing must retain the lesson');
});

test('lesson milestones survive save/reload after their objects were undone',()=>{
 const storage=memory(),save=newSave(false);save.state=addGrowth(solved[0],2);save.unlocked=2;save.entries[2]=structuredClone(save.state);save.states[2]=structuredClone(save.state);save.lessons[2]=['transformer-placed','mv-connected'];
 assert.equal(storeSave(save,storage),true);const loaded=loadSave(storage);assert.ok(toolsFor(loaded.state,loaded.lessons[2]).includes('MV'));assert.ok(loaded.lessons[2].includes('mv-connected'));
});

test('failed and unobserved runs cannot complete the first stage or open the second',()=>{
 const save=newSave(false);assert.equal(recordCompletion(save,simulate(save.state),true),false);assert.deepEqual(save.ranStages,[]);assert.equal(save.unlocked,1);
 save.state=structuredClone(solved[0]);assert.equal(recordCompletion(save,simulate(save.state)),false);assert.deepEqual(save.ranStages,[]);assert.equal(save.unlocked,1);
 assert.equal(recordCompletion(save,simulate(save.state),true),true);assert.deepEqual(save.ranStages,[1]);assert.equal(save.unlocked,2);assert.ok(save.entries[2]);assert.equal(save.entries[3],undefined);
});

test('replay completion and Next preserve later entry and edited state',()=>{
 const save=newSave(false);save.state=structuredClone(solved[0]);recordCompletion(save,simulate(save.state),true);
 const entry=structuredClone(save.entries[2]);save.states[2]=structuredClone(solved[1]);save.states[2].nextId=123;
 const edited=structuredClone(save.states[2]);assert.equal(recordCompletion(save,simulate(save.state),true),true);assert.deepEqual(save.entries[2],entry);assert.deepEqual(save.states[2],edited);assert.deepEqual(nextStageState(save),edited);assert.equal(save.unlocked,2);
});

test('legacy saves migrate intact and accidental Run presses are not treated as watched success',()=>{
 const storage=memory(),legacy={...newSave(false),version:1,lessons:undefined,ranStages:[1]};legacy.state=structuredClone(solved[0]);legacy.states[1]=structuredClone(legacy.state);const original=JSON.stringify(legacy);storage.setItem(legacyKey,original);
 const loaded=loadSave(storage);assert.equal(loaded.version,2);assert.deepEqual(loaded.state,legacy.state);assert.deepEqual(loaded.ranStages,[]);assert.ok(loaded.lessons[1].includes('line-connected'));assert.equal(storage.getItem(legacyKey),original);assert.equal(storage.getItem(saveKey),null);
});

test('legacy completed battery builds keep both batteries available',()=>{
 const legacy={...newSave(false),version:1,lessons:undefined,state:solved[4],unlocked:5,entries:{5:addGrowth(solved[3],5)},states:{5:solved[4]},stars:{5:['Lights on']},ranStages:[5]};
 const migrated=restoreSave(legacy)!;assert.ok(toolsFor(migrated.state,migrated.lessons[5]).includes('batteryLong'));assert.deepEqual(migrated.ranStages,[5]);
});

test('new campaigns archive all earlier campaigns and restoring retains every campaign',()=>{
 const storage=memory(),first=newSave(false);first.state=structuredClone(solved[5]);first.unlocked=6;first.entries[6]=addGrowth(solved[4],6);first.states[6]=structuredClone(first.state);storeSave(first,storage);
 const fresh=startNewCampaign(first,storage)!;assert.equal(fresh.state.stage,1);assert.deepEqual(archivedCampaigns(storage)[0].state,first.state);
 fresh.state.nextId=42;const second=startNewCampaign(fresh,storage)!;assert.equal(archivedCampaigns(storage).length,2);assert.equal(archivedCampaigns(storage)[0].state.stage,6);
 const restored=restoreCampaign(second,storage,0)!;assert.deepEqual(restored.state,first.state);assert.equal(archivedCampaigns(storage).length,3);assert.equal(archivedCampaigns(storage)[0].state.stage,6);assert.equal(archivedCampaigns(storage)[1].state.nextId,42);assert.equal(archivedCampaigns(storage).at(-1)!.state.stage,1);
});

test('existing single campaign archives remain readable',()=>{
 const storage=memory(),save=newSave(false);storage.setItem(archiveKey,JSON.stringify(save));assert.deepEqual(archivedCampaigns(storage)[0],save);
});

test('failed new-campaign persistence leaves the active saved campaign recoverable',()=>{
 const storage=memory(),save=newSave(false);save.state.nextId=99;storeSave(save,storage);
 const failing={getItem:storage.getItem,setItem:(key:string,value:string)=>{if(key===saveKey)throw new Error('full');storage.setItem(key,value)}};
 assert.equal(startNewCampaign(save,failing),undefined);assert.equal(loadSave(storage).state.nextId,99);assert.equal(archivedCampaigns(storage).at(-1)!.state.nextId,99);
});
