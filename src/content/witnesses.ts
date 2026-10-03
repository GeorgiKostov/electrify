import type {State} from '../game/types';
import {apply,type Command} from '../game/commands';
import {addGrowth,initialState} from '../game/levels';
import {inferLesson,learnFromDay,type Lesson} from '../game/progression';
import {simulate} from '../sim/simulate';
const run=(state:State,commands:Command[],lesson?:Lesson)=>{let s=state;for(const c of commands){const r=apply(s,c,lesson);if(r.error)throw new Error(`${JSON.stringify(c)}: ${r.error}`);s=r.state}return s};
export function witnesses():State[]{
 let s=initialState();const out:State[]=[];
 s=run(s,[{type:'connect',a:'tv',b:'h1',tier:'LV'},{type:'connect',a:'tv',b:'h2',tier:'LV'},{type:'connect',a:'tv',b:'cafe',tier:'LV'}]);out.push(s);
 s=addGrowth(s,2);s=run(s,[{type:'place',kind:'transformer',x:18,z:9,size:'S'}]);const farmTx=s.nodes.find(n=>n.x===18&&n.z===9)!.id;s=run(s,[{type:'connect',a:'tv',b:farmTx,tier:'MV'},{type:'connect',a:farmTx,b:'farm',tier:'LV'}]);out.push(s);
 s=addGrowth(s,3);s=run(s,[{type:'upgrade',id:'tv'}]);out.push(s);
 s=addGrowth(s,4);s=run(s,[{type:'place',kind:'transformer',x:16,z:6,size:'L'}]);const solarTx=s.nodes.find(n=>n.x===16&&n.z===6)!.id;s=run(s,[{type:'place',kind:'solar',x:16,z:4},{type:'connect',a:farmTx,b:solarTx,tier:'MV'}]);const solar=s.nodes.find(n=>n.kind==='solar')!.id;s=run(s,[{type:'connect',a:solarTx,b:solar,tier:'LV'}]);out.push(s);
 s=addGrowth(s,5);s=run(s,[{type:'place',kind:'batteryQuick',x:15,z:15}]);const quick=s.nodes.find(n=>n.kind==='batteryQuick')!.id;s=run(s,[{type:'connect',a:'th',b:quick,tier:'LV'}]);const lesson=learnFromDay(inferLesson(s),s,simulate(s));s=run(s,[{type:'place',kind:'batteryLong',x:17,z:15}],lesson);const long=s.nodes.find(n=>n.kind==='batteryLong')!.id;s=run(s,[{type:'connect',a:'th',b:long,tier:'LV'},{type:'battery',id:quick,schedule:{charge:[40,60],discharge:[76,80]}},{type:'battery',id:long,schedule:{charge:[40,60],discharge:[68,88]}}]);out.push(s);
 s=addGrowth(s,6);s=run(s,[{type:'place',kind:'transformer',x:23,z:13,size:'L'}]);const depotTx=s.nodes.find(n=>n.kind==='transformer'&&n.zone==='depot')!.id;s=run(s,[{type:'connect',a:farmTx,b:depotTx,tier:'MV'}]);for(let i=0;i<6;i++)s=run(s,[{type:'ev',id:`cab${i+1}`,start:88+(i>>1)*8}]);out.push(s);
 return out;
}
