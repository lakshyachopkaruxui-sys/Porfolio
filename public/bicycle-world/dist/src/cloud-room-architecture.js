import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CLOUD_FOCUS_BOUNDS,CLOUD_REEL_APERTURE} from './cloud-room-camera.js';

/** An original sky deck: no downloaded assets, invented photographs or idle loop. */
export function createCloudRoomScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9d4df');scene.fog=new THREE.Fog('#c8dadd',70,170);
  const camera=new THREE.PerspectiveCamera(43,1,.1,220),geometries=new Set(),materials=new Set(),pickRoots=[],pickEnvelopes=[];
  let disposed=false;
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
  // One generous camera silhouette leads into the actual photographs. Its top
  // finder is four solid rails around an empty tunnel, not an opaque screen.
  const photography=new THREE.Group();photography.name='Camera and open viewfinder';scene.add(photography);
  for(const angle of [0,Math.PI*2/3,Math.PI*4/3])beam(photography,[0,2.9,-4.3],[Math.sin(angle)*2.1,.1,-4.3+Math.cos(angle)*1.6],.14,p.wood);
  cylinder(photography,.38,.28,[0,2.75,-4.3],p.dark,16);
  box(photography,[7.6,3.6,2.2],[0,4.6,-4.4],p.green);
  box(photography,[7.72,.25,2.34],[0,6.27,-4.4],p.edge);
  box(photography,[7.72,.25,2.34],[0,2.92,-4.4],p.edge);
  box(photography,[1.15,3.25,.45],[3.06,4.6,-3.12],p.dark);
  for(const y of [3.45,3.9,4.35,4.8,5.25,5.7])box(photography,[.9,.045,.05],[3.06,y,-2.88],p.green);
  box(photography,[1.9,1.0,.12],[-2.3,4.8,-3.24],p.cream);
  const lens=cylinder(photography,1.46,2.35,[0,4.6,-2.2],p.dark,28);lens.rotation.x=Math.PI/2;
  const glass=cylinder(photography,1.18,.07,[0,4.6,-.99],p.blue,28);glass.rotation.x=Math.PI/2;
  part(photography,new THREE.TorusGeometry(1.40,.12,6,28),p.edge,[0,4.6,-1.02]);
  part(photography,new THREE.TorusGeometry(1.05,.065,5,28),p.dark,[0,4.6,-.94]);
  for(const x of [-2.7,2.7])cylinder(photography,.38,.24,[x,6.53,-4.3],p.dark,16);
  cylinder(photography,.18,.15,[2.7,6.72,-4.3],p.edge,16);
  const [finderX,finderY,finderZ]=CLOUD_REEL_APERTURE.center;
  const finderDepth=CLOUD_REEL_APERTURE.rearZ-CLOUD_REEL_APERTURE.frontZ;
  for(const side of [-1,1]){
    box(photography,[.38,1.85,finderDepth],[finderX+side*1.14,finderY,finderZ],p.dark);
    box(photography,[1.9,.365,finderDepth],[finderX,finderY+side*.7425,finderZ],p.dark);
    box(photography,[.12,1.85,.15],[finderX+side*1.35,finderY,CLOUD_REEL_APERTURE.rearZ+.02],p.edge);
    box(photography,[2.58,.12,.15],[finderX,finderY+side*.96,CLOUD_REEL_APERTURE.rearZ+.02],p.edge);
  }
  batch(photography);

  // Two open-spoked reels are chapter selectors, rather than extra scene toys.
  for(const [index,x]of [-5.65,5.65].entries()){
    const reel=target(index===0?'Cloud photograph film reel':'Mobile photograph film reel',index);
    reel.position.set(x,1.47,-4.05);
    for(const z of [-.25,.25]){
      part(reel,new THREE.TorusGeometry(1.24,.095,5,24),p.edge,[0,0,z]);
      for(let spoke=0;spoke<5;spoke++){
        const angle=spoke*Math.PI*2/5,arm=box(reel,[.15,1.12,.12],[Math.sin(angle)*.59,Math.cos(angle)*.59,z],p.edge);arm.rotation.z=-angle;
      }
      const hub=cylinder(reel,.30,.15,[0,0,z],p.dark,16);hub.rotation.x=Math.PI/2;
    }
    const film=cylinder(reel,.72,.4,[0,0,0],p.green,24);film.rotation.x=Math.PI/2;
    box(reel,[1.3,.12,.8],[0,-1.36,0],p.wood);batch(reel);
    envelope(reel,[x-1.4,.05,-4.5],[x+1.4,2.85,-3.6]);
  }

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

  const anchors=[{position:new THREE.Vector3(-5.65,3.25,-3.7),label:'Open cloud reel'},{position:new THREE.Vector3(5.65,3.25,-3.7),label:'Open photography reel'}];
  // Retain the shared room interface without adding a decorative door.
  const entrance=new THREE.Group();entrance.name='Open Cloud Lookout arrival';entrance.visible=false;scene.add(entrance);
  scene.add(new THREE.HemisphereLight('#fff8e6','#a7bcad',2.5));
  const sun=new THREE.DirectionalLight('#fff3d7',2.7);sun.position.set(-14,20,15);sun.target.position.set(0,3,-7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-22,right:22,top:17,bottom:-12,near:1,far:70});sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  scene.updateMatrixWorld(true);
  return {scene,camera,pickRoots,pickEnvelopes,anchors,entrance,portrait:null,cloudPuffs,cloudLayers,
    photoCamera:photography,reelAperture:CLOUD_REEL_APERTURE,
    focusBounds:CLOUD_FOCUS_BOUNDS.map(bounds=>new THREE.Box3(new THREE.Vector3(...bounds.min),new THREE.Vector3(...bounds.max))),
    select(){},
    interact(){return false;},
    interactionState(){return false;},
    getViewFraming(){return 0;},
    updateInteraction(){return false;},
    animateSound(){return false;},
    setEntrance(){entrance.visible=false;},
    dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();scene.clear();},
    get resourceCounts(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});return {meshes,triangles,ownedGeometries:geometries.size,materials:materials.size,ownedTextures:0};}
  };
}
