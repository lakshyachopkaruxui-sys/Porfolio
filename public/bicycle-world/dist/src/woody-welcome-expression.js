const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const beat=(t,start,peak,end)=>t<peak?smooth((t-start)/(peak-start)):1-smooth((t-peak)/(end-peak));
/** Authored greeting beats, sampled once from the recording clock rather than loops. */
export function sampleWelcomeExpression(time,{active=true,reduced=false,durationSeconds=12.24}={}){
 const rest={blink:0,tilt:0,lean:0,explain:0,brow:0,nod:0};
 const duration=Number.isFinite(durationSeconds)&&durationSeconds>0?durationSeconds:12.24;
 if(!active||reduced||!Number.isFinite(time)||time<0||time>=duration)return rest;
 // Keep the hello at its original clock position. Later gestures follow the
 // remaining recording length, so a revised script does not finish acting at
 // the old recording's endpoint or loop while the visitor is still listening.
 const phraseTime=time<=3?time:duration>3?3+(time-3)*9.24/(duration-3):12.24;
 const hello=beat(time,.08,.5,1.5),explain=beat(phraseTime,3.2,4.4,6.1)+.75*beat(phraseTime,7.1,8.2,10.4);
 const blink=Math.max(smooth((time-.35)/.12)*(1-smooth((time-.67)/.19)),beat(phraseTime,5.13,5.23,5.37),beat(phraseTime,9.05,9.16,9.3));
 return {blink,nod:.028*hello+.016*explain+.018*beat(phraseTime,10.6,11.4,12.24),tilt:-.055*hello+.025*explain,lean:.025*hello-.012*explain,explain,brow:hello};
}
/** Small spherical lid patches cover the supplied eyes; eye geometry stays intact. */
export function createWelcomeFace(THREE,{head,bones,eyes}){
 const material=new THREE.MeshStandardMaterial({color:0xe0b88c,roughness:.88,side:THREE.DoubleSide});
 const creaseMaterial=new THREE.LineBasicMaterial({color:0x8e6a49,transparent:true,opacity:0});
 const right=new THREE.Vector3(),up=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1),center=new THREE.Vector3(),scale=new THREE.Vector3(),headScale=new THREE.Vector3();
 const matrix=new THREE.Matrix4(),worldQ=new THREE.Quaternion(),headQ=new THREE.Quaternion();
 const upperLip=bones.find(b=>b.name==='lipUpperCenter_Woody_arm'),lowerLip=bones.find(b=>b.name==='lipLowerCenter_Woody_arm');
 const lipControls=bones.filter(b=>/^lip(?:Corner|Upper|Lower)/.test(b.name)).map(b=>({bone:b,rest:b.position.clone()}));
 const mouthMaterial=new THREE.MeshBasicMaterial({color:0x100807,side:THREE.DoubleSide});
 const mouthGeometry=new THREE.SphereGeometry(1,24,12),mouth=new THREE.Mesh(mouthGeometry,mouthMaterial);mouth.name='Woody oral cavity';mouth.frustumCulled=false;mouth.visible=false;head.add(mouth);
 const upperPoint=new THREE.Vector3(),lowerPoint=new THREE.Vector3();
 const brows=bones.filter(b=>/^brow0[1234]/.test(b.name)).map(b=>({bone:b,rest:b.position.clone()}));
 const lids=eyes.map(({object})=>{
  const eye=object.children.find(x=>x.isMesh);if(!eye)return null;eye.geometry.computeBoundingSphere();
  const sphere=eye.geometry.boundingSphere.clone(),group=new THREE.Group();group.name='Woody greeting eyelids';head.add(group);
  const patches=[1,-1].map(side=>{
   const segments=20,rows=8,positions=new Float32Array((segments+1)*(rows+1)*3),indices=[];
   for(let y=0;y<rows;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
   const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);return {side,segments,rows,geometry,positions};
  });
  const creasePoints=[];for(let i=0;i<=20;i++){const x=-.78+1.56*i/20,y=-.30*Math.sqrt(1-x*x);creasePoints.push(new THREE.Vector3(x,y,Math.sqrt(1-x*x-y*y)+.018));}
  const crease=new THREE.Line(new THREE.BufferGeometry().setFromPoints(creasePoints),creaseMaterial);crease.frustumCulled=false;group.add(crease);
  group.visible=false;return {eye,eyeVisible:eye.visible,sphere,group,patches,crease,creaseBase:crease.geometry.attributes.position.array.slice(),last:-1};
 }).filter(Boolean);
 function update(expression,{opening=0,active=false}={}){
  creaseMaterial.opacity=clamp((expression.blink-.82)/.18)*.75;
  for(const {bone,rest} of brows){bone.position.copy(rest);bone.position.y+=expression.brow*.045;}
  for(const {bone,rest} of lipControls){
   bone.position.copy(rest);
   if(bone.name.startsWith('lipCorner')){bone.position.y-=.04-.018*expression.brow;bone.position.x*=1-.055*opening;}
   else if(bone.name.startsWith('lipUpper'))bone.position.y+=(bone===upperLip?.085:.035)*opening;
   else if(bone.name.startsWith('lipLower'))bone.position.z+=.025*opening;
  }
  head.updateWorldMatrix(true,true);
  mouth.visible=active&&opening>.045&&Boolean(upperLip&&lowerLip);
  if(mouth.visible){
   upperLip.getWorldPosition(upperPoint);lowerLip.getWorldPosition(lowerPoint);head.worldToLocal(upperPoint);head.worldToLocal(lowerPoint);
   const gap=Math.max(.06,upperPoint.y-lowerPoint.y);
   mouth.position.set((upperPoint.x+lowerPoint.x)/2,(upperPoint.y+lowerPoint.y)/2,Math.min(upperPoint.z,lowerPoint.z)-.60);
   mouth.scale.set(.78,Math.max(.06,gap*.56),.18);
  }
  head.updateWorldMatrix(true,true);head.getWorldScale(headScale);head.getWorldQuaternion(headQ);
  up.set(0,1,0).applyQuaternion(headQ);right.crossVectors(up,forward).normalize();up.crossVectors(forward,right).normalize();
  matrix.makeBasis(right,up,forward);worldQ.setFromRotationMatrix(matrix);
  for(const lid of lids){
   const closure=clamp(expression.blink),flatten=smooth((closure-.94)/.06);lid.eye.visible=closure>.97?false:lid.eyeVisible;lid.group.visible=closure>.005;if(!lid.group.visible)continue;
   center.copy(lid.sphere.center);lid.eye.localToWorld(center);head.worldToLocal(center);lid.group.position.copy(center);
   lid.eye.getWorldScale(scale);lid.group.scale.setScalar(lid.sphere.radius*Math.max(scale.x,scale.y,scale.z)/Math.max(headScale.x,headScale.y,headScale.z)*1.012);
   lid.group.quaternion.copy(headQ).invert().multiply(worldQ);
   if(Math.abs(closure-lid.last)<.001)continue;lid.last=closure;
   for(const patch of lid.patches){let i=0;for(let y=0;y<=patch.rows;y++)for(let x=0;x<=patch.segments;x++){
    const px=-.999+1.998*x/patch.segments,edge=Math.sqrt(Math.max(0,1-px*px));
    const py=patch.side>0?edge*(1-1.30*closure*y/patch.rows):-edge*(1-.70*closure*y/patch.rows),pz=Math.sqrt(Math.max(0,1-px*px-py*py))*(1-.65*flatten);
    patch.positions[i++]=px;patch.positions[i++]=py;patch.positions[i++]=pz;
   }patch.geometry.attributes.position.needsUpdate=true;patch.geometry.computeVertexNormals();}
   const creasePositions=lid.crease.geometry.attributes.position.array;for(let i=2;i<creasePositions.length;i+=3)creasePositions[i]=(lid.creaseBase[i]-.018)*(1-.65*flatten)+.018;lid.crease.geometry.attributes.position.needsUpdate=true;
  }
 }
 return {update,get count(){return lids.length;},dispose(){for(const lid of lids){lid.eye.visible=lid.eyeVisible;lid.patches.forEach(p=>p.geometry.dispose());lid.crease.geometry.dispose();lid.group.removeFromParent();}material.dispose();creaseMaterial.dispose();mouthGeometry.dispose();mouthMaterial.dispose();mouth.removeFromParent();}};
}
