import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {getAboutJournalPose} from './about-journal-camera.js';

/** A quiet working studio. The notebook is the single content-bearing interaction. */
export function createAboutJournalScene({onChange=()=>{}}={}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c9c4ae');
  scene.fog=new THREE.Fog('#c9c4ae',45,100);
  const camera=new THREE.PerspectiveCamera(42,1,.1,100);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const colors=new Map(),matte=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.82});materials.add(matte);
  const p={floor:'#c8bda1',wall:'#667463',recess:'#334b40',paper:'#eee3c8',paperEdge:'#c5b99d',wood:'#956b48',edge:'#ba9467',darkWood:'#634b36',green:'#344f43',trim:'#b9b59a',cloth:'#79826b',brass:'#bf9a50',ink:'#293c33',clay:'#b47f5b',leaf:'#5d7452',shadow:'#aa9a7a'};
  let disposed=false,openProgress=0,assetState='idle',serial=0,request=null,requestTimer=null,portraitBitmap=null;
  const color=value=>{if(!colors.has(value))colors.set(value,new THREE.Color(value));return colors.get(value);};
  function part(parent,geometry,tint,at=[0,0,0]){
    const c=color(tint),data=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<data.length;i+=3){data[i]=c.r;data[i+1]=c.g;data[i+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(data,3));geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,matte);mesh.position.fromArray(at);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const box=(parent,size,at,tint)=>part(parent,new THREE.BoxGeometry(...size),tint,at);
  const cylinder=(parent,radius,height,at,tint,segments=16)=>part(parent,new THREE.CylinderGeometry(radius,radius,height,segments),tint,at);
  function beam(parent,a,b,r,tint,segments=8){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=cylinder(parent,r,delta.length(),start.add(end).multiplyScalar(.5).toArray(),tint,segments);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
  function roundedSlab(parent,width,depth,height,radius,at,tint){
    const w=width/2,d=depth/2,r=Math.min(radius,w,d),shape=new THREE.Shape();
    shape.moveTo(-w+r,-d);shape.lineTo(w-r,-d);shape.quadraticCurveTo(w,-d,w,-d+r);shape.lineTo(w,d-r);shape.quadraticCurveTo(w,d,w-r,d);shape.lineTo(-w+r,d);shape.quadraticCurveTo(-w,d,-w,d-r);shape.lineTo(-w,-d+r);shape.quadraticCurveTo(-w,-d,-w+r,-d);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,curveSegments:4,steps:1});
    geometry.rotateX(-Math.PI/2);geometry.translate(0,-height/2,0);return part(parent,geometry,tint,at);
  }
  function batch(root){
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),parts=[],sources=[];
    root.traverse(mesh=>{if(!mesh.isMesh||mesh.material!==matte)return;const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));geometry.deleteAttribute('uv');parts.push(geometry);sources.push(mesh);});
    if(!parts.length)return;
    const merged=mergeGeometries(parts,false);parts.forEach(geometry=>geometry.dispose());
    if(!merged)throw new Error('The personal studio could not be batched.');
    for(const mesh of sources){mesh.removeFromParent();mesh.geometry.dispose();geometries.delete(mesh.geometry);}
    geometries.add(merged);const mesh=new THREE.Mesh(merged,matte);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }

  const architecture=new THREE.Group();architecture.name='Warm timber personal studio';scene.add(architecture);
  roundedSlab(architecture,25,24,.3,.7,[-.8,-.22,2.3],p.floor);
  box(architecture,[21,9.5,.32],[-1.4,4.65,-5.1],p.wall);
  box(architecture,[.32,9.5,13],[-11.75,4.65,1.25],p.paper);
  box(architecture,[21,.18,.45],[-1.4,.12,-4.86],p.darkWood);
  for(const x of [-11.4,-8.7,-1.3,3.6,8.8])box(architecture,[.13,9.2,.18],[x,4.65,-4.86],p.darkWood);
  for(const x of [-10.8,-6.5,-2.2,2.1,6.4])box(architecture,[.02,.008,16],[x,.015,2.6],p.shadow);
  for(const z of [-3.5,.5,4.5,8.5])box(architecture,[22,.008,.02],[-1,.015,z],p.shadow);
  // A broad, recessed portrait has a single unmistakable place in the room.
  box(architecture,[4.75,5.7,.25],[-5.6,5.35,-4.78],p.recess);
  for(const x of [-7.67,-3.53])box(architecture,[.12,4.15,.24],[x,5.65,-4.55],p.edge);
  for(const y of [3.58,7.72])box(architecture,[4.26,.12,.24],[-5.6,y,-4.55],p.edge);
  box(architecture,[4.05,4.05,.055],[-5.6,5.65,-4.48],p.paper);
  box(architecture,[4.9,.18,.6],[-5.6,8.24,-4.6],p.edge);
  // The shelf supports a small number of recognizable studio objects.
  for(const y of [3.05,5.15])box(architecture,[3.4,.14,1.0],[5.8,y,-4.45],p.edge);
  for(const [i,x]of [4.56,4.89,5.22,5.55].entries()){
    const volume=box(architecture,[.22,1.04+i%2*.28,.58],[x,3.65,-4.47],[p.paper,p.green,p.clay,p.trim][i]);volume.rotation.z=(i===3?-.12:0);
    box(architecture,[.17,.035,.012],[x,3.82,-4.17],p.brass);
  }
  const planter=cylinder(architecture,.34,.48,[6.65,5.44,-4.42],p.clay,14);
  const foliage=new THREE.IcosahedronGeometry(.38,1);part(architecture,foliage,p.leaf,[6.65,5.98,-4.42]);
  batch(architecture);

  const furniture=new THREE.Group();furniture.name='Writing desk and grounded furniture';scene.add(furniture);
  roundedSlab(furniture,11.3,7.6,.25,.22,[0,2.75,.55],p.edge);
  roundedSlab(furniture,11.1,7.4,.055,.20,[0,2.905,.55],p.wood);
  for(const x of [-4.65,4.65])for(const z of [-2.3,3.4])beam(furniture,[x*1.03,.08,z*1.06],[x,2.65,z],.11,p.darkWood,8);
  for(const x of [-4.65,4.65])box(furniture,[.18,.18,5.6],[x,1.05,.55],p.darkWood);
  box(furniture,[9.3,.15,.16],[0,1.05,-2.3],p.darkWood);
  box(furniture,[3.7,.63,1.45],[-2.9,2.28,-2.18],p.darkWood);
  box(furniture,[3.46,.49,.055],[-2.9,2.29,-1.43],p.wood);
  box(furniture,[.52,.055,.12],[-2.9,2.29,-1.36],p.brass);
  // A static chair establishes human scale; it is neither a target nor a toy.
  const seat=new THREE.Group();seat.position.set(-7.1,0,2.15);seat.rotation.y=.34;furniture.add(seat);
  for(const x of [-.68,.68])for(const z of [-.6,.6])beam(seat,[x*1.13,.04,z*1.15],[x,1.43,z],.055,p.darkWood);
  roundedSlab(seat,1.8,1.75,.17,.18,[0,1.46,0],p.edge);
  roundedSlab(seat,1.67,1.60,.16,.18,[0,1.62,.015],p.cloth);
  for(const x of [-.7,.7])beam(seat,[x,1.48,-.64],[x,2.86,-.79],.06,p.darkWood);
  const back=box(seat,[1.6,.94,.14],[0,2.40,-.74],p.cloth);back.rotation.x=-.12;
  // An articulated task lamp lights the work surface without a new dynamic light.
  cylinder(furniture,.50,.09,[4.55,3.0,-2.45],p.green,24);
  cylinder(furniture,.15,.06,[4.55,3.075,-2.45],p.brass,16);
  beam(furniture,[4.55,3.1,-2.45],[4.72,4.35,-2.7],.065,p.green,10);
  beam(furniture,[4.72,4.35,-2.7],[3.82,5.25,-2.8],.065,p.green,10);
  for(const point of [[4.72,4.35,-2.7],[3.82,5.25,-2.8]]){const joint=cylinder(furniture,.14,.13,point,p.brass,12);joint.rotation.x=Math.PI/2;}
  const shade=part(furniture,new THREE.CylinderGeometry(.26,.64,.62,20,1,true),p.green,[3.61,5.18,-2.58]);shade.rotation.x=-.34;shade.rotation.z=-.28;
  const underside=cylinder(furniture,.57,.04,[3.52,4.89,-2.48],p.paper,20);underside.rotation.x=-.34;underside.rotation.z=-.28;
  // Only useful, restrained desk details: a pen cup, a slim tray and page marker.
  cylinder(furniture,.22,.45,[-4.78,3.16,-1.38],p.clay,14);
  for(const [i,x]of [-4.88,-4.75,-4.64].entries())beam(furniture,[x,3.13,-1.4],[x+(i-1)*.055,3.82,-1.44],.019,[p.ink,p.brass,p.paper][i],6);
  roundedSlab(furniture,1.08,1.46,.055,.06,[-4.95,2.99,1.55],p.paperEdge);
  roundedSlab(furniture,.98,1.36,.035,.04,[-4.95,3.035,1.55],p.paper);
  for(const x of [-4.7,4.7])for(const z of [-2.43,3.60]){const foot=cylinder(furniture,.22,.008,[x,.012,z],p.shadow,16);foot.castShadow=false;}
  batch(furniture);

  const bookAnchor=new THREE.Group();bookAnchor.position.set(0,3.005,.4);bookAnchor.name='Notebook gutter';scene.add(bookAnchor);
  const bookTarget=new THREE.Group();bookTarget.name='Open Lakshya’s notebook';bookTarget.userData.aboutJournal='book';bookAnchor.add(bookTarget);
  const pages=new THREE.Group();bookTarget.add(pages);
  roundedSlab(pages,4.3,4.5,.10,.09,[2.12,.03,0],p.green);
  roundedSlab(pages,4.15,4.32,.18,.06,[2.12,.17,0],p.paper);
  for(const y of [.095,.132,.169,.206]){
    box(pages,[4.07,.009,.015],[2.12,y,2.166],p.paperEdge);
    box(pages,[.014,.009,4.23],[4.202,y,0],p.paperEdge);
  }
  // Soft inner-page rules are visual texture only; readable content is HTML.
  for(const z of [-1.64,-1.23,-.82,-.41,0,.41,.82,1.23,1.64])box(pages,[3.25,.003,.007],[2.13,.263,z],p.paperEdge);
  box(pages,[.014,.004,3.85],[.62,.264,.05],p.clay);
  roundedSlab(pages,.19,4.40,.29,.07,[.015,.16,0],p.green);
  box(pages,[.12,.005,.52],[3.5,.266,1.90],p.clay);
  batch(pages);

  const cover=new THREE.Group();cover.name='Hinged cloth cover';cover.position.set(0,.30,0);bookTarget.add(cover);
  roundedSlab(cover,4.3,4.5,.10,.09,[2.12,0,0],p.green);
  roundedSlab(cover,4.12,4.32,.025,.06,[2.12,-.065,0],p.paper);
  for(const z of [-1.65,-1.24,-.83,-.42,-.01,.40,.81,1.22,1.63])box(cover,[3.25,.004,.007],[2.13,-.083,z],p.paperEdge);
  box(cover,[.014,.004,3.90],[.62,-.083,.02],p.clay);
  batch(cover);

  let coverLabel=null;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
    const ctx=typeof canvas.getContext==='function'?canvas.getContext('2d'):null;
    if(ctx){
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;textures.add(map);
      const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});materials.add(material);
      const geometry=new THREE.PlaneGeometry(3.3,1.65);geometries.add(geometry);
      coverLabel=new THREE.Mesh(geometry,material);coverLabel.rotation.x=-Math.PI/2;coverLabel.position.set(2.12,.080,-.13);cover.add(coverLabel);
      const draw=()=>{if(disposed)return;ctx.clearRect(0,0,768,384);ctx.fillStyle='#e7d4a3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 25px "DM Sans", sans-serif';ctx.fillText('LAKSHYA CHOPKAR',384,96);ctx.font='400 53px "Mochiy Pop P One", sans-serif';ctx.fillText('Field notes',384,201);ctx.fillRect(314,286,140,3);map.needsUpdate=true;onChange();};
      draw();document.fonts?.ready?.then(draw).catch(()=>{});
    }
  }

  const portraitTarget=new THREE.Group();portraitTarget.name='View Lakshya’s portrait';portraitTarget.userData.aboutJournal='portrait';scene.add(portraitTarget);
  const portraitMaterial=new THREE.MeshBasicMaterial({color:p.paper,toneMapped:false});materials.add(portraitMaterial);
  const portraitGeometry=new THREE.PlaneGeometry(1,1);geometries.add(portraitGeometry);
  const portrait=new THREE.Mesh(portraitGeometry,portraitMaterial);portrait.name='Lakshya’s actual portrait';portrait.scale.set(3.82,3.82,1);portrait.position.set(-5.6,5.65,-4.435);portraitTarget.add(portrait);

  scene.add(new THREE.HemisphereLight('#fff5dc','#8a9a7e',2.15));
  const sunlight=new THREE.DirectionalLight('#ffe0ad',2.35);sunlight.position.set(-5,13,9);sunlight.target.position.set(0,2,0);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);Object.assign(sunlight.shadow.camera,{left:-13,right:13,top:12,bottom:-10,near:1,far:35});sunlight.shadow.bias=-.0003;sunlight.shadow.normalBias=.025;scene.add(sunlight,sunlight.target);
  const raycaster=new THREE.Raycaster();
  function setOpen(value){if(disposed)return false;const next=THREE.MathUtils.clamp(Number(value)||0,0,1);if(next===openProgress)return false;openProgress=next;cover.rotation.z=Math.PI*next;sunlight.shadow.needsUpdate=true;scene.updateMatrixWorld(true);onChange();return true;}
  function frame({width=1280,height=720,progress=openProgress}={}){const pose=getAboutJournalPose({width,height,progress});if(disposed)return pose;camera.position.copy(pose.position);camera.fov=pose.fov;camera.aspect=pose.aspect;camera.lookAt(pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);return pose;}
  function pick(ray){if(disposed||!ray)return null;raycaster.ray.copy(ray);const hit=raycaster.intersectObjects([bookTarget,portraitTarget],true)[0];if(!hit)return null;let object=hit.object;while(object&&!object.userData.aboutJournal)object=object.parent;return object?.userData.aboutJournal||null;}
  function retirePortrait(){const map=portraitMaterial.map;if(map){textures.delete(map);map.dispose();portraitMaterial.map=null;}portraitBitmap?.close?.();portraitBitmap=null;}
  async function loadPortrait(photo){
    if(disposed||!photo?.src)return false;const token=++serial;request?.abort();clearTimeout(requestTimer);const controller=new AbortController();request=controller;assetState='loading';onChange();
    requestTimer=setTimeout(()=>controller.abort(),20000);
    let bitmap=null;
    try{
      const url=new URL('../'+photo.src.replace(/^\.\//,''),import.meta.url);
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Portrait request failed.');
      const blob=await response.blob();
      if(disposed||token!==serial)return false;
      if(typeof createImageBitmap!=='function')throw new Error('Portrait decoding is unavailable.');
      bitmap=await createImageBitmap(blob,{imageOrientation:'flipY',premultiplyAlpha:'none'});
      if(disposed||token!==serial){bitmap.close?.();return false;}
      const texture=new THREE.Texture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
      retirePortrait();textures.add(texture);portraitBitmap=bitmap;bitmap=null;portraitMaterial.map=texture;portraitMaterial.color.set('#ffffff');portraitMaterial.needsUpdate=true;
      const ratio=(Number(photo.width)||portraitBitmap.width)/(Number(photo.height)||portraitBitmap.height);
      const width=Math.min(3.82,3.82*ratio),height=width/ratio;portrait.scale.set(width,height,1);
      assetState='ready';onChange();return true;
    }catch{
      bitmap?.close?.();if(disposed||token!==serial)return false;assetState='error';onChange();return false;
    }finally{if(token===serial){clearTimeout(requestTimer);requestTimer=null;request=null;}}
  }
  function dispose(){if(disposed)return;disposed=true;serial++;request?.abort();request=null;clearTimeout(requestTimer);requestTimer=null;retirePortrait();for(const texture of textures)texture.dispose();textures.clear();for(const geometry of geometries)geometry.dispose();geometries.clear();for(const material of materials)material.dispose();materials.clear();sunlight.shadow.map?.dispose();sunlight.shadow.mapPass?.dispose();scene.clear();}
  frame();scene.updateMatrixWorld(true);
  return {scene,camera,bookTarget,portraitTarget,bookAnchor,portrait,setOpen,frame,pick,loadPortrait,update(){return false;},dispose,
    get stats(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});return {meshes,triangles,geometries:geometries.size,materials:materials.size,textures:textures.size,assetState,openProgress,disposed};}
  };
}
