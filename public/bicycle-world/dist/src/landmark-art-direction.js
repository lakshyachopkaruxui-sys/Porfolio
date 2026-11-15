import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LANDMARKS,STOPS,START,PATHS,WORLD_BOUNDS,RIVER,BRIDGES,STRUCTURE_COLLIDERS,STOP_SIGNS,ARRIVAL_SIGN} from './layout.js';
import {HOP_SITES} from './river-hop/hop-sites.js';

// Low garden-scale punctuation, not new destinations or collision obstacles.
// Full canopy clearance is intentionally unnecessary below one metre, but all
// travel surfaces, approach positions, signs and structural bases stay clear.
export function artDirectionClearance(x,z,radius,{naturePlacements=[],accentPlacements=[],colliders=[]}={}) {
  const b=WORLD_BOUNDS;
  if(x-radius<b.minX+.6||x+radius>b.maxX-.6||z-radius<b.minZ+.6||z+radius>b.maxZ-.6)return false;
  if(z+radius>RIVER.minZ-2&&z-radius<RIVER.maxZ+2)return false;
  if(BRIDGES.some(p=>Math.abs(x-p.x)<p.width/2+radius+2&&z>p.minZ-radius-3&&z<p.maxZ+radius+3))return false;
  for(const site of HOP_SITES){const dx=x-site.x,dz=z-site.z,c=Math.cos(site.yaw),s=Math.sin(site.yaw);if(Math.abs(c*dx-s*dz)<radius+6&&Math.abs(s*dx+c*dz)<radius+27)return false;}
  if([START,...Object.values(STOPS).map(p=>p.arrival)].some(p=>Math.hypot(x-p.x,z-p.z)<radius+2.6))return false;
  if([...Object.values(STOP_SIGNS),ARRIVAL_SIGN].some(p=>Math.hypot(x-p.x,z-p.z)<radius+1.8))return false;
  if([...STRUCTURE_COLLIDERS,...colliders].some(p=>Math.hypot(x-p.x,z-p.z)<radius+p.radius+.45))return false;
  if([...naturePlacements,...accentPlacements].some(p=>Math.hypot(x-p.x,z-p.z)<radius+(p.kind==='tree'?Math.max(.35,p.height*.065):p.radius)+.3))return false;
  for(const path of PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<path.width/2+radius+.8)return false;
  }
  return true;
}

export function planLandmarkArtDirection(options={}) {
  const placements=[];
  const anchors=[{id:'arrival',x:START.x,z:START.z,radius:3.2,yaw:START.heading},...Object.entries(LANDMARKS).map(([id,p])=>({...p,id,yaw:Math.atan2(STOPS[id].arrival.x-p.x,STOPS[id].arrival.z-p.z)}))];
  for(const anchor of anchors)for(let slot=0;slot<3;slot++){
    for(let attempt=0;attempt<96;attempt++){
      const angle=anchor.yaw+Math.PI+(slot-1)*.95+attempt*.39;
      const distance=anchor.radius+2.8+(attempt%4)*.8;
      const x=anchor.x+Math.sin(angle)*distance,z=anchor.z+Math.cos(angle)*distance,radius=1.22;
      if(!artDirectionClearance(x,z,radius,options)||placements.some(p=>Math.hypot(x-p.x,z-p.z)<radius+p.radius+.5))continue;
      const stories={arrival:'wheel-and-route',about:'conversation-seats',projects:'sketchbook-and-prototype',work:'voice-and-garba',music:'catch-collection',cloud:'phone-and-frame'};
      placements.push({id:anchor.id,slot,x,z,radius,yaw:angle,height:.82,story:stories[anchor.id],role:slot===0?'story':slot===1?'companion':'planting'});break;
    }
  }
  return placements;
}

