import {decorateModeSelectors} from './mode-selector.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {POKEMON_STORIES} from './pokemon-room-data.js';
import {loadPokemonAsset} from './pokemon-world.js';
import {createPikachuGait} from './pikachu-gait.js';
import {disposeCharacterAsset} from './character-loader.js';
import {LOOP_POINTS,STOPS,BRIDGES} from './layout.js';
import {POKEMON_COLLECTION} from './pokemon-collection-data.js';
import {getHorizontalNavigation,getBoundaryNavigation,isKeyboardShortcutBlocked,consumeNavigationKey} from './keyboard-navigation.js';

/** An imagined setting for a real memory. The parent owns the renderer/loop;
 * this room owns its scenery and one optional, independently loaded companion. */
export function createPokemonRoom({renderer,container,isReduced,onClose=()=>{},onPortfolio=()=>{},loadAsset=loadPokemonAsset,poseFactory=createPikachuGait,collection=POKEMON_COLLECTION,returnLabel="Back to Hobbies"}={}){
  if(!renderer?.domElement||!container)throw new Error('Pokemon room requires the existing renderer and a container.');
  const v=(x,y,z)=>new THREE.Vector3(x,y,z),stories=POKEMON_STORIES;
  const poses={
    threshold:{position:v(7.4,4.1,20),target:v(-.4,2.3,1.2),fov:53},
    childhood:{position:v(7.7,5.4,13.6),target:v(-4,2.5,1),fov:55},
    outdoors:{position:v(0,11.5,-1.2),target:v(0,1.8,-16.5),fov:77,shift:.09},
    garden:{position:v(10.4,5.3,8.2),target:v(5,1.3,2.4),fov:56}
  };
  // A supplied callback already resolves the app override and OS preference.
  const query=window.matchMedia('(prefers-reduced-motion: reduce)'),reduced=()=>typeof isReduced==='function'?Boolean(isReduced()):query.matches;
  const resources={geometry:new Set(),material:new Set(),texture:new Set(),light:new Set(),instanced:new Set()};
  const geometryCache=new Map(),listeners=[],picks=[],occluders=[],labels=[],doors=[],palette={},raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let walkCurve=new THREE.CatmullRomCurve3([v(1,.15,-10),v(1.1,.15,-10.1)]);
  let walkLength=walkCurve.getLength(),walkDuration=7.5;const walkPoint=v(0,0,0),walkTangent=v(0,0,0),guidePoint=v(0,0,0),guideBaseline=v(0,0,0);
  const exhibits=[],exhibitPlaces=[[-7,-9,.38],[-5.6,-15.5,.28],[-2,-20.1,.12],[2.4,-20.1,-.12],[6.2,-15.5,-.28],[7.7,-9,-.38]];
  let scene=null,camera=null,experience=null,host=null,veil=null,status=null,saved=null,externalFocus=null;
  let opened=false,closing=false,dead=false,dirty=false,clock=0,width=1,height=1,renderedFrames=0,generation=0;
  let selected='childhood',lastSelected='childhood',transition=null,target=poses.threshold.target.clone(),doorProgress=0,openingElapsed=0,hover=null,pointerDown=null,lastEscape=-Infinity;
  let model=null,gait=null,companion=null,assetController=null,assetStatus='idle',assetError='',requestSerial=0;
  let walkActive=false,walkProgress=0,walkElapsed=0,walkDistance=0,settling=0,trailLight=null,screenGlow=null,screenLight=null,modelRing=null;
  let activeIndex=0,displayStart=-1,galleryFocused=false,projectionShift=0,imageGeneration=0,indexOpen=false,viewerOpen=false,indexPage=0,indexQuery='',layerFocus=null,layerSiblings=[],viewerSerial=0;
  const assetURL=path=>new URL('../'+path.replace(/^\.\//,''),import.meta.url).href;
  const $=selector=>experience?.querySelector(selector);
  const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
  const ownGeometry=value=>(resources.geometry.add(value),value);
  const ownMaterial=value=>(resources.material.add(value),value);
  const mat=(color,extra={})=>ownMaterial(new THREE.MeshStandardMaterial({color,roughness:.88,...extra}));
  const unlit=(color,extra={})=>ownMaterial(new THREE.MeshBasicMaterial({color,toneMapped:false,...extra}));
  const dirtyFrame=()=>{dirty=true;};

  function mount(){
    experience=document.createElement('section');experience.id='pokemon-experience';experience.setAttribute('aria-label','Pokemon GO: from the screen into the world');
    experience.innerHTML=`<div id="pokemon-scene" tabindex="0" role="region" aria-label="Pokemon exhibition. A and D or Left and Right browse captures. Enter selects the current capture or opens it. Escape goes back."></div><div class="pgr-shade" aria-hidden="true"></div>
      <header class="pgr-header"><button id="pokemon-back-hobbies" class="pgr-quiet" type="button"></button><div class="pgr-heading"><p>Pokemon GO</p><h1>From the screen, into the world</h1></div><div class="pgr-header-actions"><button type="button" data-play-music class="pgr-quiet pgr-music" aria-pressed="false">Music off</button><span id="pokemon-portfolio" class="mode-switch" data-mode-switch>Portfolio / Play</span></div></header>
      <section class="pgr-story" aria-labelledby="pokemon-title"><p id="pokemon-chapter" class="pgr-eyebrow"></p><h2 id="pokemon-title"></h2><p id="pokemon-body"></p><div id="pokemon-catch-context" hidden><p id="pokemon-catch-position" class="pgr-eyebrow"></p><h3 id="pokemon-catch-name"></h3><p id="pokemon-catch-meta"></p><button id="pokemon-view-catch" class="pgr-primary" type="button">View capture</button><p id="pokemon-catch-error" hidden>Preview unavailable. The full capture is still available.</p><button id="pokemon-image-retry" class="pgr-reset" type="button" hidden>Retry preview</button></div><div class="pgr-actions"><button id="pokemon-action" class="pgr-primary" type="button">Step outside</button><button id="pokemon-reset" class="pgr-reset" type="button" hidden>Reset walk</button></div><p id="pokemon-asset-note" class="pgr-asset-note" hidden></p><button id="pokemon-retry" class="pgr-quiet" type="button" hidden>Retry Pikachu</button></section>
      <section id="pokemon-collection-controls" class="pgr-collection-controls" aria-label="Explore the catches" hidden><button id="pokemon-browse" class="pgr-quiet" type="button">Browse catches</button><div class="pgr-display-controls"><button id="pokemon-display-prev" class="pgr-quiet" type="button">Previous display</button><span id="pokemon-display-count"></span><button id="pokemon-display-next" class="pgr-quiet" type="button">Next display</button></div><button id="pokemon-collection-overview" class="pgr-quiet" type="button" hidden>See the whole display</button></section>
      <nav id="pokemon-stories" class="pgr-chapters" aria-label="Explore Lakshya’s Pokemon story"></nav>
      <footer class="pgr-footer"><span id="pokemon-position">A childhood wish</span><span id="pokemon-key-hint">A / D or Left / Right to explore · Esc to return</span></footer>
      <section id="pokemon-index" class="pgr-index" aria-labelledby="pokemon-index-title" hidden><header><div><p class="pgr-eyebrow">Lakshya’s Pokemon GO collection</p><h2 id="pokemon-index-title">My catches</h2></div><button id="pokemon-index-close" class="pgr-quiet" type="button">Back to exhibition</button></header><div class="pgr-index-toolbar"><label for="pokemon-search">Find a Pokemon</label><input id="pokemon-search" type="search" placeholder="Search by name" autocomplete="off"><p id="pokemon-index-count" aria-live="polite"></p></div><div id="pokemon-index-grid" class="pgr-index-grid"></div><footer><button id="pokemon-index-prev" class="pgr-quiet" type="button">Previous catches</button><span id="pokemon-index-page"></span><button id="pokemon-index-next" class="pgr-quiet" type="button">Next catches</button></footer></section>
      <section id="pokemon-viewer" class="pgr-viewer" aria-labelledby="pokemon-viewer-title" hidden><header><div><p class="pgr-eyebrow">From my Pokemon GO collection</p><h2 id="pokemon-viewer-title"></h2><p id="pokemon-viewer-meta"></p></div><button id="pokemon-viewer-close" class="pgr-quiet" type="button">Back to exhibit</button></header><figure><img id="pokemon-full-catch" alt=""><figcaption id="pokemon-viewer-caption"></figcaption><p id="pokemon-viewer-error" hidden>This capture couldn’t load.</p><button id="pokemon-viewer-retry" class="pgr-quiet" type="button" hidden>Retry capture</button></figure><nav aria-label="Browse full captures"><button id="pokemon-catch-prev" class="pgr-quiet" type="button">Previous capture</button><span id="pokemon-viewer-count"></span><button id="pokemon-catch-next" class="pgr-quiet" type="button">Next capture</button></nav></section>
      <div id="pokemon-hint" class="pgr-hint" hidden></div><p id="pokemon-status" class="pgr-sr" aria-live="polite"></p><div id="pokemon-veil" class="pgr-veil" aria-hidden="true"></div>`;
    container.appendChild(experience);$('#pokemon-back-hobbies').textContent=returnLabel;host=$('#pokemon-scene');veil=$('#pokemon-veil');status=$('#pokemon-status');
    for(const [i,story]of stories.entries()){const button=document.createElement('button');button.type='button';button.dataset.pgrStory=story.id;const number=document.createElement('span');number.className='pgr-number';number.textContent=String(i+1).padStart(2,'0');const text=document.createElement('span');text.textContent=story.label;button.append(number,text);$('#pokemon-stories').appendChild(button);}
  }
  function snapshotRenderer(){
    const canvas=renderer.domElement;
    return {parent:canvas.parentNode,sibling:canvas.nextSibling,style:canvas.getAttribute('style'),size:renderer.getSize(new THREE.Vector2()),pixelRatio:renderer.getPixelRatio(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),target:renderer.getRenderTarget(),clearColor:renderer.getClearColor(new THREE.Color()),clearAlpha:renderer.getClearAlpha(),toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace,autoClear:renderer.autoClear,autoClearColor:renderer.autoClearColor,autoClearDepth:renderer.autoClearDepth,autoClearStencil:renderer.autoClearStencil,shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type,shadowAutoUpdate:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate};
  }
  function borrowRenderer(){saved=snapshotRenderer();host.appendChild(renderer.domElement);Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;renderer.autoClear=renderer.autoClearColor=renderer.autoClearDepth=renderer.autoClearStencil=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(null);renderer.setScissorTest(false);}
  function restoreRenderer(){
    if(!saved)return;const canvas=renderer.domElement,s=saved;saved=null;
    if(s.parent){if(s.sibling?.parentNode===s.parent)s.parent.insertBefore(canvas,s.sibling);else s.parent.appendChild(canvas);}else canvas.remove();
    renderer.setPixelRatio(s.pixelRatio);renderer.setSize(s.size.x,s.size.y,false);renderer.outputColorSpace=s.outputColorSpace;renderer.toneMapping=s.toneMapping;renderer.toneMappingExposure=s.toneMappingExposure;renderer.autoClear=s.autoClear;renderer.autoClearColor=s.autoClearColor;renderer.autoClearDepth=s.autoClearDepth;renderer.autoClearStencil=s.autoClearStencil;renderer.shadowMap.enabled=s.shadowEnabled;renderer.shadowMap.type=s.shadowType;renderer.shadowMap.autoUpdate=s.shadowAutoUpdate;renderer.shadowMap.needsUpdate=s.shadowNeedsUpdate;renderer.setClearColor(s.clearColor,s.clearAlpha);renderer.setRenderTarget(s.target);renderer.setViewport(s.viewport);renderer.setScissor(s.scissor);renderer.setScissorTest(s.scissorTest);if(s.style===null)canvas.removeAttribute('style');else canvas.setAttribute('style',s.style);
  }
  function box(w,h,d,material,parent,x=0,y=0,z=0,r=.04){const key=[w,h,d,r].join(',');let geometry=geometryCache.get(key);if(!geometry){geometry=ownGeometry(r?new RoundedBoxGeometry(w,h,d,2,r):new THREE.BoxGeometry(w,h,d));geometryCache.set(key,geometry);}const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);occluders.push(mesh);return mesh;}
  function sphere(radius,material,parent,x,y,z,sx=1,sy=1,sz=1){const key=`sphere:${radius}`;let geo=geometryCache.get(key);if(!geo){geo=ownGeometry(new THREE.SphereGeometry(radius,16,10));geometryCache.set(key,geo);}const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;}
  function cylinder(top,bottom,height,material,parent,x,y,z,segments=24){const mesh=new THREE.Mesh(ownGeometry(new THREE.CylinderGeometry(top,bottom,height,segments)),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function pickable(mesh,id){mesh.userData.story=id;picks.push(mesh);return mesh;}
  function placard(text,w,h,x,y,z,parent=scene){const canvas=document.createElement('canvas');canvas.width=Math.round(w*180);canvas.height=Math.round(h*180);const ctx=canvas.getContext('2d'),entry={text,texture:null,draw:null};const draw=()=>{ctx.fillStyle='#d3bc8f';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#324b3b';ctx.font=`600 ${Math.round(canvas.height*.4)}px "DM Sans",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(entry.text,canvas.width/2,canvas.height/2,canvas.width-15);};draw();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;resources.texture.add(texture);entry.texture=texture;entry.draw=draw;labels.push(entry);const mesh=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(w,h)),unlit('#ffffff',{map:texture}));mesh.position.set(x,y,z);mesh.userData.label=entry;parent.add(mesh);return mesh;}
  function tree(x,z,height=5){const g=new THREE.Group();g.position.set(x,.03,z);scene.add(g);cylinder(.16,.3,height*.62,palette.bark,g,0,height*.29,0,8);const geo=ownGeometry(new THREE.IcosahedronGeometry(1,1));for(const [dx,dy,dz,scale]of [[0,.7,0,.27],[-.14,.56,.04,.23],[.16,.59,-.02,.24]]){const canopy=new THREE.Mesh(geo,palette.leaf);canopy.position.set(dx*height,dy*height,dz*height);canopy.scale.setScalar(scale*height);canopy.castShadow=true;g.add(canopy);}return g;}
  function buildScene(){
    scene=new THREE.Scene();scene.background=new THREE.Color('#b5cdc4');scene.fog=new THREE.Fog('#b5cdc4',30,62);camera=new THREE.PerspectiveCamera(53,width/height,.1,100);camera.position.copy(poses.threshold.position);camera.lookAt(target);
    Object.assign(palette,{wall:mat('#d8c5a6'),trim:mat('#eadcc0'),wood:mat('#8f6743'),woodLight:mat('#b99266'),green:mat('#426651'),deep:mat('#243f34'),cloth:mat('#b8774d'),rug:mat('#d6b78c'),ground:mat('#8aa77a'),leaf:mat('#567b52'),bark:mat('#80674d'),path:mat('#d5ba8e'),dark:mat('#263c36'),screen:unlit('#a4c8af'),cream:mat('#ede3ca'),yellow:mat('#e4bc4e')});
    const skyGeo=ownGeometry(new THREE.SphereGeometry(75,32,16)),positions=skyGeo.attributes.position,colours=new Float32Array(positions.count*3),horizon=new THREE.Color('#b5cdc4'),zenith=new THREE.Color('#718fa0'),colour=new THREE.Color();for(let i=0;i<positions.count;i++){colour.copy(horizon).lerp(zenith,THREE.MathUtils.clamp((positions.getY(i)/75-.1)/.7,0,1));colours.set([colour.r,colour.g,colour.b],i*3);}skyGeo.setAttribute('color',new THREE.BufferAttribute(colours,3));const sky=new THREE.Mesh(skyGeo,unlit('#ffffff',{vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false,depthTest:false}));sky.renderOrder=-1000;scene.add(sky);
    scene.add(new THREE.HemisphereLight('#f9ead2','#738567',1.7));const sun=new THREE.DirectionalLight('#ffedcb',2.5);sun.position.set(-10,18,-8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-19,right:19,top:22,bottom:-22,near:1,far:60});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);resources.light.add(sun);
    const warm=new THREE.PointLight('#ffd99a',26,24,2);warm.position.set(-7,5,6);scene.add(warm);
    box(180,.18,180,palette.ground,scene,0,-.24,-12,0);box(24,.3,13,palette.wood,scene,0,-.06,6,.05);box(23.9,.06,12.9,palette.rug,scene,0,.12,6,.025);
    const seams=new THREE.InstancedMesh(ownGeometry(new THREE.BoxGeometry(.018,.008,12.7)),palette.woodLight,24),dummy=new THREE.Object3D();for(let i=0;i<24;i++){dummy.position.set(-11.5+i,.156,6);dummy.updateMatrix();seams.setMatrixAt(i,dummy.matrix);}scene.add(seams);resources.instanced.add(seams);
    // A real arched threshold connects the memory nook to the open sky.
    const wallShape=new THREE.Shape();wallShape.moveTo(-12,0);wallShape.lineTo(12,0);wallShape.lineTo(12,10);wallShape.lineTo(-12,10);wallShape.closePath();
    const opening=new THREE.Path();opening.moveTo(-4,0);opening.lineTo(-4,3.7);opening.absarc(0,3.7,4,Math.PI,0,true);opening.lineTo(4,0);opening.closePath();wallShape.holes.push(opening);
    const wall=new THREE.Mesh(ownGeometry(new THREE.ExtrudeGeometry(wallShape,{depth:.48,bevelEnabled:false,curveSegments:32})),palette.wall);wall.position.z=-.5;wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);occluders.push(wall);
    box(.35,9.8,12.7,palette.wall,scene,-12,4.9,6,.05);box(24,.22,.8,palette.trim,scene,0,9.83,-.05,.04);
    const trimPoints=[v(-4.15,.15,.08),v(-4.15,3.7,.08)];for(let i=0;i<=48;i++){const a=Math.PI-i/48*Math.PI;trimPoints.push(v(Math.cos(a)*4.15,3.7+Math.sin(a)*4.15,.08));}trimPoints.push(v(4.15,.15,.08));const trim=new THREE.Mesh(ownGeometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trimPoints),96,.12,6,false)),palette.trim);scene.add(trim);
    buildDoors();buildScreenNook();buildGardenModel();buildOutdoors();applyDoor(0);renderer.shadowMap.needsUpdate=true;
  }
  function buildDoors(){
    for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*4,.17,-.1);scene.add(pivot);const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(-side*4,0);shape.lineTo(-side*4,7.45);for(let i=0;i<=24;i++){const x=i/24*4,y=3.55+Math.sqrt(Math.max(0,16-x*x));shape.lineTo(-side*(4-x),y);}shape.lineTo(0,0);const mesh=new THREE.Mesh(ownGeometry(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:24})),palette.green);mesh.castShadow=true;mesh.receiveShadow=true;pivot.add(mesh);pickable(mesh,'outdoors');for(let i=1;i<9;i++){const x=i/9*4,height=3.55+Math.sqrt(Math.max(0,16-(4-x)*(4-x)));box(.025,height-.15,.025,palette.deep,pivot,-side*x,height/2,.18,0);}box(.11,.65,.11,palette.woodLight,pivot,-side*3.6,2.35,.28,.04);doors.push({pivot,side});}
    placard('A WORLD TO WANDER',3.1,.34,0,8.45,.05);
  }
  function buildScreenNook(){
    const group=new THREE.Group();group.position.set(-6.65,0,2.35);group.rotation.y=.12;scene.add(group);
    box(5.1,.2,2.45,palette.woodLight,group,0,1.02,0,.06);for(const x of [-2.1,2.1])for(const z of [-.86,.86])box(.18,.98,.18,palette.wood,group,x,.5,z,.03);
    const housing=pickable(box(4.3,2.9,1.25,palette.deep,group,-.12,2.6,0,.27),'childhood');housing.name='Childhood screen';box(3.52,2.3,.14,palette.dark,group,-.32,2.66,.68,.19);
    screenGlow=box(3.26,2.06,.03,palette.screen,group,-.32,2.66,.78,.13);screenGlow.castShadow=false;screenGlow.receiveShadow=false;pickable(screenGlow,'childhood');
    // A small original landscape in the screen; no episode or invented capture.
    const picture=new THREE.Group();picture.position.set(-.32,2.66,.805);group.add(picture);box(3.1,.66,.012,unlit('#71946a'),picture,0,-.62,.02,.03);box(1.55,.15,.018,unlit('#d4bc86'),picture,.65,-.7,.04,.02);sphere(.28,unlit('#ead9a2'),picture,.86,.56,.04,1,1,.04);
    for(const [x,y,s]of [[-1.05,.05,.48],[-.6,-.1,.3],[.8,-.12,.35]]){const geo=ownGeometry(new THREE.ConeGeometry(s,s*1.6,5));const hill=new THREE.Mesh(geo,unlit('#527b61'));hill.position.set(x,y,.03);hill.scale.z=.04;picture.add(hill);}
    for(const y of [3.28,2.9]){const knob=cylinder(.12,.12,.08,palette.woodLight,group,1.8,y,.76,16);knob.rotation.x=Math.PI/2;}
    for(let i=0;i<6;i++)box(.34,.027,.04,palette.wood,group,1.8,1.75+i*.09,.76,.01);
    const antennaMat=palette.wood;for(const side of [-1,1]){const antenna=cylinder(.021,.021,1.25,antennaMat,group,side*.27,4.5,-.25,6);antenna.rotation.z=side*-.5;}
    screenLight=new THREE.PointLight('#acd6b7',5,8,2);screenLight.position.set(-7,3.2,4.2);scene.add(screenLight);
    box(5.3,.04,3.3,palette.cloth,scene,-6.4,.19,5.1,.08);box(2.3,.6,1.65,palette.cream,scene,-7.9,.48,5.4,.22);box(2.05,.22,1.35,palette.rug,scene,-7.9,.85,5.4,.14);
    // A familiar keepsake is optional decoration, never a collection statistic.
    const ball=new THREE.Group();ball.position.set(-4.4,1.4,2.8);scene.add(ball);for(const [start,color]of [[0,'#b65648'],[Math.PI/2,'#e7ddbe']]){const half=new THREE.Mesh(ownGeometry(new THREE.SphereGeometry(.36,24,12,0,Math.PI*2,start,Math.PI/2)),mat(color));ball.add(half);}const band=new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(.36,.025,8,32)),palette.dark);band.rotation.x=Math.PI/2;ball.add(band);sphere(.095,palette.dark,ball,0,0,.35);sphere(.058,palette.cream,ball,0,0,.427);
    placard('ON THE SCREEN',2.1,.3,-6.5,.68,3.63);
  }
  function buildGardenModel(){
    const table=new THREE.Group();table.position.set(6.55,0,3);table.rotation.y=-.1;scene.add(table);box(5.1,.24,4,palette.woodLight,table,0,1.62,0,.12);for(const x of [-2.1,2.1])for(const z of [-1.5,1.5])box(.21,1.5,.21,palette.wood,table,x,.75,z,.035);pickable(box(4.45,.2,3.35,palette.ground,table,0,1.85,0,.15),'garden');
    const miniature=new THREE.Group();miniature.position.y=1.98;table.add(miniature);
    // This small physical sketch reads the real garden's winding road, river
    // and destination coordinates. It is not a second invented circular map.
    const modelPoint=([x,z],y=.07)=>v(x*.027,y,(z+35)*.024);
    const curve=new THREE.CatmullRomCurve3(LOOP_POINTS.map(point=>modelPoint(point)),true,'centripetal');
    const ribbon=new THREE.Mesh(ownGeometry(new THREE.TubeGeometry(curve,160,.075,6,true)),palette.path);miniature.add(ribbon);
    box(4.2,.012,.192,unlit('#82acb2'),miniature,0,.025,(-51+35)*.024,.018);
    for(const bridge of BRIDGES){box(.23,.08,.42,palette.woodLight,miniature,bridge.x*.027,.11,(-51+35)*.024,.02);for(const side of [-1,1])box(.025,.12,.42,palette.wood,miniature,bridge.x*.027+side*.105,.19,(-51+35)*.024,.008);}
    for(const [id,stop]of Object.entries(STOPS)){
      const p=modelPoint([stop.x,stop.z],0),g=new THREE.Group();g.position.copy(p);miniature.add(g);
      if(id==='about'){cylinder(.2,.22,.17,palette.cream,g,0,.12,0,16);cylinder(.25,.27,.045,palette.green,g,0,.23,0,16);}
      else if(id==='projects'){box(.42,.3,.36,palette.cream,g,0,.17,0,.035);box(.46,.065,.4,palette.green,g,0,.35,0,.025);box(.27,.19,.015,palette.screen,g,0,.15,.188,.02);}
      else if(id==='work'){for(const x of [-.17,.17])for(const z of [-.17,.17])box(.04,.25,.04,palette.wood,g,x,.15,z,.008);cylinder(.25,.27,.06,palette.green,g,0,.3,0,12);}
      else if(id==='music'){cylinder(.24,.25,.075,palette.woodLight,g,0,.07,0,16);const shell=new THREE.Mesh(ownGeometry(new THREE.SphereGeometry(.24,16,8,0,Math.PI,0,Math.PI/2)),palette.cream);shell.position.y=.1;g.add(shell);}
      else{for(const x of [-.13,.13])box(.035,.45,.035,palette.wood,g,x,.24,0,.006);box(.3,.04,.1,palette.cream,g,0,.46,0,.006);}
    }
    for(const [x,z]of [[-.3,.8],[1.8,.8],[-1.8,.7]]){cylinder(.03,.05,.28,palette.bark,miniature,x,.15,z,6);sphere(.17,palette.leaf,miniature,x,.36,z,1,1.25,1);}
    const markerMat=unlit('#efd28b');modelRing=new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(2.4,.025,5,64)),markerMat);modelRing.rotation.x=-Math.PI/2;modelRing.position.y=1.81;table.add(modelRing);modelRing.visible=false;
    pickable(placard('IN THIS GARDEN',2.7,.36,6.55,1.25,5.08),'garden');
  }
  function buildOutdoors(){
    // An open conservatory around six reusable display places. The private
    // collection may grow without adding map space, geometry or texture slots.
    const floor=box(22,.17,22,palette.path,scene,0,.065,-12,.12);floor.receiveShadow=true;
    for(const x of [-10.4,10.4])box(.22,.17,21.5,palette.woodLight,scene,x,.1,-12,.025);
    const ribMaterial=palette.woodLight;
    for(const z of [-11,-17,-22]){
      const points=[v(-10,.2,z),v(-10,5.6,z),v(-8,7.5,z),v(-4,8.5,z),v(0,8.85,z),v(4,8.5,z),v(8,7.5,z),v(10,5.6,z),v(10,.2,z)];
      const rib=new THREE.Mesh(ownGeometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.105,6,false)),ribMaterial);rib.castShadow=true;scene.add(rib);
    }
    for(const x of [-7,0,7])box(.075,.075,11.2,palette.wood,scene,x,x===0?8.83:7.95,-16.5,.015);
    const trail=new THREE.CatmullRomCurve3([v(0,.15,-1),v(-2,.15,-6),v(-5,.15,-10),v(-3.6,.15,-16),v(0,.15,-17.8),v(4,.15,-15),v(5.5,.15,-10)]);
    const line=new THREE.Mesh(ownGeometry(new THREE.TubeGeometry(trail,100,.035,5,false)),palette.cream);scene.add(line);
    trailLight=new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(.7,.022,6,40)),unlit('#f2dc9c'));trailLight.rotation.x=-Math.PI/2;trailLight.position.set(-2.5,.18,-6.5);scene.add(trailLight);
    for(const [x,z,h]of [[-13,-7,6],[13,-8,7],[-14,-21,7],[14,-24,8]])tree(x,z,h);
    // The same six timber frames hold every display page. Image surfaces are
    // unlit so photograph colours stay faithful to the supplied captures.
    for(const [slot,[x,z,yaw]]of exhibitPlaces.entries()){
      const group=new THREE.Group();group.position.set(x,.15,z);group.rotation.y=yaw;scene.add(group);
      box(3.15,.16,1.35,palette.woodLight,group,0,.1,0,.06);
      for(const side of [-1,1])box(.12,4.7,.16,palette.wood,group,side*1.39,2.45,-.16,.022);
      box(3.05,.16,.35,palette.woodLight,group,0,4.76,-.1,.03);
      box(2.72,3.55,.16,palette.deep,group,0,2.79,0,.055);
      const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;const context=canvas.getContext('2d');context.fillStyle='#e8dfc9';context.fillRect(0,0,384,512);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()||1);resources.texture.add(texture);
      const picture=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(2.4,3.2)),unlit('#ffffff',{map:texture}));picture.position.set(0,2.79,.101);picture.userData.catchSlot=slot;group.add(picture);picks.push(picture);
      const plate=placard('MY CATCHES',2.45,.3,0,.72,.13,group);plate.userData.catchSlot=slot;picks.push(plate);
      const glow=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(2.84,3.67)),unlit('#d3ae59'));glow.position.set(0,2.79,-.09);group.add(glow);glow.visible=false;
      exhibits.push({slot,group,picture,plate,glow,canvas,context,texture,index:-1,status:'idle',cancel:null,request:0});
    }
  }
  const catchLabel=entry=>entry?`${entry.name}${entry.variant?` · ${entry.variant}`:''}`:'';
  const catchMeta=entry=>Number.isFinite(entry?.cp)?`CP ${entry.cp}`:'';
  function clearImageRequests(){imageGeneration++;for(const exhibit of exhibits){exhibit.cancel?.();exhibit.cancel=null;exhibit.request++;}}
  function requestImage(exhibit){
    exhibit.cancel?.();exhibit.cancel=null;const entry=collection[exhibit.index];if(!entry)return;
    const token=generation,pageToken=imageGeneration,request=++exhibit.request,image=new Image();image.decoding='async';exhibit.status='loading';
    exhibit.context.fillStyle='#e8dfc9';exhibit.context.fillRect(0,0,384,512);exhibit.texture.needsUpdate=true;
    const cancel=()=>{image.onload=null;image.onerror=null;image.src='';};exhibit.cancel=cancel;
    image.onload=()=>{if(!opened||token!==generation||pageToken!==imageGeneration||request!==exhibit.request)return;exhibit.cancel=null;image.onload=null;image.onerror=null;const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;if(!iw||!ih){exhibit.status='error';updateContent();dirtyFrame();return;}const scale=Math.min(384/iw,512/ih),dw=iw*scale,dh=ih*scale;exhibit.context.fillStyle='#e8dfc9';exhibit.context.fillRect(0,0,384,512);exhibit.context.drawImage(image,(384-dw)/2,(512-dh)/2,dw,dh);exhibit.texture.needsUpdate=true;exhibit.status='ready';updateContent();dirtyFrame();};
    image.onerror=()=>{if(!opened||token!==generation||pageToken!==imageGeneration||request!==exhibit.request)return;exhibit.cancel=null;image.onload=null;image.onerror=null;exhibit.status='error';updateContent();dirtyFrame();};image.src=assetURL(entry.thumbnail);
  }
  function setDisplay(start,{reload=false}={}){
    const bounded=Math.max(0,Math.min(Math.floor(Math.max(0,collection.length-1)/6)*6,Math.floor(start/6)*6));if(displayStart===bounded&&!reload)return;
    clearImageRequests();displayStart=bounded;
    for(const exhibit of exhibits){exhibit.index=displayStart+exhibit.slot;const entry=collection[exhibit.index];exhibit.group.visible=Boolean(entry);exhibit.status='idle';exhibit.glow.visible=galleryFocused&&exhibit.index===activeIndex;if(entry){exhibit.picture.userData.catchId=entry.id;exhibit.plate.userData.catchId=entry.id;const label=exhibit.plate.userData.label;label.text=catchLabel(entry);label.draw();label.texture.needsUpdate=true;requestImage(exhibit);}}
    dirtyFrame();
  }
  function exhibitFor(index){return exhibits[index-displayStart];}
  function catchPose(index){
    const slot=exhibitFor(index)||exhibits[index%6],p=slot.group.position,yaw=slot.group.rotation.y;
    const normal=v(Math.sin(yaw),0,Math.cos(yaw)),centre=v(p.x,2,p.z+.1);
    return {position:v(p.x,4.7,p.z+.1).addScaledVector(normal,8.8),target:centre,fov:48,shift:.16};
  }
  function companionPlace(index){const slot=exhibitFor(index)||exhibits[index%6],p=slot.group.position,yaw=slot.group.rotation.y;return v(p.x-Math.cos(yaw)*2.2+Math.sin(yaw)*.35,.15,p.z+Math.sin(yaw)*2.2+Math.cos(yaw)*.35);}
  function applyProjection(shift=0){projectionShift=shift;if(Math.abs(shift)<.0001)camera.clearViewOffset();else camera.setViewOffset(width,height,-width*shift,0,width,height);camera.updateProjectionMatrix();}
  function setCompanionAtExhibit(){if(!companion||!collection.length)return;companion.position.copy(companionPlace(activeIndex));const slot=exhibitFor(activeIndex)||exhibits[activeIndex%6];companion.rotation.y=slot.group.rotation.y+.35;companion.updateMatrixWorld(true);gait?.update({time:clock/1000,dt:0,speed:0,distance:walkDistance,reduced:true});trailLight.position.copy(companion.position);trailLight.position.y=.18;dirtyFrame();}
  function selectCatch(index,{guided=true,focus=true}={}){
    if(!opened||closing||!collection.length)return false;
    index=THREE.MathUtils.clamp(Number(index)||0,0,collection.length-1);const previousStory=selected;releaseLayer();stopWalk();setHover(null);selected='outdoors';lastSelected='outdoors';activeIndex=index;galleryFocused=true;setDisplay(Math.floor(index/6)*6);updateContent();
    const pose=catchPose(index);let duration=previousStory==='outdoors'?1350:2100;
    if(guided&&companion&&assetStatus==='ready'){
      const start=companion.position.clone(),end=companionPlace(index),middle=start.clone().lerp(end,.5);middle.z+=Math.min(2,start.distanceTo(end)*.18);middle.y=.15;
      walkCurve=new THREE.CatmullRomCurve3([start,middle,end]);walkLength=walkCurve.getLength();walkDuration=Math.max(1.1,Math.min(4.2,walkLength/2.7));duration=Math.max(duration,walkDuration*1000);walkDuration=duration/1000;walkProgress=0;walkElapsed=0;walkDistance=0;settling=0;walkActive=true;gait.reset?.();placeCompanion(0,0,true);
      if(reduced()){walkProgress=1;walkDistance=walkLength;walkActive=false;setCompanionAtExhibit();}
    }else setCompanionAtExhibit();
    updateContent();
    status.textContent=`Moving to ${catchLabel(collection[index])}.`;
    moveTo(pose,duration,()=>{if(!opened||closing)return;if(!walkActive)setCompanionAtExhibit();updateContent();status.textContent=`${catchLabel(collection[activeIndex])}. ${catchMeta(collection[activeIndex])}. View the capture or choose another.`;if(focus)$('#pokemon-view-catch').focus({preventScroll:true});},{throughDoor:camera.position.z>0});
    if(transition&&walkActive&&!transition.path)transition.guide={start:walkCurve.getPointAt(0),end:walkCurve.getPointAt(1)};
    return true;
  }
  function collectionOverview({focus=true}={}){
    if(!opened||closing)return;releaseLayer();stopWalk();galleryFocused=false;setDisplay(Math.floor(activeIndex/6)*6);selected='outdoors';lastSelected='outdoors';updateContent();moveTo(poses.outdoors,1400,()=>{if(focus)$('#pokemon-browse').focus({preventScroll:true});},{throughDoor:camera.position.z>0});
  }
  function displayPage(direction){if(!opened||closing||!collection.length)return;activeIndex=THREE.MathUtils.clamp(displayStart+direction*6,0,Math.floor((collection.length-1)/6)*6);galleryFocused=false;setDisplay(activeIndex);collectionOverview({focus:false});}
  function releaseLayer(){
    if(!experience)return;viewerSerial++;const full=$('#pokemon-full-catch');full.onload=null;full.onerror=null;full.removeAttribute('src');$('#pokemon-viewer').hidden=true;$('#pokemon-index').hidden=true;$('#pokemon-index-grid').querySelectorAll('img').forEach(img=>img.removeAttribute('src'));$('#pokemon-index-grid').replaceChildren();indexOpen=false;viewerOpen=false;layerSiblings.forEach(([element,inert])=>{element.inert=inert;});layerSiblings=[];
  }
  function confineTo(section){layerSiblings=[...experience.children].filter(element=>element!==section).map(element=>[element,element.inert]);layerSiblings.forEach(([element])=>{element.inert=true;});section.hidden=false;}
  function openIndex(){if(!opened||closing)return;stopWalk();if(transition){const t=transition;transition=null;camera.position.copy(t.pose.position);target.copy(t.pose.target);camera.fov=t.pose.fov;applyProjection(t.pose.shift||0);camera.lookAt(target);if(t.throughDoor)applyDoor(1);experience.classList.remove('pgr-moving');if(galleryFocused)setCompanionAtExhibit();}layerFocus=document.activeElement;releaseLayer();indexOpen=true;$('#pokemon-search').value=indexQuery;renderIndex();confineTo($('#pokemon-index'));$('#pokemon-search').focus({preventScroll:true});status.textContent='Browse the complete catch collection by name.';}
  function filteredCollection(){const value=indexQuery.trim().toLocaleLowerCase();return collection.map((entry,index)=>({entry,index})).filter(({entry})=>!value||catchLabel(entry).toLocaleLowerCase().includes(value));}
  function renderIndex(){
    const focused=document.activeElement,filtered=filteredCollection(),pages=Math.max(1,Math.ceil(filtered.length/12));indexPage=THREE.MathUtils.clamp(indexPage,0,pages-1);const grid=$('#pokemon-index-grid');grid.querySelectorAll('img').forEach(image=>image.removeAttribute('src'));grid.replaceChildren();
    for(const {entry,index}of filtered.slice(indexPage*12,indexPage*12+12)){
      const button=document.createElement('button');button.type='button';button.dataset.pgrCatch=entry.id;button.dataset.catchIndex=String(index);button.setAttribute('aria-label',`${catchLabel(entry)}${catchMeta(entry)?`, ${catchMeta(entry)}`:''}`);const image=document.createElement('img');image.alt='';image.loading='lazy';image.decoding='async';image.width=entry.width;image.height=entry.height;image.src=assetURL(entry.thumbnail);const title=document.createElement('strong');title.textContent=catchLabel(entry);const meta=document.createElement('span');meta.textContent=catchMeta(entry);button.append(image,title,meta);grid.appendChild(button);
    }
    if(!filtered.length){const empty=document.createElement('p');empty.textContent='No matching Pokemon. Try another name.';grid.appendChild(empty);}
    $('#pokemon-index-count').textContent=`${filtered.length} ${filtered.length===1?'capture':'captures'}`;$('#pokemon-index-page').textContent=`Page ${indexPage+1} of ${pages}`;$('#pokemon-index-prev').disabled=indexPage===0;$('#pokemon-index-next').disabled=indexPage===pages-1;
    if(focused?.disabled&&(focused.id==='pokemon-index-prev'||focused.id==='pokemon-index-next'))(grid.querySelector('button')||$('#pokemon-index-close')).focus({preventScroll:true});
  }
  function navigateIndex(direction,boundary){
    const filtered=filteredCollection();if(!filtered.length)return;
    const focused=document.activeElement?.closest?.('[data-pgr-catch]'),current=focused?filtered.findIndex(item=>item.index===Number(focused.dataset.catchIndex)):-1;
    const next=boundary==='first'?0:boundary==='last'?filtered.length-1:THREE.MathUtils.clamp(current<0?indexPage*12:current+direction,0,filtered.length-1);
    const page=Math.floor(next/12);if(page!==indexPage){indexPage=page;renderIndex();}
    $('#pokemon-index-grid').querySelector(`[data-catch-index="${filtered[next].index}"]`)?.focus({preventScroll:false});
  }
  function closeIndex(){if(!indexOpen)return;const focus=layerFocus;releaseLayer();layerFocus=null;updateContent();(focus?.isConnected?focus:$('#pokemon-browse')).focus({preventScroll:true});dirtyFrame();}
  function loadFullCapture(){
    const entry=collection[activeIndex];if(!entry)return;const image=$('#pokemon-full-catch'),serial=++viewerSerial;image.onload=null;image.onerror=null;image.removeAttribute('src');image.alt=`${catchLabel(entry)} from Lakshya’s Pokemon GO collection${catchMeta(entry)?`, ${catchMeta(entry)}`:''}.`;image.width=entry.width;image.height=entry.height;$('#pokemon-viewer-title').textContent=catchLabel(entry);$('#pokemon-viewer-meta').textContent=catchMeta(entry);$('#pokemon-viewer-caption').textContent='A capture from my Pokemon GO collection.';$('#pokemon-viewer-count').textContent=`${activeIndex+1} of ${collection.length}`;$('#pokemon-catch-prev').disabled=activeIndex===0;$('#pokemon-catch-next').disabled=activeIndex===collection.length-1;$('#pokemon-viewer-error').hidden=true;$('#pokemon-viewer-retry').hidden=true;
    image.onload=()=>{if(!opened||!viewerOpen||serial!==viewerSerial)return;image.onload=null;image.onerror=null;status.textContent=`${catchLabel(entry)} capture loaded.`;};image.onerror=()=>{if(!opened||!viewerOpen||serial!==viewerSerial)return;$('#pokemon-viewer-error').hidden=false;$('#pokemon-viewer-retry').hidden=false;status.textContent='The capture could not load. Retry or select another.';};image.src=assetURL(entry.image);
  }
  function openViewer(){if(!opened||closing||!galleryFocused||!collection.length)return;stopWalk();transition=null;experience.classList.remove('pgr-moving');const pose=catchPose(activeIndex);camera.position.copy(pose.position);target.copy(pose.target);camera.fov=pose.fov;applyProjection(pose.shift||0);camera.lookAt(target);setCompanionAtExhibit();layerFocus=$('#pokemon-view-catch');releaseLayer();viewerOpen=true;loadFullCapture();confineTo($('#pokemon-viewer'));$('#pokemon-viewer-close').focus({preventScroll:true});}
  function viewerStep(direction){if(!viewerOpen)return;activeIndex=THREE.MathUtils.clamp(activeIndex+direction,0,collection.length-1);setDisplay(Math.floor(activeIndex/6)*6);const pose=catchPose(activeIndex);camera.position.copy(pose.position);target.copy(pose.target);camera.fov=pose.fov;applyProjection(pose.shift||0);camera.lookAt(target);setCompanionAtExhibit();updateContent();loadFullCapture();if(document.activeElement?.disabled)$('#pokemon-viewer-close').focus({preventScroll:true});}
  function closeViewer(){if(!viewerOpen)return;releaseLayer();layerFocus=null;updateContent();$('#pokemon-view-catch').focus({preventScroll:true});dirtyFrame();}
  function applyDoor(value){doorProgress=THREE.MathUtils.clamp(value,0,1);for(const {pivot,side}of doors)pivot.rotation.y=side*1.61*doorProgress;renderer.shadowMap.needsUpdate=true;}
  function updateContent(){
    if(!experience)return;
    const story=stories.find(item=>item.id===selected);$('#pokemon-chapter').textContent=story.label;$('#pokemon-title').textContent=story.title;$('#pokemon-body').textContent=story.body;$('#pokemon-position').textContent=selected==='childhood'?'A childhood wish':selected==='outdoors'?'Out under the sky':'The idea became a place';experience.dataset.story=selected;
    $('#pokemon-key-hint').textContent=selected==='outdoors'?'A / D: captures · Enter on scene: open · Esc: back':'A / D: story · Enter on scene: continue · Esc: back';
    experience.querySelectorAll('[data-pgr-story]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pgrStory===selected)));
    const action=$('#pokemon-action');action.textContent=selected==='childhood'?'See my catches':selected==='garden'?'Back to childhood':galleryFocused?'Walk to the next catch':'Walk with Pikachu';action.disabled=selected==='outdoors'&&(assetStatus!=='ready'||walkActive||!collection.length);$('#pokemon-reset').hidden=true;$('#pokemon-reset').disabled=walkProgress===0||walkActive;modelRing.visible=selected==='garden';
    const note=$('#pokemon-asset-note');note.hidden=selected!=='outdoors'||assetStatus==='ready';note.textContent=assetStatus==='error'?'Pikachu couldn’t load. You can still explore the whole story.':assetStatus==='loading'?'Pikachu is on the way. The story is ready to explore.':'';$('#pokemon-retry').hidden=selected!=='outdoors'||assetStatus!=='error';
    const outdoors=selected==='outdoors',entry=collection[activeIndex];experience.dataset.catchFocus=String(outdoors&&galleryFocused);$('#pokemon-collection-controls').hidden=!outdoors;$('#pokemon-catch-context').hidden=!outdoors||!galleryFocused||!entry;$('#pokemon-collection-overview').hidden=!galleryFocused;$('#pokemon-browse').textContent=`Browse ${collection.length} catches`;$('#pokemon-display-count').textContent=collection.length?`${Math.max(0,displayStart)+1}–${Math.min(collection.length,Math.max(0,displayStart)+6)} of ${collection.length}`:'No captures yet';$('#pokemon-display-prev').disabled=displayStart<=0;$('#pokemon-display-next').disabled=displayStart+6>=collection.length;
    if(entry){$('#pokemon-catch-position').textContent=`Capture ${activeIndex+1} of ${collection.length}`;$('#pokemon-catch-name').textContent=catchLabel(entry);$('#pokemon-catch-meta').textContent=catchMeta(entry);const failed=exhibitFor(activeIndex)?.status==='error';$('#pokemon-catch-error').hidden=!failed;$('#pokemon-image-retry').hidden=!failed;}
    for(const exhibit of exhibits)exhibit.glow.visible=outdoors&&galleryFocused&&exhibit.index===activeIndex;
  }
  function moveTo(pose,duration,onComplete,{throughDoor=false,entry=false,exit=false,closeDoor=false}={}){
    const startPosition=camera.position.clone(),startTarget=target.clone(),startFov=camera.fov,startDoor=doorProgress,startShift=projectionShift;let path=null;
    if(throughDoor){path=new THREE.CatmullRomCurve3([startPosition,v(0,3.1,5.1),v(0,3.2,-.9),pose.position]);}
    else if(exit&&startPosition.z<0){path=new THREE.CatmullRomCurve3([startPosition,v(0,3.1,-1.4),v(0,3.1,4.4),pose.position]);}
    if(reduced()){camera.position.copy(pose.position);target.copy(pose.target);camera.fov=pose.fov;applyProjection(pose.shift||0);camera.lookAt(target);if(throughDoor)applyDoor(1);else if(closeDoor)applyDoor(0);transition=null;onComplete?.();dirtyFrame();return;}
    transition={started:clock,duration,startPosition,startTarget,startFov,startDoor,startShift,pose,path,onComplete,throughDoor,entry,exit,closeDoor};experience.classList.add('pgr-moving');dirtyFrame();
  }
  function selectStory(id,{focus=true}={}){
    if(!opened||closing||!stories.some(story=>story.id===id))return false;
    const previous=selected;releaseLayer();stopWalk();setHover(null);selected=id;lastSelected=id;galleryFocused=false;if(id==='outdoors')setDisplay(Math.floor(activeIndex/6)*6);updateContent();status.textContent=stories.find(story=>story.id===id).body;
    moveTo(poses[id],previous==='outdoors'||id==='outdoors'?1900:1200,()=>{if(!opened||closing)return;experience.classList.remove('pgr-moving');if(focus)$('#pokemon-action').focus({preventScroll:true});},{throughDoor:id==='outdoors'&&camera.position.z>0,exit:previous==='outdoors'&&id!=='outdoors',closeDoor:id==='childhood'});return true;
  }
  function releaseCompanion(){gait?.dispose();gait=null;if(model)disposeCharacterAsset(model);model=null;companion?.removeFromParent();companion=null;}
  function requestCompanion(){
    if(!opened||closing||assetStatus==='loading')return;assetController?.abort();const controller=new AbortController();assetController=controller;const token=generation,request=++requestSerial;assetStatus='loading';assetError='';updateContent();
    Promise.resolve().then(()=>{if(controller.signal.aborted)throw new DOMException('Companion loading cancelled','AbortError');return loadAsset('pikachu',controller.signal);}).then(asset=>{
      if(!opened||closing||controller.signal.aborted||token!==generation||request!==requestSerial){disposeCharacterAsset(asset);return;}
      try{releaseCompanion();model=asset;gait=poseFactory(model);gait.update({time:0,dt:0,speed:0,distance:0,reduced:true,lighter:false});model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(v(0,0,0));if(!Number.isFinite(size.y)||size.y<=0)throw new Error('Pikachu has invalid bounds.');const scale=1.8/size.y,anchor=gait.anchor?.clone?.()||v(0,bounds.min.y,0);model.scale.multiplyScalar(scale);model.position.addScaledVector(anchor,-scale);model.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=true;if(object.isSkinnedMesh)object.frustumCulled=false;}});companion=new THREE.Group();companion.name='Pikachu on the imagined walk';companion.userData.story='outdoors';companion.add(model);scene.add(companion);assetStatus='ready';if(galleryFocused)setCompanionAtExhibit();else placeCompanion(walkProgress,0,true);updateContent();status.textContent='Pikachu is ready. The exhibition walk is optional.';dirtyFrame();}
      catch(error){releaseCompanion();assetStatus='error';assetError=error.message;updateContent();dirtyFrame();}
    },error=>{if(!opened||controller.signal.aborted||token!==generation||request!==requestSerial)return;assetStatus='error';assetError=error.message;updateContent();dirtyFrame();});
  }
  function placeCompanion(progress,dt=0,quiet=false){
    if(!companion||!gait)return;walkCurve.getPointAt(progress,walkPoint);walkCurve.getTangentAt(progress,walkTangent);companion.position.copy(walkPoint);companion.rotation.y=Math.atan2(walkTangent.x,walkTangent.z);companion.updateMatrixWorld(true);const speed=walkActive&&!quiet?walkLength/walkDuration:0;gait.update({time:clock/1000,dt,speed,distance:walkDistance,reduced:quiet,lighter:false});trailLight.position.copy(walkPoint);trailLight.position.y=.18;
  }
  function startWalk(){
    if(!opened||closing||selected!=='outdoors'||assetStatus!=='ready'||walkActive)return false;
    return selectCatch(galleryFocused?(activeIndex+1)%collection.length:activeIndex,{guided:true});
  }
  function stopWalk(){if(!walkActive&&settling===0)return;walkActive=false;settling=0;placeCompanion(walkProgress,0,true);dirtyFrame();}
  function resetWalk(){if(!opened||closing||walkActive)return;walkProgress=0;walkElapsed=0;walkDistance=0;settling=0;gait?.reset?.();placeCompanion(0,0,true);updateContent();status.textContent='Pikachu is back at the start of the walk.';dirtyFrame();}
  function action(){if(selected==='childhood')selectStory('outdoors');else if(selected==='garden')selectStory('childhood');else startWalk();}
  function setHover(id){if(hover===id)return;hover=id;renderer.domElement.style.cursor=id?'pointer':'default';const hint=$('#pokemon-hint');if(!hint)return;hint.hidden=!id;if(id)hint.textContent=id.startsWith('catch:')?catchLabel(collection[Number(id.slice(6))]):id==='pikachu'?'Walk with Pikachu':stories.find(story=>story.id===id)?.label||'';}
  function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const visible=object=>{for(let item=object;item;item=item.parent)if(!item.visible)return false;return true;},objectHit=raycaster.intersectObjects([...new Set([...picks,...occluders])].filter(visible),false)[0],companionHit=companion?raycaster.intersectObject(companion,true)[0]:null;if(companionHit&&(!objectHit||companionHit.distance<objectHit.distance))return 'pikachu';const object=objectHit?.object;if(Number.isInteger(object?.userData.catchSlot)){const exhibit=exhibits[object.userData.catchSlot];return collection[exhibit.index]?`catch:${exhibit.index}`:null;}return object?.userData.story||null;}
  function pointerMove(event){if(transition||closing||walkActive||viewerOpen||indexOpen){setHover(null);return;}setHover(pick(event));if(hover){const rect=experience.getBoundingClientRect();Object.assign($('#pokemon-hint').style,{left:`${Math.max(15,Math.min(width-220,event.clientX-rect.left+15))}px`,top:`${Math.max(100,Math.min(height-130,event.clientY-rect.top-42))}px`});}}
  function bindUI(){
    decorateModeSelectors(experience,{mode:'play',pageURL:location.href,navigationHandled:true});
    listen($('#pokemon-back-hobbies'),'click',()=>close());listen($('#pokemon-portfolio'),'click',()=>onPortfolio());listen($('#pokemon-action'),'click',action);listen($('#pokemon-reset'),'click',resetWalk);listen($('#pokemon-retry'),'click',requestCompanion);
    listen($('#pokemon-browse'),'click',openIndex);listen($('#pokemon-view-catch'),'click',openViewer);listen($('#pokemon-collection-overview'),'click',()=>collectionOverview());listen($('#pokemon-display-prev'),'click',()=>displayPage(-1));listen($('#pokemon-display-next'),'click',()=>displayPage(1));listen($('#pokemon-image-retry'),'click',()=>{const exhibit=exhibitFor(activeIndex);if(exhibit)requestImage(exhibit);});
    listen($('#pokemon-index-close'),'click',closeIndex);listen($('#pokemon-search'),'input',event=>{indexQuery=event.target.value||'';indexPage=0;renderIndex();});listen($('#pokemon-index-prev'),'click',()=>{indexPage--;renderIndex();});listen($('#pokemon-index-next'),'click',()=>{indexPage++;renderIndex();});listen($('#pokemon-index-grid'),'click',event=>{const button=event.target.closest?.('[data-pgr-catch]');if(button)selectCatch(Number(button.dataset.catchIndex));});
    listen($('#pokemon-viewer-close'),'click',closeViewer);listen($('#pokemon-catch-prev'),'click',()=>viewerStep(-1));listen($('#pokemon-catch-next'),'click',()=>viewerStep(1));listen($('#pokemon-viewer-retry'),'click',loadFullCapture);
    experience.querySelectorAll('[data-pgr-story]').forEach(button=>listen(button,'click',()=>selectStory(button.dataset.pgrStory)));
    listen(renderer.domElement,'pointermove',pointerMove);listen(renderer.domElement,'pointerleave',()=>{pointerDown=null;setHover(null);});listen(renderer.domElement,'pointercancel',()=>{pointerDown=null;});listen(renderer.domElement,'pointerdown',event=>{pointerDown=event.button===0?{x:event.clientX,y:event.clientY}:null;});listen(renderer.domElement,'pointerup',event=>{const press=pointerDown;pointerDown=null;if(event.button!==0||!press||Math.hypot(event.clientX-press.x,event.clientY-press.y)>6)return;if(closing||viewerOpen||indexOpen)return;const id=pick(event);if(id?.startsWith('catch:')){const index=Number(id.slice(6));if(galleryFocused&&activeIndex===index&&!transition&&!walkActive)openViewer();else selectCatch(index);}else if(id==='pikachu'){if(selected!=='outdoors')selectStory('outdoors');else startWalk();}else if(id){if(id===selected&&id==='childhood')selectStory('outdoors');else selectStory(id);}});
    listen(document,'keydown',event=>{
      if(!opened||event.defaultPrevented)return;
      if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey||(event.shiftKey&&event.key!=='Tab'))return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!event.repeat)cancel({fromKeyboard:true});return;}
      if((viewerOpen||indexOpen)&&event.key==='Tab'){const layer=viewerOpen?$('#pokemon-viewer'):$('#pokemon-index'),controls=[...layer.querySelectorAll('button,input')].filter(item=>!item.disabled&&!item.closest('[hidden],[inert]'));if(!controls.length)return;const first=controls[0],last=controls.at(-1),current=document.activeElement;if(event.shiftKey&&current===first||!event.shiftKey&&current===last||!controls.includes(current)){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}return;}
      if(closing||isKeyboardShortcutBlocked(event)||event.target?.closest?.('#pokemon-experience')!==experience)return;
      const direction=getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);
      if(direction||boundary){
        consumeNavigationKey(event);
        if(viewerOpen){viewerStep(boundary==='first'?-activeIndex:boundary==='last'?collection.length-1-activeIndex:direction);return;}
        if(indexOpen){navigateIndex(direction,boundary);return;}
        const storyButton=event.target.closest?.('[data-pgr-story]');
        if(selected!=='outdoors'||storyButton){const index=stories.findIndex(item=>item.id===selected),next=boundary==='first'?0:boundary==='last'?stories.length-1:THREE.MathUtils.clamp(index+direction,0,stories.length-1);selectStory(stories[next].id,{focus:false});if(storyButton)experience.querySelector(`[data-pgr-story="${stories[next].id}"]`)?.focus({preventScroll:true});return;}
        selectCatch(boundary==='first'?0:boundary==='last'?collection.length-1:galleryFocused?activeIndex+direction:activeIndex,{guided:false,focus:false});return;
      }
      if((event.key==='Enter'||event.key===' ')&&event.target===host){consumeNavigationKey(event);if(event.repeat)return;if(selected==='outdoors'){if(galleryFocused)openViewer();else selectCatch(activeIndex,{guided:false,focus:false});}else action();}
    });
    listen(document,'visibilitychange',()=>{if(!document.hidden)dirtyFrame();});listen(window,'pagehide',()=>{if(!opened)return;stopWalk();if(transition){const t=transition;camera.position.copy(t.pose.position);target.copy(t.pose.target);camera.fov=t.pose.fov;applyProjection(t.pose.shift||0);camera.lookAt(target);if(t.throughDoor)applyDoor(1);else if(t.closeDoor)applyDoor(0);transition=null;experience.classList.remove('pgr-moving');t.onComplete?.();}if(opened){if(galleryFocused)setCompanionAtExhibit();updateContent();dirtyFrame();}});listen(query,'change',()=>{if(reduced()){if(transition)transition.started=clock-transition.duration;if(walkActive){walkProgress=1;walkDistance=walkLength;walkActive=false;settling=0;placeCompanion(1,0,true);updateContent();}dirtyFrame();}});
  }
  function cancel({fromKeyboard=false}={}){if(!opened)return false;const now=performance.now();if(!fromKeyboard&&now-lastEscape<180)return true;lastEscape=now;if(closing)return true;if(viewerOpen)closeViewer();else if(indexOpen)closeIndex();else if(walkActive){stopWalk();transition=null;experience.classList.remove('pgr-moving');updateContent();$('#pokemon-action').focus({preventScroll:true});status.textContent='Walk stopped. View the capture, choose another or use the return button.';}else if(galleryFocused)collectionOverview();else close();return true;}
  function resize(){if(!opened||!camera)return;const rect=experience.getBoundingClientRect();width=Math.max(1,rect.width||container.clientWidth||window.innerWidth);height=Math.max(1,rect.height||container.clientHeight||window.innerHeight);renderer.setPixelRatio(Math.min(saved?.pixelRatio||1,1.6));renderer.setSize(width,height,false);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);camera.aspect=width/height;applyProjection(projectionShift);dirtyFrame();}
  function open({returnFocus,initialCollection=false}={}){
    if(dead)throw new Error('Pokemon room has been disposed.');if(opened)return false;opened=true;closing=false;generation++;clock=0;renderedFrames=0;openingElapsed=0;walkActive=false;walkProgress=0;walkElapsed=0;walkDistance=0;settling=0;walkCurve=new THREE.CatmullRomCurve3([v(1,.15,-10),v(1.1,.15,-10.1)]);walkLength=walkCurve.getLength();walkDuration=7.5;doorProgress=0;selected='childhood';transition=null;assetStatus='idle';assetError='';lastEscape=-Infinity;projectionShift=0;galleryFocused=false;displayStart=-1;indexOpen=viewerOpen=false;layerSiblings=[];pointerDown=null;activeIndex=Math.min(activeIndex,Math.max(0,collection.length-1));target.copy(poses.threshold.target);externalFocus=returnFocus||document.activeElement;
    try{mount();borrowRenderer();buildScene();bindUI();resize();updateContent();requestCompanion();const token=generation;document.fonts?.ready?.then(()=>{if(!opened||token!==generation)return;labels.forEach(({texture,draw})=>{draw();texture.needsUpdate=true;});dirtyFrame();});veil.style.opacity=reduced()?'0':'1';host.focus({preventScroll:true});if(initialCollection)collectionOverview({focus:false});else moveTo(poses.childhood,1800,()=>{if(!opened||closing)return;status.textContent='Inside the story. Three places connect a childhood wish to this garden.';},{entry:true});return true;}catch(error){finishClose(false);throw error;}
  }
  function close({immediate=false,notify=true}={}){if(!opened)return false;if(closing&&!immediate)return false;closing=true;releaseLayer();stopWalk();setHover(null);experience.dataset.phase='returning';if(immediate||reduced()){finishClose(notify);return true;}moveTo(poses.threshold,1500,()=>finishClose(notify),{exit:true});return true;}
  function finishClose(notify){
    if(!opened)return;generation++;clearImageRequests();releaseLayer();assetController?.abort();assetController=null;requestSerial++;opened=false;closing=false;walkActive=false;transition=null;dirty=false;listeners.splice(0).forEach(remove=>remove());releaseCompanion();resources.instanced.forEach(value=>value.dispose());resources.light.forEach(light=>light.shadow?.dispose());resources.geometry.forEach(value=>value.dispose());resources.material.forEach(value=>value.dispose());resources.texture.forEach(value=>value.dispose());Object.values(resources).forEach(set=>set.clear());geometryCache.clear();doors.length=0;picks.length=0;occluders.length=0;labels.length=0;exhibits.length=0;Object.keys(palette).forEach(key=>delete palette[key]);scene?.clear();restoreRenderer();experience?.remove();experience=host=veil=status=scene=camera=trailLight=screenGlow=screenLight=modelRing=null;assetStatus='idle';const focus=externalFocus;externalFocus=null;if(notify){try{onClose();}finally{if(focus?.isConnected&&!focus.disabled)focus.focus({preventScroll:true});}}
  }
  function update(dtSeconds=0){
    if(!opened||!scene||document.hidden||viewerOpen||indexOpen)return false;const dt=Math.min(.1,Math.max(0,Number(dtSeconds)||0));clock+=dt*1000;
    if(!closing&&openingElapsed<.45){openingElapsed+=dt;veil.style.opacity=reduced()?'0':String(Math.max(0,1-openingElapsed/.45));dirty=true;}
    if(reduced()&&transition)transition.started=clock-transition.duration;
    if(transition){
      const t=reduced()?1:Math.min(1,(clock-transition.started)/transition.duration),ease=t*t*(3-2*t);
      if(transition.path)camera.position.copy(transition.path.getPoint(ease));else camera.position.lerpVectors(transition.startPosition,transition.pose.position,ease);
      target.lerpVectors(transition.startTarget,transition.pose.target,ease);
      if(transition.guide&&walkActive){
        // Keep the travelling composition anchored to the actual curved walk,
        // rather than letting a straight camera interpolation lose the guide.
        walkCurve.getPointAt(Math.min(1,(walkElapsed+dt)/walkDuration),guidePoint);
        guideBaseline.lerpVectors(transition.guide.start,transition.guide.end,ease);
        guidePoint.sub(guideBaseline);camera.position.add(guidePoint);target.add(guidePoint);
      }
      const guideBreathingRoom=transition.guide&&walkActive ? .035*Math.sin(Math.PI*t) : 0;
      camera.fov=THREE.MathUtils.lerp(transition.startFov,transition.pose.fov,ease);applyProjection(THREE.MathUtils.lerp(transition.startShift||0,transition.pose.shift||0,ease)+guideBreathingRoom);camera.lookAt(target);
      if(transition.throughDoor)applyDoor(THREE.MathUtils.lerp(transition.startDoor,1,Math.min(1,t*2.5)));
      if(transition.closeDoor)applyDoor(THREE.MathUtils.lerp(transition.startDoor,0,THREE.MathUtils.smoothstep(t,.65,1)));
      if(closing)veil.style.opacity=String(Math.max(0,(t-.72)/.28));dirty=true;
      if(t===1){const done=transition.onComplete;transition=null;experience.classList.remove('pgr-moving');done?.();}
    }
    if(!opened)return false;
    if(walkActive){if(reduced())walkElapsed=walkDuration;else walkElapsed+=dt;walkProgress=Math.min(1,walkElapsed/walkDuration);walkDistance=walkLength*walkProgress;placeCompanion(walkProgress,dt,reduced());dirty=true;if(walkProgress===1){walkActive=false;settling=.28;updateContent();status.textContent=`Arrived at ${catchLabel(collection[activeIndex])}. View the capture or choose another.`;}}
    else if(settling>0){settling=Math.max(0,settling-dt);placeCompanion(walkProgress,dt,settling===0);if(settling===0&&galleryFocused)setCompanionAtExhibit();dirty=true;}
    experience.dataset.phase=closing?'returning':transition?'moving':walkActive?'walking':'viewing';if(!dirty)return false;renderer.render(scene,camera);renderedFrames++;dirty=false;return true;
  }
  function diagnostics(){return {isOpen:opened,opened,phase:!opened?'closed':closing?'returning':viewerOpen?'capture':indexOpen?'index':transition?'moving':walkActive?'walking':'viewing',selected,lastSelected,moving:Boolean(transition),walkActive,walkProgress,assetStatus,assetError,renderedFrames,doorProgress,collectionCount:collection.length,activeId:collection[activeIndex]?.id||null,activeIndex,displayStart,galleryFocused,loadedImages:exhibits.filter(exhibit=>exhibit.status==='ready').length,pendingImages:exhibits.filter(exhibit=>exhibit.cancel).length,sceneImageTextures:exhibits.length,viewerOpen,indexOpen,indexPage,ownedGeometries:resources.geometry.size,ownedMaterials:resources.material.size,ownedTextures:resources.texture.size,drawCalls:opened?renderer.info.render.calls:0,triangles:opened?renderer.info.render.triangles:0,ownsRenderer:false};}
  function dispose(){if(dead)return;close({immediate:true,notify:false});dead=true;}
  return {open,close,cancel,update,resize,dispose,diagnostics,get isOpen(){return opened;}};
}



