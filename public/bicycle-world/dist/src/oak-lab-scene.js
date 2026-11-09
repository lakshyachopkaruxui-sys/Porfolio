import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeCharacterAsset} from './character-loader.js';
import {PATHS,WORLD_BOUNDS,RIVER,BRIDGES,LANDMARKS,STOPS,START} from './layout.js';

const url=path=>new URL('../'+path.replace(/^\.\//,''),import.meta.url).href;

/** Original cutaway scenery. The caller owns renderer, activity and animation. */
export function createOakLabScene({onChange=()=>{},onAssetState=()=>{}}={}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d9e5d8');
  const camera=new THREE.PerspectiveCamera(45,1,.1,65);
  const materials=new Map(),geometry=new Set(),textures=new Set(),batches=new Map();
  let disposed=false,oak=null,serial=0,assetState='idle',previewSerial=0,assetController=null,assetTimer=null;
  const previews=[],imageRequests=[],pickZones=[],displayBalls=[],buildPins=[];
  let displayTime=0,displayAccumulator=0,lastReduced=false,reaction=null,buildStage='all';
  const mat=(color)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.86}));return materials.get(color);};
  const p={cream:mat('#eee2c4'),wood:mat('#806247'),timber:mat('#a17b55'),mint:mat('#a7c7b7'),deepMint:mat('#628c7c'),ink:mat('#334f47'),paper:mat('#fff7df'),red:mat('#ab5144'),tile:mat('#f6f3df'),seam:mat('#d8d7c8'),green:mat('#73946b'),leaf:mat('#4b785b'),blue:mat('#88b8bc'),gold:mat('#d7b769')};
  function part(geo,material,x=0,y=0,z=0,rotation=null){
    const object=new THREE.Mesh(geo,material);object.position.set(x,y,z);if(rotation)object.rotation.set(...rotation);object.updateMatrix();geo.applyMatrix4(object.matrix);const list=batches.get(material)||[];list.push(geo);batches.set(material,list);return object;
  }
  const box=(w,h,d,x,y,z,m=p.cream,rotation)=>part(new THREE.BoxGeometry(w,h,d),m,x,y,z,rotation);
  const cylinder=(radius,h,x,y,z,m=p.paper)=>part(new THREE.CylinderGeometry(radius,radius,h,16),m,x,y,z);
  const sphere=(r,x,y,z,m)=>part(new THREE.SphereGeometry(r,16,10),m,x,y,z);
  // Small original display props share one matte material. Vertex colours keep
  // each complete rotating ball to one draw without downloading another asset.
  const ballMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.58});materials.set('display-balls',ballMaterial);
  function createDisplayBall(kind,x,index){
    const pieces=[],r=.30;
    function add(g,color,position=[0,0,0],rotation=[0,0,0]){
      const transform=new THREE.Object3D();transform.position.fromArray(position);transform.rotation.set(...rotation);transform.updateMatrix();
      const value=g.index?g.toNonIndexed():g.clone();g.dispose();value.applyMatrix4(transform.matrix);value.deleteAttribute('uv');
      const c=new THREE.Color(color),rgb=new Float32Array(value.attributes.position.count*3);
      for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}
      value.setAttribute('color',new THREE.BufferAttribute(rgb,3));pieces.push(value);
    }
    const top={classic:'#d84e42',ultra:'#253333',master:'#9655ba'}[kind];
    add(new THREE.SphereGeometry(r,20,10,0,Math.PI*2,0,Math.PI/2),top);
    add(new THREE.SphereGeometry(r,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),'#fff5de');
    add(new THREE.CylinderGeometry(r+.002,r+.002,.04,24),'#263633');
    if(kind==='ultra'){
      // The yellow H follows the upper shell instead of hovering as flat decals.
      for(const phi of [1.01,1.93])add(new THREE.SphereGeometry(r+.003,6,10,phi,.20,.13,1.35),'#f2ce49');
      add(new THREE.SphereGeometry(r+.004,12,3,1.01,1.12,.55,.20),'#f2ce49');
    }
    if(kind==='master'){
      for(const side of [-1,1]){
        const bump=new THREE.SphereGeometry(.075,12,8);bump.scale(1,.72,.48);
        add(bump,'#e477ac',[side*.185,.16,.187]);
      }
      const glyph=[[-.074,.105],[-.074,.217],[0,.151],[.074,.217],[.074,.105]];
      for(let i=1;i<glyph.length;i++){
        const a=new THREE.Vector3(...glyph[i-1],0),b=new THREE.Vector3(...glyph[i],0);
        a.z=Math.sqrt(r*r-a.x*a.x-a.y*a.y)+.008;b.z=Math.sqrt(r*r-b.x*b.x-b.y*b.y)+.008;
        const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(.010,.010,delta.length(),6);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
        add(g,'#fff9ee',a.add(b).multiplyScalar(.5).toArray());
      }
    }
    add(new THREE.CylinderGeometry(.088,.088,.032,16),'#263633',[0,0,.293],[Math.PI/2,0,0]);
    add(new THREE.CylinderGeometry(.057,.057,.037,16),'#fff9ee',[0,0,.304],[Math.PI/2,0,0]);
    const merged=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());geometry.add(merged);
    const ball=new THREE.Mesh(merged,ballMaterial);ball.name=`Counter ball: ${kind}`;ball.position.set(x,1.84,-.7);
    ball.userData.counterBall={kind,baseY:1.84,radius:r,pedestalTop:1.475};scene.add(ball);
    const axes=[new THREE.Vector3(0,1,0),new THREE.Vector3(.72,.9,.12).normalize(),new THREE.Vector3(.1,.8,.6).normalize()];
    displayBalls.push({mesh:ball,axis:axes[index],speed:[.29,-.23,.26][index],phase:index*2.1});
  }
  scene.add(new THREE.HemisphereLight('#fff4da','#8c9c7e',2.4));
  const sun=new THREE.DirectionalLight('#fff1cf',3.1);sun.position.set(-5,11,8);scene.add(sun);
  // Open cutaway: diagonal white floor, timber dado and cream upper walls.
  box(17,.20,11,0,-.1,0,p.wood);box(16.8,.025,10.8,0,.015,0,p.tile);
  for(let i=-12;i<=12;i++)for(const sign of [-1,1]){
    // Clip diagonal grid to the room's rectangular outline before batching.
    const x=i*.85;const start=new THREE.Vector3(x-8,0,sign*-8),end=new THREE.Vector3(x+8,0,sign*8);
    const dx=end.x-start.x,dz=end.z-start.z;let a=0,b=1;
    for(const [v,d,min,max]of [[start.x,dx,-8.35,8.35],[start.z,dz,-5.35,5.35]]){const lo=(min-v)/d,hi=(max-v)/d;a=Math.max(a,Math.min(lo,hi));b=Math.min(b,Math.max(lo,hi));}
    if(b>a){const mid=start.clone().addScaledVector(new THREE.Vector3(dx,0,dz),(a+b)/2);box(.018,.008,Math.hypot(dx,dz)*(b-a),mid.x,.035,mid.z,p.seam,[0,Math.atan2(dx,dz),0]);}
  }
  box(17,4.8,.22,0,2.4,-5.5,p.cream);box(17,1.18,.10,0,.59,-5.34,p.wood);box(17,.10,.18,0,1.22,-5.25,p.timber);
  box(.2,4.8,8.2,-8.5,2.4,-1.3,p.cream);box(.12,1.18,8.2,-8.35,.59,-1.3,p.wood);
  // Right opening frames the garden; wall stops below the roof sightline.
  box(.22,1.2,8.2,8.5,.6,-1.3,p.cream);
  for(const z of [-5.3,-1.9,1.6])box(.22,4.7,.22,8.5,2.35,z,p.timber);
  box(.3,.24,8.7,8.5,4.65,-1.25,p.red);
  for(const z of [-5.3,-1.6,2.1])box(17.4,.2,.22,0,4.8,z,p.red);
  box(17.7,.16,.18,0,4.96,-5.5,p.red);
  // Mint research cabinetry, a large chart and paired certificates.
  box(7.7,1.2,1.2,-3.5,.6,-4.5,p.mint);box(7.95,.13,1.45,-3.5,1.25,-4.5,p.paper);
  for(let i=0;i<6;i++){
    const x=-6.8+i*1.3;box(.045,1.0,.03,x,.65,-3.88,p.deepMint);box(.45,.05,.06,x+.55,1.05,-3.82,p.ink);
  }
  box(3.6,2.15,.10,-4.3,3.18,-5.29,p.wood);box(3.34,1.91,.025,-4.3,3.18,-5.22,p.paper);
  for(let i=0;i<4;i++)box(2.0-i*.24,.035,.012,-4.35,3.75-i*.28,-5.195,p.deepMint);
  for(const x of [-7.8,-6.7]){box(.82,1.05,.10,x,3.3,-5.28,p.timber);box(.65,.85,.02,x,3.3,-5.20,p.paper);cylinder(.12,.02,x,3.35,-5.17,p.gold);}
  // Central three-partner counter, with small round selection pedestals.
  box(5.65,1.20,1.55,-2.5,.6,-.95,p.mint);box(5.95,.16,1.85,-2.5,1.28,-.95,p.paper);
  box(5.3,.06,.03,-2.5,.86,.0,p.deepMint);
  for(const [index,x]of [-4.2,-2.5,-.8].entries()){
    cylinder(.43,.11,x,1.42,-.7,p.paper);
    createDisplayBall(['classic','ultra','master'][index],x,index);
  }
  // Collection wall: a bookcase, six storage drawers and three real previews.
  const collectionOffset=.40; // Clear the complete third preview, including its right edge.
  box(4.9,3.3,.65,5.35+collectionOffset,1.65,-4.95,p.wood);
  for(const y of [.15,1.14,2.14,3.23])box(4.7,.10,.8,5.35+collectionOffset,y,-4.86,p.timber);
  for(const x of [3.02,5.35,7.68])box(.10,3.25,.8,x+collectionOffset,1.62,-4.86,p.timber);
  for(let i=0;i<19;i++)box(.13+(i%3)*.045,.55+(i%4)*.10,.3,3.2+collectionOffset+i*.23,2.57,-4.65,[p.red,p.mint,p.blue,p.gold][i%4]);
  for(const x of [3.7,5.35,7.0]){box(1.35,.7,.45,x+collectionOffset,.64,-4.63,p.mint);box(.36,.05,.06,x+collectionOffset,.66,-4.36,p.ink);}
  for(const [i,x]of [-.2,1.2,2.6].entries()){
    box(1.1,1.56,.12,x,3.05,-5.28,p.wood);
    const material=new THREE.MeshBasicMaterial({color:'#dfdfbc',toneMapped:false});materials.set(`preview${i}`,material);
    const geo=new THREE.PlaneGeometry(.96,1.28);geometry.add(geo);const image=new THREE.Mesh(geo,material);image.position.set(x,3.05,-5.20);scene.add(image);previews.push(image);
  }
  // The making desk is a physical model of the actual garden. A uniform scale
  // preserves the original winding route, river, bridges and five stop locations.
  box(4.35,.14,3.8,4.6,1.4,.65,p.timber);
  for(const x of [2.65,6.55])for(const z of [-.95,2.25])box(.14,1.35,.14,x,.68,z,p.wood);
  box(3.15,.07,3.46,4.4,1.50,.6,p.ink);box(3.0,.025,3.31,4.4,1.548,.6,p.green);
  const miniScale=.021,miniCentre={x:4.4,z:.6},mapCentre={x:(WORLD_BOUNDS.minX+WORLD_BOUNDS.maxX)/2,z:(WORLD_BOUNDS.minZ+WORLD_BOUNDS.maxZ)/2};
  const miniPoint=(x,z,y=1.57)=>new THREE.Vector3(miniCentre.x+(x-mapCentre.x)*miniScale,y,miniCentre.z+(z-mapCentre.z)*miniScale);
  const riverPoint=miniPoint(0,(RIVER.minZ+RIVER.maxZ)/2);
  box((WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)*miniScale,.012,(RIVER.maxZ-RIVER.minZ)*miniScale,miniCentre.x,1.567,riverPoint.z,mat('#58a9b6'));
  function routeStrip(path,width,y){
    const points=path.points.filter((_,i)=>i%4===0),last=path.points.at(-1);
    const same=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<1e-6;
    if(path.closed&&same(points[0],points.at(-1)))points.pop();
    if(!path.closed&&!same(points.at(-1),last))points.push(last);
    const vertices=[],indices=[],n=points.length;
    for(let i=0;i<n;i++){
      const current=points[i],previous=points[path.closed?(i+n-1)%n:Math.max(0,i-1)],next=points[path.closed?(i+1)%n:Math.min(n-1,i+1)];
      const tangent=new THREE.Vector2(next.x-previous.x,next.z-previous.z).normalize(),point=miniPoint(current.x,current.z,y),half=width*miniScale/2;
      vertices.push(point.x-tangent.y*half,y,point.z+tangent.x*half,point.x+tangent.y*half,y,point.z-tangent.x*half);
      if(i<n-1||path.closed){const a=i*2,b=((i+1)%n)*2;indices.push(a,b,a+1,a+1,b,b+1);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const routeAccentParts=[];
  for(const path of PATHS){
    part(routeStrip(path,path.width+1.5,1.575),p.paper);
    part(routeStrip(path,path.width,1.578),mat('#d5b67d'));
    routeAccentParts.push(routeStrip(path,1.3,1.586));
  }
  for(const bridge of BRIDGES){
    const point=miniPoint(bridge.x,(bridge.minZ+bridge.maxZ)/2),depth=(bridge.maxZ-bridge.minZ)*miniScale,width=bridge.width*miniScale;
    box(width,.025,depth,point.x,1.594,point.z,p.timber);
    for(const side of [-1,1])box(.018,.055,depth,point.x+side*(width/2-.009),1.632,point.z,p.red);
  }
  const stageStops=[['about','about'],['work','projects'],['hobbies','work'],['oak','music'],['cloud','cloud']];
  for(const [id,stopId]of stageStops){
    const stop=STOPS[stopId],place=LANDMARKS[stopId],court=miniPoint(stop.x,stop.z),point=miniPoint(place.x,place.z);
    cylinder(stop.size*miniScale,.014,court.x,1.586,court.z,p.paper);
    const x=point.x,z=point.z;
    if(id==='about'){
      box(.22,.18,.21,x,1.68,z,p.cream);
      part(new THREE.ConeGeometry(.18,.12,4),p.red,x,1.83,z,[0,Math.PI/4,0]);
      box(.055,.10,.012,x,1.65,z+.113,p.mint);
    }else if(id==='work'){
      box(.30,.13,.19,x,1.65,z,p.cream);box(.14,.24,.20,x,1.705,z,p.paper);
      box(.32,.045,.21,x,1.74,z,mat('#9c6e88'));box(.16,.045,.22,x,1.845,z,mat('#9c6e88'));
      box(.055,.10,.012,x,1.64,z+.108,p.ink);
    }else if(id==='hobbies'){
      cylinder(.135,.17,x,1.675,z,p.cream);
      part(new THREE.SphereGeometry(.15,12,6,0,Math.PI*2,0,Math.PI/2),p.red,x,1.76,z);
      box(.07,.11,.012,x,1.65,z+.14,p.mint);
    }else if(id==='oak'){
      box(.23,.21,.22,x,1.69,z,p.cream);box(.15,.12,.20,x-.17,1.65,z,p.paper);
      part(new THREE.SphereGeometry(.15,12,6,0,Math.PI*2,0,Math.PI/2),p.red,x,1.80,z);
      box(.10,.13,.012,x,1.69,z+.116,p.mint);
    }else{
      box(.24,.17,.22,x,1.675,z,p.cream);cylinder(.095,.10,x-.055,1.81,z-.025,p.gold);
      part(new THREE.SphereGeometry(.102,12,6,0,Math.PI*2,0,Math.PI/2),p.gold,x-.055,1.86,z-.025);
      box(.16,.09,.012,x,1.72,z+.117,p.blue);
    }
    buildPins.push({id,stopId,position:point.clone(),source:{x:place.x,z:place.z},sphere:new THREE.Sphere(new THREE.Vector3(x,1.72,z),.24)});
  }
  // A few miniature groves supply scale without duplicating full garden assets.
  for(const [x,z]of [[-50,31],[-7,32],[45,30],[-59,-35],[18,-39],[-3,-71],[37,-93]]){
    const point=miniPoint(x,z);cylinder(.018,.10,point.x,1.63,point.z,p.wood);
    part(new THREE.ConeGeometry(.07,.18,7),p.leaf,point.x,1.77,point.z);
  }
  const start=miniPoint(START.x,START.z);cylinder(.042,.018,start.x,1.59,start.z,p.red);
  const ringGeometry=new THREE.RingGeometry(.19,.205,32);ringGeometry.rotateX(-Math.PI/2);geometry.add(ringGeometry);
  const accentMaterial=new THREE.MeshBasicMaterial({color:'#f8d37e',toneMapped:false});materials.set('miniature-accent',accentMaterial);
  const selectionRings=new THREE.InstancedMesh(ringGeometry,accentMaterial,5);selectionRings.name='Garden miniature selected places';scene.add(selectionRings);
  const routeAccentGeometry=mergeGeometries(routeAccentParts,false);routeAccentParts.forEach(g=>g.dispose());geometry.add(routeAccentGeometry);
  const routeAccent=new THREE.Mesh(routeAccentGeometry,accentMaterial);routeAccent.name='Garden miniature route emphasis';routeAccent.visible=false;scene.add(routeAccent);
  function setBuildStage(id='all'){
    if(disposed||!['all','route',...stageStops.map(([key])=>key)].includes(id))return false;
    buildStage=id;routeAccent.visible=id==='route';
    const selected=id==='all'?buildPins:buildPins.filter(pin=>pin.id===id),matrix=new THREE.Matrix4();selectionRings.count=selected.length;
    selected.forEach((pin,index)=>{matrix.makeTranslation(pin.position.x,1.59,pin.position.z);selectionRings.setMatrixAt(index,matrix);});
    selectionRings.instanceMatrix.needsUpdate=true;selectionRings.computeBoundingSphere();onChange();return buildStage;
  }
  setBuildStage();
  // Beyond the open side: a small, quiet green courtyard.
  box(7,.12,13,12,-.12,-2,p.green);
  for(const [x,z]of [[10,-5],[12,-1],[11,3]]){cylinder(.16,2.3,x,1.05,z,p.wood);part(new THREE.IcosahedronGeometry(1.3,1),p.leaf,x,3.0,z);}
  // The lead visually approved this static relaxed-pose derivative of the supplied model.
  const oakAnchor=new THREE.Group();oakAnchor.name='Professor Oak acknowledgement anchor';oakAnchor.position.set(-2.5,.04,-2.35);scene.add(oakAnchor);
  // A small placard signals the host while preserving a useful HTML fallback.
  box(1.0,.07,.45,-2.5,1.40,-1.1,p.mint);
  pickZones.push({id:'welcome',box:new THREE.Box3(new THREE.Vector3(-4.2,0,-3.1),new THREE.Vector3(-.6,3.7,-.5))},{id:'collection',box:new THREE.Box3(new THREE.Vector3(-.8,1.7,-5.1),new THREE.Vector3(7.9,4.1,-3.9))},{id:'making',box:new THREE.Box3(new THREE.Vector3(2.3,0,-1.3),new THREE.Vector3(7.1,2.9,2.6))});
  // Every static surface uses the same roughness. Bake its palette into vertices
  // so the richer miniature costs geometry, not a draw call for every colour.
  const staticParts=[];
  for(const [material,parts]of batches)for(const source of parts){
    const g=source.index?source.toNonIndexed():source.clone();source.dispose();g.deleteAttribute('uv');
    const rgb=new Float32Array(g.attributes.position.count*3),c=material.color;
    for(let i=0;i<rgb.length;i+=3){rgb[i]=c.r;rgb[i+1]=c.g;rgb[i+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(rgb,3));staticParts.push(g);
  }
  const staticGeometry=mergeGeometries(staticParts,false);staticParts.forEach(g=>g.dispose());geometry.add(staticGeometry);batches.clear();
  const staticMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86});materials.set('static-palette',staticMaterial);
  const scenery=new THREE.Mesh(staticGeometry,staticMaterial);scenery.name='Oak lab static scenery';scene.add(scenery);
  let currentZone='welcome',moving=null,cameraTarget=new THREE.Vector3();
  function frame(zone='welcome',aspect=1,compact=false,{animate=false,entry=false}={}){
    currentZone=['welcome','collection','making'].includes(zone)?zone:'welcome';
    if(currentZone!=='welcome'){reaction=null;oakAnchor.rotation.y=0;}
    const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:1,making=currentZone==='making';
    camera.aspect=safeAspect;camera.fov=compact?51:making?38:45;camera.updateProjectionMatrix();
    const target=making?new THREE.Vector3(4.4,1.68,.6):new THREE.Vector3(-2.5,1.75,-1.65);
    const direction=making?new THREE.Vector3(2.3,4.1,4.3).normalize():new THREE.Vector3(currentZone==='collection'?.18:.30,.20,1).normalize();
    const span=compact?(making?5.4:7.7):Math.max(making?4.6:6.6,(making?7.2:11.4)/safeAspect);
    const distance=span/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    // Keep the physical subject on the left, leaving the existing semantic
    // dialogue on the right. Narrow desktop windows pull back instead of crop.
    if(!compact)target.addScaledVector(new THREE.Vector3(direction.z,0,-direction.x).normalize(),span*safeAspect*(making?.18:.19));
    const position=target.clone().addScaledVector(direction,distance);
    if(entry){camera.position.copy(position).addScaledVector(position.clone().sub(target).normalize(),2.4);camera.position.y+=.2;cameraTarget.copy(target);camera.lookAt(cameraTarget);}
    if(animate){moving={from:camera.position.clone(),fromTarget:cameraTarget.clone(),position,target,elapsed:0,duration:entry?.9:.8};}
    else{moving=null;camera.position.copy(position);cameraTarget.copy(target);camera.lookAt(cameraTarget);}
    onChange();
  }
  function react({reduced=false}={}){
    if(disposed||currentZone!=='welcome')return false;
    reaction=reduced?null:{elapsed:0};oakAnchor.rotation.y=0;onChange();return !reduced;
  }
  function update(dt=0,reduced=false,{active=true}={}){
    if(disposed)return false;
    const step=Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.1):0;let changed=false;
    if(moving){
      const t=moving,p=reduced?1:Math.min(1,(t.elapsed+=step)/t.duration),ease=p*p*(3-2*p);
      camera.position.lerpVectors(t.from,t.position,ease);cameraTarget.lerpVectors(t.fromTarget,t.target,ease);camera.lookAt(cameraTarget);if(p===1)moving=null;changed=true;
    }
    if(reduced&&!lastReduced){
      displayTime=displayAccumulator=0;reaction=null;oakAnchor.rotation.y=0;
      displayBalls.forEach(({mesh})=>{mesh.quaternion.identity();mesh.position.y=mesh.userData.counterBall.baseY;});changed=true;
    }
    lastReduced=reduced;
    if(active&&!reduced&&step>0){
      if(currentZone==='welcome'||currentZone==='collection'){
        displayTime+=step;displayAccumulator+=step;
        if(displayAccumulator>=1/30-1e-9){
          displayAccumulator=Math.max(0,displayAccumulator-Math.floor((displayAccumulator+1e-9)*30)/30);
          displayBalls.forEach(({mesh,axis,speed,phase})=>{
            mesh.quaternion.setFromAxisAngle(axis,displayTime*speed);
            mesh.position.y=mesh.userData.counterBall.baseY+Math.sin(displayTime*1.6+phase)*.018;
          });changed=true;
        }
      }
      if(reaction){
        reaction.elapsed+=step;const progress=Math.min(1,reaction.elapsed/.6);
        // The supplied figure has no usable arm rig. A small, grounded whole-
        // figure turn acknowledges a tap without distorting its authored pose.
        oakAnchor.rotation.y=Math.sin(progress*Math.PI)*.065;
        if(progress===1){reaction=null;oakAnchor.rotation.y=0;}changed=true;
      }
    }
    return changed;
  }
  function loadOak(){
    if(disposed||assetState==='loading'||assetState==='ready')return;const token=++serial;assetState='loading';onAssetState(assetState);
    assetController=new AbortController();assetTimer=setTimeout(()=>assetController?.abort(),20000);
    fetch(url('assets/oak-lab/professor-oak-relaxed.glb'),{signal:assetController.signal}).then(response=>{if(!response.ok)throw new Error('Oak model request failed.');return response.arrayBuffer();}).then(bytes=>{if(disposed||token!==serial)throw new DOMException('Oak loading cancelled','AbortError');return new GLTFLoader().parseAsync(bytes,url('assets/oak-lab/'));}).then(gltf=>{
      if(disposed||token!==serial){disposeCharacterAsset(gltf.scene);return;}
      oak=gltf.scene;const bounds=new THREE.Box3().setFromObject(oak,true),size=bounds.getSize(new THREE.Vector3());
      if(!Number.isFinite(size.y)||size.y<=0){disposeCharacterAsset(oak);oak=null;throw new Error('Oak model has invalid bounds.');}
      const scale=3.2/size.y;oak.scale.multiplyScalar(scale);oak.position.set(-(bounds.min.x+size.x/2)*scale,-bounds.min.y*scale,-(bounds.min.z+size.z/2)*scale);oak.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;}});oakAnchor.add(oak);assetState='ready';onAssetState(assetState);onChange();
    }).catch(()=>{if(disposed||token!==serial)return;assetState='error';onAssetState(assetState);onChange();}).finally(()=>{if(token!==serial)return;clearTimeout(assetTimer);assetTimer=null;assetController=null;});
  }
  function setPreviews(entries=[]){
    const token=++previewSerial;
    entries.slice(0,3).forEach((entry,index)=>{const image=new Image();image.decoding='async';imageRequests.push(image);image.onload=()=>{if(disposed||token!==previewSerial)return;const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;textures.add(texture);const mesh=previews[index];mesh.material.map=texture;mesh.material.color.set('#ffffff');mesh.material.needsUpdate=true;onChange();};image.onerror=()=>{};image.src=url(entry.thumbnail);});
  }
  frame();
  return {scene,camera,frame,update,loadOak,setPreviews,react,setBuildStage,
    pickBuildStop(ray){let nearest=null;for(const pin of buildPins){const point=ray.intersectSphere(pin.sphere,new THREE.Vector3());if(point){const distance=ray.origin.distanceToSquared(point);if(!nearest||distance<nearest.distance)nearest={id:pin.id,distance};}}return nearest?.id||null;},
    getMiniatureFraming(){return {scale:miniScale,centre:{...miniCentre},worldCentre:{...mapCentre},stage:buildStage,stops:buildPins.map(pin=>({id:pin.id,stopId:pin.stopId,source:{...pin.source},position:pin.position.toArray()}))};},
    beginExit(){const position=camera.position.clone().addScaledVector(camera.position.clone().sub(cameraTarget).normalize(),2);moving={from:camera.position.clone(),fromTarget:cameraTarget.clone(),position,target:cameraTarget.clone(),elapsed:0,duration:.45};onChange();},
    headProjection(){camera.updateMatrixWorld(true);return new THREE.Vector3(-2.5,3.2,-2.35).project(camera);},
    pick(ray){let nearest=null;for(const entry of pickZones){const point=ray.intersectBox(entry.box,new THREE.Vector3());if(point){const distance=ray.origin.distanceToSquared(point);if(!nearest||distance<nearest.distance)nearest={id:entry.id,distance};}}return nearest?.id||null;},
    dispose(){if(disposed)return;disposed=true;serial++;previewSerial++;clearTimeout(assetTimer);assetController?.abort();assetController=null;imageRequests.forEach(image=>{image.onload=image.onerror=null;image.src='';});disposeCharacterAsset(oak);oak=null;selectionRings.dispose();geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());scene.clear();geometry.clear();materials.clear();textures.clear();},
    get stats(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);}});return {meshes,triangles,textures:textures.size,assetState,zone:currentZone,moving:Boolean(moving),reacting:Boolean(reaction),buildStage};}
  };
}
