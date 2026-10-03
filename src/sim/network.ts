import type {State,Node,Tier} from '../game/types';
export interface Edge { id:string; a:string; b:string; tier:Tier|'TX'; length:number; capacity:number; lossCoeff:number }
export interface Tree { nodes:Map<string,Node>; edges:Edge[]; edgeById:Map<string,Edge>; parent:Record<string,string>; via:Record<string,string>; order:string[]; section:Record<string,string>; errors:string[]; connected:Set<string> }
const port=(node:Node,tier:Tier)=>node.kind==='transformer'?`${node.id}:${tier}`:node.id;
export const supportsTier=(node:Node,tier:Tier)=>node.kind!=='site'&&(tier==='MV'?node.kind==='grid'||node.kind==='transformer':node.kind!=='grid');
export const lineCapacity=(tier:Tier)=>tier==='LV'?40:200;
export function buildTree(state:State):Tree {
 const nodes=new Map(state.nodes.map(x=>[x.id,x])); const errors:string[]=[];const edges:Edge[]=[];
 const seen=new Set<string>();
 for(const line of [...state.lines].sort((a,b)=>a.id.localeCompare(b.id))){
  const a=nodes.get(line.a),b=nodes.get(line.b);
  if(!a||!b){errors.push(`Missing port on ${line.id}`);continue}
  if(a.id===b.id||!supportsTier(a,line.tier)||!supportsTier(b,line.tier)){errors.push(`WRONG_VOLTAGE:${line.id}`);continue}
  const pa=port(a,line.tier),pb=port(b,line.tier);const key=[pa,pb].sort().join('|');if(seen.has(key)){errors.push(`LOOP_NOT_ALLOWED:${line.id}`);continue} seen.add(key);
  edges.push({id:line.id,a:pa,b:pb,tier:line.tier,length:line.length,capacity:lineCapacity(line.tier),lossCoeff:line.tier==='LV'?.02:.0005});
 }
 for(const n of state.nodes.filter(x=>x.kind==='transformer').sort((a,b)=>a.id.localeCompare(b.id)))edges.push({id:`tx:${n.id}`,a:`${n.id}:MV`,b:`${n.id}:LV`,tier:'TX',length:0,capacity:n.size==='L'?50:25,lossCoeff:0});
 const adj:Record<string,{to:string,id:string}[]>={};for(const e of edges){(adj[e.a]??=[]).push({to:e.b,id:e.id});(adj[e.b]??=[]).push({to:e.a,id:e.id})}for(const v of Object.values(adj))v.sort((a,b)=>a.id.localeCompare(b.id));
 const parent:Record<string,string>={},via:Record<string,string>={},order:string[]=[];const connected=new Set<string>();
 const root=state.nodes.find(x=>x.kind==='grid')?.id??'grid';const queue=[root];connected.add(root);
 while(queue.length){const v=queue.shift()!;order.push(v);for(const next of adj[v]??[]){if(next.to===parent[v])continue;if(connected.has(next.to)){errors.push(`LOOP_NOT_ALLOWED:${next.id}`);continue}connected.add(next.to);parent[next.to]=v;via[next.to]=next.id;queue.push(next.to)}}
 const uf:Record<string,string>={};const find=(v:string):string=>uf[v]===undefined?(uf[v]=v):uf[v]===v?v:(uf[v]=find(uf[v]));for(const e of edges){const a=find(e.a),b=find(e.b);if(a===b){const err=`LOOP_NOT_ALLOWED:${e.id}`;if(!errors.includes(err))errors.push(err)}else uf[a]=b}
 const section:Record<string,string>={};const reach:Record<string,number>={};for(const v of order){const e=edges.find(x=>x.id===via[v]);if(e?.tier==='TX'){section[v]=v.split(':')[0];reach[v]=0}else if(e?.tier==='LV'){section[v]=section[parent[v]];reach[v]=(reach[parent[v]]??0)+e.length;if(reach[v]>6)errors.push(`TOO_FAR_FOR_LV:${v}`)}}
 for(const n of state.nodes){if(n.kind==='transformer'&&connected.has(`${n.id}:MV`)){const mvParent=parent[`${n.id}:MV`];if(!mvParent||mvParent===`${n.id}:LV`)errors.push(`ONE_PARENT:${n.id}`)}}
 return {nodes,edges,edgeById:new Map(edges.map(e=>[e.id,e])),parent,via,order,section,errors:[...new Set(errors)],connected};
}
export function subtree(tree:Tree,vertex:string):string[]{return tree.order.filter(v=>{let cur:string|undefined=v;while(cur!==undefined){if(cur===vertex)return true;cur=tree.parent[cur]}return false})}
export function nodeVertex(n:Node){return n.kind==='transformer'?`${n.id}:LV`:n.id}
