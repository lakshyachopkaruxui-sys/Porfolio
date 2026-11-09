import * as THREE from 'three';

const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const lobes=[
  [0,0,0,1.05,.85,.80],[-.68,-.10,-.12,.66,.61,.59],
  [.68,-.13,-.08,.70,.60,.62],[-.27,.44,.02,.70,.65,.63],
  [.40,.31,.12,.64,.60,.60],
];
const noise=(x,y,seed)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};

/** Real, texture-free cloud volumes. One shared geometry, one lit material.
 * The owner supplies its renderer and clock; this module owns neither. */
export function createCloudVolume(){
  const scene=new THREE.Scene();scene.name='Cloud entry volumes';
  const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,60);
  camera.position.set(0,0,30);
  const geometry=new THREE.IcosahedronGeometry(1,2);
  const material=new THREE.MeshLambertMaterial({color:'#f5f8fb'});
  scene.add(new THREE.HemisphereLight('#ffffff','#9badc4',2.0));
  const sun=new THREE.DirectionalLight('#fffaf0',2.3);sun.position.set(-5,9,10);scene.add(sun);
  const fill=new THREE.DirectionalLight('#d8e7f5',.35);fill.position.set(8,-3,5);scene.add(fill);
  const dummy=new THREE.Object3D(),colour=new THREE.Color();
  function makeBank(i,capacity){
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);
    mesh.name=['West cloud bank','East cloud bank','North cloud bank','South cloud bank'][i];
    mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    scene.add(mesh);return mesh;
  }
  const banks=Array.from({length:4},(_,i)=>makeBank(i,32));
  const miniature=new THREE.InstancedMesh(geometry,material,3*lobes.length);
  miniature.name='Loading cloud cluster';miniature.frustumCulled=false;scene.add(miniature);
  // An opaque backstop seals tiny crevices before changing the scene below.
  const veilGeometry=new THREE.PlaneGeometry(2,2),veilMaterial=new THREE.MeshBasicMaterial({color:'#eef3f8',transparent:true,depthWrite:false,toneMapped:false});
  const veil=new THREE.Mesh(veilGeometry,veilMaterial);veil.name='Cloud opacity backstop';veil.position.z=-4;veil.renderOrder=-1;scene.add(veil);
  const viewport=new THREE.Vector4(),scissor=new THREE.Vector4();
  let width=0,height=0,halfWidth=8,halfHeight=5,disposed=false;
  const safeSize=value=>Number.isFinite(value)&&value>0?value:1;

  function put(mesh,index,x,y,z,sx,sy,sz,rotation=0,tint=1){
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,rotation);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);mesh.setColorAt(index,colour.setRGB(tint,tint,tint));
  }
  function resize(w,h){
    w=safeSize(w);h=safeSize(h);if(width===w&&height===h)return;
    width=w;height=h;
    // Keep the short camera axis fixed. Extra screen area gets more cloud
    // copies, never an independent X/Y/Z stretch of the cloud shape.
    halfWidth=5*Math.max(1,w/h);halfHeight=5*Math.max(1,h/w);
    // During a collapsed/minimized resize, keep the existing opacity fallback
    // instead of allocating thousands of copies for an unusable viewport.
    if(Math.min(w,h)<32||Math.max(w/h,h/w)>6){banks.forEach(bank=>bank.count=0);return;}
    const stepX=2.25,stepY=1.53,padding=1.6;
    const columns=Math.ceil((halfWidth*2+padding*2)/stepX)+1;
    const rows=Math.ceil((halfHeight*2+padding*2)/stepY)+1;
    const clusters=[[],[],[],[]];
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const cx=(col-(columns-1)/2)*stepX+(row%2?.5:-.5)*stepX*.5+(noise(col,row,1)-.5)*.26;
      const cy=(row-(rows-1)/2)*stepY+(noise(col,row,2)-.5)*.22;
      const side=Math.abs(cx/halfWidth)>Math.abs(cy/halfHeight)?(cx<0?0:1):(cy<0?3:2);
      clusters[side].push({x:cx,y:cy,z:1+noise(col,row,3)*1.3,scale:1.12+noise(col,row,4)*.18,angle:(noise(col,row,5)-.5)*.26});
    }
    clusters.forEach((copies,side)=>{
      const count=copies.length*lobes.length;
      if(count>banks[side].instanceMatrix.count){
        const previous=banks[side];previous.removeFromParent();previous.dispose();
        banks[side]=makeBank(side,2**Math.ceil(Math.log2(Math.max(32,count))));
      }
      const bank=banks[side];bank.count=count;let index=0;
      for(const copy of copies){
        const cos=Math.cos(copy.angle),sin=Math.sin(copy.angle),s=copy.scale;
        for(const [x,y,z,sx,sy,sz] of lobes){
          put(bank,index++,copy.x+(x*cos-y*sin)*s,copy.y+(x*sin+y*cos)*s,copy.z+z*s,
            sx*s,sy*s,sz*s,copy.angle,side===1?.97:1);
        }
      }
      bank.instanceMatrix.needsUpdate=true;bank.instanceColor.needsUpdate=true;bank.boundingSphere=null;
    });
  }
  let miniIndex=0;
  for(let c=0;c<3;c++)for(const [x,y,z,sx,sy,sz] of lobes){
    const scale=c===1?.90:.61;
    put(miniature,miniIndex++,(c-1)*1.16+x*scale,(c===1?-.12:.17)+y*scale,z*scale+(c===1?1:0),sx*scale,sy*scale,sz*scale,0,c===1?1:.94);
  }
  miniature.instanceMatrix.needsUpdate=true;miniature.instanceColor.needsUpdate=true;
  resize(1280,720);

  function update(snapshot,w=width,h=height){
    if(disposed)return;
    resize(w,h);miniature.visible=false;
    veil.visible=Boolean(snapshot.active);veil.scale.set(halfWidth,halfHeight,1);
    veilMaterial.opacity=snapshot.phase==='revealing'?1-ease(snapshot.revealProgress/.18):ease((snapshot.coverProgress-.55)/.45);
    camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
    const opening=snapshot.phase==='revealing';
    banks.forEach((bank,i)=>{
      bank.visible=Boolean(snapshot.active);
      const delay=opening?[0,.045,.095,.02][i]:0;
      const spread=opening?ease((snapshot.revealProgress-delay)/(.91-delay)):1-ease(snapshot.coverProgress);
      const horizontal=i<2,sign=i===0||i===3?-1:1;
      bank.position.set(horizontal?sign*(halfWidth+6)*spread:(i===2?-1:1)*.65*spread,
        horizontal?(i===0?-.45:.6)*spread:sign*(halfHeight+6)*spread,spread*(i===0||i===3?2.5:.7));
      bank.rotation.set(0,(horizontal?sign:0)*.045*spread,(i%2?1:-1)*.025*spread);
      bank.scale.setScalar(1+spread*(i===0||i===3?.09:.035));
    });
    scene.updateMatrixWorld(true);
  }

  function draw(renderer,rect){
    if(disposed)return;
    const autoClear=renderer.autoClear,scissorTest=renderer.getScissorTest();
    renderer.getViewport(viewport);renderer.getScissor(scissor);
    try{
      renderer.autoClear=false;
      if(rect){renderer.setViewport(rect.x,rect.y,rect.width,rect.height);renderer.setScissor(rect.x,rect.y,rect.width,rect.height);renderer.setScissorTest(true);}
      else{renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);}
      renderer.clearDepth();renderer.render(scene,camera);
    }finally{
      renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
    }
  }
  function render(renderer,snapshot,w,h){
    if(disposed||!snapshot.active)return;
    update(snapshot,w,h);draw(renderer);
  }
  function renderLoading(renderer,rect,time=0,{reduced=false}={}){
    if(disposed||rect.width<1||rect.height<1)return;
    banks.forEach(bank=>bank.visible=false);veil.visible=false;miniature.visible=true;
    miniature.rotation.y=reduced?-.15:-.15+Math.sin(time*.65)*.17;
    miniature.position.y=reduced?0:Math.sin(time*.9)*.045;
    const aspect=rect.width/rect.height;
    camera.left=-1.15*aspect;camera.right=1.15*aspect;camera.top=1.15;camera.bottom=-1.15;camera.updateProjectionMatrix();
    draw(renderer,rect);
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const mesh of [...banks,miniature])mesh.dispose();
    geometry.dispose();material.dispose();veilGeometry.dispose();veilMaterial.dispose();scene.clear();
  }
  return {scene,camera,banks,miniature,geometry,material,veil,update,render,renderLoading,dispose,
    get metrics(){const instances=banks.reduce((n,bank)=>n+bank.count,0);return {clouds:instances/lobes.length,instances,triangles:instances*geometry.attributes.position.count/3+2,draws:5,textures:0};}};
}
