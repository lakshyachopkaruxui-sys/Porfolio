import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HOP} from './trajectory.js';
export function createRampModel(scene){
const rampRoot=new THREE.Group();rampRoot.name='River Hop ramps';scene.add(rampRoot);
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});const deck=mat('#d6b47e'),edge=mat('#31726b');
const extra=[];
const seams=[];
function ramp(start,landing){
 const length=HOP.launch-HOP.launchStart;const h=u=>HOP.lip*(landing?(1-u)**3:u**3),shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(length,0);for(let i=24;i>=0;i--)shape.lineTo(i*length/24,h(i/24));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:HOP.width,bevelEnabled:false,steps:1});const mesh=new THREE.Mesh(geometry,deck);mesh.rotation.y=-Math.PI/2;mesh.position.set(HOP.x+HOP.width/2,0,start);mesh.castShadow=true;mesh.receiveShadow=true;rampRoot.add(mesh);extra.push(geometry);
 for(let i=1;i<12;i++){const g=new THREE.BoxGeometry(HOP.width-.24,.025,.028);g.translate(HOP.x,h(i/12)+.025,start+i*length/12);seams.push(g);}
 for(const side of [-1,1])for(let i=0;i<12;i++){const a=new THREE.Vector3(HOP.x+side*(HOP.width/2-.12),h(i/12)+.035,start+i*length/12),b=new THREE.Vector3(a.x,h((i+1)/12)+.035,start+(i+1)*length/12);const g=new THREE.BoxGeometry(.10,.05,a.distanceTo(b));const stripe=new THREE.Mesh(g,edge);stripe.position.copy(a).add(b).multiplyScalar(.5);stripe.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());stripe.userData.edgeStripe=true;rampRoot.add(stripe);extra.push(g);}
}
ramp(HOP.launchStart,false);ramp(HOP.land,true);
const seamGeometry=mergeGeometries(seams),seamMaterial=mat('#9b8059');seams.forEach(g=>g.dispose());extra.push(seamGeometry);rampRoot.add(new THREE.Mesh(seamGeometry,seamMaterial));
const stripeMeshes=rampRoot.children.filter(o=>o.userData.edgeStripe),stripeCopies=stripeMeshes.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});const stripeGeometry=mergeGeometries(stripeCopies);stripeCopies.forEach(g=>g.dispose());stripeMeshes.forEach(o=>rampRoot.remove(o));rampRoot.add(new THREE.Mesh(stripeGeometry,edge));extra.push(stripeGeometry);
const signAssembly=new THREE.Group();signAssembly.name='River Hop instruction sign';signAssembly.position.set(-29,0,-30);rampRoot.add(signAssembly);
const signCanvas=document.createElement('canvas');signCanvas.width=768;signCanvas.height=384;const c=signCanvas.getContext('2d');c.fillStyle='#fffdf6';c.fillRect(0,0,768,384);c.fillStyle='#254b3b';c.font='700 75px sans-serif';c.fillText('RIVER HOP',48,112);c.font='42px sans-serif';c.fillText('Ride up - jump automatically',48,205);c.fillText('Optional · Esc to cancel',48,283);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.8,2.4),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.FrontSide}));sign.position.set(0,2.9,0);sign.rotation.y=.25;const back=sign.clone();back.rotation.set(0,Math.PI,0);back.position.set(0,0,-.015);sign.add(back);signAssembly.add(sign);
const postG=new THREE.BoxGeometry(.15,1.9,.15);extra.push(postG);for(const x of [-30.7,-27.3]){const post=new THREE.Mesh(postG,edge);post.position.set(x+29,.95,0);signAssembly.add(post);}

return {root:rampRoot,dispose(){rampRoot.removeFromParent();extra.forEach(g=>g.dispose());deck.dispose();edge.dispose();seamMaterial.dispose();signTexture.dispose();sign.geometry.dispose();sign.material.dispose();}};
}
