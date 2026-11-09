import * as THREE from 'three';

/** A deliberately illustrated sky, never presented as the owner's photography. */
export function createSkyCamera(host, isReduced) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor('#bedbdc');
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Illustrated clouds in the virtual viewfinder');
  renderer.domElement.setAttribute('role','img');
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-7,7,4.2,-4.2,.1,80);
  camera.position.set(0,1,16);camera.lookAt(0,.5,0);
  scene.add(new THREE.HemisphereLight('#ffffff','#93bbc4',2.4));
  const sun=new THREE.DirectionalLight('#fff6dc',3);sun.position.set(-6,8,10);scene.add(sun);
  const geo=new THREE.SphereGeometry(1,22,14);
  const white=new THREE.MeshStandardMaterial({color:'#fff9ed',roughness:1});
  const soft=new THREE.MeshStandardMaterial({color:'#eaf2e8',roughness:1});
  const clusters=[];
  function cloud(x,y,z,scale){
    const group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);scene.add(group);
    for(const [px,py,pz,sx,sy,sz] of [[0,0,0,1.9,.45,.8],[-.8,.28,.1,.85,.66,.72],[.15,.55,0,1.05,.95,.95],[1.05,.15,.05,.7,.6,.65]]){
      const p=new THREE.Mesh(geo,z<-2?soft:white);p.position.set(px,py,pz);p.scale.set(sx,sy,sz);group.add(p);
    }
    clusters.push({group,x,y});
  }
  cloud(-3.5,1.8,-3,1.35);cloud(2.7,-.5,0,1.55);cloud(-5,-2.3,-5,.8);cloud(6,3,-7,1.1);
  let frame=0,elapsed=0,last=0,offset=0,desiredOffset=0,stopped=false;
  function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);camera.left=-4.2*w/h;camera.right=4.2*w/h;camera.updateProjectionMatrix();render();}
  function render(){renderer.render(scene,camera);}
  function tick(now){if(stopped)return;frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000||.016,.05);last=now;if(document.hidden)return;const reduced=isReduced();if(!reduced)elapsed+=dt;offset=reduced?desiredOffset:THREE.MathUtils.damp(offset,desiredOffset,5,dt);camera.position.x=offset;camera.lookAt(offset,.5,0);for(let i=0;i<clusters.length;i++){const c=clusters[i];c.group.position.x=c.x+(reduced?0:Math.sin(elapsed*.1+i)*.22);}render();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();frame=requestAnimationFrame(tick);
  return {
    move(direction){desiredOffset=THREE.MathUtils.clamp(desiredOffset+direction*1.2,-3,3);},
    capture(value=''){
      render();
      const caption=String(value).replace(/\s+/gu,' ').trim().slice(0,100)||'A small moment, looking up.';
      const postcard=document.createElement('canvas');
      const imageHeight=Math.round(1120*renderer.domElement.height/renderer.domElement.width);
      postcard.width=1200;
      const ctx=postcard.getContext('2d');
      ctx.font='600 32px "DM Sans"';
      // Prefer whole words, but also fit a single unbroken caption within the image.
      const lines=[];let line='';
      for(const word of caption.split(' ')){
        const candidate=line?`${line} ${word}`:word;
        if(ctx.measureText(candidate).width<=1096){line=candidate;continue;}
        if(line){lines.push(line);line='';}
        for(const character of word){
          if(line&&ctx.measureText(line+character).width>1096){lines.push(line);line=character;}
          else line+=character;
        }
      }
      if(line)lines.push(line);
      postcard.height=imageHeight+150+lines.length*40;
      ctx.fillStyle='#fbfaf5';ctx.fillRect(0,0,postcard.width,postcard.height);
      ctx.drawImage(renderer.domElement,40,40,1120,imageHeight);
      ctx.fillStyle='#23483e';ctx.font='600 32px "DM Sans"';
      lines.forEach((text,index)=>ctx.fillText(text,52,imageHeight+102+index*40));
      ctx.font='19px "DM Sans"';ctx.fillStyle='#5a7065';
      ctx.fillText('POSTCARD FROM LAKSHYA’S WORLD · VIRTUAL SKY',54,imageHeight+104+lines.length*40);
      return {url:postcard.toDataURL('image/png'),width:postcard.width,height:postcard.height,caption};
    },
    dispose(){if(stopped)return;stopped=true;cancelAnimationFrame(frame);observer.disconnect();geo.dispose();white.dispose();soft.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}
