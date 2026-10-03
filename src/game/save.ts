import type {State,DayResult} from './types';
import {initialState,addGrowth} from './levels';
import {inferLesson,learnFromState,type Lesson} from './progression';
import {goalMet,stars} from '../content/goals';
export interface Settings {region:'eu'|'na';twelve:boolean;reduced:boolean;numbers:boolean;tips:boolean}
export interface Save {version:2;state:State;entries:Record<number,State>;states:Record<number,State>;unlocked:number;stars:Record<number,string[]>;settings:Settings;coachSeen:boolean;ranStages:number[];lessons:Record<number,Lesson>}
export interface StorageAccess {getItem(key:string):string|null;setItem(key:string,value:string):void}
export const saveKey='power-places-save-v2',legacyKey='power-places-save-v1',archiveKey='power-places-archived-campaign';
export function newSave(reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false):Save {const state=initialState();return {version:2,state,entries:{1:structuredClone(state)},states:{1:structuredClone(state)},unlocked:1,stars:{},settings:{region:'eu',twelve:false,reduced,numbers:false,tips:true},coachSeen:false,ranStages:[],lessons:{1:[]}}}
export function restoreSave(value:unknown):Save|undefined {
 const raw=value as Omit<Save,'version'>&{version:number};
 if(!raw||(raw.version!==1&&raw.version!==2)||!Array.isArray(raw.state?.nodes)||!Array.isArray(raw.state?.lines)||raw.state.stage<1||raw.state.stage>6||!raw.entries?.[raw.state.stage]||!raw.settings||raw.unlocked<1||raw.unlocked>6)return;
 const saved=structuredClone(raw) as Save;saved.states??={[saved.state.stage]:structuredClone(saved.state)};saved.stars??={};saved.ranStages??=[];saved.lessons??={};
 for(const [stage,layout] of Object.entries(saved.states))saved.lessons[Number(stage)]=learnFromState(saved.lessons[Number(stage)]??[],layout);
 // Legacy runs were marked at button press. Keep only completed stages as observed success.
 if(raw.version===1){saved.ranStages=saved.ranStages.filter(stage=>saved.stars[stage]?.includes('Lights on'));if(saved.stars[5]?.includes('Lights on')||saved.states[5]?.nodes.some(n=>n.kind==='batteryLong'))saved.lessons[5]=[...new Set([...(saved.lessons[5]??[]),'quick-observed' as const])];}
 saved.version=2;return saved;
}
export function loadSave(storage:StorageAccess=localStorage):Save {try{const raw=storage.getItem(saveKey)??storage.getItem(legacyKey);if(raw){const value=restoreSave(JSON.parse(raw));if(value)return value}}catch{}return newSave()}
export function storeSave(value:Save,storage:StorageAccess=localStorage):boolean {try{storage.setItem(saveKey,JSON.stringify(value));return true}catch{return false}}
export function hasCampaign(storage:StorageAccess=localStorage):boolean {try{return !!(storage.getItem(saveKey)||storage.getItem(legacyKey))}catch{return false}}
export function archivedCampaigns(storage:StorageAccess=localStorage):Save[] {try{const raw=storage.getItem(archiveKey);if(!raw)return [];const parsed=JSON.parse(raw),values=Array.isArray(parsed)?parsed:[parsed];return values.map(restoreSave).filter((value):value is Save=>!!value)}catch{return []}}
export function archivedCampaign(storage:StorageAccess=localStorage):Save|undefined {return archivedCampaigns(storage).at(-1)}
export function startNewCampaign(current:Save,storage:StorageAccess=localStorage):Save|undefined {const fresh=newSave(current.settings.reduced);fresh.settings=structuredClone(current.settings);try{const campaigns=archivedCampaigns(storage);campaigns.push(structuredClone(current));storage.setItem(archiveKey,JSON.stringify(campaigns));if(!storeSave(fresh,storage))return;return fresh}catch{return}}
export function restoreCampaign(current:Save,storage:StorageAccess=localStorage,index?:number):Save|undefined {const campaigns=archivedCampaigns(storage),chosen=index??campaigns.length-1,archived=campaigns[chosen];if(!archived)return;try{campaigns.push(structuredClone(current));storage.setItem(archiveKey,JSON.stringify(campaigns));if(!storeSave(archived,storage))return;return archived}catch{return}}
export function recordCompletion(saved:Save,result:DayResult,watched=false):boolean {
 const stage=saved.state.stage;
 if(!goalMet(stage,result))return false;
 if(watched&&!saved.ranStages.includes(stage))saved.ranStages.push(stage);
 if(stage===1&&!saved.ranStages.includes(1))return false;
 const earned=stars(stage,result);saved.stars[stage]=[...new Set([...(saved.stars[stage]??[]),...earned])];
 if(stage<6){const next=stage+1;saved.unlocked=Math.max(saved.unlocked,next);if(!saved.entries[next])saved.entries[next]=structuredClone(addGrowth(saved.state,next));if(!saved.states[next])saved.states[next]=structuredClone(saved.entries[next]);saved.lessons[next]??=inferLesson(saved.states[next]);}
 return true;
}
export function stageState(saved:Save,stage:number):State|undefined {if(stage<1||stage>saved.unlocked)return;const layout=saved.states[stage]??saved.entries[stage];return layout?structuredClone(layout):undefined}
export function nextStageState(saved:Save):State|undefined {if(!saved.stars[saved.state.stage]?.includes('Lights on'))return;return stageState(saved,saved.state.stage+1)}

