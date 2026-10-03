export type Intent='select'|'place'|'move'|'connect'|'pan';
export function pointerIntent(tool:string,node:'fixed'|'movable'|undefined,input:{button:number;space:boolean;shift:boolean;running:boolean}):Intent{if(input.running||input.button===1||input.button===2||input.space||input.shift)return 'pan';if(tool==='LV'||tool==='MV')return 'connect';if(tool==='select')return node==='movable'?'move':node==='fixed'?'select':'pan';return tool==='move'?'move':'place'}
export interface Point {x:number;y:number}
export interface Press extends Point {id:number;intent:Intent;node?:string;moved:boolean}
export class MapGesture {
 points=new Map<number,Point>();press?:Press;navigation=false;
 begin(id:number,point:Point,intent:Intent,node?:string){this.points.set(id,point);if(this.points.size>1){this.navigation=true;this.press=undefined}else if(!this.navigation)this.press={id,...point,intent,node,moved:false}}
 navigate(){if(this.press)this.press.intent='pan'}
 move(id:number,point:Point){
  const previous=this.points.get(id);if(!previous)return;
  const before=[...this.points.values()];this.points.set(id,point);const after=[...this.points.values()];
  if(this.points.size>1){const center=(p:Point[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}),distance=(p:Point[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),oldDistance=distance(before),newDistance=distance(after);return {pinch:true,from:center(before),to:center(after),factor:oldDistance>2&&newDistance>2?newDistance/oldDistance:1}}
  if(this.navigation||!this.press)return;
  const wasMoved=this.press.moved;if(Math.hypot(point.x-this.press.x,point.y-this.press.y)>6)this.press.moved=true;
  return {pinch:false,from:!wasMoved&&this.press.moved?{x:this.press.x,y:this.press.y}:previous,to:point,factor:1};
 }
 end(id:number,inside:boolean){const press=this.press;this.points.delete(id);const allowed=inside&&!this.navigation&&press?.id===id;if(press?.id===id)this.press=undefined;if(!this.points.size)this.navigation=false;return allowed?press:undefined}
 cancel(){this.points.clear();this.press=undefined;this.navigation=false}
}
