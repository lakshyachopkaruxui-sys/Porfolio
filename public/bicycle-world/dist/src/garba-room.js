import {decorateModeSelectors} from './mode-selector.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GARBA_PHOTOS } from './garba-room-data.js';
import {getHorizontalNavigation,getBoundaryNavigation,consumeNavigationKey} from './keyboard-navigation.js';

/** An interpreted courtyard around Lakshya's real Garba photographs.
 * One borrowed renderer; the parent owns the animation loop. The light reveal
 * is a finite visual celebration, not a dance lesson or a reenacted event.
 */
export function createGarbaRoom({renderer,container,isReduced=()=>false,onClose=()=>{},onPortfolio=()=>{}}={}){
  if(!renderer?.domElement||!container)throw new Error('Garba courtyard requires the existing renderer and a container.');
  const v=(x,y,z)=>new THREE.Vector3(x,y,z),photos=GARBA_PHOTOS;
  const overview={position:v(1.2,4.5,7.2),target:v(0,2,-1.8),fov:60};
  const threshold={position:v(0,2.8,15.6),target:v(0,2.5,7.1),fov:50};
  const photoPlaces=[{x:-4.1,z:-3.8},{x:4.1,z:-3.8}];
  const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced=()=>Boolean(isReduced()||motionQuery.matches);
  const resources={geometry:new Set(),material:new Set(),texture:new Set(),lights:new Set(),instanced:new Set()};
  const listeners=[],pendingImages=[],placards=[],picks=[],photoMeshes=new Map(),geometryCache=new Map();
  let viewerSiblings=[];
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),palette={};
  let experience=null,host=null,status=null,veil=null,scene=null,camera=null,saved=null,externalFocus=null;
  let opened=false,closing=false,dead=false,dirty=false,generation=0,clock=0,renderedFrames=0;
  let width=1,height=1,view='threshold',selected=null,lastSelected=null,transition=null,viewerOpen=false;
  let target=threshold.target.clone(),pointerDown=null,hover=null,assetsReady=false,assetsLoading=false;
  let openingElapsed=0,closingVeilStart=0,circleProgress=0,circleActive=false,ringLights=null,lampFlame=null,lampLight=null,lastCircleStep=-1,lastEscapeHandled=-Infinity;
  const $=selector=>experience?.querySelector(selector);
  const listen=(element,type,fn,options)=>{element.addEventListener(type,fn,options);listeners.push(()=>element.removeEventListener(type,fn,options));};
  const assetUrl=path=>new URL('../'+path.replace(/^\.\//,''),import.meta.url).href;
  const requestRender=()=>{dirty=true;};
  const ownGeometry=geometry=>{resources.geometry.add(geometry);return geometry;};
  function material(color,extra={}){const value=new THREE.MeshStandardMaterial({color,roughness:.87,...extra});resources.material.add(value);return value;}
  function mount(){
    const section=document.createElement('section');section.id='garba-experience';section.setAttribute('aria-label','Garba courtyard');
    section.innerHTML=`<div id="garba-scene" aria-hidden="true"></div><div class="gr-vignette" aria-hidden="true"></div>
      <header class="gr-header"><button id="garba-back-hobbies" class="gr-quiet" type="button">Back to Hobbies</button><div class="gr-heading"><p>Garba</p><h1 id="garba-heading">Always room in the circle</h1></div><span id="garba-portfolio" class="mode-switch" data-mode-switch>Portfolio / Play</span></header>
      <section id="garba-overview" class="gr-rail" aria-label="Explore the courtyard"><div class="gr-intro"><p class="gr-eyebrow">Music. Movement. People.</p><p>Garba brings together a few of my favourite things. Come in for a little of that energy.</p></div><nav id="garba-photo-choices" class="gr-photo-choices" aria-label="Lakshya’s Garba photographs"></nav><div class="gr-circle-actions"><button id="garba-circle" class="gr-primary" type="button">Light the circle</button><button id="garba-reset" class="gr-text" type="button" disabled>Reset lights</button></div></section>
      <section id="garba-context" class="gr-context" aria-labelledby="garba-photo-title" hidden><button id="garba-back-courtyard" class="gr-quiet" type="button">Back to courtyard</button><p class="gr-eyebrow">A photograph from Garba</p><h2 id="garba-photo-title"></h2><p id="garba-photo-description"></p><button id="garba-view-photo" class="gr-primary" type="button">View photograph</button></section>
      <section id="garba-viewer" class="gr-viewer" aria-labelledby="garba-viewer-title" hidden><header><div><p class="gr-eyebrow">Lakshya’s photograph</p><h2 id="garba-viewer-title"></h2></div><button id="garba-viewer-back" class="gr-quiet" type="button">Back to photograph</button></header><div class="gr-viewer-layout"><figure><img id="garba-full-photo" alt=""><figcaption id="garba-viewer-caption"></figcaption></figure><aside><p class="gr-eyebrow">Music, movement &amp; people</p><p id="garba-viewer-description"></p><nav aria-label="Garba photographs"><button type="button" id="garba-photo-prev" class="gr-quiet">Previous photograph</button><span id="garba-photo-count" role="status" aria-live="polite"></span><button type="button" id="garba-photo-next" class="gr-quiet">Next photograph</button></nav><p id="garba-photo-error" role="status" hidden></p></aside></div></section>
      <div id="garba-object-hint" class="gr-object-hint" hidden></div><p id="garba-status" class="gr-sr" aria-live="polite">Entering the Garba courtyard.</p>
      <footer class="gr-footer"><span id="garba-view-label">Through the entrance</span><span id="garba-load-label">Two real photographs. A little room to move.</span></footer><div id="garba-veil" class="gr-veil" aria-hidden="true"></div>`;
    experience=section;container.appendChild(section);host=$('#garba-scene');status=$('#garba-status');veil=$('#garba-veil');
    experience.setAttribute('aria-description','A and D or Left and Right browse photographs. Home and End choose the first or last photograph. Escape returns one level.');
    $('#garba-load-label').textContent='A/D or Left/Right to browse · Esc to return';
    const viewerHint=document.createElement('p');viewerHint.className='gr-eyebrow';viewerHint.textContent='A/D or Left/Right to browse · Esc to return';$('#garba-viewer').querySelector('header').querySelector('div').appendChild(viewerHint);
    for(const [index,photo]of photos.entries()){
      const button=document.createElement('button');button.type='button';button.className='gr-photo-choice';button.dataset.grPhoto=photo.id;button.setAttribute('aria-pressed',String(lastSelected===photo.id));
      const number=document.createElement('span');number.className='gr-number';number.textContent=String(index+1).padStart(2,'0');
      const text=document.createElement('span'),title=document.createElement('strong'),type=document.createElement('small');title.textContent=photo.caption;type.textContent='Photograph';text.append(title,type);button.append(number,text);$('#garba-photo-choices').appendChild(button);
    }
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
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
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

  function box(w,h,d,mat,parent,x=0,y=0,z=0,radius=0){
    const key=[w,h,d,radius].join(',');let geometry=geometryCache.get(key);if(!geometry){geometry=ownGeometry(radius?new RoundedBoxGeometry(w,h,d,2,radius):new THREE.BoxGeometry(w,h,d));geometryCache.set(key,geometry);}
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function cylinder(top,bottom,h,mat,parent,x,y,z,segments=32){const mesh=new THREE.Mesh(ownGeometry(new THREE.CylinderGeometry(top,bottom,h,segments)),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function label(text,w,h,parent,x,y,z,{background='#d2b184',color='#304738',size=30}={}){
    const canvas=document.createElement('canvas');canvas.width=Math.round(w*180);canvas.height=Math.round(h*180);const context=canvas.getContext('2d');
    const draw=()=>{context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle=color;context.font=`600 ${size}px "DM Sans",sans-serif`;context.textAlign='center';context.textBaseline='middle';context.fillText(text,canvas.width/2,canvas.height/2,canvas.width-20);};draw();
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;resources.texture.add(texture);placards.push({texture,draw});const mat=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});resources.material.add(mat);const mesh=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(w,h)),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function buildScene(){
    scene=new THREE.Scene();
    scene.background=new THREE.Color('#56696b');
    // Three applies fog after tone mapping; the unlit sky bypasses it too.
    // The low horizon stays exactly fog-coloured; only the upper sky darkens.
    const skyGeometry=ownGeometry(new THREE.SphereGeometry(55,32,16)),skyPositions=skyGeometry.attributes.position,skyColours=new Float32Array(skyPositions.count*3),horizonColour=new THREE.Color('#56696b'),upperColour=new THREE.Color('#263c47'),skyColour=new THREE.Color();
    for(let i=0;i<skyPositions.count;i++){const blend=THREE.MathUtils.clamp((skyPositions.getY(i)/55-.12)/.65,0,1);skyColour.copy(horizonColour).lerp(upperColour,blend);skyColours[i*3]=skyColour.r;skyColours[i*3+1]=skyColour.g;skyColours[i*3+2]=skyColour.b;}
    skyGeometry.setAttribute('color',new THREE.BufferAttribute(skyColours,3));const skyMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,toneMapped:false,depthWrite:false,depthTest:false});resources.material.add(skyMaterial);const sky=new THREE.Mesh(skyGeometry,skyMaterial);sky.renderOrder=-1000;scene.add(sky);
    scene.fog=new THREE.Fog('#56696b',20,46);camera=new THREE.PerspectiveCamera(50,width/height,.1,80);camera.position.copy(threshold.position);camera.lookAt(target);
    Object.assign(palette,{plaster:material('#dfd5bc'),cap:material('#e8dabb'),earth:material('#b68d6b'),wood:material('#926843'),woodLight:material('#c0a075'),darkWood:material('#5f4936'),forest:material('#52654d'),clay:material('#ae6c4a'),darkClay:material('#754d39'),ink:material('#39493d'),brass:material('#aa8b4d',{metalness:.35,roughness:.5})});
    scene.add(new THREE.HemisphereLight('#eee1c7','#59654e',1.65));
    const key=new THREE.DirectionalLight('#ffdfb6',2.0);key.position.set(-6,12,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:35});key.shadow.normalBias=.035;key.shadow.bias=-.00025;scene.add(key);resources.lights.add(key);
    const bounce=new THREE.PointLight('#ffe1ab',12,20,2);bounce.position.set(0,5,-2);scene.add(bounce);
    // Extend beyond the fog range so a finite green plane never cuts the sky.
    box(180,.2,180,palette.forest,scene,0,-.38,0);
    cylinder(8.85,9,.28,palette.darkClay,scene,0,-.12,0,80);cylinder(8.67,8.67,.065,palette.earth,scene,0,.055,0,80);
    const wall=new THREE.Mesh(ownGeometry(new THREE.CylinderGeometry(8.7,8.7,1.6,48,1,true,Math.PI/2,Math.PI)),palette.plaster);wall.material.side=THREE.DoubleSide;wall.position.y=.83;wall.castShadow=true;wall.receiveShadow=true;scene.add(wall);
    const capPath=new THREE.CatmullRomCurve3(Array.from({length:33},(_,i)=>v(Math.cos(i/32*Math.PI)*8.7,1.65,-Math.sin(i/32*Math.PI)*8.7)));
    const cap=new THREE.Mesh(ownGeometry(new THREE.TubeGeometry(capPath,64,.105,6,false)),palette.cap);scene.add(cap);
    // The gate is crossed once on entry. Low side walls keep the sky open.
    [-2.45,2.45].forEach(x=>box(.28,5.2,.3,palette.wood,scene,x,2.6,8.5,.045));box(5.3,.28,.4,palette.woodLight,scene,0,5.05,8.5,.04);
    label('GARBA',2.1,.48,scene,0,4.56,8.73,{background:'#926843',color:'#f1e3c5',size:35});
    [-5.6,5.6].forEach(x=>{box(3.65,1.5,.28,palette.plaster,scene,x,.75,8.45,.055);box(3.8,.14,.43,palette.cap,scene,x,1.54,8.45,.035);});
    // A restrained canopy follows what is visible in the actual photographs.
    const wirePoints=[],bulbPositions=[];
    for(const z of [-5.4,-2.3,.8,3.9]){
      for(let i=0;i<24;i++){const t=i/24,t2=(i+1)/24;wirePoints.push(v(-7.0+t*14,6.2-Math.sin(t*Math.PI)*.65,z),v(-7+t2*14,6.2-Math.sin(t2*Math.PI)*.65,z));}
      for(let i=0;i<16;i++){const t=(i+.5)/16;bulbPositions.push(v(-7+t*14,6.2-Math.sin(t*Math.PI)*.65-.045,z));}
    }
    const wires=new THREE.LineSegments(ownGeometry(new THREE.BufferGeometry().setFromPoints(wirePoints)),new THREE.LineBasicMaterial({color:'#8c8970'}));resources.material.add(wires.material);scene.add(wires);
    const bulbMat=new THREE.MeshBasicMaterial({color:'#ffe4aa',toneMapped:false});resources.material.add(bulbMat);const bulbs=new THREE.InstancedMesh(ownGeometry(new THREE.SphereGeometry(.055,8,6)),bulbMat,bulbPositions.length);const dummy=new THREE.Object3D();bulbPositions.forEach((p,i)=>{dummy.position.copy(p);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);});scene.add(bulbs);resources.instanced.add(bulbs);
    for(const x of [-7,7])for(const z of [-5.4,3.9])box(.16,6.25,.16,palette.wood,scene,x,3.1,z,.025);
    // Two large full-frame photographs, each with its own modest timber place.
    photos.forEach((photo,index)=>buildPhotoPlace(photo,index));
    buildCircle();
    // One low bench and planted edge establish a courtyard without a crowd set.
    box(3.0,.17,.72,palette.woodLight,scene,0,.68,-6.9,.055);[-1.15,1.15].forEach(x=>box(.14,.6,.55,palette.darkWood,scene,x,.33,-6.9,.025));
    const shrubGeo=ownGeometry(new THREE.IcosahedronGeometry(1,1));for(const [x,z,scale]of [[-7.5,-5.7,1.05],[7.5,-5.7,1.1],[-7.7,1.6,.75],[7.7,1.6,.8]]){const shrub=new THREE.Mesh(shrubGeo,palette.forest);shrub.position.set(x,.6,z);shrub.scale.set(scale,.72*scale,scale);shrub.castShadow=true;scene.add(shrub);}
    renderer.shadowMap.needsUpdate=true;
  }
  function buildPhotoPlace(photo,index){
    const {x,z}=photoPlaces[index],imageHeight=3.3,imageWidth=imageHeight*photo.width/photo.height,y=2.8;
    [-1,1].forEach(side=>box(.14,4.6,.18,palette.wood,scene,x+side*(imageWidth/2+.22),2.3,z-.12,.025));box(imageWidth+.75,.16,.3,palette.woodLight,scene,x,4.61,z-.12,.035);
    box(imageWidth+.26,imageHeight+.26,.13,palette.darkWood,scene,x,y,z,.035);box(imageWidth+.1,imageHeight+.1,.025,palette.cap,scene,x,y,z+.08,.02);
    const canvas=document.createElement('canvas');canvas.width=Math.round(1024*photo.width/photo.height);canvas.height=1024;const context=canvas.getContext('2d');context.fillStyle='#d7c9ac';context.fillRect(0,0,canvas.width,canvas.height);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());resources.texture.add(texture);
    const mat=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});resources.material.add(mat);const mesh=new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(imageWidth,imageHeight)),mat);mesh.position.set(x,y,z+.101);mesh.userData.photoId=photo.id;scene.add(mesh);picks.push(mesh);photoMeshes.set(photo.id,mesh);pendingImages.push({photo,canvas,context,texture});
    label(`${String(index+1).padStart(2,'0')}  ${photo.caption.toUpperCase()}`,imageWidth+.2,.29,scene,x,.76,z+.02,{background:'#b68d6b',color:'#3e4938',size:24});
  }
  function buildCircle(){
    for(const radius of [3.55,4.25]){const ring=new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(radius,.022,5,80)),palette.cap);ring.rotation.x=-Math.PI/2;ring.position.y=.102;scene.add(ring);}
    cylinder(.95,1.0,.15,palette.cap,scene,0,.18,.2,48);
    const profile=[[.0,0],[.27,.02],[.46,.17],[.52,.4],[.45,.64],[.22,.85],[.2,.91]].map(([r,y])=>new THREE.Vector2(r,y));
    const pot=new THREE.Mesh(ownGeometry(new THREE.LatheGeometry(profile,32)),palette.clay);pot.position.set(0,.27,.2);pot.castShadow=true;pot.receiveShadow=true;pot.userData.action='circle';scene.add(pot);picks.push(pot);
    const rim=new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(.22,.035,6,32)),palette.brass);rim.rotation.x=-Math.PI/2;rim.position.set(0,1.18,.2);scene.add(rim);
    const flameMat=new THREE.MeshBasicMaterial({color:'#e7b168',toneMapped:false});resources.material.add(flameMat);lampFlame=new THREE.Mesh(ownGeometry(new THREE.SphereGeometry(.075,10,8)),flameMat);lampFlame.scale.set(.7,1.8,.7);lampFlame.position.set(0,1.31,.2);scene.add(lampFlame);
    lampLight=new THREE.PointLight('#ffc477',1.8,9,2);lampLight.position.set(0,1.55,.2);scene.add(lampLight);
    const bases=new THREE.InstancedMesh(ownGeometry(new THREE.CylinderGeometry(.13,.16,.055,10)),palette.darkClay,24);ringLights=new THREE.InstancedMesh(ownGeometry(new THREE.SphereGeometry(.065,8,6)),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),24);resources.material.add(ringLights.material);resources.instanced.add(bases);resources.instanced.add(ringLights);const dummy=new THREE.Object3D();
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;dummy.position.set(Math.sin(a)*3.9,.13,Math.cos(a)*3.9+.2);dummy.updateMatrix();bases.setMatrixAt(i,dummy.matrix);dummy.position.y=.19;dummy.updateMatrix();ringLights.setMatrixAt(i,dummy.matrix);}
    scene.add(bases,ringLights);applyCircle(0);
  }
  function applyCircle(progress){
    circleProgress=THREE.MathUtils.clamp(progress,0,1);const count=Math.floor(circleProgress*24);
    if(count!==lastCircleStep){const lit=new THREE.Color('#ffd084'),dim=new THREE.Color('#8b7957');for(let i=0;i<24;i++)ringLights.setColorAt(i,i<count?lit:dim);ringLights.instanceColor.needsUpdate=true;lastCircleStep=count;}
    lampLight.intensity=1.8+circleProgress*7;lampFlame.material.color.set(circleProgress?'#ffd99a':'#e7b168');
  }
  async function loadPhotos(){
    if(assetsReady||assetsLoading||!opened)return;assetsLoading=true;const token=generation;$('#garba-load-label').textContent='Opening the photographs…';
    const outcomes=await Promise.all(pendingImages.map(entry=>new Promise(resolve=>{
      const image=new Image();entry.image=image;entry.cancel=()=>{image.onload=null;image.onerror=null;image.src='';resolve(false);};image.decoding='async';
      image.onload=()=>{if(!opened||generation!==token){resolve(false);return;}const {canvas,context,texture}=entry;const scale=Math.min(canvas.width/image.width,canvas.height/image.height),w=image.width*scale,h=image.height*scale;context.fillStyle='#d7c9ac';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);texture.needsUpdate=true;entry.cancel=null;requestRender();resolve(true);};
      image.onerror=()=>{entry.cancel=null;resolve(false);};image.src=assetUrl(entry.photo.src);
    })));
    if(!opened||token!==generation)return;assetsReady=true;assetsLoading=false;experience.dataset.ready='true';$('#garba-load-label').textContent=outcomes.every(Boolean)?'Two photographs from Lakshya’s Garba memories.':'A photograph could not load. Reopen the courtyard to retry.';status.textContent=outcomes.every(Boolean)?'Both Garba photographs are ready.':'A photograph could not load. The courtyard controls remain available.';requestRender();
  }
  function bindUI(){
    decorateModeSelectors(experience,{mode:'play',pageURL:location.href,navigationHandled:true});
    listen($('#garba-back-hobbies'),'click',()=>close());listen($('#garba-portfolio'),'click',()=>{close({immediate:true,notify:false});onPortfolio();});
    experience.querySelectorAll('[data-gr-photo]').forEach(button=>listen(button,'click',()=>selectPhoto(button.dataset.grPhoto)));
    listen($('#garba-circle'),'click',lightCircle);listen($('#garba-reset'),'click',resetCircle);listen($('#garba-back-courtyard'),'click',backToOverview);listen($('#garba-view-photo'),'click',openViewer);listen($('#garba-viewer-back'),'click',closeViewer);
    for(const [id,direction]of [['garba-photo-prev',-1],['garba-photo-next',1]])listen($('#'+id),'click',()=>{const index=photos.findIndex(photo=>photo.id===selected);showViewerPhoto(photos[Math.max(0,Math.min(photos.length-1,index+direction))].id);if(document.activeElement?.disabled)$('#garba-viewer-back').focus({preventScroll:true});});
    listen($('#garba-full-photo'),'error',()=>{if(opened&&viewerOpen){status.textContent='The photograph could not load. Back to photograph remains available.';$('#garba-photo-error').textContent='This photograph could not load. Choose the other one or return to the courtyard.';$('#garba-photo-error').hidden=false;}});
    listen(renderer.domElement,'pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY};});
    listen(renderer.domElement,'pointermove',pointerMove);listen(renderer.domElement,'pointerleave',()=>setHover(null));
    listen(renderer.domElement,'pointerup',event=>{if(!pointerDown||Math.hypot(pointerDown.x-event.clientX,pointerDown.y-event.clientY)>8)return;pointerDown=null;if(transition||closing||viewerOpen)return;const id=pick(event);if(id==='circle')lightCircle();else if(id)selectPhoto(id);});
    listen(document,'keydown',event=>{
      if(!opened||!event.target?.closest?.('#garba-experience'))return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!event.repeat)cancel({fromKeyboard:true});return;}
      if(closing||transition)return;
      const direction=getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);if(!direction&&!boundary)return;
      const current=photos.findIndex(photo=>photo.id===(selected||lastSelected));
      const index=boundary==='first'?0:boundary==='last'?photos.length-1:current<0?(direction>0?0:photos.length-1):THREE.MathUtils.clamp(current+direction,0,photos.length-1);
      consumeNavigationKey(event);if(photos[index].id===selected)return;
      if(viewerOpen)showViewerPhoto(photos[index].id);else selectPhoto(photos[index].id);
    },true);
    listen(document,'visibilitychange',()=>{if(!document.hidden)resize();});
    listen(window,'pagehide',()=>{if(viewerOpen)releaseViewer();});
    listen(motionQuery,'change',()=>{if(transition&&reduced()){transition.started=clock-transition.duration;requestRender();}});
  }
  function setHover(id){
    if(hover===id)return;hover=id;renderer.domElement.style.cursor=id?'pointer':'default';const hint=$('#garba-object-hint');hint.hidden=!id;
    if(id)hint.textContent=id==='circle'?(circleProgress===1?'Replay the circle lights':'Light the circle'):photos.find(photo=>photo.id===id)?.caption||'View photograph';
  }
  function pick(event){
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(picks,false)[0];return hit?.object.userData.photoId||hit?.object.userData.action||null;
  }
  function pointerMove(event){
    if(transition||viewerOpen||closing){setHover(null);return;}setHover(pick(event));if(!hover)return;const rect=experience.getBoundingClientRect();Object.assign($('#garba-object-hint').style,{left:`${Math.max(12,Math.min(width-240,event.clientX-rect.left+16))}px`,top:`${Math.max(90,Math.min(height-90,event.clientY-rect.top-45))}px`});
  }
  function photoPose(id){const index=photos.findIndex(photo=>photo.id===id),place=photoPlaces[index];return {position:v(place.x,2.8,2.7),target:v(place.x,2.8,place.z+.1),fov:43};}
  function moveTo(pose,duration,onComplete,{entry=false,exit=false,circle=false}={}){
    const startPosition=camera.position.clone(),startTarget=target.clone(),startFov=camera.fov;let path=null;
    if(entry)path=new THREE.CatmullRomCurve3([startPosition,v(0,2.7,10.3),v(0,2.9,7.8),pose.position]);
    else if(exit&&camera.position.z<8.2)path=new THREE.CatmullRomCurve3([startPosition,v(0,3.0,6.8),v(0,2.7,10.3),pose.position]);
    if(reduced()){camera.position.copy(pose.position);target.copy(pose.target);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.lookAt(target);if(circle){applyCircle(1);circleActive=false;}onComplete?.();requestRender();return;}
    transition={started:clock,duration,startPosition,startTarget,startFov,pose,path,onComplete,circle};experience.classList.add('gr-moving');requestRender();
  }
  function selectPhoto(id){
    if(!opened||closing||transition||viewerOpen||!photos.some(photo=>photo.id===id))return;selected=id;lastSelected=id;view='photograph';circleActive=false;setHover(null);updateSelection();
    const photo=photos.find(item=>item.id===id);$('#garba-overview').hidden=true;$('#garba-context').hidden=false;$('#garba-photo-title').textContent=photo.caption;$('#garba-photo-description').textContent=photo.description;$('#garba-view-photo').disabled=true;experience.classList.add('gr-focused');$('#garba-view-label').textContent='A closer look';
    moveTo(photoPose(id),1050,()=>{if(!opened||closing)return;$('#garba-view-photo').disabled=false;status.textContent=`${photo.caption}. ${photo.alt}`;$('#garba-view-photo').focus({preventScroll:true});});
  }
  function updateSelection(){experience.querySelectorAll('[data-gr-photo]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.grPhoto===lastSelected)));}
  function backToOverview(){
    if(!opened||closing)return;const previous=selected;releaseViewer();selected=null;view='overview';circleActive=false;setHover(null);$('#garba-overview').hidden=false;$('#garba-context').hidden=true;experience.classList.remove('gr-focused');
    moveTo(overview,1000,()=>{if(!opened||closing)return;$('#garba-view-label').textContent='In the courtyard';status.textContent='Back in the Garba courtyard.';const button=previous?experience.querySelector(`[data-gr-photo="${previous}"]`):$('#garba-circle');button?.focus({preventScroll:true});});
  }
  function openViewer(){
    if(!opened||closing||transition||!selected||viewerOpen)return;viewerOpen=true;const photo=photos.find(item=>item.id===selected),image=$('#garba-full-photo');image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.src=assetUrl(photo.src);$('#garba-viewer-title').textContent=photo.caption;$('#garba-viewer-caption').textContent=photo.caption;syncViewerControls(photo);$('#garba-viewer').hidden=false;
    viewerSiblings=[...experience.children].filter(element=>element.id!=='garba-viewer').map(element=>[element,element.inert]);viewerSiblings.forEach(([element])=>{element.inert=true;});
    $('#garba-viewer-back').focus({preventScroll:true});status.textContent=`Full photograph: ${photo.caption}.`;
  }
  function showViewerPhoto(id){
    const photo=photos.find(item=>item.id===id);if(!photo||!viewerOpen)return;
    selected=lastSelected=id;updateSelection();$('#garba-photo-title').textContent=photo.caption;$('#garba-photo-description').textContent=photo.description;
    const image=$('#garba-full-photo');image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.src=assetUrl(photo.src);$('#garba-viewer-title').textContent=photo.caption;$('#garba-viewer-caption').textContent=photo.caption;syncViewerControls(photo);
    // The hidden scene does not animate or render while a full photograph is
    // being read. Returning reveals the matching photograph's settled pose.
    const pose=photoPose(id);camera.position.copy(pose.position);target.copy(pose.target);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.lookAt(target);
    status.textContent=`Full photograph: ${photo.caption}.`;
  }
  function syncViewerControls(photo){
    const index=photos.indexOf(photo);$('#garba-viewer-description').textContent=photo.description;$('#garba-photo-count').textContent=(index+1)+' of '+photos.length;$('#garba-photo-prev').disabled=index===0;$('#garba-photo-next').disabled=index===photos.length-1;$('#garba-photo-error').hidden=true;
  }
  function releaseViewer(){if(!experience)return;$('#garba-full-photo').removeAttribute('src');$('#garba-viewer').hidden=true;viewerOpen=false;viewerSiblings.forEach(([element,inert])=>{element.inert=inert;});viewerSiblings=[];}
  function closeViewer(){if(!viewerOpen)return;releaseViewer();$('#garba-view-photo').focus({preventScroll:true});status.textContent='Back at the photograph in the courtyard.';requestRender();}
  function lightCircle(){
    if(!opened||closing||transition||viewerOpen||view!=='overview')return;circleActive=true;applyCircle(0);lastCircleStep=-1;setHover(null);$('#garba-circle').disabled=true;$('#garba-reset').disabled=true;status.textContent='The circle lights travel around the lamp.';
    moveTo({position:v(.15,4.5,7.3),target:overview.target.clone(),fov:60},2400,()=>{if(!opened||closing)return;circleActive=false;applyCircle(1);$('#garba-circle').disabled=false;$('#garba-circle').textContent='Replay the lights';$('#garba-reset').disabled=false;status.textContent='The circle is lit. The view has settled.';$('#garba-circle').focus({preventScroll:true});},{circle:true});
  }
  function resetCircle(){if(!opened||closing||transition)return;circleActive=false;applyCircle(0);$('#garba-circle').textContent='Light the circle';$('#garba-reset').disabled=true;status.textContent='The circle lights are reset.';requestRender();}
  function cancel({fromKeyboard=false}={}){if(!opened)return false;const now=performance.now();if(!fromKeyboard&&now-lastEscapeHandled<180)return true;lastEscapeHandled=now;if(closing)return true;if(viewerOpen)closeViewer();else if(selected)backToOverview();else close();return true;}
  function resize(){
    if(!opened||!camera)return;const rect=experience.getBoundingClientRect();width=Math.max(1,rect.width||container.clientWidth||window.innerWidth);height=Math.max(1,rect.height||container.clientHeight||window.innerHeight);renderer.setPixelRatio(Math.min(saved?.pixelRatio||1,1.6));renderer.setSize(width,height,false);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender();
  }
  function open({returnFocus}={}){
    if(dead)throw new Error('Garba courtyard has been disposed.');if(opened)return false;opened=true;closing=false;generation++;clock=0;renderedFrames=0;openingElapsed=0;closingVeilStart=0;view='threshold';selected=null;transition=null;viewerOpen=false;assetsReady=false;assetsLoading=false;circleProgress=0;circleActive=false;lastCircleStep=-1;lastEscapeHandled=-Infinity;target.copy(threshold.target);externalFocus=returnFocus||document.activeElement;
    try{
      mount();borrowRenderer();const rect=experience.getBoundingClientRect();width=Math.max(1,rect.width||window.innerWidth);height=Math.max(1,rect.height||window.innerHeight);buildScene();bindUI();resize();loadPhotos();const token=generation;document.fonts?.ready?.then(()=>{if(!opened||token!==generation)return;placards.forEach(({texture,draw})=>{draw();texture.needsUpdate=true;});requestRender();});
      veil.style.opacity=reduced()?'0':'1';view='overview';experience.dataset.phase='entering';$('#garba-back-hobbies').focus({preventScroll:true});moveTo(overview,2100,()=>{if(!opened||closing)return;$('#garba-view-label').textContent='In the courtyard';status.textContent='Inside the Garba courtyard. Choose a photograph or light the circle.';},{entry:true});return true;
    }catch(error){finishClose(false);throw error;}
  }
  function close({immediate=false,notify=true}={}){
    if(!opened)return false;if(closing&&!immediate)return false;closing=true;circleActive=false;releaseViewer();setHover(null);closingVeilStart=Number(veil.style.opacity)||0;$('#garba-overview').hidden=true;$('#garba-context').hidden=true;experience.dataset.phase='returning';
    if(immediate||reduced()){finishClose(notify);return true;}moveTo(threshold,1450,()=>finishClose(notify),{exit:true});return true;
  }
  function finishClose(notify){
    if(!opened)return;generation++;releaseViewer();transition=null;opened=false;closing=false;dirty=false;circleActive=false;listeners.splice(0).forEach(remove=>remove());pendingImages.forEach(entry=>{entry.cancel?.();if(entry.image){entry.image.onload=null;entry.image.onerror=null;}});
    resources.instanced.forEach(value=>value.dispose());resources.lights.forEach(light=>light.shadow?.dispose());resources.geometry.forEach(value=>value.dispose());resources.material.forEach(value=>value.dispose());resources.texture.forEach(value=>value.dispose());Object.values(resources).forEach(set=>set.clear());pendingImages.length=0;picks.length=0;placards.length=0;photoMeshes.clear();geometryCache.clear();Object.keys(palette).forEach(key=>delete palette[key]);scene?.clear();restoreRenderer();experience?.remove();experience=null;host=null;status=null;veil=null;scene=null;camera=null;ringLights=null;lampFlame=null;lampLight=null;assetsLoading=false;assetsReady=false;const focus=externalFocus;externalFocus=null;
    if(notify){try{onClose();}finally{if(focus?.isConnected&&!focus.disabled)focus.focus({preventScroll:true});}}
  }
  function update(dtSeconds=0){
    if(!opened||document.hidden||!scene)return false;const delta=Math.min(.1,Math.max(0,Number(dtSeconds)||0));clock+=delta*1000;
    if(reduced()&&transition)transition.started=clock-transition.duration;
    if(!closing&&openingElapsed<.42){openingElapsed+=delta;veil.style.opacity=reduced()?'0':String(Math.max(0,1-openingElapsed/.42));dirty=true;}
    if(viewerOpen)return false;if(!dirty&&!transition)return false;
    if(transition){const progress=Math.min(1,(clock-transition.started)/transition.duration),ease=progress*progress*(3-2*progress);if(transition.path)camera.position.copy(transition.path.getPoint(ease));else camera.position.lerpVectors(transition.startPosition,transition.pose.position,ease);target.lerpVectors(transition.startTarget,transition.pose.target,ease);camera.fov=THREE.MathUtils.lerp(transition.startFov,transition.pose.fov,ease);camera.updateProjectionMatrix();camera.lookAt(target);if(transition.circle)applyCircle(progress);if(closing)veil.style.opacity=String(Math.max(closingVeilStart,(progress-.78)/.22));if(progress===1){const done=transition.onComplete;transition=null;experience.classList.remove('gr-moving');done?.();}}
    if(!opened||!scene)return false;experience.dataset.phase=closing?'returning':transition?'moving':'viewing';renderer.render(scene,camera);renderedFrames++;dirty=false;return true;
  }
  function diagnostics(){return {phase:!opened?'closed':closing?'returning':transition?'moving':'viewing',isOpen:opened,view,selected,lastSelected,viewerOpen,circleActive,circleProgress,moving:Boolean(transition),renderedFrames,assetsReady,assetsLoading,pendingImages:pendingImages.filter(entry=>entry.cancel).length,ownedGeometries:resources.geometry.size,ownedMaterials:resources.material.size,ownedTextures:resources.texture.size,drawCalls:opened?renderer.info.render.calls:0,triangles:opened?renderer.info.render.triangles:0,ownsRenderer:false};}
  function dispose(){if(dead)return;close({immediate:true,notify:false});dead=true;}
  return {open,close,cancel,update,resize,dispose,diagnostics,get isOpen(){return opened;}};
}
