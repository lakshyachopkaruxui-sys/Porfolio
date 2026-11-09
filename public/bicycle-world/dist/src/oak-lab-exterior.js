import * as THREE from 'three';

/** Original two-volume interpretation of the owner's rounded-roof lab reference. */
export function buildOakLabExterior({root,spec,mesh,box,material}){
  const cream=material('#eddfb8','Oak lab plaster'),red=material('#994638','Oak lab curved roof');
  const trim=material('#f8efd7','Oak lab window trim'),mint=material('#83b8a4','Oak lab mint frames');
  const dark=material('#344b43','Oak lab doorway'),glass=material('#a4d8d2','Oak lab research glazing');
  const stone=material('#bcb49e','Oak lab foundation');
  const centre=-1.0,front=1.43;
  root.name='Landmark: Professor Oak’s lab';
  root.userData.entry={x:spec.x+centre,y:1.8,z:spec.z+2.5};
  box(root,0,.22,-.08,5.0,.44,3.45,stone);
  // Tall front volume: curved facade and wrapping roof carry its identity.
  const facade=new THREE.Shape();facade.moveTo(-1.34,.42);facade.lineTo(1.34,.42);facade.lineTo(1.34,3.1);
  for(let i=0;i<=18;i++){const a=i/18*Math.PI;facade.lineTo(Math.cos(a)*1.34,3.1+Math.sin(a)*1.73);}facade.closePath();
  mesh(root,new THREE.ExtrudeGeometry(facade,{depth:3.05,bevelEnabled:false,curveSegments:18}),cream,centre,0,-1.62);
  box(root,centre,.64,-.05,2.74,.25,3.12,stone);
  function roofBand(rx,ry,thickness,depth,z,mat){
    const shape=new THREE.Shape();
    for(let i=0;i<=20;i++){const a=i/20*Math.PI,x=Math.cos(a)*rx,y=3.1+Math.sin(a)*ry;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}
    for(let i=20;i>=0;i--){const a=i/20*Math.PI;shape.lineTo(Math.cos(a)*(rx-thickness),3.1+Math.sin(a)*(ry-thickness));}shape.closePath();
    return mesh(root,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),mat,centre,0,z);
  }
  roofBand(1.48,1.88,.13,3.65,-1.85,red);roofBand(1.49,1.89,.065,.075,1.80,trim);
  // Sparse tile courses read at riding scale without texture requests.
  for(const z of [-1.48,-.96,-.44,.08,.60,1.12,1.65])roofBand(1.487,1.887,.022,.025,z,red);
  // Three tall arched panes replace the generic house's small attic window.
  function archedPane(x,bottom,width,shoulder,capHeight){
    const outline=new THREE.Shape();outline.moveTo(-width/2,bottom);outline.lineTo(width/2,bottom);outline.lineTo(width/2,shoulder);
    for(let i=0;i<=16;i++){const a=i/16*Math.PI;outline.lineTo(Math.cos(a)*width/2,shoulder+Math.sin(a)*capHeight);}outline.closePath();
    mesh(root,new THREE.ExtrudeGeometry(outline,{depth:.085,bevelEnabled:false}),trim,x,0,front+.025);
    const inset=new THREE.Shape(),w=width-.10;inset.moveTo(-w/2,bottom+.08);inset.lineTo(w/2,bottom+.08);inset.lineTo(w/2,shoulder);
    for(let i=0;i<=16;i++){const a=i/16*Math.PI;inset.lineTo(Math.cos(a)*w/2,shoulder+Math.sin(a)*(capHeight-.055));}inset.closePath();
    mesh(root,new THREE.ShapeGeometry(inset,16),glass,x,0,front+.12);box(root,x,bottom+.09,front+.135,width-.08,.06,.04,mint);
  }
  archedPane(centre-.72,3.09,.66,3.88,.37);archedPane(centre,3.09,.66,4.13,.36);archedPane(centre+.72,3.09,.66,3.88,.37);
  box(root,centre,2.72,front+.07,2.22,.46,.10,trim);box(root,centre,2.72,front+.13,2.03,.30,.035,glass);
  for(const x of [centre-.69,centre,centre+.69])box(root,x,2.72,front+.165,.055,.32,.05,mint);
  // Recessed, parted double doors beneath a projecting research-lab canopy.
  box(root,centre,1.43,front+.035,1.25,1.85,.09,dark);
  for(const side of [-1,1]){
    box(root,centre+side*.69,1.43,front+.14,.13,1.99,.17,trim);
    const door=box(root,centre+side*.47,1.40,front+.22,.31,1.68,.11,mint);door.rotation.y=side*.35;
    box(root,centre+side*.47,1.68,front+.29,.20,.64,.025,glass);
  }
  box(root,centre,2.35,1.73,1.72,.15,.70,mint);box(root,centre,2.44,1.73,1.84,.08,.77,trim);
  box(root,centre,.48,1.94,1.8,.16,.72,stone);box(root,centre,.31,2.39,2.12,.18,.49,stone);
  // Lower side wing has a separate roof and broad research-room windows.
  box(root,1.43,1.37,-.03,2.12,1.90,3.05,cream);box(root,1.43,.62,-.03,2.19,.24,3.12,stone);
  const wingTriangle=new THREE.Shape();wingTriangle.moveTo(-1.15,0);wingTriangle.lineTo(1.15,0);wingTriangle.lineTo(0,.82);wingTriangle.closePath();
  for(const z of [-1.68,1.53])mesh(root,new THREE.ExtrudeGeometry(wingTriangle,{depth:.10,bevelEnabled:false}),cream,1.43,2.28,z);
  for(const side of [-1,1]){const slope=box(root,1.43+side*.60,2.70,-.05,1.48,.14,3.50,red);slope.rotation.z=-side*.62;}
  box(root,1.43,3.13,-.05,.12,.12,3.58,red);
  for(const x of [.86,2.01]){box(root,x,1.52,1.54,.78,.93,.10,trim);box(root,x,1.52,1.605,.62,.77,.035,glass);box(root,x,1.52,1.64,.05,.78,.04,mint);}
  box(root,2.53,1.53,-.24,.08,1.05,1.64,trim);box(root,2.58,1.53,-.24,.035,.86,1.44,glass);
  for(const z of [-.72,.23])box(root,2.61,1.53,z,.045,.89,.05,mint);
  // Research vent and planter remain below the native height cap.
  box(root,2.02,2.99,-.9,.28,.54,.34,stone);box(root,2.02,3.28,-.9,.40,.07,.44,trim);
  box(root,2.11,.68,1.94,.55,.40,.47,red);mesh(root,new THREE.IcosahedronGeometry(.33,1),mint,2.11,1.05,1.94);
}
