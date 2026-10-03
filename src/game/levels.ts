import type {Node,Line,State} from './types';
const n=(id:string,kind:Node['kind'],x:number,z:number,extra:Partial<Node>={}):Node=>({id,kind,x,z,locked:true,...extra});
const l=(id:string,a:string,b:string,tier:Line['tier'],length:number):Line=>({id,a,b,tier,length,locked:true});
export const stageTitles=['First light','The far farm','Evening rush','Sunny field','After sunset','Night shift'];
export const budgets=[15,42,48,88,102,145];
export const stageGoals=['Give every building power','Get power to the farm across the river','Keep every home powered all day','Keep the village powered. Use the sun','Keep the hill homes powered all evening','Charge every robotaxi by 06:00. Keep the lights on'];
export const stageFocus=[72,72,74,50,74,88];
const hillPositions:[number,number][]=[[14,13],[15,12],[16,12],[17,12],[18,13],[19,14],[19,15],[19,16],[18,17],[17,17],[16,17],[15,17],[14,16],[13,15],[14,14],[18,15]];
const villagePositions:[number,number][]=[[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11]];
export function growth(stage:number):{nodes:Node[],lines:Line[]}{
 if(stage===1)return {nodes:[n('grid','grid',1,9,{zone:'village'}),n('tv','transformer',6,9,{size:'S',zone:'village'}),n('h1','home',8,8,{peakKW:2,zone:'village'}),n('h2','home',8,10,{peakKW:2,zone:'village'}),n('cafe','cafe',9,9,{peakKW:8,zone:'village'})],lines:[l('mv-base','grid','tv','MV',5)]};
 if(stage===2)return {nodes:[n('farm','workshop',20,9,{peakKW:15,zone:'farm'})],lines:[]};
 if(stage===3){const nodes=villagePositions.map(([x,z],i)=>n(`street${i+1}`,'home',x,z,{peakKW:2,zone:'village'}));return {nodes,lines:nodes.map(o=>l(`built-${o.id}`,'tv',o.id,'LV',Math.abs(o.x-6)+Math.abs(o.z-9)))} }
 if(stage===4)return {nodes:[n('cafe2','cafe',10,8,{peakKW:5,zone:'village'}),n('shop','workshop',11,9,{peakKW:15,zone:'village'})],lines:[l('built-cafe2','tv','cafe2','LV',5),l('built-shop','tv','shop','LV',5)]};
 if(stage===5){const homes=hillPositions.map(([x,z],i)=>n(`hill${i+1}`,'home',x,z,{peakKW:2,zone:'hill'}));return {nodes:[n('th','transformer',16,14,{size:'S',zone:'hill'}),...homes],lines:[l('mv-hill','tv','th','MV',15),...homes.map(o=>l(`built-${o.id}`,'th',o.id,'LV',Math.abs(o.x-16)+Math.abs(o.z-14)))]} }
 if(stage===6){const nodes:[Node,...Node[]]=[n('depot','site',23,13,{zone:'depot'}),...Array.from({length:6},(_,i)=>n(`cab${i+1}`,'ev',20+(i%3),12+((i/3)|0),{chargerKW:22,needKWh:40,window:[88,120],zone:'depot'})),n('daycab','ev',22,15,{chargerKW:22,needKWh:20,window:[44,60],zone:'depot'})];return {nodes,lines:[]} }
 return {nodes:[],lines:[]};
}
export function initialState():State {const g=growth(1);return {stage:1,nodes:g.nodes,lines:g.lines,batteries:{},evStarts:{},nextId:1} }
export function addGrowth(state:State,stage:number):State{const g=growth(stage);return {...state,stage,nodes:[...state.nodes,...g.nodes],lines:[...state.lines,...g.lines]}}
export function dist(a:Node,b:Node){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)}
