import {decorateModeSelectors} from './mode-selector.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LISTENING_COLLECTION } from './listening-room-data.js';
import {getHorizontalNavigation,getBoundaryNavigation,consumeNavigationKey} from './keyboard-navigation.js';

/**
 * Media-led interior borrowing the application's single renderer. The parent
 * personal-room manager owns the animation loop. The approved reference proof
 * is qa/listening-room-review.html; media belongs to its physical place here.
 */
export function createListeningRoom({renderer,container,isReduced,onClose=()=>{},onPortfolio=()=>{}}={}) {
  if(!renderer?.domElement||!container)throw new Error('Listening Room requires the existing renderer and a container.');
  const collection=LISTENING_COLLECTION,v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const views={
    threshold:{position:v(-13.7,3.05,7.3),target:v(-6.5,2.5,2.35),fov:48},
    room:{position:v(3.4,4.3,7.5),target:v(0,2,-1.5),fov:65},
    spontaneous:{position:v(2.05,3.02,3.9),target:v(2.05,3.02,-2.66),fov:44},
    'tiny-desk':{position:v(2.05,3.02,3.9),target:v(2.05,3.02,-2.66),fov:44},
    junoon:{position:v(-4.3,3.15,.6),target:v(-4.3,3.15,-4.73),fov:43},
    family:{position:v(-1.8,3.12,.55),target:v(-1.8,3.12,-4.73),fov:43},
  };
  const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  // A supplied callback already resolves the app override and OS preference.
  const shouldReduceMotion=()=>typeof isReduced==='function'?Boolean(isReduced()):motionQuery.matches;
  const resources={geometry:new Set(),material:new Set(),texture:new Set(),lights:new Set(),instanced:new Set()};
  const picks=[],placards=[],pendingImages=[],listeners=[];
  const itemMeshes=new Map(),recordingPosters=new Map(),boxGeometry=new Map();
  const palette={},raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),pointerPixel={x:0,y:0};
  let experience=null,host=null,status=null,player=null,playerSurface=null;
  let scene=null,camera=null,door=null,doorLeaf=null,roomGroup=null,monitorScreen=null,veil=null;
  let opened=false,closing=false,dead=false,dirty=false,clock=0,renderedFrames=0,generation=0;
  let width=1,height=1,saved=null,externalFocus=null,lastFocused=null;
  let photoViewerOpen=false,photoViewerSiblings=[];
  let activeView='threshold',activeId=null,selectedId=null,transition=null,pointerDown=null,queuedSelection=null;
  let playerOpen=false,assetsReady=false,assetsLoading=false,cameraShift=0,openingElapsed=0,closingVeilStart=0;
  let fullscreenIntent=false,fullscreenObserved=false,lastFullscreenExit=-Infinity,lastEscapeHandled=-Infinity;
  let target=views.threshold.target.clone(),doorAngle=0,hoverId=null;
  const $=selector=>experience?.querySelector(selector);
  const listen=(element,type,handler,options)=>{element.addEventListener(type,handler,options);listeners.push(()=>element.removeEventListener(type,handler,options));};
  function ownGeometry(geometry){resources.geometry.add(geometry);return geometry;}
  function material(color,extra={}){const result=new THREE.MeshStandardMaterial({color,roughness:.83,...extra});resources.material.add(result);return result;}
  function assetUrl(path){const source=path.replace(/^\.\//,'');return new URL('../'+(source.startsWith('assets/')?source:'assets/personal/'+source),import.meta.url).href;}
  function isRecording(id){return Boolean(collection[id]?.video);}
  function mount(){
    const template=document.createElement('template');
    template.innerHTML="<section id=\"listening-experience\" aria-label=\"Listening Room\">\n    <div id=\"listening-scene\" aria-hidden=\"true\"></div>\n    <div class=\"vignette\" aria-hidden=\"true\"></div>\n    <header class=\"masthead\">\n      <button class=\"garden-link\" id=\"listening-back-hobbies\" type=\"button\">Back to Hobbies</button>\n      <span class=\"study-label\">A room to listen.</span>\n      <span class=\"mode-switch\" data-mode-switch id=\"listening-portfolio\">Portfolio / Play</span>\n    </header>\n\n    <section id=\"threshold\" class=\"threshold-copy\" aria-labelledby=\"entry-heading\">\n      <p class=\"eyebrow\">Lakshya, away from the desk</p>\n      <h1 id=\"entry-heading\">There’s usually<br>a song.</h1>\n      <p class=\"entry-description\">I sing when I’m happy, and singing helps me slow down. Come in for a recording or a moment from the stage.</p>\n      \n      <p class=\"concept-note\">Two recordings and a few moments from the stage.</p>\n    </section>\n\n    <section id=\"room-controls\" class=\"room-controls\" aria-label=\"Room navigation\" hidden>\n      <div class=\"room-heading\">\n        <div><p class=\"eyebrow\">Make yourself at home</p><h1>A song, shared with you.</h1></div>\n        <button id=\"leave-room\" class=\"quiet-button\" type=\"button\">Back to Hobbies</button>\n      </div>\n      <p class=\"room-instruction\">Choose a video to watch or a photograph to read.</p>\n    </section>\n\n    <nav id=\"collection\" class=\"collection\" aria-label=\"Lakshya’s singing collection\" hidden>\n      <p class=\"collection-label\">The collection</p>\n      <div class=\"collection-items\">\n        <button type=\"button\" data-select=\"spontaneous\" aria-pressed=\"false\"><span class=\"item-number\">01</span><span><strong>Just felt like singing</strong><small>Watch video · 1:10</small></span></button>\n        <button type=\"button\" data-select=\"tiny-desk\" aria-pressed=\"false\"><span class=\"item-number\">02</span><span><strong>At Tiny Desk</strong><small>Watch video · 2:00</small></span></button>\n        <button type=\"button\" data-select=\"junoon\" aria-pressed=\"false\"><span class=\"item-number\">03</span><span><strong>A moment at Junoon</strong><small>Open photo · college performance</small></span></button>\n        <button type=\"button\" data-select=\"family\" aria-pressed=\"false\"><span class=\"item-number\">04</span><span><strong>A song with family</strong><small>Open photo · family function</small></span></button>\n      </div>\n    </nav>\n\n    <section id=\"item-context\" class=\"item-context\" aria-labelledby=\"item-title\" hidden>\n      <button id=\"back-room\" class=\"quiet-button back-button\" type=\"button\">Back to recordings</button>\n      <p id=\"item-type\" class=\"eyebrow\"></p>\n      <h2 id=\"item-title\"></h2>\n      <p id=\"item-description\"></p>\n      <button id=\"view-singing-photo\" class=\"button primary\" type=\"button\" hidden>View photograph</button>\n      <button id=\"watch-recording\" class=\"button primary\" type=\"button\" hidden>Open recording</button>\n      <p id=\"player-hint\" class=\"player-hint\" hidden>Press Play on the screen. Take your time.</p>\n      <button id=\"expand-recording\" class=\"text-button\" type=\"button\" hidden>Expand video</button>\n    </section>\n\n    <div id=\"player-surface\" hidden>\n      <video id=\"recording-player\" controls playsinline preload=\"none\" aria-label=\"Lakshya’s spontaneous singing recording\"></video>\n    </div>\n    <div id=\"object-hint\" class=\"object-hint\" hidden></div>\n    <p id=\"status\" class=\"sr-only\" aria-live=\"polite\">Listening Room is ready.</p>\n    <div id=\"fallback\" class=\"fallback\" hidden><h1>The room needs WebGL.</h1><p>Your browser could not open the 3D view. The recordings and photographs remain available below.</p><a href=\"#\">Watch the spontaneous singing recording</a><a href=\"#\">Watch the Tiny Desk performance</a><a href=\"#\">Junoon photograph</a><a href=\"#\">Family performance photograph</a></div>\n    <footer class=\"review-footer\"><span id=\"view-label\">At the doorway</span><span id=\"load-label\">No audio plays automatically.</span></footer>\n  </section>";
    experience=template.content.firstElementChild;container.appendChild(experience);
    host=$('#listening-scene');status=$('#status');player=$('#recording-player');playerSurface=$('#player-surface');
    veil=document.createElement('div');veil.className='listening-veil';veil.setAttribute('aria-hidden','true');experience.appendChild(veil);
    $('#leave-room').hidden=true;
    const photoViewer=document.createElement('section');photoViewer.id='listening-photo-viewer';photoViewer.hidden=true;photoViewer.setAttribute('aria-labelledby','listening-photo-title');photoViewer.innerHTML='<header><h2 id="listening-photo-title"></h2><button type="button" id="listening-photo-close" class="quiet-button">Back to recordings</button></header><div class="singing-photo-layout"><figure><img id="listening-full-photo" alt=""><figcaption id="listening-photo-caption"></figcaption></figure><aside><p class="eyebrow">A moment from the stage</p><p id="listening-photo-description"></p><nav aria-label="Performance photographs"><button type="button" id="listening-photo-prev" class="quiet-button">Previous photograph</button><span id="listening-photo-count" role="status" aria-live="polite"></span><button type="button" id="listening-photo-next" class="quiet-button">Next photograph</button></nav><p id="listening-photo-error" role="status" hidden></p></aside></div>';experience.append(photoViewer);
    experience.setAttribute('aria-description','A and D or Left and Right browse the collection. Home and End choose the first or last item. Escape returns one level. Video controls keep their normal keys.');
    experience.querySelector('.room-instruction').textContent='Choose a video or photograph below. Left / Right changes selection; Escape goes back.';
    const links=$('#fallback').querySelectorAll('a');
    ['spontaneous','tiny-desk','junoon','family'].forEach((id,index)=>{links[index].href=assetUrl(collection[id].video||collection[id].image);});
  }
  function snapshotRenderer(){
    const canvas=renderer.domElement;
    return {parent:canvas.parentNode,sibling:canvas.nextSibling,style:canvas.getAttribute('style'),
      size:renderer.getSize(new THREE.Vector2()),pixelRatio:renderer.getPixelRatio(),
      viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),
      target:renderer.getRenderTarget(),clearColor:renderer.getClearColor(new THREE.Color()),clearAlpha:renderer.getClearAlpha(),
      toneMapping:renderer.toneMapping,toneMappingExposure:renderer.toneMappingExposure,outputColorSpace:renderer.outputColorSpace,
      autoClear:renderer.autoClear,autoClearColor:renderer.autoClearColor,autoClearDepth:renderer.autoClearDepth,autoClearStencil:renderer.autoClearStencil,
      shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type,shadowAutoUpdate:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate};
  }
  function borrowRenderer(){
    saved=snapshotRenderer();host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
    renderer.autoClear=renderer.autoClearColor=renderer.autoClearDepth=renderer.autoClearStencil=true;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    renderer.setRenderTarget(null);renderer.setScissorTest(false);
  }
  function restoreRenderer(){
    if(!saved)return;const canvas=renderer.domElement,original=saved;saved=null;
    if(original.parent){if(original.sibling?.parentNode===original.parent)original.parent.insertBefore(canvas,original.sibling);else original.parent.appendChild(canvas);}else canvas.remove();
    renderer.setPixelRatio(original.pixelRatio);renderer.setSize(original.size.x,original.size.y,false);
    renderer.outputColorSpace=original.outputColorSpace;renderer.toneMapping=original.toneMapping;renderer.toneMappingExposure=original.toneMappingExposure;
    renderer.autoClear=original.autoClear;renderer.autoClearColor=original.autoClearColor;renderer.autoClearDepth=original.autoClearDepth;renderer.autoClearStencil=original.autoClearStencil;
    renderer.shadowMap.enabled=original.shadowEnabled;renderer.shadowMap.type=original.shadowType;renderer.shadowMap.autoUpdate=original.shadowAutoUpdate;renderer.shadowMap.needsUpdate=original.shadowNeedsUpdate;
    renderer.setClearColor(original.clearColor,original.clearAlpha);renderer.setRenderTarget(original.target);
    renderer.setViewport(original.viewport);renderer.setScissor(original.scissor);renderer.setScissorTest(original.scissorTest);
    if(original.style===null)canvas.removeAttribute('style');else canvas.setAttribute('style',original.style);
  }
  function buildScene(){
    scene=new THREE.Scene();scene.background=new THREE.Color('#dce2d1');scene.fog=new THREE.Fog('#dce2d1',28,58);
    camera=new THREE.PerspectiveCamera(48,width/height,.1,90);camera.position.copy(views.threshold.position);camera.lookAt(target);
    Object.assign(palette,{plaster:material('#eee7d5'),plasterLight:material('#f8f0dc'),forest:material('#45634d'),wood:material('#b78350'),darkWood:material('#795133'),paleWood:material('#d6b88a'),brass:material('#a58842',{metalness:.55,roughness:.4}),charcoal:material('#28352d'),linen:material('#eee3c8'),brown:material('#856849'),rug:material('#a5ad8e'),ground:material('#bdc9ad'),path:material('#d8c5a1'),glass:material('#8bafa2',{roughness:.28})});
    scene.add(new THREE.HemisphereLight('#fff5db','#889676',2.1));
    const sun=new THREE.DirectionalLight('#fff0d1',3.1);sun.position.set(-6,13,7);sun.castShadow=true;
    sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-14,right:14,top:13,bottom:-13,near:.5,far:35});sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;scene.add(sun);resources.lights.add(sun);
    const windowLight=new THREE.PointLight('#fff2d4',15,15,2);windowLight.position.set(5.7,4.5,-1);scene.add(windowLight);
    buildGround();buildArchitecture();buildRoom();scene.traverse(object=>{if(object.isInstancedMesh)resources.instanced.add(object);});
    renderer.shadowMap.needsUpdate=true;
  }

  function box(width, height, depth, mat, parent, x = 0, y = 0, z = 0, radius = 0) {
  const key = `${width},${height},${depth},${radius}`;
  let geometry = boxGeometry.get(key);
  if (!geometry) { geometry = ownGeometry(radius ? new RoundedBoxGeometry(width, height, depth, 2, radius) : new THREE.BoxGeometry(width, height, depth)); boxGeometry.set(key, geometry); }
  const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(top, bottom, height, mat, parent, x, y, z, segments = 12) {
  const mesh = new THREE.Mesh(ownGeometry(new THREE.CylinderGeometry(top, bottom, height, segments)), mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(radius, mat, parent, x, y, z, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(ownGeometry(new THREE.SphereGeometry(radius, 12, 8)), mat); mesh.position.set(x, y, z); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function label(text, width, height, parent, x, y, z, options = {}) {
  const canvas = document.createElement('canvas'); canvas.width = Math.round(width * 180); canvas.height = Math.round(height * 180);
  const context = canvas.getContext('2d');
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = options.background || '#eee6d1'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = options.color || '#304c38';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = `${options.weight || '600'} ${options.size || Math.round(canvas.height * .32)}px "${options.heading ? 'Mochiy Pop P One' : 'DM Sans'}", sans-serif`;
    const lines = text.split('\n'), lineHeight = canvas.height / Math.max(lines.length + .8, 1.8);
    lines.forEach((line, index) => context.fillText(line, canvas.width / 2, canvas.height / 2 + (index - (lines.length - 1) / 2) * lineHeight, canvas.width - 20));
  };
  draw(); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; resources.texture.add(texture); placards.push({ texture, draw });
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }); resources.material.add(mat);
  const mesh = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(width, height)), mat); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function buildGround() {
  box(100, .24, 100, palette.ground, scene, 0, -.42, 0);
  const path = box(12, .05, 3.15, palette.path, scene, -12.4, -.26, 2.5, .1);
  path.rotation.y = -.045;
  // A few shared garden forms establish continuity without adding model downloads.
  const canopyGeometry = ownGeometry(new THREE.IcosahedronGeometry(1, 1));
  const canopyMaterial = material('#7a9569');
  [[-13.5,-5.2,2.7],[-5.3,10.4,2.8],[9.2,-7,3.5],[10,4,2.9],[-1.6,-8,3.9]].forEach(([x,z,h],i) => {
    cylinder(.13,.22,h,palette.darkWood,scene,x,h/2-.2,z,7);
    const canopy = new THREE.Mesh(canopyGeometry,canopyMaterial); canopy.position.set(x,h+.2,z); canopy.scale.set(1.3+i%2*.2,1.6,1.3); canopy.castShadow=true; scene.add(canopy);
  });
  [[-8.9,5.9,.52],[-9.3,6.6,.32],[-9.7,-1.5,.43],[8.9,4.4,.6]].forEach(([x,z,r]) => sphere(r,palette.rug,scene,x,r*.36-.16,z,[1,.6,.8]));
}
function buildArchitecture() {
  roomGroup = new THREE.Group(); scene.add(roomGroup);
  box(14.5,.4,11.6,palette.darkWood,roomGroup,0,-.17,.55,.08);
  const plankGeo = ownGeometry(new THREE.BoxGeometry(.48,.07,11.15));
  const planks = new THREE.InstancedMesh(plankGeo,palette.paleWood,29); const dummy=new THREE.Object3D();
  for(let i=0;i<29;i++){dummy.position.set(-6.9+i*.492,.07,.55);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);}
  planks.receiveShadow=true;roomGroup.add(planks);
  // Split walls preserve a real opening in the left wall and a large right window.
  box(14.3,5.8,.24,palette.plaster,roomGroup,0,2.9,-5.1);
  box(.24,5.8,5.9,palette.plaster,roomGroup,-7.1,2.9,-2.05);
  box(.24,5.8,1.6,palette.plaster,roomGroup,-7.1,2.9,5.1);
  box(.24,1.5,3.4,palette.plaster,roomGroup,-7.1,5.05,2.6);
  box(.24,5.8,1.8,palette.plaster,roomGroup,7.1,2.9,-4.2);
  box(.24,5.8,4.8,palette.plaster,roomGroup,7.1,2.9,3.6);
  box(.24,1.9,4.4,palette.plaster,roomGroup,7.1,.95,-1.05);
  box(.24,.8,4.4,palette.plaster,roomGroup,7.1,5.4,-1.05);
  // Timber skirting, wall cap and two quiet ceiling beams complete the room.
  box(14.1,.18,.13,palette.wood,roomGroup,0,.2,-4.93,.025);
  box(.13,.18,5.8,palette.wood,roomGroup,-6.93,.2,-2,.025);
  box(14.4,.25,.38,palette.wood,roomGroup,0,5.75,-5.05,.035);
  box(.35,.3,11.4,palette.wood,roomGroup,-7.05,5.75,.5,.035);
  box(.35,.3,11.4,palette.wood,roomGroup,7.05,5.75,.5,.035);
  box(14,.2,.2,palette.paleWood,roomGroup,0,5.75,.25,.025);
  // The doorway faces the garden. Opening sweeps the leaf out of the passage.
  [-.04,3.18].forEach((offset) => box(.5,4.48,.23,palette.wood,roomGroup,-7.12,2.24,.95+offset,.045));
  box(.5,.3,3.7,palette.wood,roomGroup,-7.12,4.45,2.49,.04);
  box(.9,.09,3.5,palette.paleWood,roomGroup,-7.11,.11,2.49,.03);
  door = new THREE.Group();door.position.set(-7.11,.15,1.04);roomGroup.add(door);
  doorLeaf=box(.16,4.12,2.96,palette.forest,door,0,2.06,1.48,.045);
  box(.19,.14,2.68,palette.wood,door,-.02,3.84,1.48,.025);
  box(.19,.12,2.68,palette.wood,door,-.02,.32,1.48,.025);
  box(.19,.12,2.68,palette.wood,door,-.02,1.86,1.48,.025);
  const inset = box(.185,1.5,2.45,palette.darkWood,door,-.012,2.85,1.48,.03);
  inset.material = palette.forest;
  const handle = cylinder(.065,.065,.3,palette.brass,door,-.15,1.9,2.6,10);handle.rotation.z=Math.PI/2;
  label('COME ON IN',1.9,.42,door,-.105,3.1,1.5,{background:'#45634d',color:'#eee8ce',size:20}).rotation.y=-Math.PI/2;
  const sign=label('THE LISTENING ROOM',3.9,.65,roomGroup,-7.255,5.05,2.5,{background:'#d6b88a',heading:true,size:27});sign.rotation.y=-Math.PI/2;
  const doorPick=box(.2,3.8,3.0,new THREE.MeshBasicMaterial({visible:false}),roomGroup,-7.3,2.15,2.5);resources.material.add(doorPick.material);doorPick.userData.item='enter';picks.push(doorPick);
  // A framed cloud photograph creates a view rather than a second gallery.
  [[-3.33,2.25],[1.23,2.25]].forEach(([z])=>box(.2,3.35,.16,palette.wood,roomGroup,6.94,3.27,z,.025));
  [1.68,4.86].forEach(y=>box(.3,.16,4.7,palette.wood,roomGroup,6.95,y,-1.05,.025));
  box(.55,.13,4.8,palette.paleWood,roomGroup,6.8,1.69,-1.05,.03);
  box(.18,3.15,.07,palette.paleWood,roomGroup,6.93,3.26,-1.05,.02);
  const cloud = photoPlane('clouds/layers-of-cloud.webp',4.45,3.0,roomGroup,7.06,3.27,-1.05,'cover'); cloud.rotation.y=-Math.PI/2;
  // Light falling across the floor is static: no animated shader or shadow pass.
  const lightMat = new THREE.MeshBasicMaterial({color:'#fff2c2',transparent:true,opacity:.16,depthWrite:false});resources.material.add(lightMat);
  const light=box(3.8,.004,3.4,lightMat,roomGroup,4.2,.115,-.2);light.rotation.y=-.35;light.castShadow=false;light.receiveShadow=false;
}
function buildRoom() {
  // Low-key floor rug and seating leave a generous, legible route through the room.
  box(6.3,.035,4.1,palette.rug,roomGroup,-.2,.125,1.55,.04);
  for(let i=0;i<4;i++)box(.045,.005,3.8,palette.linen,roomGroup,-3.08+i*.12,.147,1.55);
  const seat=new THREE.Group();seat.position.set(-4.5,0,1.5);seat.rotation.y=.14;roomGroup.add(seat);
  [-1.23,1.23].forEach(x=>[-.52,.52].forEach(z=>cylinder(.07,.06,.48,palette.darkWood,seat,x,.32,z,8)));
  box(3,.65,1.45,palette.forest,seat,0,.77,0,.15);
  box(3.05,1.25,.36,palette.forest,seat,0,1.46,-.62,.15);
  [-1.42,1.42].forEach(x=>box(.28,.69,1.4,palette.forest,seat,x,1.08,0,.1));
  const pillow=box(.7,.73,.23,palette.linen,seat,.63,1.49,-.34,.1);pillow.rotation.z=-.17;
  const pillow2=box(.6,.68,.23,palette.paleWood,seat,-.65,1.43,-.3,.1);pillow2.rotation.z=.15;
  const table=cylinder(.63,.68,.1,palette.wood,roomGroup,-1.8,.8,2.4,24);
  cylinder(.1,.16,.7,palette.darkWood,roomGroup,-1.8,.41,2.4,12);
  cylinder(.46,.46,.055,palette.darkWood,roomGroup,-1.8,.14,2.4,20);
  const mug=cylinder(.13,.12,.21,palette.linen,roomGroup,-1.69,.96,2.39,16);
  const coffee=cylinder(.108,.108,.005,palette.darkWood,roomGroup,-1.69,1.068,2.39,16);coffee.castShadow=false;
  // The recording has a real desk, phone and microphone, not an ornamental stage.
  const deskZ=-3.25;
  box(5.0,.17,1.75,palette.wood,roomGroup,2.05,1.81,deskZ,.065);
  [-.12,4.22].forEach(x=>[-3.84,-2.65].forEach(z=>box(.14,1.65,.14,palette.darkWood,roomGroup,x,.9,z,.025)));
  box(4.5,.11,.12,palette.darkWood,roomGroup,2.05,.73,-3.78,.02);
  // The native HTML video is registered to this plane after the camera settles.
  box(4.02,2.39,.19,palette.darkWood,roomGroup,2.05,3.02,-2.81,.09);
  box(3.84,2.22,.025,palette.charcoal,roomGroup,2.05,3.02,-2.7,.025);
  monitorScreen=photoPlane(collection.spontaneous.image,3.7,2.08,roomGroup,2.05,3.02,-2.675,'contain','#1e2922');
  monitorScreen.userData.item='spontaneous';picks.push(monitorScreen);itemMeshes.set('spontaneous',monitorScreen);
  recordingPosters.set('spontaneous',monitorScreen.material.map);
  const secondPoster=photoPlane(collection['tiny-desk'].image,3.7,2.08,roomGroup,2.05,3.02,-2.675,'contain','#1e2922');secondPoster.visible=false;
  recordingPosters.set('tiny-desk',secondPoster.material.map);
  box(.2,.37,.15,palette.charcoal,roomGroup,2.05,1.98,-2.99,.03);
  box(1.0,.07,.65,palette.charcoal,roomGroup,2.05,1.93,-2.95,.05);
  // Two visible recording sleeves share this one listening screen. Poster maps
  // are reused; each physical sleeve has an equivalent named HTML control.
  ['spontaneous','tiny-desk'].forEach((id,index)=>{
    const x=1.14+index*1.82;
    box(1.48,.99,.1,palette.darkWood,roomGroup,x,1.22,-2.36,.035);
    const cardMaterial=new THREE.MeshBasicMaterial({map:recordingPosters.get(id)});resources.material.add(cardMaterial);
    const card=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(1.32,.742)),cardMaterial);card.position.set(x,1.3,-2.302);card.userData.item=id;roomGroup.add(card);picks.push(card);
    label(index?'02  TINY DESK':'01  SPONTANEOUS',1.35,.17,roomGroup,x,.82,-2.302,{size:16,background:'#795133',color:'#f0e7ce'});
  });
  // Phone rests upright in its cradle; the front is deliberately small and quiet.
  const phone=new THREE.Group();phone.position.set(.14,1.94,-3.0);phone.rotation.y=.28;phone.rotation.x=-.12;roomGroup.add(phone);
  box(.36,.67,.055,palette.charcoal,phone,0,.3,0,.035);
  box(.28,.54,.006,palette.glass,phone,0,.32,.035,.02);
  box(.52,.045,.35,palette.darkWood,phone,0,-.02,0,.025);
  cylinder(.23,.23,.06,palette.charcoal,roomGroup,4.08,1.95,-2.98,20);
  cylinder(.025,.025,.51,palette.brass,roomGroup,4.08,2.22,-2.98,10);
  const mic=box(.19,.36,.17,palette.charcoal,roomGroup,4.08,2.61,-2.98,.075);mic.rotation.z=-.15;
  for(let i=0;i<4;i++)box(.16,.014,.006,palette.paleWood,roomGroup,4.07,2.52+i*.05,-2.883,.002);
  // Two truthful photographic memories form the room's second focal point.
  framedPhoto('junoon',-4.3,3.15,2.16,2.16,'03  JUNOON');
  framedPhoto('family',-1.8,3.12,2.24,1.5,'04  FAMILY');
  label('Songs are better shared.',5.0,.45,roomGroup,-2.9,4.83,-4.95,{heading:true,size:31,background:'#eee7d5',color:'#4d6348'});
  // Small open storage, with three recording sleeves rather than a fictitious discography.
  const shelf=new THREE.Group();shelf.position.set(5.85,0,2.65);shelf.rotation.y=-Math.PI/2;roomGroup.add(shelf);
  [-.91,.91].forEach(x=>box(.12,2.45,.68,palette.wood,shelf,x,1.36,0,.035));
  [.22,1.25,2.51].forEach(y=>box(1.95,.12,.7,palette.wood,shelf,0,y,0,.035));
  box(1.75,2.24,.05,palette.darkWood,shelf,0,1.36,-.32,.02);
  [-.65,-.44,-.25,.03,.23,.47,.65].forEach((x,i)=>{const book=box(.13,.55+(i%3)*.06,.4,[palette.forest,palette.linen,palette.paleWood][i%3],shelf,x,.58,0,.018);book.rotation.z=(i===0?-.12:0);});
  label('RECORDINGS &\nLITTLE MEMORIES',1.34,.55,shelf,0,2.08,.36,{background:'#b78350',size:21});
  cylinder(.19,.17,.3,palette.linen,roomGroup,5.92,2.76,2.65,16);
  // A standing lamp gives the seating a human scale.
  cylinder(.31,.34,.06,palette.darkWood,roomGroup,-5.95,.2,-.15,20);
  cylinder(.027,.027,2.45,palette.brass,roomGroup,-5.95,1.46,-.15,10);
  cylinder(.38,.6,.63,palette.linen,roomGroup,-5.95,2.91,-.15,20);
  const glow=new THREE.PointLight('#ffe8b3',3.5,6,2);glow.position.set(-5.95,2.65,-.15);roomGroup.add(glow);
  // A visible interior door label provides a return destination in the world.
    const exitLabel=label('BACK TO HOBBIES',2.45,.4,roomGroup,-6.94,4.64,2.52,{size:24,background:'#d6b88a'});exitLabel.rotation.y=Math.PI/2;
}
function framedPhoto(id,x,y,width,height,caption){
  box(width+.25,height+.25,.13,palette.wood,roomGroup,x,y,-4.91,.035);
  box(width+.08,height+.08,.015,palette.linen,roomGroup,x,y,-4.827);
  const photo=photoPlane(collection[id].image,width-.12,height-.12,roomGroup,x,y,-4.806,'contain');
  photo.userData.item=id;picks.push(photo);itemMeshes.set(id,photo);
  label(caption,width,.26,roomGroup,x,y-height/2-.39,-4.89,{background:'#eee7d5',size:22,color:'#445d43'});
}
function photoPlane(path,width,height,parent,x,y,z,mode='contain',background='#e5deca'){
  const canvas=document.createElement('canvas');const scale=1024/Math.max(width,height);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const context=canvas.getContext('2d');context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());resources.texture.add(texture);
  const mat=new THREE.MeshBasicMaterial({map:texture});resources.material.add(mat);
  const mesh=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(width,height)),mat);mesh.position.set(x,y,z);parent.add(mesh);
  pendingImages.push({path,canvas,context,texture,mode,background});return mesh;
}


  async function loadImages(){
    if(assetsReady||assetsLoading||!opened)return;
    assetsLoading=true;const token=generation;$('#load-label').textContent='Opening the collection…';
    const results=await Promise.allSettled(pendingImages.map(entry=>new Promise(resolve=>{
      const image=new Image();entry.image=image;entry.cancel=()=>{image.onload=null;image.onerror=null;image.src='';resolve(false);};image.decoding='async';
      image.onload=()=>{
        if(!opened||token!==generation){resolve(false);return;}
        const {canvas,context,texture,mode,background}=entry;
        const scale=mode==='cover'?Math.max(canvas.width/image.width,canvas.height/image.height):Math.min(canvas.width/image.width,canvas.height/image.height);
        const imageWidth=image.width*scale,imageHeight=image.height*scale;
        context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,(canvas.width-imageWidth)/2,(canvas.height-imageHeight)/2,imageWidth,imageHeight);texture.needsUpdate=true;entry.cancel=null;requestFrame();resolve(true);
      };
      image.onerror=()=>{if(opened&&token===generation)console.warn('Listening Room image could not load:',entry.path);entry.cancel=null;resolve(false);};
      image.src=assetUrl(entry.path);
    })));
    if(!opened||token!==generation)return;
    assetsLoading=false;assetsReady=true;
    const failed=results.some(result=>result.status!=='fulfilled'||!result.value);
    $('#load-label').textContent=failed?'Some photographs could not load. Reopen the room to retry.':'Two recordings. Two performance photographs.';
    status.textContent=failed?'Some photographs could not load. The collection controls remain available.':'The recording posters and performance photographs are ready.';
    experience.dataset.ready='true';requestFrame();
  }
  function bindUI(){
    decorateModeSelectors(experience,{mode:'play',pageURL:location.href,navigationHandled:true});
    listen($('#listening-back-hobbies'),'click',()=>close());
    listen($('#leave-room'),'click',()=>close());
    listen($('#listening-portfolio'),'click',()=>{close({immediate:true,notify:false});onPortfolio();});
    listen($('#back-room'),'click',backToRoom);
    listen($('#watch-recording'),'click',openRecording);
    listen($('#view-singing-photo'),'click',openPhoto);
    listen($('#listening-photo-close'),'click',closePhoto);
    for(const [id,direction]of [['listening-photo-prev',-1],['listening-photo-next',1]])listen($('#'+id),'click',()=>browsePhoto(direction));
    listen($('#listening-full-photo'),'error',()=>{if(photoViewerOpen){$('#listening-photo-error').hidden=false;$('#listening-photo-error').textContent='This photograph could not load. You can choose the other one or return to the room.';}});
    listen($('#expand-recording'),'click',async()=>{
      if(!playerOpen)return;fullscreenIntent=true;
      try{if(player.requestFullscreen)await player.requestFullscreen();else if(player.webkitEnterFullscreen)player.webkitEnterFullscreen();}
      catch(error){fullscreenIntent=false;if(opened)status.textContent='Fullscreen could not open. The recording remains on the room screen.';console.warn('Fullscreen could not open.',error);}
    });
    listen(document,'fullscreenchange',fullscreenChanged);
    listen(player,'webkitbeginfullscreen',()=>{fullscreenIntent=true;fullscreenObserved=true;});
    listen(player,'webkitendfullscreen',fullscreenEnded);
    experience.querySelectorAll('[data-select]').forEach(button=>listen(button,'click',()=>selectItem(button.dataset.select,button)));
    listen(renderer.domElement,'pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY};});
    listen(renderer.domElement,'pointermove',pointerMove);
    listen(renderer.domElement,'pointerleave',()=>setHover(null));
    listen(renderer.domElement,'pointerup',event=>{
      if(!pointerDown||Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>8)return;
      const id=pick(event);pointerDown=null;if(!id||transition||closing)return;
      if(id==='enter')close();else selectItem(id);
    });
    listen(document,'keydown',event=>{
      if(!opened||!event.target?.closest?.('#listening-experience'))return;
      if(event.key==='Escape'){
        event.stopPropagation();if(event.repeat){event.preventDefault();return;}
        const nativeFullscreen=fullscreenIntent||performance.now()-lastFullscreenExit<450;
        if(!nativeFullscreen)event.preventDefault();cancel({fromKeyboard:true});return;
      }
      // A playing recording owns its controls until explicitly closed. A room
      // navigation key must never silently change or stop someone's song.
      if(closing||playerOpen||fullscreenIntent)return;
      if(photoViewerOpen){const step=getHorizontalNavigation(event),edge=getBoundaryNavigation(event);if(step||edge){consumeNavigationKey(event);showPhotoItem(edge==='first'?'junoon':edge==='last'?'family':activeId==='junoon'&&step>0?'family':activeId==='family'&&step<0?'junoon':activeId);}return;}
      const direction=getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);
      if(!direction&&!boundary)return;
      if(transition&&activeView!=='room')return;
      const ids=['spontaneous','tiny-desk','junoon','family'],current=ids.indexOf(activeId||selectedId);
      const index=boundary==='first'?0:boundary==='last'?ids.length-1:current<0?(direction>0?0:ids.length-1):THREE.MathUtils.clamp(current+direction,0,ids.length-1);
      consumeNavigationKey(event);if(ids[index]!==activeId)selectItem(ids[index]);
    },true);
    listen(player,'play',()=>{if(opened)$('#load-label').textContent=`Now playing · ${collection[activeId]?.title||'recording'}`;});
    listen(player,'pause',()=>{if(opened&&playerOpen)$('#load-label').textContent='Recording paused · native playback controls';});
    listen(player,'ended',()=>{if(opened)$('#load-label').textContent='End of recording · stay a little longer';});
    listen(player,'error',()=>{if(opened&&playerOpen){status.textContent='The recording could not load. Return to the room and try again.';$('#player-hint').textContent='The recording could not load. Return to the room and try again.';}});
    listen(document,'visibilitychange',()=>{if(document.hidden&&playerOpen)closeRecording();else if(!document.hidden)resize();});
    // A persisted browser navigation may emit pagehide without an earlier
    // visibilitychange. Release its decoder while preserving a usable room.
    listen(window,'pagehide',()=>{if(playerOpen)closeRecording();});
    listen(window,'blur',()=>{if(playerOpen)player.pause();});
    listen(motionQuery,'change',()=>{if(transition&&shouldReduceMotion()){transition.started=clock-transition.duration;requestFrame();}});
  }
  function enterRoom(){
    activeView='room';activeId=null;setHover(null);loadImages();
    $('#threshold').hidden=true;$('#room-controls').hidden=false;$('#collection').hidden=false;$('#item-context').hidden=true;
    experience.classList.remove('is-threshold','is-item');$('#view-label').textContent='Entering the listening room';
    moveTo('room',2200,()=>{if(!opened||closing)return;if(queuedSelection){const next=queuedSelection;queuedSelection=null;selectItem(next.id,next.sourceButton);return;}$('#view-label').textContent='The listening room';status.textContent='Inside the listening room. Choose a recording or a performance photograph.';$('#listening-back-hobbies').focus({preventScroll:true});},true);
  }
  function selectItem(id,sourceButton){
    if(!collection[id]||closing||!opened)return;
    if(transition){
      if(activeView!=='room')return;
      // Collection buttons are already visible during entry and return. Keep
      // the doorway path intact, then honor the latest selection. A room-return
      // transition can retarget immediately from its actual current camera pose.
      if(transition.path){queuedSelection={id,sourceButton};selectedId=id;updateSelection();status.textContent=`Opening ${collection[id].title} after entering the room.`;return;}
    }
    queuedSelection=null;
    lastFocused=sourceButton||experience.querySelector(`[data-select="${id}"]`);releaseMedia();activeId=id;selectedId=id;activeView=id;setHover(null);
    $('#collection').hidden=true;$('#item-context').hidden=false;experience.classList.add('is-item');updateSelection();
    const item=collection[id];$('#item-type').textContent=item.type;$('#item-title').textContent=item.title;$('#item-description').textContent=item.description;
    $('#view-singing-photo').hidden=isRecording(id);$('#view-singing-photo').disabled=true;$('#watch-recording').hidden=!isRecording(id);$('#watch-recording').disabled=true;$('#player-hint').hidden=true;
    if(isRecording(id)){monitorScreen.material.map=recordingPosters.get(id);monitorScreen.userData.item=id;}
    $('#view-label').textContent=isRecording(id)?'At the listening desk':'At the performance wall';
    // A collection choice opens its content directly; a second View step is unnecessary.
    if(!isRecording(id)){transition=null;openPhoto();return;}
    moveTo(id,1150,()=>{if(!opened||closing)return;$('#watch-recording').disabled=false;status.textContent=`${item.title}. ${item.type}.`;openRecording();});
  }
  function backToRoom(){
    if(!opened||closing)return;queuedSelection=null;const previous=activeId;releaseMedia();activeView='room';activeId=null;experience.classList.remove('is-item');$('#item-context').hidden=true;$('#collection').hidden=false;$('#room-controls').hidden=false;updateSelection();
    $('#load-label').textContent='Two recordings. Two performance photographs.';
    moveTo('room',1000,()=>{if(!opened||closing)return;status.textContent='Back in the listening room.';$('#view-label').textContent='The listening room';if(previous)experience.querySelector(`[data-select="${previous}"]`).focus({preventScroll:true});});
  }
  function updateSelection(){experience.querySelectorAll('[data-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.select===selectedId)));}
  function showPhotoItem(id){
    const item=collection[id];if(!item||item.mediaType!=='image'||!photoViewerOpen)return;
    activeId=selectedId=id;activeView=id;updateSelection();$('#item-title').textContent=item.title;$('#item-type').textContent=item.type;$('#item-description').textContent=item.description;
    const image=$('#listening-full-photo');image.alt=item.alt;image.width=item.width;image.height=item.height;image.src=assetUrl(item.image);image.decoding='async';
    $('#listening-photo-title').textContent=item.title;$('#listening-photo-caption').textContent=item.caption;$('#listening-photo-description').textContent=item.description;$('#listening-photo-error').hidden=true;
    $('#listening-photo-prev').disabled=id==='junoon';$('#listening-photo-next').disabled=id==='family';$('#listening-photo-count').textContent=id==='junoon'?'1 of 2':'2 of 2';
  }
  function openPhoto(){
    if(!opened||closing||transition||photoViewerOpen||collection[activeId]?.mediaType!=='image')return;
    photoViewerOpen=true;setHover(null);$('#listening-photo-viewer').hidden=false;
    photoViewerSiblings=[...experience.children].filter(el=>el.id!=='listening-photo-viewer').map(el=>[el,el.inert]);photoViewerSiblings.forEach(([el])=>{el.inert=true;});
    showPhotoItem(activeId);status.textContent=`${collection[activeId].title}. Photograph opened.`;$('#listening-photo-close').focus({preventScroll:true});
  }
  function browsePhoto(direction){showPhotoItem(direction<0?'junoon':'family');if(document.activeElement?.disabled)$('#listening-photo-close').focus({preventScroll:true});}
  function releasePhoto(){
    if(!experience)return;$('#listening-full-photo').removeAttribute('src');$('#listening-photo-viewer').hidden=true;photoViewerOpen=false;
    photoViewerSiblings.forEach(([el,inert])=>{el.inert=inert;});photoViewerSiblings=[];
  }
  function closePhoto(){if(!photoViewerOpen)return;releasePhoto();backToRoom();}
  function openRecording(){
    if(!opened||closing||!isRecording(activeId)||transition||playerOpen)return;playerOpen=true;
    const item=collection[activeId];player.setAttribute('aria-label',`${item.title} — Lakshya’s singing recording`);player.poster=assetUrl(item.image);player.src=assetUrl(item.video);player.load();
    $('#watch-recording').hidden=true;$('#player-hint').textContent='Press Play on the screen. Take your time.';$('#player-hint').hidden=false;$('#expand-recording').hidden=!(player.requestFullscreen||player.webkitEnterFullscreen);
    playerSurface.hidden=false;alignPlayer();$('#load-label').textContent='Recording ready · press Play on the screen';status.textContent='Recording opened on the room screen. Use the native controls to play. Escape closes the recording.';player.focus({preventScroll:true});requestFrame();
  }
  function closeRecording(){if(!opened)return;backToRoom();}
  function releaseMedia(){
    if(!player)return;player.pause();player.removeAttribute('src');player.removeAttribute('poster');player.load();playerOpen=false;playerSurface.hidden=true;fullscreenIntent=false;fullscreenObserved=false;$('#expand-recording').hidden=true;
    if(document.fullscreenElement===player)document.exitFullscreen().catch(()=>{});
    else if(player.webkitDisplayingFullscreen&&player.webkitExitFullscreen)player.webkitExitFullscreen();
  }
  function fullscreenChanged(){if(document.fullscreenElement===player){fullscreenIntent=true;fullscreenObserved=true;}else if(fullscreenObserved)fullscreenEnded();}
  function fullscreenEnded(){fullscreenIntent=false;fullscreenObserved=false;lastFullscreenExit=performance.now();if(opened&&playerOpen){status.textContent='Back at the room screen. The recording remains open.';requestFrame();}}
  function cancel({fromKeyboard=false}={}){
    if(!opened)return false;const now=performance.now();
    // Some browser hosts emit both keydown and the parent dialog's cancel for
    // one Escape. They must consume one level, not two. Held keys also stop here.
    if(!fromKeyboard&&now-lastEscapeHandled<180)return true;
    lastEscapeHandled=now;if(closing)return true;
    if(fullscreenIntent||now-lastFullscreenExit<450){
      if(document.fullscreenElement===player)document.exitFullscreen().catch(()=>{});
      else if(player.webkitDisplayingFullscreen&&player.webkitExitFullscreen)player.webkitExitFullscreen();
      fullscreenEnded();return true;
    }
    if(photoViewerOpen){closePhoto();return true;}
    if(playerOpen){closeRecording();}
    else if(activeId)backToRoom();else close();return true;
  }

  function moveTo(view,duration,onComplete,doorTravel=false){
  const end=views[view];
  const startPosition=camera.position.clone(),startTarget=target.clone(),startFov=camera.fov;
  const endDoor=view==='threshold'?0:-Math.PI*.54;
  const endShift=horizontalShiftFor(view);
  if(shouldReduceMotion()){transition=null;experience.classList.remove('is-moving');camera.position.copy(end.position);target.copy(end.target);camera.fov=end.fov;doorAngle=endDoor;door.rotation.y=doorAngle;cameraShift=endShift;updateProjection();camera.lookAt(target);onComplete?.();renderer.shadowMap.needsUpdate=true;requestFrame();return;}
  let path=null;
  if(doorTravel&&view==='room')path=new THREE.CatmullRomCurve3([startPosition,v(-10.0,2.68,2.6),v(-6.1,2.67,2.7),v(-3.5,3.3,4.1),end.position]);
  if(doorTravel&&view==='threshold')path=new THREE.CatmullRomCurve3([startPosition,v(-2.6,3.1,4.05),v(-6.1,2.67,2.7),v(-10,2.7,2.6),end.position]);
  transition={started:clock,duration,startPosition,startTarget,startFov,end,path,onComplete,startDoor:doorAngle,endDoor,startShift:cameraShift,endShift};experience.classList.add('is-moving');requestFrame();
}
function tick(now){
  if(!opened||document.hidden||!scene)return;
  if(transition){
    const t=Math.min(1,(now-transition.started)/transition.duration),ease=t*t*(3-2*t);
    if(transition.path)camera.position.copy(transition.path.getPoint(ease));else camera.position.lerpVectors(transition.startPosition,transition.end.position,ease);
    target.lerpVectors(transition.startTarget,transition.end.target,ease);camera.fov=THREE.MathUtils.lerp(transition.startFov,transition.end.fov,ease);cameraShift=THREE.MathUtils.lerp(transition.startShift,transition.endShift,ease);updateProjection();
    const doorT=transition.endDoor===0?Math.max(0,(t-.7)/.3):Math.min(1,t/.32);
    const previousDoorAngle=doorAngle;
    doorAngle=THREE.MathUtils.lerp(transition.startDoor,transition.endDoor,doorT*doorT*(3-2*doorT));door.rotation.y=doorAngle;
    camera.lookAt(target);if(Math.abs(previousDoorAngle-doorAngle)>.00001)renderer.shadowMap.needsUpdate=true;
    if(t===1){const done=transition.onComplete;transition=null;experience.classList.remove('is-moving');done?.();}
  }
  if(!opened||!scene)return;renderer.render(scene,camera);renderedFrames++;dirty=false;if(playerOpen)alignPlayer();if(transition)requestFrame();
}
function requestFrame(){dirty=true;}
function alignPlayer(){
  if(!playerOpen)return;camera.updateMatrixWorld();
  const topLeft=v(2.05-3.7/2,3.02+2.08/2,-2.671).project(camera);
  const bottomRight=v(2.05+3.7/2,3.02-2.08/2,-2.671).project(camera);
  const left=(topLeft.x+1)*width/2,top=(1-topLeft.y)*height/2;
  Object.assign(playerSurface.style,{left:`${left}px`,top:`${top}px`,width:`${(bottomRight.x-topLeft.x)*width/2}px`,height:`${(topLeft.y-bottomRight.y)*height/2}px`});
}
function pick(event){
  const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(picks,false);return hits.find(hit=>activeView==='threshold'?hit.object.userData.item==='enter':hit.object.userData.item!=='enter'||doorAngle<-.5)?.object.userData.item||null;
}
function pointerMove(event){
  pointerPixel.x=event.clientX;pointerPixel.y=event.clientY;
  if(transition||playerOpen){setHover(null);return;}setHover(pick(event));
  if(hoverId){$('#object-hint').style.left=`${Math.min(width-250,event.clientX-experience.getBoundingClientRect().left+16)}px`;$('#object-hint').style.top=`${Math.max(80,Math.min(height-80,event.clientY-experience.getBoundingClientRect().top-45))}px`;}
}
function setHover(id){
  if(hoverId===id)return;hoverId=id;renderer.domElement.style.cursor=id?'pointer':'default';
  const hint=$('#object-hint');hint.hidden=!id;if(id)hint.textContent=id==='enter'?(activeView==='threshold'?'Enter the listening room':'Back through the doorway'):collection[id].action;
}
function horizontalShiftFor(view){
  if(!collection[view]||width<701)return 0;
  // Keep a frontal screen and reserve real space for the context rail. Off-axis
  // projection shifts its composition without skewing the native video plane.
  const pose=views[view],probe=new THREE.PerspectiveCamera(pose.fov,width/height,.1,90);
  probe.position.copy(pose.position);probe.lookAt(pose.target);probe.updateMatrixWorld();
  const subjectWidth=isRecording(view)?3.7:view==='junoon'?2.16:2.24;
  const left=v(pose.target.x-subjectWidth/2,pose.target.y,isRecording(view)?-2.675:-4.806).project(probe);
  const right=v(pose.target.x+subjectWidth/2,pose.target.y,isRecording(view)?-2.675:-4.806).project(probe);
  const leftPx=(left.x+1)*width/2,rightPx=(right.x+1)*width/2;
  return Math.max(0,Math.min($('#item-context').getBoundingClientRect().right-experience.getBoundingClientRect().left+22-leftPx,width-22-rightPx));
}
function updateProjection(){
  camera.aspect=width/height;
  if(cameraShift)camera.setViewOffset(width,height,-cameraShift,0,width,height);else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}


  function resize(){
    if(!opened||!experience||!camera)return;
    const rect=experience.getBoundingClientRect();width=Math.max(1,rect.width||container.clientWidth||window.innerWidth);height=Math.max(1,rect.height||container.clientHeight||window.innerHeight);
    renderer.setPixelRatio(Math.min(saved?.pixelRatio||1,1.6));renderer.setSize(width,height,false);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);
    if(transition)transition.endShift=horizontalShiftFor(activeView);else cameraShift=horizontalShiftFor(activeView);
    updateProjection();alignPlayer();requestFrame();
  }
  function open({returnFocus,returnLabel='Back to Hobbies'}={}){
    if(dead)throw new Error('Listening Room has been disposed.');if(opened)return false;
    opened=true;closing=false;generation++;clock=0;openingElapsed=0;closingVeilStart=0;renderedFrames=0;dirty=true;assetsReady=false;assetsLoading=false;activeView='threshold';activeId=null;transition=null;queuedSelection=null;target.copy(views.threshold.target);doorAngle=0;cameraShift=0;fullscreenIntent=false;fullscreenObserved=false;lastFullscreenExit=-Infinity;lastEscapeHandled=-Infinity;
    externalFocus=returnFocus||document.activeElement;
    try{
      mount();$('#listening-back-hobbies').textContent=returnLabel;borrowRenderer();const rect=experience.getBoundingClientRect();width=Math.max(1,rect.width||window.innerWidth);height=Math.max(1,rect.height||window.innerHeight);buildScene();if(isRecording(selectedId)){monitorScreen.material.map=recordingPosters.get(selectedId);monitorScreen.userData.item=selectedId;}bindUI();resize();
      experience.classList.add('is-threshold');experience.dataset.phase='entering';updateSelection();
      const token=generation;document.fonts?.ready?.then(()=>{if(!opened||token!==generation)return;placards.forEach(({texture,draw})=>{draw();texture.needsUpdate=true;});requestFrame();});
      veil.style.opacity=shouldReduceMotion()?'0':'1';$('#listening-back-hobbies').focus({preventScroll:true});enterRoom();return true;
    }catch(error){finishClose(false);throw error;}
  }
  function close({immediate=false,notify=true}={}){
    if(!opened)return false;if(closing&&!immediate)return false;
    queuedSelection=null;releasePhoto();releaseMedia();setHover(null);closing=true;closingVeilStart=Number(veil.style.opacity)||0;activeView='threshold';activeId=null;$('#collection').hidden=true;$('#item-context').hidden=true;$('#room-controls').hidden=true;experience.dataset.phase='returning';
    if(immediate||shouldReduceMotion()){finishClose(notify);return true;}
    moveTo('threshold',1500,()=>finishClose(notify),camera.position.x>-6.5);return true;
  }
  function finishClose(notify){
    if(!opened)return;generation++;releasePhoto();releaseMedia();transition=null;queuedSelection=null;closing=false;opened=false;dirty=false;
    listeners.splice(0).forEach(remove=>remove());pendingImages.forEach(entry=>{entry.cancel?.();if(entry.image){entry.image.onload=null;entry.image.onerror=null;}});
    resources.instanced.forEach(object=>object.dispose());resources.lights.forEach(light=>light.shadow?.dispose());resources.geometry.forEach(resource=>resource.dispose());resources.material.forEach(resource=>resource.dispose());resources.texture.forEach(resource=>resource.dispose());
    Object.values(resources).forEach(set=>set.clear());picks.length=0;placards.length=0;pendingImages.length=0;itemMeshes.clear();recordingPosters.clear();boxGeometry.clear();Object.keys(palette).forEach(key=>delete palette[key]);scene?.clear();
    restoreRenderer();experience?.remove();experience=null;host=null;scene=null;camera=null;door=null;doorLeaf=null;roomGroup=null;monitorScreen=null;player=null;playerSurface=null;status=null;veil=null;assetsReady=false;assetsLoading=false;
    const focus=externalFocus;externalFocus=null;
    if(notify){try{onClose();}finally{if(focus?.isConnected&&!focus.disabled)focus.focus({preventScroll:true});}}
  }
  function update(dtSeconds=0){
    if(!opened||document.hidden||!scene)return false;
    const delta=Math.min(.1,Math.max(0,Number(dtSeconds)||0));clock+=delta*1000;
    if(shouldReduceMotion()&&transition)transition.started=clock-transition.duration;
    if(!closing&&openingElapsed<.42){openingElapsed+=delta;veil.style.opacity=shouldReduceMotion()?'0':String(Math.max(0,1-openingElapsed/.42));dirty=true;}
    if(closing&&transition)veil.style.opacity=String(Math.max(closingVeilStart,(Math.min(1,(clock-transition.started)/transition.duration)-.78)/.22));
    if(photoViewerOpen)return false;if(!dirty&&!transition)return false;experience.dataset.phase=closing?'returning':transition?'moving':'viewing';tick(clock);return true;
  }
  function diagnostics(){return {phase:!opened?'closed':closing?'returning':transition?'moving':'viewing',isOpen:opened,view:activeView,selected:activeId,lastSelected:selectedId,playerOpen,photoViewerOpen,assetsReady,assetsLoading,moving:Boolean(transition),renderedFrames,mediaSources:player?.hasAttribute('src')?1:0,ownedGeometries:resources.geometry.size,ownedMaterials:resources.material.size,ownedTextures:resources.texture.size,pendingImages:pendingImages.filter(entry=>entry.cancel).length,drawCalls:opened?renderer.info.render.calls:0,triangles:opened?renderer.info.render.triangles:0,ownsRenderer:false};}
  function dispose(){if(dead)return;close({immediate:true,notify:false});dead=true;}
  return {open,close,cancel,update,resize,dispose,diagnostics,get isOpen(){return opened;}};
}
