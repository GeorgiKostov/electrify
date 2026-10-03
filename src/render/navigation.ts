import * as THREE from 'three';
export interface Point {x:number;y:number}
export interface Viewport {left:number;top:number;width:number;height:number}
export function groundAt(camera:THREE.OrthographicCamera,rect:Viewport,point:Point){
 const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((point.x-rect.left)/rect.width*2-1,1-(point.y-rect.top)/rect.height*2),camera);
 return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3())??undefined;
}
export function panOffset(camera:THREE.OrthographicCamera,rect:Viewport,from:Point,to:Point){const a=groundAt(camera,rect,from),b=groundAt(camera,rect,to);return a&&b?{x:a.x-b.x,z:a.z-b.z}:{x:0,z:0}}
export function zoomAt(camera:THREE.OrthographicCamera,rect:Viewport,factor:number,point:Point){
 const before=groundAt(camera,rect,point);camera.zoom=Math.max(.25,Math.min(12,camera.zoom*factor));camera.updateProjectionMatrix();
 const after=groundAt(camera,rect,point),offset=before&&after?{x:before.x-after.x,z:before.z-after.z}:{x:0,z:0};
 camera.position.x+=offset.x;camera.position.z+=offset.z;camera.updateMatrixWorld(true);return offset;
}
export function wheelFactor(delta:number,mode:number,height:number){const pixels=delta*(mode===1?16:mode===2?height:1);return Math.exp(-Math.max(-400,Math.min(400,pixels))*.0015)}

export function draggedTile(node:{x:number;z:number},from:{x:number;z:number},to:{x:number;z:number}){return {x:Math.round(node.x+to.x-from.x),z:Math.round(node.z+to.z-from.z)}}
