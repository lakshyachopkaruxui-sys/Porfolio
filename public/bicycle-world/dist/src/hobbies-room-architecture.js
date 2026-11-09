import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HOBBIES_FOCUS_BOUNDS} from './hobbies-room-camera.js';

/** Original open-air hobby courtyard. No renderer, network fetch or idle RAF. */
export function createHobbiesRoomScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9c8b4');scene.fog=new THREE.Fog('#b9c8b4',58,145);
  const camera=new THREE.PerspectiveCamera(43,1,.1,180),geometries=new Set(),materials=new Set(),textures=new Set(),pickRoots=[],pickEnvelopes=[];
  let disposed=false,plaqueDirty=false;
  const p={stone:'#c9c2ad',cream:'#f0e9d5',plaster:'#dfd7be',wood:'#91643f',edge:'#c6a374',green:'#365c47',dark:'#233e34',cloth:'#bb795b',ochre:'#d2ab58',blue:'#a7c8c5',leaf:'#6c8e5a',lightLeaf:'#96aa70',ink:'#334c3f',red:'#c96c52'};
  const matte=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.87});materials.add(matte);
  const cache=new Map(),color=tint=>{if(!cache.has(tint))cache.set(tint,new THREE.Color(tint));return cache.get(tint);};
  function part(root,geometry,tint,position=[0,0,0]){
    const c=color(tint),data=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<data.length;i+=3){data[i]=c.r;data[i+1]=c.g;data[i+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(data,3));geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,matte);mesh.position.fromArray(position);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  const box=(root,size,at,tint)=>part(root,new THREE.BoxGeometry(...size),tint,at);
  const cylinder=(root,radius,height,at,tint,segments=20)=>part(root,new THREE.CylinderGeometry(radius,radius,height,segments),tint,at);
  const sphere=(root,radius,at,tint,detail=1)=>part(root,new THREE.IcosahedronGeometry(radius,detail),tint,at);
  function beam(root,a,b,width,tint,depth=width){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=box(root,[width,delta.length(),depth],start.add(end).multiplyScalar(.5).toArray(),tint);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
  function ring(root,radius,width,y,center,tint,start=0,arc=Math.PI*2,segments=48){
    const shape=new THREE.Shape(),inside=radius-width;
    for(let i=0;i<=segments;i++){const a=start+i/segments*arc,x=Math.cos(a)*radius,z=Math.sin(a)*radius;if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);}
    for(let i=segments;i>=0;i--){const a=start+i/segments*arc;shape.lineTo(Math.cos(a)*inside,Math.sin(a)*inside);}shape.closePath();
    const mesh=part(root,new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false,curveSegments:1}),tint,[center[0],y,center[1]]);mesh.rotation.x=-Math.PI/2;return mesh;
  }
  function batch(root,castShadow=true){
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),parts=[],sources=[];
    root.traverse(mesh=>{if(!mesh.isMesh||mesh.material!==matte)return;const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));g.deleteAttribute('uv');parts.push(g);sources.push(mesh);});
    if(!parts.length)return;const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)throw new Error('Hobbies courtyard batching failed.');
    for(const mesh of sources){mesh.removeFromParent();mesh.geometry.dispose();geometries.delete(mesh.geometry);}geometries.add(merged);const mesh=new THREE.Mesh(merged,matte);mesh.castShadow=castShadow;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  function target(name,index){const root=new THREE.Group();root.name=name;root.userData.personalChapter=index;scene.add(root);pickRoots.push(root);return root;}
  function envelope(root,min,max){pickEnvelopes.push({root,bounds:new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max))});}
  const architecture=new THREE.Group();architecture.name='Continuous hobby courtyard';scene.add(architecture);
  const canopy=new THREE.Group();canopy.name='Open pavilion canopy';scene.add(canopy);
  box(architecture,[50,.32,70],[0,-.22,12],p.stone);
  box(architecture,[35,.08,16],[0,-.02,-1],p.plaster);
  // Broad joints and low masonry, not a dense field of decorative props.
  for(let x=-17;x<18;x+=2)box(architecture,[.027,.015,16],[x,.031,-1],p.stone);
  for(let z=-9;z<=7;z+=2)box(architecture,[35,.015,.027],[0,.031,z],p.stone);
  box(architecture,[35,1.25,.65],[0,.60,-9.1],p.green);
  box(architecture,[35,.15,.85],[0,1.27,-9.1],p.edge);
  for(const x of [-17,17]){box(architecture,[.65,1.25,18],[x,.60,-.5],p.green);box(architecture,[.85,.15,18],[x,1.27,-.5],p.edge);}
  // An inhabited colonnade frames two spacious stories while leaving the foreground open.
  for(const x of [-15.5,0,15.5]){
    box(architecture,[.30,8.4,.34],[x,4.2,-7.9],p.wood);
    box(architecture,[.54,.22,.62],[x,.15,-7.9],p.edge);
    beam(architecture,[x,6.4,-7.9],[x+1.5,8.1,-7.9],.18,p.wood);
    beam(architecture,[x,8.37,-7.9],[x,8.37,-.2],.20,p.wood,.3);
  }
  box(architecture,[31.6,.26,.35],[-.15,8.23,-7.9],p.wood);
  // Continuous transverse rails support the slats at both ends and at midspan.
  for(const z of [-7.65,-4.0,-.35])box(architecture,[31.9,.18,.22],[0,8.38,z],p.wood);
  for(let i=0;i<11;i++)box(canopy,[1.5,.13,7.7],[-15+i*3,8.55,-4.0],i%2?p.plaster:p.cream);
  for(const x of [-16.6,16.6]){cylinder(architecture,.60,1.05,[x,.56,-6.2],p.cloth,16);for(const [dx,dy,dz]of [[-.3,.25,0],[.25,.5,.05],[0,1,-.1]])sphere(architecture,.68,[x+dx,1.5+dy,-6.2+dz],p.leaf);}

  // Preserve the approved subjects at their authored size, with a shared open aisle.
  const stageSpace=new THREE.Group();stageSpace.name='Singing courtyard bay';stageSpace.position.x=1.6;scene.add(stageSpace);
  const stageArchitecture=new THREE.Group();stageSpace.add(stageArchitecture);
  // Singing: a small real stage with a recessed curtain, mic and folded sound shell.
  const stage=target('Singing stage',0);stageSpace.add(stage);stage.position.set(-9,0,-3.6);
  const stageBase=cylinder(stageArchitecture,4.5,.42,[-9,.25,-4],p.wood,48);stageBase.scale.z=.72;
  const stageTop=cylinder(stageArchitecture,4.38,.06,[-9,.50,-4],p.edge,48);stageTop.scale.z=.72;
  for(let step=0;step<2;step++)box(stageArchitecture,[4.2+step*.8,.16,1.0],[-9,.17-step*.08,-.85+step*.55],p.wood);
  box(stageArchitecture,[8.4,5.7,.45],[-9,3.3,-7.25],p.dark);
  for(let i=0;i<9;i++){const panel=box(stageArchitecture,[.76,5.35,.20],[-12.45+i*.86,3.2,-6.91],i%2?p.wood:p.green);panel.rotation.y=i%2?.16:-.16;}
  // A designed title plaque names the owner's real performance context. It is
  // deliberately not represented as an event poster, photograph or recording.
  let stagePlaque=null;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const context=typeof canvas.getContext==='function'?canvas.getContext('2d'):null;
    if(context){
      function paintPlaque(){
        context.fillStyle=p.cream;context.fillRect(0,0,512,256);
        context.textAlign='center';context.textBaseline='middle';context.fillStyle=p.ink;
        context.font='400 47px "Mochiy Pop P One", sans-serif';context.fillText('JUNOON',256,80);
        context.fillStyle=p.wood;context.fillRect(164,133,184,2);
        context.font='500 24px "DM Sans", sans-serif';context.fillStyle=p.ink;context.fillText('A moment on stage',256,170);
        context.font='500 17px "DM Sans", sans-serif';context.fillStyle=p.wood;context.fillText('M.Des',256,216);
      }
      paintPlaque();
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;textures.add(texture);
      const material=new THREE.MeshBasicMaterial({map:texture,color:'#ffffff',toneMapped:false});materials.add(material);
      const geometry=new THREE.PlaneGeometry(4.8,2.4);geometries.add(geometry);
      box(stageArchitecture,[5.12,2.72,.12],[-9,4.5,-6.70],p.edge);
      stagePlaque=new THREE.Mesh(geometry,material);stagePlaque.name='Junoon title plaque';stagePlaque.position.set(-9,4.5,-6.625);stageSpace.add(stagePlaque);
      if(document.fonts?.load)Promise.all([document.fonts.load('400 47px "Mochiy Pop P One"'),document.fonts.load('500 24px "DM Sans"')]).then(()=>{if(disposed)return;paintPlaque();texture.needsUpdate=true;plaqueDirty=true;}).catch(()=>{});
    }
  }
  for(const x of [-13.2,-4.8]){box(stageArchitecture,[.32,6.2,.62],[x,3.4,-6.1],p.wood);box(stageArchitecture,[.52,.24,.82],[x,.56,-6.1],p.edge);}
  box(stageArchitecture,[8.8,.34,.85],[-9,6.5,-6.1],p.wood);
  const valance=box(stageArchitecture,[8.3,.55,.35],[-9,6.15,-5.9],p.cloth);
  const curtains=[];
  for(const side of [-1,1]){
    const curtain=new THREE.Group();curtain.position.set(side*1.9,.55,-2.48);stage.add(curtain);
    for(let i=0;i<7;i++){const fold=box(curtain,[.58,5.2,.15],[-1.6+i*.53,2.6,(i%2)*.14],i%2?p.cloth:p.red);fold.rotation.y=i%2?.16:-.16;}
    box(curtain,[3.8,.12,.25],[0,.1,.06],p.ochre);batch(curtain);curtains.push({curtain,side});
  }
  const micGroup=new THREE.Group();stage.add(micGroup);
  cylinder(micGroup,.46,.12,[0,.62,1.02],p.dark,20);cylinder(micGroup,.045,2.86,[0,2.10,1.02],p.dark,12);
  beam(micGroup,[0,3.55,1.02],[.50,3.75,.62],.055,p.ink);
  const microphone=part(micGroup,new THREE.CapsuleGeometry(.16,.38,4,12),p.dark,[.62,3.77,.53]);microphone.rotation.z=-1.1;
  for(const x of [-3.5,3.5]){const monitor=box(micGroup,[.85,.63,.76],[x,.85,.25],p.dark);monitor.rotation.x=-.18;box(micGroup,[.67,.40,.05],[x,.86,.65],p.green);}
  batch(micGroup);
  const lightMaterial=new THREE.MeshStandardMaterial({color:'#e4c685',emissive:'#e4b84f',emissiveIntensity:0,roughness:1});materials.add(lightMaterial);
  const lampGeometry=new THREE.CylinderGeometry(.20,.20,.07,12);geometries.add(lampGeometry);
  const footlights=new THREE.InstancedMesh(lampGeometry,lightMaterial,7);footlights.name='Stage footlights';const temp=new THREE.Object3D();
  for(let i=0;i<7;i++){temp.position.set(-11.8+i*.93,.57,-1.10);temp.rotation.set(0,0,0);temp.updateMatrix();footlights.setMatrixAt(i,temp.matrix);}stageSpace.add(footlights);
  const spot=new THREE.SpotLight('#ffcf89',0,18,.62,.8,1);spot.position.set(-8,7.3,-2.1);spot.target.position.set(-9,.6,-4.1);stageSpace.add(spot,spot.target);
  // Terraced seating establishes audience scale without crowding the controls.
  for(const [r,y]of [[4.9,.25],[5.6,.4]])ring(stageArchitecture,r,.46,y,[-9,-3.8],p.wood,.25,2.4,30);
  envelope(stage,[-13.5,.45,-6.7],[-4.5,6.35,-.7]);

  batch(stageArchitecture);
  const danceSpace=new THREE.Group();danceSpace.name='Garba courtyard bay';danceSpace.position.x=6.6;scene.add(danceSpace);
  const danceArchitecture=new THREE.Group();danceSpace.add(danceArchitecture);
  // Garba: a communal circle around an earthen lamp, not a dance-step tutorial.
  const dance=target('Garba circle',1);danceSpace.add(dance);dance.position.set(.8,0,-2.5);
  cylinder(danceArchitecture,4.20,.13,[.8,.12,-2.5],p.cream,64);
  for(const [r,w,tint]of [[4.12,.20,p.cloth],[3.70,.06,p.ochre],[2.70,.08,p.cloth],[1.33,.14,p.ochre]])ring(danceArchitecture,r,w,.20,[.8,-2.5],tint);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const inlay=box(danceArchitecture,[.34,.025,.34],[.8+Math.cos(a)*3.18,.23,-2.5-Math.sin(a)*3.18],i%2?p.ochre:p.cloth);inlay.rotation.y=-a+Math.PI/4;}
  const lampStand=cylinder(dance,.70,.20,[0,.32,0],p.wood,20);
  const potPoints=[[.20,0],[.40,.07],[.47,.27],[.41,.52],[.23,.63],[.28,.69]].map(([x,y])=>new THREE.Vector2(x,y));
  part(dance,new THREE.LatheGeometry(potPoints,20),p.cloth,[0,.42,0]);
  const potRim=part(dance,new THREE.TorusGeometry(.26,.045,6,20),p.ochre,[0,1.13,0]);potRim.rotation.x=Math.PI/2;
  batch(dance);
  const flameGeometry=new THREE.IcosahedronGeometry(.17,1);geometries.add(flameGeometry);
  const flameMaterial=new THREE.MeshStandardMaterial({color:'#e4c481',emissive:'#efb34a',emissiveIntensity:.12,roughness:.9});materials.add(flameMaterial);
  const flame=new THREE.Mesh(flameGeometry,flameMaterial);flame.name='Earthen lamp glow';flame.position.set(.8,1.26,-2.5);flame.scale.set(.62,1.3,.62);danceSpace.add(flame);
  const beadGeometry=new THREE.CylinderGeometry(.21,.21,.06,12);geometries.add(beadGeometry);
  const circleMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.84});materials.add(circleMaterial);
  const circleLights=new THREE.InstancedMesh(beadGeometry,circleMaterial,18);circleLights.name='Counter-clockwise Garba light sequence';danceSpace.add(circleLights);
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;temp.position.set(.8+Math.cos(a)*3.70,.25,-2.5-Math.sin(a)*3.70);temp.rotation.set(0,0,0);temp.updateMatrix();circleLights.setMatrixAt(i,temp.matrix);circleLights.setColorAt(i,color(p.stone));}
  // Suspended triangles and two practical lanterns give the circle a canopy.
  for(const x of [-3.15,4.75]){box(danceArchitecture,[.14,5.2,.14],[x,2.6,-6.1],p.wood);beam(danceArchitecture,[x,5.2,-6.1],[x,5.2,.6],.055,p.wood);}
  for(let i=0;i<9;i++){
    const x=-3.15+i*.985,y=5.2-Math.sin(i/8*Math.PI)*.45;
    if(i<8)beam(danceArchitecture,[x,y,-6.0],[x+.985,5.2-Math.sin((i+1)/8*Math.PI)*.45,-6.0],.026,p.ink);
    const triangle=new THREE.Shape();triangle.moveTo(-.26,0);triangle.lineTo(.26,0);triangle.lineTo(0,-.52);triangle.closePath();part(danceArchitecture,new THREE.ExtrudeGeometry(triangle,{depth:.018,bevelEnabled:false}),i%2?p.cloth:p.ochre,[x,y,-5.98]);
  }
  for(const x of [-2.9,4.5]){beam(danceArchitecture,[x,5.3,-5.9],[x,4.3,-5.9],.025,p.ink);const lantern=sphere(danceArchitecture,.35,[x,4.05,-5.9],p.ochre);lantern.scale.y=1.3;cylinder(danceArchitecture,.19,.10,[x,4.48,-5.9],p.wood,12);}
  envelope(dance,[-3.45,.08,-6.75],[5.05,1.6,1.8]);

  batch(danceArchitecture);
  pickEnvelopes[0].bounds.translate(new THREE.Vector3(1.6,0,0));
  pickEnvelopes[1].bounds.translate(new THREE.Vector3(6.6,0,0));
  batch(architecture);batch(canopy,false);

  const anchors=[{position:new THREE.Vector3(-5.45,2.3,-1.5),label:'Enter the listening room'},{position:new THREE.Vector3(9.7,.8,.6),label:'Enter the Garba courtyard'}];
  const entrance=new THREE.Group();entrance.name='Hobbies garden threshold';entrance.visible=false;scene.add(entrance);
  for(const x of [-5.1,5.1])box(entrance,[.5,9.2,.85],[x,4.6,0],p.wood);
  box(entrance,[10.7,.36,.95],[0,9,0],p.wood);box(entrance,[11,.15,1.2],[0,9.3,0],p.edge);box(entrance,[10.6,.10,1.9],[0,-.05,0],p.stone);batch(entrance);
  const leaves=[];
  for(const side of [-1,1]){const hinge=new THREE.Group();hinge.position.set(side*4.86,0,0);entrance.add(hinge);const center=-side*2.43;for(const x of [center-2.35,center+2.35])box(hinge,[.16,8.7,.24],[x,4.4,0],p.green);for(const y of [.1,4.1,8.7])box(hinge,[4.86,.18,.24],[center,y,0],p.green);for(let row=0;row<12;row++)box(hinge,[4.65,.42,.15],[center,.52+row*.68,0],p.edge);batch(hinge);leaves.push({hinge,side});}
  scene.add(new THREE.HemisphereLight('#fff4dc','#7c8c70',1.65));
  const sun=new THREE.DirectionalLight('#fff0cf',2.05);sun.position.set(-8,18,12);sun.target.position.set(0,1,-3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-23,right:23,top:18,bottom:-13,near:1,far:70});sun.shadow.bias=-.00025;sun.shadow.normalBias=.024;scene.add(sun,sun.target);
  const targetStates=[false,false],states=[0,0];let selected=0;
  const circleTint=new THREE.Color();
  const smooth=value=>value*value*(3-2*value);
  function applyInteraction(){
    const stageOpen=smooth(states[0]);
    for(const {curtain,side}of curtains){curtain.position.x=side*(1.9+stageOpen*1.65);curtain.scale.x=1-stageOpen*.58;}
    lightMaterial.emissiveIntensity=stageOpen*1.1;spot.intensity=stageOpen*20;
    flameMaterial.emissiveIntensity=.12+states[1]*.9;
    for(let i=0;i<18;i++){circleTint.copy(color(p.stone)).lerp(color(p.ochre),THREE.MathUtils.clamp(states[1]*18-i,0,1));circleLights.setColorAt(i,circleTint);}circleLights.instanceColor.needsUpdate=true;
    scene.updateMatrixWorld(true);
  }
  applyInteraction();
  return {scene,camera,pickRoots,pickEnvelopes,portrait:null,stagePlaque,anchors,entrance,
    focusBounds:HOBBIES_FOCUS_BOUNDS.map(bounds=>new THREE.Box3(new THREE.Vector3(...bounds.min),new THREE.Vector3(...bounds.max))),
    select(index){selected=THREE.MathUtils.clamp(Math.round(Number(index)||0),0,1);},
    interact(index=selected){index=THREE.MathUtils.clamp(Math.round(Number(index)||0),0,1);targetStates[index]=!targetStates[index];return targetStates[index];},
    interactionState(index=selected){return Boolean(targetStates[index]);},
    updateInteraction(dt,reduced=false){if(disposed)return false;let changed=plaqueDirty;plaqueDirty=false;dt=Math.min(.1,Math.max(0,Number(dt)||0));for(let i=0;i<2;i++){const goal=Number(targetStates[i]);if(states[i]===goal)continue;const duration=i===0?1.15:3.4;const step=dt/(goal?duration:.7);states[i]=reduced?goal:goal?Math.min(goal,states[i]+step):Math.max(goal,states[i]-step);changed=true;}if(changed)applyInteraction();return changed;},
    animateSound(){return false;},
    setEntrance(progress,pose){entrance.visible=progress<1&&Boolean(pose?.entrance);if(!entrance.visible)return;entrance.position.copy(pose.entrance.position);entrance.rotation.y=pose.entrance.rotationY;for(const {hinge,side}of leaves)hinge.rotation.y=side*pose.openness*1.54;entrance.updateMatrixWorld(true);},
    dispose(){if(disposed)return;disposed=true;for(const instance of [footlights,circleLights])instance.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(texture=>texture.dispose());sun.shadow.dispose();scene.clear();},
    get resourceCounts(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);}});return {meshes,triangles,ownedGeometries:geometries.size,materials:materials.size,ownedTextures:textures.size};}
  };
}
