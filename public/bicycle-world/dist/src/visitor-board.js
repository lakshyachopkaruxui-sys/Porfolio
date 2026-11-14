import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeCharacterAsset} from './character-loader.js';

export const VISITOR_BOARD_LOCATION=Object.freeze({x:44,z:34,yaw:2.91,pole:Object.freeze({x:42.60,z:34.46}),approach:Object.freeze({x:50,z:7})});

// Notice either the close roadside approach or a shortcut across the return
// meadow. An initial arrival at the start must never count as a completed lap.
export function visitorBoardPresence(state,previous={approached:false,passed:false},active=true){
 const d=Math.hypot(state.x-VISITOR_BOARD_LOCATION.x,state.z-VISITOR_BOARD_LOCATION.z);
 const returning=state.x>30&&state.x<62&&state.z>5&&state.z<30;
 const approached=previous.approached||(active&&(d<19||returning));
 const beyondReturn=state.x<29&&state.z>8||(state.z>38&&d>23);
 const invite=active&&approached&&!previous.passed&&beyondReturn;
 return {near:active&&d<19,approached,passed:previous.passed||invite,invite};
}

export function createVisitorBoard(scene,{onOpen=()=>{},onPass=()=>{}}={}){
 const root=new THREE.Group();root.name='Visitor feedback hoarding';root.position.set(VISITOR_BOARD_LOCATION.x,0,VISITOR_BOARD_LOCATION.z);root.rotation.y=VISITOR_BOARD_LOCATION.yaw;root.scale.setScalar(8.4/600);scene.add(root);
 const canvas=document.createElement('canvas');canvas.width=2160;canvas.height=790;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const faceMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
 const face=new THREE.Mesh(new THREE.PlaneGeometry(918.4,334.6),faceMaterial);face.rotation.y=-Math.PI/2;face.position.set(-56.4,480,-90);face.name='Read visitor notes';
 let source=null,dead=false,near=false,passed=false,approached=false,reviews=[],loadState='loading';
 const open=document.createElement('button');open.type='button';open.className='vb-near';open.textContent='Open the visitor board · Enter';open.hidden=true;document.body.append(open);open.addEventListener('click',()=>onOpen());
 function fitLine(text,x,y,width,font){ctx.font=font;if(ctx.measureText(text).width>width){while(text.length&&ctx.measureText(text+'…').width>width)text=text.slice(0,-1);text+='…';}ctx.fillText(text,x,y);}
 function quote(text,x,y,width){
  ctx.font='500 62px "DM Sans"';
  let remaining=text.replace(/\s+/g,' ').trim();
  for(let row=0;row<3&&remaining;row++){
   let length=remaining.length;
   while(length>0&&ctx.measureText(remaining.slice(0,length)+(row===2?'…':'')).width>width)length--;
   if(length<remaining.length){const space=remaining.lastIndexOf(' ',length);if(space>length*.55)length=space;}
   const line=remaining.slice(0,length).trim();remaining=remaining.slice(length).trim();ctx.fillText(line+(row===2&&remaining?'…':''),x,y+row*68);
  }
 }
 function draw(){
  // A white advertising canvas, one grouped review panel and one deliberate action.
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,2160,790);ctx.textAlign='left';ctx.fillStyle='#243537';
  for(const x of [34,2126]){ctx.beginPath();ctx.arc(x,30,6,0,Math.PI*2);ctx.fill();}
  ctx.font='700 34px "DM Sans"';ctx.fillText('LAKSHYA’S VISITOR BOARD',86,90);
  ctx.font='400 126px "Mochiy Pop P One"';ctx.fillText('How was',78,269);ctx.fillText('your ride?',78,432);
  ctx.font='400 47px "DM Sans"';ctx.fillText('A favourite moment or an idea to improve?',88,518);
  ctx.fillStyle='#f6bd84';ctx.fillRect(86,597,920,100);ctx.fillStyle='#243537';ctx.font='700 57px "DM Sans"';ctx.fillText('Open visitor board',132,668);
  ctx.font='500 34px "DM Sans"';ctx.fillText('Read reviews or leave yours · Click / Enter',88,747);
  ctx.fillStyle='#d6eaf8';ctx.fillRect(1104,65,970,660);ctx.save();ctx.translate(1170,118);ctx.fillStyle='#163849';
  ctx.font='700 39px "DM Sans"';ctx.fillText('RECENT REVIEWS',0,51);
  if(reviews.length){const r=reviews[0];ctx.font='600 52px "DM Sans"';ctx.fillText('★'.repeat(r.stars)+'☆'.repeat(5-r.stars),0,150);quote(r.feedback,0,256,825);fitLine(r.name,0,545,825,'600 44px "DM Sans"');}
  else if(loadState!=='ready'){ctx.font='600 67px "DM Sans"';ctx.fillText(loadState==='error'?'Reviews couldn’t':'Getting the latest',0,242);ctx.fillText(loadState==='error'?'load just yet.':'visitor reviews…',0,328);ctx.font='400 44px "DM Sans"';ctx.fillText('Open the board to try again.',0,468);}
  else{ctx.font='600 80px "DM Sans"';ctx.fillText('Be the first',0,237);ctx.fillText('to leave a note.',0,335);ctx.font='400 47px "DM Sans"';ctx.fillText('What should the next',0,464);ctx.fillText('visitor know?',0,529);}
  ctx.restore();texture.needsUpdate=true;
 }
 async function refresh(){try{const r=await fetch('/api/reviews',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(!dead){reviews=Array.isArray(data.reviews)?data.reviews:[];loadState='ready';draw();}}catch{if(!dead){loadState='error';draw();}}}
 draw();
 const ready=new GLTFLoader().loadAsync(new URL('../assets/visitor-board/billboard.glb',import.meta.url).href).then(gltf=>{if(dead){disposeCharacterAsset(gltf.scene);return;}source=gltf.scene;source.position.set(55,15,90);const display=source.getObjectByName('b');display.material=new THREE.MeshStandardMaterial({color:'#463b40',roughness:1});display.geometry=display.geometry.clone();display.geometry.translate(0,-405,90).scale(1,1.4,1.6).translate(0,305,-90);source.add(face);const canonical=new THREE.Group();canonical.rotation.y=Math.PI/2;canonical.add(source);source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.add(canonical);void document.fonts.ready.then(()=>{if(!dead)draw();});void refresh();}).catch(e=>console.warn('Visitor board model unavailable; feedback remains in Guide.',e));
 return {ready,root,refresh,setReviews(items){reviews=Array.isArray(items)?items:[];loadState='ready';draw();},get near(){return near;},pick(raycaster){return source?raycaster.intersectObject(root,true).length>0:false;},update(state,active,night){if(dead)return;const next=visitorBoardPresence(state,{approached,passed},active);near=next.near;approached=next.approached;passed=next.passed;open.hidden=!near;if(next.invite)onPass();},dispose(){dead=true;open.remove();source&&disposeCharacterAsset(source);face.geometry.dispose();faceMaterial.dispose();texture.dispose();root.removeFromParent();}};
}
