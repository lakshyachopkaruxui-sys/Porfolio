import * as THREE from 'three';

/** An original compact performance hall based on the inspected Contest Hall.
 * The dome, recessed arches and open threshold represent singing and Garba.
 * Opaque shared materials keep the whole landmark in the static batch. */
export function buildHobbiesExterior({root,spec,mesh,box,material}){
  const cream=material('#eddfb8','Hobbies hall plaster');
  const trim=material('#f8efd7','Hobbies hall cornice');
  const roof=material('#aa4b38','Hobbies hall terracotta dome');
  const rib=material('#bd7254','Hobbies dome raised ribs');
  const mint=material('#83b8a4','Hobbies mint joinery');
  const glass=material('#a4d8d2','Hobbies recessed sky glazing');
  const stone=material('#bcb49e','Hobbies foundation stone');
  const dark=material('#344b43','Hobbies auditorium shade');
  const wood=material('#a2784e','Hobbies stage timber');
  const hall=new THREE.Group();hall.rotation.y=Math.atan2(-5,8);root.add(hall);
  root.name='Landmark: Singing and Garba hall';
  root.userData.entry={x:spec.x-1.2,y:1.7,z:spec.z+2.1};
  const cylinder=(parent,r,h,x,y,z,mat,n=24)=>mesh(parent,new THREE.CylinderGeometry(r,r,h,n),mat,x,y,z);
  function arch(width,bottom,shoulder,cap){
    const shape=new THREE.Shape();shape.moveTo(-width/2,bottom);shape.lineTo(width/2,bottom);shape.lineTo(width/2,shoulder);
    for(let i=0;i<=6;i++){const a=i/6*Math.PI;shape.lineTo(Math.cos(a)*width/2,shoulder+Math.sin(a)*cap);}
    shape.closePath();return shape;
  }
  function archPath(width,bottom,shoulder,cap){
    const path=new THREE.Path();path.moveTo(-width/2,bottom);path.lineTo(-width/2,shoulder);
    for(let i=6;i>=0;i--){const a=i/6*Math.PI;path.lineTo(Math.cos(a)*width/2,shoulder+Math.sin(a)*cap);}
    path.lineTo(width/2,bottom);path.closePath();return path;
  }
  const extrude=(parent,shape,depth,mat,x=0,y=0,z=0)=>mesh(parent,
    new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:6}),mat,x,y,z);
  function archFrame(parent,width,bottom,shoulder,cap,thickness,z,mat){
    const outer=arch(width,bottom,shoulder,cap);
    outer.holes.push(archPath(width-2*thickness,bottom+thickness,shoulder,cap-thickness));
    return extrude(parent,outer,.10,mat,0,0,z);
  }

  const centreZ=-.30;
  cylinder(hall,2.28,.19,0,.43,centreZ,stone);
  cylinder(hall,2.24,.09,0,.57,centreZ,trim);
  cylinder(hall,2.18,.10,0,.66,centreZ,stone);
  // Twelve-sided drum with actual window holes and inward-set glass.
  // Front facets are absent behind the entrance, so its recess is real.
  const sides=12,apothem=2.00,panelWidth=2*apothem*Math.tan(Math.PI/sides);
  const wallShape=new THREE.Shape();
  wallShape.moveTo(-panelWidth/2,.66);wallShape.lineTo(panelWidth/2,.66);
  wallShape.lineTo(panelWidth/2,2.88);wallShape.lineTo(-panelWidth/2,2.88);wallShape.closePath();
  wallShape.holes.push(archPath(.57,1.14,2.13,.285));
  const wallGeometry=new THREE.ExtrudeGeometry(wallShape,{depth:.14,steps:1,bevelEnabled:false,curveSegments:6});
  const paneGeometry=new THREE.ShapeGeometry(arch(.56,1.15,2.13,.275),6);
  for(let i=0;i<sides;i++){
    if(i===0||i===1||i===sides-1)continue;
    const a=i/sides*Math.PI*2,facet=new THREE.Group();
    facet.position.set(Math.sin(a)*apothem,0,centreZ+Math.cos(a)*apothem);facet.rotation.y=a;hall.add(facet);
    mesh(facet,wallGeometry,cream);
    mesh(facet,paneGeometry,glass,0,0,.035);
    archFrame(facet,.71,1.065,2.13,.355,.075,.14,trim);
    box(facet,0,1.66,.19,.04,1.01,.035,mint);
    box(facet,0,1.65,.19,.54,.045,.035,mint);
    box(facet,0,1.065,.18,.75,.10,.24,stone);
  }
  // Broad cornice and stepped eaves ground the dome on the wall below.
  cylinder(hall,2.20,.16,0,2.81,centreZ,cream);
  cylinder(hall,2.29,.12,0,2.91,centreZ,trim);
  cylinder(hall,2.31,.075,0,3.00,centreZ,roof);
  const dome=mesh(hall,new THREE.SphereGeometry(1,24,7,0,Math.PI*2,0,Math.PI/2),roof,0,3.02,centreZ);
  dome.scale.set(2.28,1.43,2.28);
  // Sparse low-section ribs give the round roof its Contest Hall identity.
  for(let i=0;i<8;i++){
    const azimuth=i/8*Math.PI*2,points=[];
    for(let j=0;j<=8;j++){
      const a=.05+j/8*(Math.PI/2-.05),r=Math.sin(a)*2.29;
      points.push(new THREE.Vector3(Math.sin(azimuth)*r,3.02+Math.cos(a)*1.445,centreZ+Math.cos(azimuth)*r));
    }
    mesh(hall,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.027,3,false),rib);
  }
  cylinder(hall,.17,.075,0,4.47,centreZ,trim,12);
  mesh(hall,new THREE.SphereGeometry(.10,8,6),mint,0,4.55,centreZ);

  // A lower entrance wing gives the round hall a legible front facade.
  for(const side of [-1,1]){
    const wing=new THREE.Group();wing.position.set(side*1.35,0,1.57);hall.add(wing);
    box(wing,0,1.56,-.15,.88,1.91,.65,cream);
    box(wing,0,.74,.20,.93,.25,.40,stone);
    extrude(wing,arch(.46,1.10,1.94,.23),.025,glass,0,0,.19);
    archFrame(wing,.62,1.02,1.94,.31,.08,.27,trim);
    box(wing,0,1.55,.36,.045,.84,.05,mint);
    box(wing,0,1.05,.33,.72,.09,.28,stone);
    box(wing,0,2.57,-.08,1.02,.15,.95,trim);
    const wingRoof=box(wing,0,2.70,-.11,1.07,.13,1.03,roof);wingRoof.rotation.x=.16;
    // Return wall closes the side seam between the low wing and round hall.
    box(hall,side*1.73,1.65,.99,.16,2.02,1.17,cream);
  }
  // An open arch gives a glimpse of a small stage instead of a painted doorway.
  // One continuous contour avoids a hole coincident with the bottom edge.
  const entryShape=new THREE.Shape();entryShape.moveTo(-.955,.57);entryShape.lineTo(-.955,1.90);
  for(let i=8;i>=0;i--){const a=i/8*Math.PI;entryShape.lineTo(Math.cos(a)*.955,1.90+Math.sin(a)*.88);}
  entryShape.lineTo(.955,.57);entryShape.lineTo(.73,.57);entryShape.lineTo(.73,1.90);
  for(let i=0;i<=8;i++){const a=i/8*Math.PI;entryShape.lineTo(Math.cos(a)*.73,1.90+Math.sin(a)*.65);}
  entryShape.lineTo(-.73,.57);entryShape.closePath();
  extrude(hall,entryShape,.36,trim,0,0,1.92);
  for(const side of [-1,1])box(hall,side*.70,1.23,2.30,.055,1.30,.08,mint);
  const trimTop=new THREE.Shape();
  for(let i=0;i<=8;i++){const a=i/8*Math.PI,x=Math.cos(a)*.735,y=1.90+Math.sin(a)*.665;i?trimTop.lineTo(x,y):trimTop.moveTo(x,y);}
  for(let i=8;i>=0;i--){const a=i/8*Math.PI;trimTop.lineTo(Math.cos(a)*.68,1.90+Math.sin(a)*.61);}trimTop.closePath();
  extrude(hall,trimTop,.08,mint,0,0,2.30);
  box(hall,0,1.48,1.12,1.46,1.83,.10,dark);
  box(hall,0,.66,1.88,1.46,.10,1.56,wood);
  // Curtain and microphone glimpses communicate performance, with no Pokémon props.
  for(const side of [-1,1])for(let j=0;j<2;j++)cylinder(hall,.085,1.39,side*(.47+j*.12),1.45,1.47,roof,6);
  cylinder(hall,.12,.04,0,.75,1.60,dark,8);
  cylinder(hall,.019,.82,0,1.18,1.60,dark,6);
  const mic=mesh(hall,new THREE.CapsuleGeometry(.035,.13,2,6),dark,.045,1.61,1.60);mic.rotation.z=-.7;
  // Low approach steps stay inside the original solid circular footprint.
  box(hall,0,.51,2.20,2.17,.20,.94,stone);
  box(hall,0,.42,2.70,2.33,.13,.27,stone);
  box(hall,0,.38,2.86,2.38,.06,.10,trim);
  // Mounted entrance lanterns are consumed by the existing instanced night-light batch.
  root.userData.entranceLenses=[];
  for(const side of [-1,1]){
    box(hall,side*1.04,1.84,2.14,.16,.29,.14,dark);
    box(hall,side*1.04,1.84,2.22,.10,.19,.035,cream);
    const point=new THREE.Vector3(side*1.04,1.84,2.244).applyAxisAngle(new THREE.Vector3(0,1,0),hall.rotation.y);
    root.userData.entranceLenses.push({position:point.toArray(),size:[.10,.19,.012],yaw:hall.rotation.y});
  }
}
