import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CLOUD_FOCUS_BOUNDS} from './cloud-room-camera.js';

/** An original sky deck: no downloaded assets, invented photographs or idle loop. */
export function createCloudRoomScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9d4df');scene.fog=new THREE.Fog('#c8dadd',70,170);
  const camera=new THREE.PerspectiveCamera(43,1,.1,220),geometries=new Set(),materials=new Set(),pickRoots=[],pickEnvelopes=[];
  let disposed=false,selected=0;
  const p={wood:'#946846',edge:'#c8ab7d',cream:'#f1eddd',stone:'#cfcab7',green:'#355b4b',dark:'#29493f',clay:'#bd8d68',leaf:'#aebea2',sky:'#bdd5df',cloud:'#fff9e9',shade:'#e8eddf',blue:'#789eaa'};
  const matte=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.89});materials.add(matte);
  const colors=new Map(),color=tint=>{if(!colors.has(tint))colors.set(tint,new THREE.Color(tint));return colors.get(tint);};
  function part(root,geometry,tint,at=[0,0,0]){
    const c=color(tint),data=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<data.length;i+=3){data[i]=c.r;data[i+1]=c.g;data[i+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(data,3));geometries.add(geometry);const mesh=new THREE.Mesh(geometry,matte);mesh.position.fromArray(at);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  const box=(root,size,at,tint)=>part(root,new THREE.BoxGeometry(...size),tint,at);
  const cylinder=(root,radius,height,at,tint,segments=18)=>part(root,new THREE.CylinderGeometry(radius,radius,height,segments),tint,at);
  function beam(root,a,b,width,tint){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=box(root,[width,delta.length(),width],start.add(end).multiplyScalar(.5).toArray(),tint);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
  function batch(root,{castShadow=true,receiveShadow=true}={}){
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),parts=[],sources=[];
    root.traverse(mesh=>{if(!mesh.isMesh||mesh.material!==matte)return;const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));g.deleteAttribute('uv');parts.push(g);sources.push(mesh);});
    if(!parts.length)return;const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)throw new Error('Cloud deck batching failed.');
    for(const mesh of sources){mesh.removeFromParent();mesh.geometry.dispose();geometries.delete(mesh.geometry);}geometries.add(merged);const mesh=new THREE.Mesh(merged,matte);mesh.castShadow=castShadow;mesh.receiveShadow=receiveShadow;root.add(mesh);return mesh;
  }
  function target(name,index){const root=new THREE.Group();root.name=name;root.userData.personalChapter=index;scene.add(root);pickRoots.push(root);return root;}
  function envelope(root,min,max){pickEnvelopes.push({root,bounds:new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max))});}
  const architecture=new THREE.Group();architecture.name='Open cloud photography deck';scene.add(architecture);
  // Spare deck and a low edge establish human scale; nothing encloses the sky.
  box(architecture,[42,.30,50],[0,-.22,15],p.stone);box(architecture,[33,.12,15],[0,-.02,-.6],p.cream);
  for(let x=-16;x<=16;x+=1.5)box(architecture,[.025,.012,14.8],[x,.047,-.6],p.stone);
  box(architecture,[33,.65,.42],[0,.35,-8.1],p.green);box(architecture,[33,.10,.60],[0,.72,-8.1],p.edge);
  for(const side of [-1,1]){box(architecture,[.45,.65,14],[side*16.3,.35,-1.3],p.green);box(architecture,[.62,.10,14],[side*16.3,.72,-1.3],p.edge);}
  // One structural rounded window, with matching curved shutters. The other
  // viewpoints stay open; repeated ornamental hoops would compete with the sky.
  const window=target('Cloud viewing shutters',0);window.position.set(-8,0,-5);
  for(const side of [-1,1])box(window,[.46,3.48,.60],[side*4.4,1.85,0],p.wood);
  const archPoints=[];for(let i=0;i<=40;i++){const a=Math.PI-i/40*Math.PI;archPoints.push(new THREE.Vector3(Math.cos(a)*4.4,3.45+Math.sin(a)*4.7,0));}
  part(window,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints),40,.24,8,false),p.wood);
  box(window,[9.2,.30,1.05],[0,.32,.1],p.edge);batch(window);
  const shutters=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.name=side<0?'Left sky shutter':'Right sky shutter';hinge.position.set(side*4.2,.48,.0);window.add(hinge);
    const center=-side*2.10,shape=new THREE.Shape();shape.moveTo(-side*4.18,0);shape.lineTo(0,0);shape.lineTo(0,3);
    for(let i=0;i<=24;i++){const a=side>0?i/24*Math.PI/2:Math.PI-i/24*Math.PI/2;shape.lineTo(Math.cos(a)*4.18-side*4.18,3+Math.sin(a)*4.65);}shape.closePath();
    part(hinge,new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false,curveSegments:1}),p.green);
    for(let i=0;i<8;i++){const y=.5+i*.94,w=y<=3?4.15:4.15*Math.sqrt(1-((y-3)/4.65)**2);box(hinge,[w,.045,.04],[side*w/2-side*4.18,y,.15],p.dark);}
    box(hinge,[4.14,.16,.18],[center,.15,.08],p.wood);
    box(hinge,[.12,.55,.14],[-side*3.80,3.75,.14],p.edge);batch(hinge);shutters.push({hinge,side});
  }
  envelope(window,[-12.6,.3,-6.1],[-3.4,8.5,-4.5]);

  const photography=target('Photography viewfinder',1);
  // The open physical frame shows the same live sky used by the postcard capture.
  const corners=[];
  for(const side of [-1,1])for(const upper of [-1,1]){
    const corner=new THREE.Group();corner.name='Viewfinder corner';corner.visible=false;photography.add(corner);
    box(corner,[1.1,.095,.13],[side*.5,0,0],p.green);box(corner,[.095,.72,.13],[0,upper*.32,0],p.green);batch(corner);corners.push({corner,side,upper});
  }
  // A simple camera and tripod, with a recognizable lens and rear viewfinder.
  const tripod=new THREE.Group();tripod.name='Camera on a tripod';photography.add(tripod);tripod.position.set(0,0,.15);
  for(const a of [0,Math.PI*2/3,Math.PI*4/3])beam(tripod,[0,2.5,0],[Math.sin(a)*.95,.1,Math.cos(a)*.95],.075,p.wood);
  cylinder(tripod,.15,.22,[0,2.48,0],p.dark,12);box(tripod,[1.35,.83,.62],[0,3.0,0],p.green);box(tripod,[.92,.48,.045],[-.07,3,.34],p.dark);
  box(tripod,[.65,.32,.05],[-.10,3,.37],p.blue);box(tripod,[.45,.20,.38],[0,3.48,0],p.dark);
  cylinder(tripod,.10,.08,[.43,3.48,.05],p.edge,12);
  const lens=cylinder(tripod,.42,.80,[0,3,-.59],p.dark,24);lens.rotation.x=Math.PI/2;
  const glass=cylinder(tripod,.34,.025,[0,3,-1.0],p.blue,24);glass.rotation.x=Math.PI/2;
  const lensRing=part(tripod,new THREE.TorusGeometry(.42,.045,5,24),p.edge,[0,3,-.96]);batch(tripod);tripod.scale.setScalar(1.4);
  envelope(photography,[-3.9,.1,-6.1],[3.9,8.2,1.3]);

  const quiet=target('Quiet sky bench',2);quiet.position.set(8.2,0,-3.5);
  // A curved bench, visibly facing the sky, provides an unhurried final view.
  for(let i=0;i<9;i++){
    const x=-2.8+i*.70,z=.08*x*x;
    const seat=box(quiet,[.65,.16,.72],[x,.85,z],p.edge);seat.rotation.y=-x*.14;
    const back=box(quiet,[.65,.58,.12],[x,1.22,z+.44],p.wood);back.rotation.y=-x*.14;
  }
  for(const x of [-2.2,0,2.2]){box(quiet,[.18,.8,.65],[x,.4,.08*x*x],p.wood);}
  // Resting camera strap is a restrained human trace, not fabricated personal media.
  box(quiet,[.70,.12,.42],[1.65,.97,.21],p.green);batch(quiet);envelope(quiet,[4.8,.05,-4.1],[11.7,1.7,-1.6]);

  // Distant atmospheric layers. Each cloud is assembled from round, unscaled puffs.
  const cloudLayers=[],cloudPuffs=[];
  const clusters=[
    {z:-18,puffs:[[-11,5.2,2.0],[-1.5,6.0,1.6],[9.4,4.8,2.0]],detail:2},
    {z:-33,puffs:[[-22,9,2.1],[-9,10.2,2.5],[6,8.7,2.3],[22,9.3,2.7]],detail:1},
    {z:-55,puffs:[[-30,14,3.2],[-11,13,2.5],[11,12.5,3.1],[32,15,3.0]],detail:1}
  ];
  const puffLayouts=[
    [[-1.35,-.08,.08,.68],[-.50,.30,-.15,.98],[.66,.12,.12,.90],[1.47,-.16,.06,.55],[.10,-.40,.32,.81]],
    [[-1.05,0,0,.85],[0,.35,-.1,1.08],[1.05,0,.1,.82],[.16,-.40,.2,.83]],
    [[-1.50,-.18,.12,.57],[-.75,.1,-.08,.80],[.30,.24,.06,1.03],[1.28,-.06,-.1,.69],[.25,-.42,.25,.76]]
  ];
  const underside=new THREE.Color('#c7d8de'),topCloud=new THREE.Color(),blendCloud=new THREE.Color();
  for(const [layerIndex,layer]of clusters.entries()){
    const root=new THREE.Group();root.name=`Cloud depth layer ${layerIndex+1}`;scene.add(root);
    for(const [clusterIndex,[cx,cy,size]]of layer.puffs.entries())for(const [dx,dy,dz,r]of puffLayouts[(clusterIndex+layerIndex)%puffLayouts.length]){
      const puff=part(root,new THREE.IcosahedronGeometry(size*r,layer.detail),layerIndex===2?p.shade:p.cloud,[cx+dx*size,cy+dy*size,layer.z+dz*size]);puff.name='Round cloud puff';cloudPuffs.push({position:puff.position.clone(),radius:size*r,scale:puff.scale.clone(),layer:layerIndex,cluster:clusterIndex});
      const positions=puff.geometry.attributes.position,tints=puff.geometry.attributes.color;topCloud.set(layerIndex===2?p.shade:p.cloud);
      for(let i=0;i<positions.count;i++){const shadeAmount=THREE.MathUtils.smoothstep(-positions.getY(i)/(size*r),-.05,.9)*.55;blendCloud.copy(topCloud).lerp(underside,shadeAmount);tints.setXYZ(i,blendCloud.r,blendCloud.g,blendCloud.b);}
    }
    batch(root,{castShadow:false,receiveShadow:false});cloudLayers.push(root);
  }
  // One inexpensive sky shell supplies the horizon gradient, without images.
  const skyGeometry=new THREE.SphereGeometry(150,24,12);geometries.add(skyGeometry);
  const atmosphere=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:{horizon:{value:new THREE.Color('#dce7e1')},zenith:{value:new THREE.Color('#82b7d1')}},vertexShader:'varying vec3 skyDirection; void main(){skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 horizon; uniform vec3 zenith; varying vec3 skyDirection; void main(){float h=normalize(skyDirection).y; gl_FragColor=vec4(mix(horizon,zenith,smoothstep(-0.08,0.35,h)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});materials.add(atmosphere);
  const sky=new THREE.Mesh(skyGeometry,atmosphere);sky.name='Illustrated sky atmosphere';sky.renderOrder=-1;scene.add(sky);batch(architecture);

  const anchors=[{position:new THREE.Vector3(-5.2,2.2,-4.4),label:'Open the sky'},{position:new THREE.Vector3(2.0,3.8,-2.9),label:'Frame the sky'},{position:new THREE.Vector3(10.6,2.7,-4.2),label:'Let the clouds drift'}];
  const entrance=new THREE.Group();entrance.name='Cloud Lookout threshold';entrance.visible=false;scene.add(entrance);
  for(const x of [-5.1,5.1])box(entrance,[.45,9.2,.8],[x,4.6,0],p.wood);
  box(entrance,[10.7,.35,.8],[0,9,0],p.wood);box(entrance,[10.9,.12,1.0],[0,9.27,0],p.edge);box(entrance,[10.6,.10,1.8],[0,-.05,0],p.stone);batch(entrance);
  const leaves=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.set(side*4.8,0,0);entrance.add(hinge);const center=-side*2.4;
    box(hinge,[4.75,8.75,.16],[center,4.38,0],p.green);for(const y of [.25,8.5])box(hinge,[4.8,.18,.22],[center,y,.05],p.wood);box(hinge,[.10,.65,.16],[-side*4.3,4.2,.17],p.edge);batch(hinge);leaves.push({hinge,side});
  }
  scene.add(new THREE.HemisphereLight('#fff8e6','#a7bcad',2.5));
  const sun=new THREE.DirectionalLight('#fff3d7',2.7);sun.position.set(-14,20,15);sun.target.position.set(0,3,-7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-22,right:22,top:17,bottom:-12,near:1,far:70});sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  const goals=[false,false,false],states=[0,0,0],smooth=t=>t*t*(3-2*t);
  function apply(){
    // Open onto the deck rather than into the photographing space. The leaves
    // therefore remain behind the final lens view, without visibility tricks.
    for(const {hinge,side}of shutters)hinge.rotation.y=side*smooth(states[0])*1.46;
    const framing=smooth(states[1]);for(const {corner,side,upper}of corners){corner.visible=states[1]>0&&states[1]<.7&&selected===1;corner.position.set(side*(2.7-framing*.55),4.8+upper*(1.30-framing*.25),-5.2);}
    for(let i=0;i<cloudLayers.length;i++){cloudLayers[i].position.x=smooth(states[2])*[1.4,-.9,.6][i];cloudLayers[i].position.y=smooth(states[2])*[.15,-.05,.07][i];}
    scene.updateMatrixWorld(true);
  }
  apply();
  return {scene,camera,pickRoots,pickEnvelopes,anchors,entrance,portrait:null,cloudPuffs,cloudLayers,
    focusBounds:CLOUD_FOCUS_BOUNDS.map(bounds=>new THREE.Box3(new THREE.Vector3(...bounds.min),new THREE.Vector3(...bounds.max))),
    select(index){selected=THREE.MathUtils.clamp(Math.round(index),0,2);apply();},
    interact(index=selected){index=THREE.MathUtils.clamp(Math.round(index),0,2);goals[index]=!goals[index];return goals[index];},
    interactionState(index=selected){return Boolean(goals[index]);},
    getViewFraming(){return smooth(states[1]);},
    updateInteraction(dt,reduced=false){if(disposed)return false;let changed=false;dt=Math.min(.1,Math.max(0,Number(dt)||0));for(let i=0;i<3;i++){const goal=Number(goals[i]);if(states[i]===goal)continue;const duration=goal?[1.3,1.5,4.2][i]:i===1?1.5:.8;const step=dt/duration;states[i]=reduced?goal:goal?Math.min(goal,states[i]+step):Math.max(goal,states[i]-step);changed=true;}if(changed)apply();return changed;},
    animateSound(){return false;},
    setEntrance(progress,pose){entrance.visible=progress<1&&Boolean(pose?.entrance);if(!entrance.visible)return;entrance.position.copy(pose.entrance.position);entrance.rotation.y=pose.entrance.rotationY;for(const {hinge,side}of leaves)hinge.rotation.y=side*pose.openness*1.54;entrance.updateMatrixWorld(true);},
    dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();scene.clear();},
    get resourceCounts(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});return {meshes,triangles,ownedGeometries:geometries.size,materials:materials.size,ownedTextures:0};}
  };
}
