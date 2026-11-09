import * as THREE from 'three';

/** Original compact exhibition house informed by the Pewter museum facade.
 * Solid glazing and merged static geometry retain the garden's resource budget. */
export function buildWorksExterior({root,spec,mesh,box,beam,material}) {
  const cream=material('#f0e4c8','Works plaster'),stone=material('#c8b48b','Works sandstone');
  const light=material('#fff0d2','Works cornice'),roof=material('#555b84','Works indigo roof');
  const roofLight=material('#717795','Works roof facets'),roofDark=material('#414a6b','Works roof shadow');
  const dark=material('#283f44','Works entrance'),mint=material('#9ac6bd','Works glazing');
  const blue=material('#668f9a','Works shaded glass'),timber=material('#9b7048','Works oak doors');
  const brass=material('#d6ab58','Works brass');
  root.name='Landmark: Works exhibition house';
  const entry=new THREE.Vector3(0,1.9,2.68).applyAxisAngle(new THREE.Vector3(0,1,0),root.rotation.y);
  root.userData.entry={x:spec.x+entry.x,y:entry.y,z:spec.z+entry.z};
  root.userData.entranceLenses=[-1,1].map(side=>({position:[side*1.45,3.40,2.313],size:[.13,.16,.035],yaw:0}));
  function bevel(x,y,z,w,h,d,mat){
    const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);
    shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();
    return mesh(root,new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025}),mat,x,y,z-d/2);
  }
  function hipRoof(x,y,z,w,d,rise,topW,topD){
    const b=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]];
    const t=[[-topW/2,rise,-topD/2],[topW/2,rise,-topD/2],[topW/2,rise,topD/2],[-topW/2,rise,topD/2]];
    for(let i=0;i<4;i++){
      const j=(i+1)%4,g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute([...b[i],...t[i],...t[j],...b[i],...t[j],...b[j]],3));g.computeVertexNormals();
      mesh(root,g,i===2?roofLight:i===0?roofDark:roof,x,y,z);
    }
    box(root,x,y+rise,z,topW,.07,topD,roofLight);
    bevel(x,y-.07,z,w,.17,d,roofDark);
  }
  function archShape(outerR,innerR,spring,bottom){
    const s=new THREE.Shape();s.moveTo(-outerR,bottom);s.lineTo(-outerR,spring);
    for(let i=0;i<=16;i++){const a=Math.PI-i*Math.PI/16;s.lineTo(Math.cos(a)*outerR,spring+Math.sin(a)*outerR);}
    s.lineTo(outerR,bottom);s.lineTo(innerR,bottom);s.lineTo(innerR,spring);
    for(let i=0;i<=16;i++){const a=i*Math.PI/16;s.lineTo(Math.cos(a)*innerR,spring+Math.sin(a)*innerR);}
    s.lineTo(-innerR,bottom);s.closePath();return s;
  }
  function windowPanel(x,y,z,w,h,yaw=0){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);
    box(g,0,0,-.035,w+.14,h+.14,.15,stone);
    box(g,0,0,.052,w,h,.045,blue);
    box(g,-w*.18,h*.08,.079,w*.48,h*.71,.012,mint);
    for(const a of [-1,1])box(g,a*(w/2+.015),0,.093,.05,h+.10,.09,light);
    box(g,0,0,.105,.045,h,.055,light);box(g,0,h*.05,.105,w,.045,.055,light);
    box(g,0,-h/2-.09,.07,w+.22,.12,.23,stone);
    box(g,0,h/2+.08,.03,w+.20,.09,.17,light);
  }
  // Low side wings distinguish a central entrance from the exhibition volumes.
  bevel(0,.43,-.12,4.55,.36,3.75,stone);
  bevel(0,.65,-.12,4.60,.10,3.79,light);
  for(const side of [-1,1]){
    const x=side*1.66;
    box(root,x,1.80,-.16,1.13,2.25,3.50,cream);
    bevel(x,2.95,-.16,1.23,.16,3.62,light);
    hipRoof(x,3.09,-.16,1.34,3.72,.51,.79,3.05);
    windowPanel(x,1.95,1.63,.64,1.38);
    for(const z of [-1.18,.10])windowPanel(side*2.24,1.95,z,.82,1.35,side*Math.PI/2);
    for(const z of [-1.81,1.54])box(root,side*2.18,1.80,z,.16,2.25,.20,stone);
    box(root,side*1.12,1.85,1.72,.21,2.40,.28,stone);
  }
  // A genuine recessed threshold, with no opaque wall sheet across the opening.
  box(root,0,2.43,-1.78,2.10,3.58,.24,cream);
  for(const side of [-1,1]){
    box(root,side*.99,2.39,-.15,.23,3.48,3.37,cream);
    box(root,side*1.015,2.25,1.64,.20,3.20,.30,stone);
    bevel(side*1.03,.82,1.65,.31,.35,.38,light);
    bevel(side*1.03,3.45,1.65,.33,.22,.38,light);
  }
  box(root,0,3.73,1.52,2.06,.80,.24,cream);
  box(root,0,1.76,.49,1.86,2.22,.12,dark);
  for(const side of [-1,1]){
    const leaf=new THREE.Group();leaf.position.set(side*.84,.70,.66);leaf.rotation.y=side*.32;root.add(leaf);
    box(leaf,-side*.30,1.05,0,.60,2.10,.14,timber);
    box(leaf,-side*.30,1.28,.08,.43,1.12,.03,mint);
    box(leaf,-side*.30,.34,.08,.43,.40,.025,stone);
    mesh(leaf,new THREE.SphereGeometry(.038,8,6),brass,-side*.53,.95,.14);
  }
  mesh(root,new THREE.ExtrudeGeometry(archShape(1.12,.87,2.25,.70),{depth:.34,bevelEnabled:true,bevelSegments:1,bevelThickness:.03,bevelSize:.025,steps:1,curveSegments:1}),stone,0,0,1.58);
  for(let i=0;i<9;i++){
    const a=(i+.5)*Math.PI/9;
    const joint=box(root,Math.cos(a)*1.01,2.25+Math.sin(a)*1.01,1.955,.023,.20,.018,cream);joint.rotation.z=a-Math.PI/2;
  }
  bevel(0,.71,1.77,2.32,.16,.59,stone);
  bevel(0,.52,2.12,2.12,.22,.54,light);
  bevel(0,.32,2.47,1.92,.18,.44,stone);
  // Tiered tower roof, thick eaves and recessed glazing read at riding distance.
  bevel(0,4.20,-.12,2.37,.19,3.64,light);
  hipRoof(0,4.36,-.12,2.47,3.73,.70,1.77,2.91);
  for(const side of [-1,1]){
    windowPanel(side*.57,3.68,1.68,.56,.60);
    for(const z of [-1.2,.08])windowPanel(side*1.12,3.74,z,.78,.63,side*Math.PI/2);
  }
  // The tested canvas plaque aperture remains unchanged.
  bevel(0,3.98,2.53,3.22,.72,.18,dark);
  for(const side of [-1,1]){
    beam(root,[side*1.45,3.62,1.78],[side*1.45,3.62,2.49],.045,brass);
    box(root,side*1.45,3.40,2.23,.16,.20,.15,light);
    mesh(root,new THREE.ConeGeometry(.16,.13,8),roofDark,side*1.45,3.55,2.23);
  }
}