export function createLandmarkArtDirection(options={}) {
  const placements=planLandmarkArtDirection(options),group=new THREE.Group();group.name='Personal garden field stations';
  if(!placements.length)return {group,placements,bounds:new THREE.Box3(new THREE.Vector3(),new THREE.Vector3()),metrics:{drawCalls:0,vertices:0,triangles:0,maxHeight:0},dispose(){group.removeFromParent();group.clear();}};
  const pieces=[],matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),color=new THREE.Color();
  const palette={soil:'#b7a17d',stone:'#d7cfb9',base:'#3d5748',leaf:'#698367',light:'#91a17a',stem:'#7a674b',timber:'#a67c55',paper:'#eee6cf',ink:'#34463d',petal:'#d6b36d',clay:'#b87657'};
  function add(geometry,tint,position,scale=[1,1,1],rotation=[0,0,0]) {
    const prepared=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();prepared.deleteAttribute('uv');
    quaternion.setFromEuler(new THREE.Euler(...rotation));matrix.compose(new THREE.Vector3(...position),quaternion,new THREE.Vector3(...scale));prepared.applyMatrix4(matrix);
    color.set(tint);const colors=new Float32Array(prepared.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}prepared.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(prepared);
  }
  for(const p of placements){
    const point=(dx,y,dz)=>[p.x+Math.cos(p.yaw)*dx+Math.sin(p.yaw)*dz,y,p.z-Math.sin(p.yaw)*dx+Math.cos(p.yaw)*dz];
    const box=(x,y,z,w,h,d,tint=palette.timber,turn=0)=>add(new THREE.BoxGeometry(w,h,d),tint,point(x,y,z),[1,1,1],[0,p.yaw+turn,0]);
    const disk=(x,y,z,r,h,tint)=>add(new THREE.CylinderGeometry(r,r,h,12),tint,point(x,y,z));
    const leaf=(x,z,size=.34)=>{add(new THREE.IcosahedronGeometry(1,0),palette.base,point(x,.15,z),[size+.04,.13,size*.82]);add(new THREE.IcosahedronGeometry(1,1),palette.leaf,point(x,.29,z),[size,.23,size*.78],[0,p.yaw,0]);};
    const rod=(a,b,r,tint)=>{const from=new THREE.Vector3(...point(...a)),to=new THREE.Vector3(...point(...b)),delta=to.clone().sub(from);const g=new THREE.CylinderGeometry(r,r,delta.length(),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));add(g,tint,from.add(to).multiplyScalar(.5).toArray());};
    // One broad story object, one companion and one planted edge: a field
    // station rather than the same flower bed repeated around every building.
    if(p.role==='planting'){
      add(new THREE.CylinderGeometry(1,1,.045,12),palette.soil,point(0,.02,0),[1.05,1,.65],[0,p.yaw,0]);
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7;add(new THREE.IcosahedronGeometry(1,0),palette.stone,point(Math.cos(a)*1.02,.09,Math.sin(a)*.62),[.16,.09,.13]);}
      leaf(-.43,0,.4);leaf(.18,-.08,.45);leaf(.57,.12,.29);
      continue;
    }
    box(0,.06,0,1.72,.12,.96,palette.stone);
    box(0,.13,0,1.56,.035,.82,palette.timber);
    if(p.role==='companion'){
      // A shared low timber perch makes each stop part of the same garden.
      // The meaningful companion objects are drawn from the existing stories.
      box(0,.36,0,1.42,.10,.43);box(-.5,.24,0,.13,.23,.30);box(.5,.24,0,.13,.23,.30);
      if(p.id==='projects'){box(-.18,.45,0,.7,.07,.45,palette.paper,-.15);box(.31,.53,.06,.27,.25,.25,palette.clay);}
      else if(p.id==='cloud'){box(0,.49,0,.62,.16,.39,palette.paper);box(0,.58,0,.46,.025,.28,palette.ink);}
      else if(p.id==='music'){for(let i=0;i<3;i++)disk((i-1)*.38,.49,0,.14,.18,i===1?palette.clay:palette.paper);}
      else {leaf(-.62,-.31,.19);leaf(.62,-.31,.19);}
      continue;
    }
    if(p.id==='arrival'){
      // The bicycle wheel connects arrival to the actual ride, not a new logo.
      add(new THREE.TorusGeometry(.29,.045,6,16),palette.ink,point(-.31,.48,0),[1,1,1],[0,p.yaw,0]);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([-.31,.48,0],[-.31+Math.cos(a)*.29,.48+Math.sin(a)*.29,0],.012,palette.stone);}
      disk(.42,.25,0,.31,.15,palette.paper);box(.42,.34,0,.43,.025,.045,palette.ink,-.45);disk(.42,.36,0,.045,.04,palette.clay);
    }else if(p.id==='about'){
      // Two seats facing a shared surface express the existing conversation stop.
      for(const x of [-.52,.52]){disk(x,.30,0,.23,.22,palette.timber);disk(x,.43,0,.27,.07,palette.paper);}
      disk(0,.53,-.04,.24,.07,palette.paper);rod([0,.15,-.04],[0,.51,-.04],.065,palette.timber);
    }else if(p.id==='projects'){
      box(-.17,.27,0,1.03,.20,.66,palette.timber);box(-.17,.39,0,1.13,.055,.76,palette.paper);
      box(-.42,.425,.02,.42,.014,.60,palette.stone,-.08);box(.09,.425,.02,.42,.014,.60,palette.paper,.08);box(-.17,.44,0,.035,.015,.64,palette.ink);
      for(let i=0;i<3;i++)box(.55,.22+i*.13,-.16+i*.08,.30,.13,.29,i===1?palette.clay:palette.light,i*.18);
    }else if(p.id==='work'){
      // String lights come from the supplied Garba evening photograph. Do not
      // substitute Dandiya sticks for an activity the source does not document.
      for(const x of [-.79,.14])box(x,.43,-.10,.05,.65,.05,palette.timber);
      rod([-.79,.72,-.10],[.14,.72,-.10],.018,palette.ink);
      for(const x of [-.64,-.32,0]){rod([x,.72,-.10],[x,.60,-.10],.012,palette.timber);add(new THREE.IcosahedronGeometry(.075,0),palette.petal,point(x,.57,-.10));}
      disk(.53,.21,0,.20,.08,palette.ink);rod([.53,.24,0],[.53,.65,0],.035,palette.timber);add(new THREE.IcosahedronGeometry(.14,1),palette.ink,point(.53,.68,0),[.8,1,.8]);
    }else if(p.id==='music'){
      // A small collection display evokes the documented Pokemon GO catches.
      box(0,.27,0,1.25,.20,.57,palette.timber);
      for(let i=0;i<3;i++){const x=(i-1)*.42,r=i===1?.22:.17;add(new THREE.SphereGeometry(r,12,6,0,Math.PI*2,0,Math.PI/2),palette.clay,point(x,.40,0));add(new THREE.SphereGeometry(r,12,6,0,Math.PI*2,Math.PI/2,Math.PI/2),palette.paper,point(x,.40,0));disk(x,.40,0,r+.012,.035,palette.ink);}
    }else if(p.id==='cloud'){
      // A phone camera matches the actual mobile photographs, rather than
      // implying that Lakshya used professional camera equipment.
      for(const x of [-.58,-.20])rod([x,.16,.18],[-.39,.49,0],.028,palette.timber);rod([-.39,.16,-.22],[-.39,.49,0],.028,palette.timber);
      box(-.39,.60,0,.24,.36,.08,palette.ink);box(-.39,.60,.046,.18,.27,.012,palette.light);add(new THREE.CylinderGeometry(.03,.03,.02,8),palette.stone,point(-.46,.735,-.05),[1,1,1],[Math.PI/2,0,0]);
      for(const x of [.22,.76])box(x,.46,-.08,.055,.58,.06,palette.paper);box(.49,.73,-.08,.59,.055,.06,palette.paper);box(.49,.19,-.08,.59,.055,.06,palette.paper);
    }
  }
  const geometry=pieces.length?mergeGeometries(pieces,false):new THREE.BufferGeometry();pieces.forEach(p=>p.dispose());
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Merged personal field stations and planting';mesh.receiveShadow=true;mesh.castShadow=false;group.add(mesh);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const bounds=geometry.boundingBox?.clone()||new THREE.Box3();let disposed=false;
  return {group,placements,bounds,metrics:{drawCalls:1,vertices:geometry.attributes.position?.count||0,triangles:(geometry.attributes.position?.count||0)/3,maxHeight:.82},dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();material.dispose();group.clear();}};
}
