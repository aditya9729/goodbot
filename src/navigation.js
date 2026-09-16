import { inside, dist } from './math.js';
export const CELL=.4, RADIUS=.27;
export function blockers(scene,ignore=[]){return [...scene.furniture,...scene.objects.filter(o=>o.blocks&&!o.held)].filter(o=>!ignore.includes(o.id));}
export function walkable(scene,p,ignore=[]){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=.35&&p.x<=scene.width-.35&&p.z>=.35&&p.z<=scene.depth-.35&&!blockers(scene,ignore).some(o=>inside(p,o,RADIUS));}
export function visibleReach(scene,from,target,ignore=[]){
 if(dist(from,target)>1.65)return false;
 const list=blockers(scene,[target.id,target.support,...ignore]);
 for(let i=1;i<10;i++){const p={x:from.x+(target.x-from.x)*i/10,z:from.z+(target.z-from.z)*i/10};if(list.some(o=>inside(p,o,-.07)))return false;}
 return true;
}
export function findPath(scene,start,target,{approach=false,ignore=[]}={}) {
 const nx=Math.round(scene.width/CELL),nz=Math.round(scene.depth/CELL);
 const point=(x,z)=>({x:(x+.5)*CELL,z:(z+.5)*CELL});
 const key=(x,z)=>z*nx+x;
 let sx=Math.floor(start.x/CELL),sz=Math.floor(start.z/CELL);
 const goal=p=>approach?(dist(p,target)<1.48&&visibleReach(scene,p,target,ignore)):dist(p,target)<.32;
 if(goal(start)&&walkable(scene,start,ignore))return [];
 const queue=[[sx,sz]],parents=new Map([[key(sx,sz),null]]);let finish=null;
 for(let qi=0;qi<queue.length;qi++){
  const [x,z]=queue[qi],p=point(x,z);
  if(walkable(scene,p,ignore)&&goal(p)){finish=key(x,z);break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const xx=x+dx,zz=z+dz,k=key(xx,zz);if(xx<0||zz<0||xx>=nx||zz>=nz||parents.has(k))continue;
   if(!walkable(scene,point(xx,zz),ignore))continue;
   parents.set(k,key(x,z));queue.push([xx,zz]);
  }
 }
 if(finish===null)return null;
 const path=[];for(let k=finish;parents.get(k)!==null;k=parents.get(k))path.push(point(k%nx,Math.floor(k/nx)));
 return path.reverse();
}
