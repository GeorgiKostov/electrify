import type {State,Node,Line,Kind,Tier,BatterySchedule} from './types';
import {budgets,dist} from './levels';
import {buildTree} from '../sim/network';
import {commandAllowed,inferLesson,type Lesson} from './progression';
export const movable=(node:Node)=>!node.locked&&!(node.kind==='transformer'&&node.zone==='depot')&&['transformer','solar','batteryQuick','batteryLong'].includes(node.kind);
export const wholeTile=(x:number,z:number)=>Number.isInteger(x)&&Number.isInteger(z);
export const nodeCost=(n:Node)=>n.kind==='transformer'?(n.size==='L'?5:3):n.kind==='solar'?8:n.kind==='batteryQuick'?3:n.kind==='batteryLong'?4:0;
export const lineCost=(l:Line)=>Math.ceil(l.length)*(l.tier==='MV'?2:1);
export function buildCost(s:State){return s.nodes.filter(n=>!n.locked).reduce((v,n)=>v+nodeCost(n),0)+s.lines.filter(l=>!l.locked).reduce((v,l)=>v+lineCost(l),0)+(s.nodes.find(n=>n.id==='tv')?.size==='L'?2:0)}
export type Command = {type:'place';kind:Kind;x:number;z:number;size?:'S'|'L'}|{type:'connect';a:string;b:string;tier:Tier}|{type:'move';id:string;x:number;z:number}|{type:'remove';id:string}|{type:'upgrade';id:string}|{type:'battery';id:string;schedule:BatterySchedule}|{type:'ev';id:string;start:number};
export interface Applied {state:State;error?:string}
export function apply(state:State,cmd:Command,lesson:Lesson=inferLesson(state)):Applied{
 if(!commandAllowed(state,cmd,lesson))return {state,error:'Not unlocked yet'};
 if((cmd.type==='place'||cmd.type==='move')&&!wholeTile(cmd.x,cmd.z))return {state,error:'Choose a whole tile'};
 const s:State=structuredClone(state);let error='';
 const byId=(id:string)=>s.nodes.find(n=>n.id===id);
 if(cmd.type==='place'){
  if(!['transformer','solar','batteryQuick','batteryLong'].includes(cmd.kind))error='Cannot place that';
  else if(s.nodes.some(n=>n.x===cmd.x&&n.z===cmd.z&&n.kind!=='site'))error='Something is already here';
  else if(cmd.x<1||cmd.x>23||cmd.z<2||cmd.z>17)error='Outside the village';
  else if(cmd.kind==='solar'&&s.stage<4||cmd.kind.startsWith('battery')&&s.stage<5||cmd.kind==='transformer'&&s.stage<2||cmd.kind==='transformer'&&cmd.size==='L'&&s.stage<3)error='Not unlocked yet';
  else if(cmd.kind==='transformer'&&cmd.x>=12&&cmd.z>=12&&!(s.stage===6&&cmd.x===23&&cmd.z===13))error="This pole can't hold a transformer";
  else if(cmd.kind==='transformer'&&cmd.x===23&&cmd.z===13&&cmd.size!=='L')error='The depot needs the 50 kW transformer';
  else if(cmd.kind==='solar'&&!(cmd.x>=13&&cmd.z<=7)&&!(s.stage===6&&cmd.x>=20&&cmd.z>=15)&&!(cmd.z>=13&&cmd.x<20))error='Place solar in a field';
  else if(cmd.kind.startsWith('battery')&&cmd.x>=12&&cmd.z>=12&&cmd.x<=20&&cmd.z<=17&&s.stage<5)error='Not unlocked yet';
  if(!error){const id=`p${s.nextId++}`,zone=cmd.x>=12&&cmd.z>=12?(cmd.x>=21?'depot':'hill'):cmd.x>=13&&cmd.z<=7?'field':'village';const n:Node={id,kind:cmd.kind,x:cmd.x,z:cmd.z,zone,size:cmd.size??'S',placedOrder:s.nextId};if(cmd.kind==='solar')n.siteFactor=zone==='hill'?.5:1;s.nodes.push(n);if(cmd.kind.startsWith('battery'))s.batteries[id]={charge:[40,60],discharge:[68,88]};if(cmd.kind==='transformer'&&zone==='depot'){for(const cab of s.nodes.filter(x=>x.kind==='ev'))s.lines.push({id:`built-${cab.id}`,a:id,b:cab.id,tier:'LV',length:dist(n,cab),locked:true})}}
 }else if(cmd.type==='connect'){
  const a=byId(cmd.a),b=byId(cmd.b);if(!a||!b)error='Choose two objects';
  else if(a.id===b.id)error='Choose two objects';
  else if((a.zone==='hill'||b.zone==='hill')&&a.zone!==b.zone&&cmd.tier==='LV'&&a.kind!=='solar'&&b.kind!=='solar')error='Needs a line nearby';
  else if((a.zone==='depot'||b.zone==='depot')&&a.zone!==b.zone&&cmd.tier==='LV')error='Needs a line nearby';
  else if(cmd.tier==='MV'&&(a.id==='th'||b.id==='th'))error='The hill has one fixed connection';
  else if((a.zone==='depot'||b.zone==='depot')&&cmd.tier==='MV'&&((a.zone==='depot'&&a.kind!=='transformer')||(b.zone==='depot'&&b.kind!=='transformer')))error='Connect the depot transformer';
  else if((a.zone==='depot'||b.zone==='depot')&&cmd.tier==='MV'&&s.lines.some(l=>l.tier==='MV'&&(l.a===(a.zone==='depot'?a.id:b.id)||l.b===(a.zone==='depot'?a.id:b.id))))error='The depot has one connection';
  else {const line:Line={id:`l${s.nextId++}`,a:a.id,b:b.id,tier:cmd.tier,length:dist(a,b)};s.lines.push(line)}
 }else if(cmd.type==='move'){
  const n=byId(cmd.id);if(!n||!movable(n))error=n?.kind==='transformer'&&n.zone==='depot'?'The depot connection stays here':'This is part of the village';
  else if(cmd.x<1||cmd.x>23||cmd.z<2||cmd.z>17)error='Outside the village';
  else if(s.nodes.some(o=>o.id!==n.id&&o.kind!=='site'&&o.x===cmd.x&&o.z===cmd.z))error='Something is already here';
  else if(n.kind==='transformer'&&(cmd.x>=12&&cmd.z>=12)&&!(n.zone==='depot'&&cmd.x===23&&cmd.z===13))error="This pole can't hold a transformer";
  else if(n.kind==='transformer'&&n.zone==='depot'&&(cmd.x!==23||cmd.z!==13))error='The depot connection stays here';
  else if(n.kind==='solar'&&!(cmd.x>=13&&cmd.z<=7)&&!(s.stage===6&&cmd.x>=20&&cmd.z>=15)&&!(cmd.z>=13&&cmd.x<20))error='Place solar in a field';
  else {const zone=cmd.x>=12&&cmd.z>=12?(cmd.x>=21?'depot':'hill'):cmd.x>=13&&cmd.z<=7?'field':'village';const cross=s.lines.filter(l=>l.tier==='LV'&&(l.a===n.id||l.b===n.id)).some(l=>{const other=byId(l.a===n.id?l.b:l.a)!;return zone!==other.zone&&(zone==='hill'||zone==='depot'||other.zone==='hill'||other.zone==='depot')&&n.kind!=='solar'&&other.kind!=='solar'});if(cross)error='Needs a line nearby';else{n.x=cmd.x;n.z=cmd.z;n.zone=zone;if(n.kind==='solar')n.siteFactor=n.zone==='hill'?.5:1;for(const l of s.lines.filter(l=>l.a===n.id||l.b===n.id)){const other=byId(l.a===n.id?l.b:l.a)!;l.length=dist(n,other)}}}
 }else if(cmd.type==='remove'){
  const line=s.lines.find(l=>l.id===cmd.id),n=byId(cmd.id);
  if(line){if(line.locked)error='This is part of the village';else s.lines=s.lines.filter(l=>l.id!==line.id)}
  else if(n){if(n.locked)error='This is part of the village';else {s.nodes=s.nodes.filter(o=>o.id!==n.id);s.lines=s.lines.filter(l=>l.a!==n.id&&l.b!==n.id);delete s.batteries[n.id]}}
  else error='Choose an object';
 }else if(cmd.type==='upgrade'){
  const n=byId(cmd.id);if(!n||n.kind!=='transformer'||n.size==='L')error='No upgrade here';
  else if(s.stage<3)error='Not unlocked yet';
  else if(n.zone==='hill'||n.zone==='depot')error="This pole can't hold a bigger one";
  else n.size='L';
 }else if(cmd.type==='battery'){
  const n=byId(cmd.id);const [c0,c1]=cmd.schedule.charge,[d0,d1]=cmd.schedule.discharge;
  if(!n||!n.kind.startsWith('battery')||c0<0||c1>96||d0<0||d1>96||c0>=c1||d0>=d1)error='Choose valid times';else s.batteries[cmd.id]=cmd.schedule;
 }else if(cmd.type==='ev'){
  const n=byId(cmd.id);const start=cmd.start,duration=n?Math.ceil((n.needKWh??0)/((n.chargerKW??1)*.25)):0;
  if(!n||n.kind!=='ev'||start<(n.window?.[0]??0)||start+duration>(n.window?.[1]??0))error='Choose a time in the plug window';else s.evStarts[cmd.id]=start;
 }
 if(!error&&buildCost(s)>budgets[s.stage-1])error='Not enough coins';
 if(!error){const errs=buildTree(s).errors;if(errs.length)error=errs[0].startsWith('WRONG_VOLTAGE')?'Needs matching voltage':errs[0].startsWith('TOO_FAR')?'Too far for low voltage':'That would make a loop'}
 return error?{state,error}:{state:s};
}
