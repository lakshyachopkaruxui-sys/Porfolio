// The same room remains explorable when the renderer cannot draw a WebGL frame.
// Coordinates are the four inner corners of each mount in the reference image.
const mounts = [
  [[148,335],[279,303],[323,419],[193,452]],
  [[330,192],[403,182],[421,267],[349,276]],
  [[459,139],[518,136],[520,210],[465,213]],
  [[566,136],[622,139],[615,213],[559,210]],
  [[688,182],[763,193],[742,277],[668,267]],
  [[827,304],[961,335],[908,453],[778,419]]
];

// Project a unit square onto a quadrilateral so every picture follows its frame.
function mountTransform([a,b,c,d]) {
  const x=b[0]-c[0],y=b[1]-c[1],u=d[0]-c[0],v=d[1]-c[1];
  const sx=a[0]-b[0]+c[0]-d[0],sy=a[1]-b[1]+c[1]-d[1],det=x*v-u*y;
  const g=(sx*v-u*sy)/det,h=(x*sy-sx*y)/det;
  return 'matrix3d('+[
    (b[0]-a[0]+g*b[0])/100,(b[1]-a[1]+g*b[1])/100,0,g/100,
    (d[0]-a[0]+h*d[0])/100,(d[1]-a[1]+h*d[1])/100,0,h/100,
    0,0,1,0,a[0],a[1],0,1
  ].join(',')+')';
}

export function createRoomBackdrop(host,collection,select) {
  const panel=document.createElement('div');
  panel.className='pgr-room-backdrop';
  panel.hidden=true;
  const board=document.createElement('div');
  board.className='pgr-room-board';
  board.setAttribute('role','group');
  board.setAttribute('aria-label','Framed captures in the exhibition');
  const surround=document.createElement('canvas');
  surround.className='pgr-room-surround';
  surround.setAttribute('aria-hidden','true');
  panel.append(surround,board);
  host.append(panel);
  let current=null;
  const frames=mounts.map((corners,slot)=>{
    const mount=document.createElement('div');
    mount.className='pgr-mount';
    mount.style.transform=mountTransform(corners);
    const art=document.createElement('div');
    art.className='pgr-frame-art';
    const hit=document.createElement('span');
    hit.className='pgr-frame-hit';
    const button=document.createElement('button');
    button.type='button';
    button.addEventListener('click',()=>select(current+slot));
    hit.append(button);mount.append(art,hit);board.append(mount);
    return {mount,art,button};
  });
  let inset=0;
  const reference=new Image();
  function paint(){
    if(panel.hidden)return;
    const w=host.clientWidth,h=host.clientHeight;
    if(w<1||h<1)return;
    const scale=Math.min(w/916,Math.max(1,h-inset)/508);
    board.style.setProperty('--room-scale',scale);
    if(!reference.naturalWidth)return;
    // Fill only the margins from the adjoining sky, trees or floor pixels.
    // The interactive photograph in the middle stays in its original proportion.
    const width=916*scale,height=508*scale,left=(w-width)/2,top=(h+inset-height)/2;
    surround.width=w;surround.height=h;
    const ctx=surround.getContext('2d');
    if(!ctx)return;
    const horizontal=[[0,1,0,left],[0,916,left,width],[915,1,left+width,w-left-width]];
    const vertical=[[0,1,0,top],[0,508,top,height],[507,1,top+height,h-top-height]];
    for(const [sx,sw,dx,dw] of horizontal)for(const [sy,sh,dy,dh] of vertical){
      if(dw<=0||dh<=0)continue;
      ctx.drawImage(reference,sx,sy,sw,sh,dx,dy,dw,dh);
    }
  }
  reference.onload=paint;
  return {
    resize(headerHeight){inset=headerHeight;paint();},
    show(start){
      if(current===start)return;
      current=start;panel.hidden=start===null;
      if(panel.hidden)return;
      if(!reference.getAttribute('src'))reference.src=new URL('../assets/pokemon-room-overhead.png',import.meta.url);
      paint();
      frames.forEach(({mount,art,button},slot)=>{
        const entry=collection[start+slot];
        button.disabled=!entry;
        art.replaceChildren();
        button.setAttribute('aria-label',entry?'Walk to '+entry.name:'Empty frame');
        button.title=entry?.name||'';
        // Page one is the original photograph of this exact arrangement.
        mount.dataset.empty=String(!entry);
        if(entry&&start!==0){
          const picture=new Image();
          picture.alt='';picture.decoding='async';
          picture.src=new URL('../'+entry.thumbnail,import.meta.url);
          art.append(picture);
        }
      });
    },
    remove(){reference.onload=null;panel.remove();}
  };
}
