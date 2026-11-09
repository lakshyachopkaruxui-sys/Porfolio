import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ABOUT_FOCUS_BOUNDS} from './about-room-camera.js';

/** A personal garden studio: authored geometry, one shared palette, no new assets. */
export function createAboutRoomScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b1bfae');
  scene.fog=new THREE.Fog('#b1bfae',62,145);
  const camera=new THREE.PerspectiveCamera(43,1,.1,160);
  const geometries=new Set(),materials=new Set(),textures=new Set(),pickRoots=[],pickEnvelopes=[];
  const palette={wall:'#54715d',recess:'#243e34',wood:'#8e633f',edge:'#c2a072',stone:'#c5bca5',paper:'#f2ecda',cream:'#ddd1b7',ink:'#334e40',clay:'#b88766',cloth:'#7d8c69',blue:'#a8c6c6',leaf:'#628657',leafLight:'#879f66',brass:'#c6aa64',cloud:'#eef0dc'};
  const matte=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.87});materials.add(matte);
  const colors=new Map();
  const color=value=>{if(!colors.has(value))colors.set(value,new THREE.Color(value));return colors.get(value);};
  function mesh(root,geometry,tint,position=[0,0,0]){
    geometries.add(geometry);const count=geometry.attributes.position.count,data=new Float32Array(count*3),c=color(tint);
    for(let i=0;i<count;i++){data[i*3]=c.r;data[i*3+1]=c.g;data[i*3+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(data,3));
    const value=new THREE.Mesh(geometry,matte);value.position.fromArray(position);value.castShadow=true;value.receiveShadow=true;root.add(value);return value;
  }
  const box=(root,size,at,tint)=>mesh(root,new THREE.BoxGeometry(...size),tint,at);
  const cylinder=(root,radius,height,at,tint,segments=16)=>mesh(root,new THREE.CylinderGeometry(radius,radius,height,segments),tint,at);
  const sphere=(root,size,at,tint)=>mesh(root,new THREE.IcosahedronGeometry(size,1),tint,at);
  function beam(root,a,b,width,tint,depth=width){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p);
    const value=box(root,[width,delta.length(),depth],p.add(q).multiplyScalar(.5).toArray(),tint);
    value.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return value;
  }
  function batch(root,{castShadow=true}={}){
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),parts=[],sources=[];
    root.traverse(item=>{if(!item.isMesh||item.material!==matte)return;let geometry=item.geometry.index?item.geometry.toNonIndexed():item.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,item.matrixWorld));geometry.deleteAttribute('uv');parts.push(geometry);sources.push(item);});
    if(!parts.length)return;
    const merged=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());if(!merged)throw new Error('About studio could not be batched.');
    for(const item of sources){item.removeFromParent();item.geometry.dispose();geometries.delete(item.geometry);}
    geometries.add(merged);const result=new THREE.Mesh(merged,matte);result.castShadow=castShadow;result.receiveShadow=true;root.add(result);return result;
  }
  const architecture=new THREE.Group();architecture.name='Continuous garden studio';scene.add(architecture);
  const daylightCanopy=new THREE.Group();daylightCanopy.name='Light-filtering studio canopy';scene.add(daylightCanopy);
  box(architecture,[44,.35,70],[0,-.2,12],palette.stone);
  box(architecture,[30,.035,16],[0,.0,1.0],palette.cream);
  for(let x=-15;x<=15;x+=1.5)box(architecture,[.025,.012,16],[x,.023,1],palette.stone);
  for(let z=-7;z<=9;z+=2)box(architecture,[30,.012,.025],[0,.025,z],palette.stone);
  // A substantial rear wall and warm plaster return keep the space continuous.
  box(architecture,[17.5,15,.5],[-4.3,7.5,-6.2],palette.wall);
  box(architecture,[10.5,15,.5],[16.8,7.5,-6.2],palette.wall);
  box(architecture,[8.8,2.15,.5],[7.0,1.075,-6.2],palette.wall);
  box(architecture,[8.8,7,.5],[7.0,11.5,-6.2],palette.wall);
  box(architecture,[.5,15,24],[-15,7.5,5.5],palette.cream);
  box(architecture,[.5,15,24],[22,7.5,5.5],palette.cream);
  // The canopy admits diffuse daylight. It must not shadow the entire room
  // into a flat dark box; furniture and structural ribs still cast contact shadows.
  box(daylightCanopy,[37,.4,28],[3.5,14.5,6.3],palette.cream);
  for(const x of [-14,-10.5,-2.65,3.0,11.0,16,21]){
    box(architecture,[.3,13.6,.52],[x,6.8,-5.8],palette.wood);
    box(architecture,[.5,.25,.7],[x,.15,-5.72],palette.edge);
    beam(architecture,[x,11.1,-5.6],[x,13.8,5.7],.22,palette.wood,.38);
    beam(architecture,[x,13.8,5.7],[x,11.3,15.5],.22,palette.wood,.38);
  }
  for(const z of [-5.6,5.7,15.5])box(architecture,[36,.22,.32],[3.3,z===5.7?13.8:11.2,z],palette.wood);
  for(let i=0;i<9;i++){const x=-13+i*3.85;box(architecture,[3.2,1.25,.09],[x,10.2,-5.9],palette.blue);box(architecture,[3.5,.12,.22],[x,9.5,-5.75],palette.edge);}
  // Foreground posts make cross-room travel legible, without fencing in the subject.
  for(const x of [-13.5,15.5]){
    box(architecture,[.34,11.5,.38],[x,5.75,7.8],palette.wood);
    beam(architecture,[x,9.4,7.8],[x+(x<0?1.7:-1.7),11.3,7.8],.22,palette.wood);
  }

  // Conversation corner: a real portrait, chairs facing one another, room to sit.
  const people=new THREE.Group();people.userData.personalChapter=0;people.name='Conversation corner';scene.add(people);pickRoots.push(people);
  box(architecture,[5.6,8.0,.35],[-6.3,4,-3.9],palette.recess);
  box(architecture,[5.88,.18,.6],[-6.3,8.0,-3.7],palette.edge);
  box(architecture,[4.20,5.42,.16],[-6.3,4.65,-3.65],palette.wood);
  box(architecture,[3.99,5.21,.06],[-6.3,4.65,-3.53],palette.paper);
  const portraitMaterial=new THREE.MeshBasicMaterial({color:palette.paper,toneMapped:false});materials.add(portraitMaterial);
  const portraitGeometry=new THREE.PlaneGeometry(3.78,5.04);geometries.add(portraitGeometry);
  const portrait=new THREE.Mesh(portraitGeometry,portraitMaterial);portrait.position.set(-6.3,4.65,-3.485);portrait.name='Lakshya supplied portrait';scene.add(portrait);
  const contact=(parent,x,z,w,d)=>{const value=cylinder(parent,1,.012,[x,.045,z],palette.stone,24);value.scale.set(w,1,d);value.castShadow=false;};
  function chair(root,at,yaw){
    const group=new THREE.Group();group.position.fromArray(at);group.rotation.y=yaw;root.add(group);
    for(const x of [-.64,.64])for(const z of [-.55,.55])beam(group,[x*1.12,.08,z*1.12],[x,1.35,z],.12,palette.wood);
    box(group,[1.65,.15,1.55],[0,1.38,0],palette.wood);
    box(group,[1.51,.21,1.4],[0,1.54,.03],palette.cloth);
    for(const x of [-.69,.69])box(group,[.12,1.38,.15],[x,2.0,-.62],palette.wood);
    const back=box(group,[1.5,.85,.17],[0,2.40,-.60],palette.cloth);back.rotation.x=-.10;
    for(const x of [-.84,.84]){beam(group,[x,1.4,-.5],[x,1.95,-.5],.10,palette.wood);box(group,[.14,.11,1.22],[x,1.96,.02],palette.edge);}
    return group;
  }
  const guestChair=chair(people,[-4.4,0,1.8],-.7);batch(guestChair);
  const hostChair=chair(architecture,[-8.3,0,.35],.75);
  contact(architecture,-8.3,.35,1.05,.9);contact(architecture,-4.4,1.8,1.1,1.0);
  const table=new THREE.Group();table.position.set(-6.25,0,1.05);people.add(table);
  cylinder(table,1.02,.16,[0,1.32,0],palette.edge,32);
  cylinder(table,.18,1.2,[0,.65,0],palette.wood);
  cylinder(table,.67,.10,[0,.10,0],palette.wood,24);
  for(const [x,z]of [[-.42,.12],[.38,-.1]]){
    cylinder(table,.15,.25,[x,1.55,z],palette.cream,16);
    const rim=mesh(table,new THREE.TorusGeometry(.12,.027,4,14),palette.wood,[x,1.69,z]);rim.rotation.x=Math.PI/2;
    const handle=mesh(table,new THREE.TorusGeometry(.10,.025,4,12),palette.cream,[x+.15,1.57,z]);handle.rotation.y=Math.PI/2;
  }
  batch(table);

  // A working desk, angled toward the daylight instead of a museum display bay.
  const design=new THREE.Group();design.userData.personalChapter=1;design.name='Working desk';scene.add(design);pickRoots.push(design);
  box(architecture,[6.8,.22,3.35],[.0,2.05,.10],palette.edge);
  for(const x of [-2.7,2.7]){
    box(architecture,[.20,1.96,2.7],[x,1.0,.05],palette.wood);
    box(architecture,[.36,.12,2.95],[x,.08,.05],palette.wood);
  }
  box(architecture,[5.2,.18,.14],[0,.70,-1.1],palette.wood);
  box(architecture,[2.4,1.1,.95],[-1.9,1.38,-.85],palette.wood);
  for(const y of [1.15,1.65]){box(architecture,[2.25,.43,.055],[-1.9,y,-.345],palette.wall);box(architecture,[.38,.055,.10],[-1.9,y+.06,-.29],palette.brass);}
  const bookRoot=new THREE.Group();bookRoot.position.set(-.10,2.22,.62);bookRoot.rotation.y=-.12;design.add(bookRoot);
  box(bookRoot,[1.58,.12,1.9],[.78,.02,0],palette.ink);
  box(bookRoot,[1.47,.12,1.75],[.77,.13,0],palette.paper);
  for(const z of [-.64,-.39,-.14,.11,.36])box(bookRoot,[.9,.009,.026],[.79,.197,z],palette.clay);
  const notebookCover=new THREE.Group();notebookCover.position.set(0,.23,0);bookRoot.add(notebookCover);
  box(notebookCover,[1.58,.07,1.9],[.78,0,0],palette.ink);
  box(notebookCover,[1.46,.018,1.75],[.77,-.048,0],palette.paper);
  // Small ink rules are explicitly a notebook illustration, not fabricated research.
  for(const z of [-.6,-.3,0,.3])box(notebookCover,[.93,.012,.027],[.75,-.065,z],palette.clay);
  box(notebookCover,[.38,.02,.34],[.73,.048,-.12],palette.brass);
  batch(notebookCover);
  const bookStatic=new THREE.Group();bookRoot.add(bookStatic);
  for(const item of [...bookRoot.children])if(item.isMesh)bookStatic.add(item);
  batch(bookStatic);
  // Actual owner-described methods, printed on the object rather than a fake
  // research artifact. The page uses the portfolio's already loaded body font.
  let notebookPage=null,pageDirty=false;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=480;
    const context=typeof canvas.getContext==='function'?canvas.getContext('2d'):null;
    if(context){
      function paintPage(){
      context.fillStyle=palette.paper;context.fillRect(0,0,384,480);
      context.fillStyle=palette.ink;context.textBaseline='top';
      context.font='600 18px "DM Sans", sans-serif';context.fillText('MY APPROACH',34,38);
      context.fillStyle=palette.clay;context.fillRect(34,77,316,2);
      context.fillStyle=palette.ink;context.font='500 28px "DM Sans", sans-serif';
      context.fillText('Listen to people',34,123);
      context.fillText('Choose methods',34,226);
      context.fillText('Revisit decisions',34,329);
      context.font='400 16px "DM Sans", sans-serif';context.fillStyle=palette.wood;
      context.fillText('Methods follow the situation.',34,423);
      }
      paintPage();
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;textures.add(texture);
      const pageMaterial=new THREE.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.94});materials.add(pageMaterial);
      const pageGeometry=new THREE.PlaneGeometry(1.43,1.70);geometries.add(pageGeometry);
      notebookPage=new THREE.Mesh(pageGeometry,pageMaterial);notebookPage.name='Owner-described design approach';notebookPage.rotation.x=-Math.PI/2;notebookPage.position.set(.77,.213,0);notebookPage.receiveShadow=true;bookRoot.add(notebookPage);
      // Direct links may open the room before its body font has finished loading.
      // Refresh this one texture once ready, without a permanent animation loop.
      document.fonts?.load('600 24px "DM Sans"').then(()=>{if(disposed)return;paintPage();texture.needsUpdate=true;pageDirty=true;}).catch(()=>{});
    }
  }
  // Desk lamp, pencil cup, and three reusable blank method cards.
  cylinder(architecture,.33,.10,[2.55,2.23,-.80],palette.ink,20);
  beam(architecture,[2.55,2.25,-.80],[2.55,3.55,-.80],.09,palette.ink);
  beam(architecture,[2.55,3.55,-.80],[1.98,3.65,-.25],.09,palette.ink);
  const shade=mesh(architecture,new THREE.ConeGeometry(.48,.40,18,1,true),palette.ink,[1.98,3.55,-.25]);shade.rotation.x=.15;
  cylinder(architecture,.19,.48,[-2.8,2.45,.95],palette.clay,16);
  for(let i=0;i<4;i++){const pencil=box(architecture,[.038,.72,.038],[-2.92+i*.08,2.93,.95],i%2?palette.ink:palette.brass);pencil.rotation.z=(i-1.5)*.07;}
  for(let i=0;i<3;i++){const card=box(architecture,[.68,.025,.9],[-1.90+i*.13,2.19,-.52+i*.20],i===1?palette.cream:palette.paper);card.rotation.y=-.17+i*.18;}

  // Window-side hobby shelf: layered outdoor geometry is an illustration, not
  // one of Lakshya's photographs. No transparent panes or particle system.
  const away=new THREE.Group();away.userData.personalChapter=2;away.name='Window and hobby shelf';scene.add(away);pickRoots.push(away);
  const windowRoot=new THREE.Group();windowRoot.position.set(7,0,-5.75);scene.add(windowRoot);
  box(architecture,[8.2,6.3,.22],[7,5.1,-6.55],palette.blue);
  for(const [x,z,s]of [[4.0,-6.42,1.3],[5.5,-6.4,1],[9.1,-6.38,1.5],[10,-6.39,.9]]){
    const hill=sphere(architecture,s,[x,2.2,z],palette.leaf);hill.scale.set(1.8,1,.10);
  }
  for(const [x,y,s]of [[5.0,6.6,.52],[8.6,7.0,.58],[9.7,5.6,.42]]){
    for(const [dx,dy,r]of [[-.65,0,.75],[0,.2,1],[.65,0,.65]]){const cloud=sphere(architecture,s*r,[x+dx*s,y+dy*s,-6.37],palette.cloud);cloud.scale.z=.16;}
  }
  for(const x of [3.15,10.85])box(architecture,[.28,6.6,.55],[x,5.15,-5.8],palette.wood);
  for(const y of [1.8,8.42])box(architecture,[8.1,.28,.75],[7,y,-5.65],palette.edge);
  box(architecture,[8.6,.24,1.18],[7,1.68,-5.25],palette.edge);
  const shutters=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.set(7+side*3.63,1.96,-5.52);away.add(hinge);
    const center=-side*1.81;
    for(const x of [center-1.76,center+1.76])box(hinge,[.12,6.21,.18],[x,3.1,0],palette.wall);
    for(const y of [.08,3.07,6.14])box(hinge,[3.62,.15,.20],[center,y,0],palette.wall);
    for(let row=0;row<14;row++){const slat=box(hinge,[3.50,.27,.12],[center,.34+row*.43,0],palette.cloth);slat.rotation.x=-.28;}
    box(hinge,[.08,.48,.16],[-side*3.35,2.75,.18],palette.brass);
    batch(hinge);shutters.push({hinge,side});
  }
  box(architecture,[5.5,.18,1.65],[7.3,1.62,-.45],palette.edge);
  for(const x of [5.0,9.6])box(architecture,[.15,1.55,1.3],[x,.79,-.45],palette.wood);
  // Camera, handheld microphone and a small game-shaped keepsake stay secondary.
  box(architecture,[1.35,.84,.65],[5.7,2.14,-.32],palette.ink);
  const lens=cylinder(architecture,.33,.33,[5.7,2.14,.15],palette.wood,24);lens.rotation.x=Math.PI/2;
  const glass=cylinder(architecture,.24,.025,[5.7,2.14,.33],palette.blue,24);glass.rotation.x=Math.PI/2;
  box(architecture,[.38,.17,.36],[5.37,2.64,-.28],palette.edge);
  const mic=mesh(architecture,new THREE.CapsuleGeometry(.15,.57,4,12),palette.ink,[7.13,1.90,-.23]);mic.rotation.z=-1.05;
  cylinder(architecture,.42,.06,[7.12,1.75,-.3],palette.stone,20);
  const keepsake=box(architecture,[.57,.88,.14],[8.67,2.14,-.35],palette.clay);keepsake.rotation.x=-.18;
  box(architecture,[.38,.43,.035],[8.67,2.24,-.24],palette.blue);
  cylinder(architecture,.07,.026,[8.67,1.94,-.20],palette.ink,12).rotation.x=Math.PI/2;
  for(let i=0;i<3;i++)box(architecture,[.15,.72+i*.08,.62],[9.3+i*.18,2.09+i*.04,-.5],i%2?palette.wall:palette.clay);

  // Built-in shelves, a rug, and pendant shades provide inhabited scale.
  box(architecture,[3.1,.18,.82],[-11.6,2.1,-5.4],palette.wood);
  box(architecture,[3.1,.18,.82],[-11.6,4.0,-5.4],palette.wood);
  for(let i=0;i<8;i++)box(architecture,[.22,.72+(i%3)*.12,.42],[-12.65+i*.29,2.56+(i%3)*.06,-5.32],i%3===0?palette.clay:i%3===1?palette.cream:palette.ink);
  cylinder(architecture,.36,.58,[-11.6,4.38,-5.4],palette.clay,18);
  for(const [dx,dy]of [[-.2,.35],[.25,.55],[0,.8]])sphere(architecture,.35,[-11.6+dx,4.9+dy,-5.4],palette.leaf);
  const rug=box(architecture,[6.2,.026,4.8],[-6.2,.05,1.5],palette.cloth);rug.rotation.y=.12;
  for(const [x,z]of [[-6.5,1.2],[.5,-.2],[8,-.1]]){
    beam(architecture,[x,11.3,z],[x,8.85,z],.025,palette.ink);
    const lamp=mesh(architecture,new THREE.ConeGeometry(.7,.45,20,1,true),palette.edge,[x,8.7,z]);
    cylinder(architecture,.55,.05,[x,8.46,z],palette.paper,20);
  }
  batch(architecture);batch(daylightCanopy,{castShadow:false});

  // Pick roots contain actual moving elements; generous boxes stay invisible.
  const targets=[{root:people,min:[-9.1,.0,-3.4],max:[-2.9,7.3,3.5]},{root:design,min:[-3.4,1.7,-1.4],max:[3.4,4.1,2.1]},{root:away,min:[3.2,1.6,-6],max:[10.9,8.4,-3.8]}];
  targets.forEach(({root,min,max})=>pickEnvelopes.push({root,bounds:new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max))}));
  const anchors=[{position:new THREE.Vector3(-4.15,1.25,3.45),label:'Pull up a chair'},{position:new THREE.Vector3(2.3,2.55,1.4),label:'Open my notebook'},{position:new THREE.Vector3(4.15,3.0,-4.7),label:'Open the window'}];

  const entrance=new THREE.Group();entrance.name='About entry threshold';entrance.visible=false;scene.add(entrance);
  for(const x of [-5.1,5.1])box(entrance,[.50,9.2,.90],[x,4.6,0],palette.wood);
  box(entrance,[10.75,.40,1.0],[0,9.0,0],palette.wood);
  box(entrance,[11,.19,1.15],[0,9.28,0],palette.edge);
  box(entrance,[10.7,.10,2.5],[0,-.03,.2],palette.wood);batch(entrance);
  const leaves=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.set(side*4.86,0,0);entrance.add(hinge);
    const center=-side*2.43;
    for(const x of [center-2.36,center+2.36])box(hinge,[.15,8.75,.24],[x,4.4,0],palette.wall);
    for(const y of [.10,4.2,8.70])box(hinge,[4.86,.18,.24],[center,y,0],palette.wall);
    for(let i=0;i<18;i++)box(hinge,[4.65,.32,.13],[center,.43+i*.47,-.02],palette.cloth);
    box(hinge,[.12,.74,.24],[-side*4.4,4.0,.18],palette.brass);batch(hinge);leaves.push({hinge,side});
  }
  scene.add(new THREE.HemisphereLight('#fff4dc','#66755f',1.30));
  const sun=new THREE.DirectionalLight('#fff1d4',2.2);sun.position.set(-9,16,15);sun.target.position.set(0,2,-1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-21,right:21,top:17,bottom:-15,near:1,far:65});sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  const daylight=new THREE.DirectionalLight('#c6dedd',.85);daylight.position.set(8,7,-4);daylight.target.position.set(0,1,4);scene.add(daylight,daylight.target);
  const targetStates=[false,false,false],states=[0,0,0];let selected=0,disposed=false;
  function applyInteraction(){
    guestChair.position.set(-4.4+.30*states[0],0,1.8+1.03*states[0]);guestChair.rotation.y=-.7+.15*states[0];
    notebookCover.rotation.z=states[1]*2.68;
    for(const {hinge,side}of shutters)hinge.rotation.y=side*states[2]*1.78;
    scene.updateMatrixWorld(true);
  }
  applyInteraction();
  return {scene,camera,portrait,notebookPage,pickRoots,pickEnvelopes,anchors,entrance,
    focusBounds:ABOUT_FOCUS_BOUNDS.map(bounds=>new THREE.Box3(new THREE.Vector3(...bounds.min),new THREE.Vector3(...bounds.max))),
    select(index){selected=THREE.MathUtils.clamp(Math.round(index),0,2);},
    interact(index=selected){index=THREE.MathUtils.clamp(Math.round(index),0,2);targetStates[index]=!targetStates[index];return targetStates[index];},
    interactionState(index=selected){return Boolean(targetStates[index]);},
    updateInteraction(dt,reduced=false){let changed=pageDirty;pageDirty=false;const blend=1-Math.exp(-Math.min(.1,Math.max(0,Number(dt)||0))*7.5);for(let i=0;i<states.length;i++){const target=targetStates[i]?1:0;if(states[i]===target)continue;states[i]=reduced?target:THREE.MathUtils.lerp(states[i],target,blend);if(Math.abs(states[i]-target)<.001)states[i]=target;changed=true;}if(changed)applyInteraction();return changed;},
    animateSound(){return false;},
    setEntrance(progress,pose){entrance.visible=progress<1&&Boolean(pose?.entrance);if(!entrance.visible)return;entrance.position.copy(pose.entrance.position);entrance.rotation.y=pose.entrance.rotationY;for(const {hinge,side}of leaves)hinge.rotation.y=side*pose.openness*1.54;entrance.updateMatrixWorld(true);},
    dispose(){if(disposed)return;disposed=true;geometries.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());textures.forEach(item=>item.dispose());sun.shadow.dispose();scene.clear();},
    get resourceCounts(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});return {meshes,triangles,ownedGeometries:geometries.size,materials:materials.size,ownedTextures:textures.size};}
  };
}
