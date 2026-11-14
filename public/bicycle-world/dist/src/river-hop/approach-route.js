import {positionIsClear} from '../layout.js';
const TAU=Math.PI*2,mod=a=>(a%TAU+TAU)%TAU;
const arcAngle=(from,to,sign)=>mod(sign*(to-from));

/** Four bounded-radius tangent paths to an oriented dry runway entry.
 * All points are clearance checked; no in-place heading change is authored. */
export function planRampApproach(start,gate,colliders){
 const phi0=-start.heading-Math.PI/2,phi1=-gate.heading-Math.PI/2,candidates=[];
 for(const radius of [2.8,3.6])for(const first of [-1,1])for(const last of [-1,1]){
  const c0={x:start.x-first*radius*Math.sin(phi0),z:start.z+first*radius*Math.cos(phi0)};
  const c1={x:gate.x-last*radius*Math.sin(phi1),z:gate.z+last*radius*Math.cos(phi1)};
  const dx=c1.x-c0.x,dz=c1.z-c0.z,d=Math.hypot(dx,dz),normal=(last-first)*radius;
  if(d<Math.abs(normal)+1e-6||d<1e-6)continue;
  const tangent=Math.atan2(dz,dx)-Math.asin(normal/d),line=Math.sqrt(d*d-normal*normal);
  const a=arcAngle(phi0,tangent,first),b=arcAngle(tangent,phi1,last),points=[];
  function append(x,z,phi){points.push({x,z,heading:-phi-Math.PI/2});}
  append(start.x,start.z,phi0);
  for(let i=1,n=Math.max(1,Math.ceil(a*radius/.3));i<=n;i++){const p=phi0+first*a*i/n;append(c0.x+first*radius*Math.sin(p),c0.z-first*radius*Math.cos(p),p);}
  const from=points.at(-1);
  for(let i=1,n=Math.max(1,Math.ceil(line/.3));i<=n;i++)append(from.x+Math.cos(tangent)*line*i/n,from.z+Math.sin(tangent)*line*i/n,tangent);
  for(let i=1,n=Math.max(1,Math.ceil(b*radius/.3));i<=n;i++){const p=tangent+last*b*i/n;append(c1.x+last*radius*Math.sin(p),c1.z-last*radius*Math.cos(p),p);}
  const end=points.at(-1);if(Math.hypot(end.x-gate.x,end.z-gate.z)>.001)continue;
  // Stay on this bank, outside the raised decks. The bridge route is untouched.
  if(points.some(p=>(gate.northbound?p.z<-41.8:p.z>-60.2)||!positionIsClear(p,colliders)))continue;
  candidates.push({points:points.slice(1),length:(a+b)*radius+line});
 }
 candidates.sort((a,b)=>a.length-b.length);
 return candidates[0]?.points??null;
}
