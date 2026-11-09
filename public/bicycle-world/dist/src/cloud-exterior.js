import * as THREE from 'three';

/** An original compact weather lookout in the existing Cloud footprint.
 * Static geometry is absorbed by the garden's shared vertex-colour batch. */
export function buildCloudExterior({root,spec,mesh,box,material}){
  const plaster=material('#eadcb7','Lookout cream plaster');
  const trim=material('#fff0cb','Lookout warm window reveals');
  const gold=material('#ba8948','Lookout gold roof');
  const goldEdge=material('#e3b96d','Lookout raised roof seams');
  const turquoise=material('#83c5c0','Lookout turquoise glazing');
  const reflection=material('#c7e2d4','Lookout glazing reflection');
  const shadow=material('#294c4a','Lookout recessed doorway');
  const stone=material('#c3b898','Lookout foundation stone');
  const deck=new THREE.Group();deck.rotation.y=Math.atan2(-7,8);
  root.add(deck);root.name='Landmark: Cloud weather lookout';

  const cylinder=(parent,r,h,x,y,z,mat,n=16)=>mesh(parent,new THREE.CylinderGeometry(r,r,h,n),mat,x,y,z);
  function beam(parent,from,to,r,mat){
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to);
    const delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
    const object=cylinder(parent,r,delta.length(),mid.x,mid.y,mid.z,mat,6);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return object;
  }
  // Chamfered plan corners give the slabs thickness without exceeding the
  // original circular plinth. No shader, texture or transparent glass is needed.
  function slab(x,y,z,width,height,depth,chamfer,mat){
    const w=width/2,d=depth/2,c=chamfer,shape=new THREE.Shape();
    const points=[[-w+c,-d],[w-c,-d],[w,-d+c],[w,d-c],[w-c,d],[-w+c,d],[-w,d-c],[-w,-d+c]];
    points.forEach(([px,pz],i)=>i?shape.lineTo(px,pz):shape.moveTo(px,pz));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:1});
    geometry.rotateX(Math.PI/2);
    return mesh(deck,geometry,mat,x,y+height/2,z);
  }
  slab(0,.43,-.05,3.76,.22,3.06,.22,stone);
  slab(0,.56,-.05,3.56,.08,2.90,.18,trim);

  // Real wall returns around a recessed entrance, rather than a doorway painted
  // over a solid block. The front remains open along the existing entry axis.
  box(deck,0,1.78,-1.37,3.32,2.36,.18,plaster);
  for(const side of [-1,1]){
    box(deck,side*1.63,1.78,-.05,.20,2.36,2.70,plaster);
    box(deck,side*1.20,1.78,1.30,.80,2.36,.20,plaster);
    box(deck,side*.68,1.80,1.42,.18,2.40,.30,trim);
    box(deck,side*1.69,1.80,1.30,.22,2.40,.26,trim);
    box(deck,side*.68,.68,1.44,.29,.18,.36,gold);
    box(deck,side*.68,2.92,1.44,.29,.16,.36,gold);
    // Deep front window bays with sill, broad surround and slim mullion.
    box(deck,side*1.18,1.89,1.418,.76,1.88,.08,shadow);
    box(deck,side*1.18,1.89,1.462,.61,1.70,.028,turquoise);
    box(deck,side*1.18,1.03,1.50,.82,.12,.22,trim);
    box(deck,side*1.18,2.78,1.49,.82,.12,.16,trim);
    box(deck,side*1.18,1.88,1.49,.052,1.68,.055,goldEdge);
    box(deck,side*1.18,1.89,1.49,.64,.055,.055,goldEdge);
    box(deck,side*1.18-.16,2.29,1.483,.10,.65,.012,reflection);
    // Side glazing is recessed within the same cream structural piers.
    box(deck,side*1.742,1.91,-.18,.035,1.70,1.70,shadow);
    box(deck,side*1.766,1.91,-.18,.024,1.51,1.49,turquoise);
    for(const z of [-1.02,.66])box(deck,side*1.77,1.90,z,.10,1.84,.12,trim);
    for(const y of [1.04,2.77])box(deck,side*1.77,y,-.18,.12,.12,1.84,trim);
    box(deck,side*1.79,1.91,-.18,.05,1.54,.055,goldEdge);
  }
  box(deck,0,1.73,.78,1.20,2.26,.10,shadow);
  box(deck,0,2.87,1.31,1.20,.25,.22,plaster);
  box(deck,0,2.81,1.49,1.25,.10,.20,goldEdge);
  for(const side of [-1,1]){
    const door=box(deck,side*.52,1.66,1.16,.20,2.06,.09,turquoise);
    door.rotation.y=side*.27;
    box(deck,side*.48,1.65,1.23,.045,.30,.06,goldEdge);
  }
  // Small mounted entrance lamps share the garden's existing night-light
  // instance batch; their static housings stay in this architecture batch.
  root.userData.entranceLenses=[];
  for(const side of [-1,1]){
    const x=side*.68,y=2.30,z=1.635;
    box(deck,x,y,z,.17,.29,.12,shadow);
    for(const offset of [-.16,.16])box(deck,x,y+offset,z+.015,.21,.06,.16,gold);
    box(deck,x,y,z+.065,.105,.18,.015,trim);
    const position=new THREE.Vector3(x,y,z+.075).applyAxisAngle(new THREE.Vector3(0,1,0),deck.rotation.y);
    root.userData.entranceLenses.push({position:position.toArray(),size:[.105,.18,.015],yaw:deck.rotation.y});
  }
  // A small shallow stair ends before the existing arrival point.
  slab(0,.41,1.65,1.48,.16,.66,.10,stone);
  slab(0,.32,1.99,1.68,.13,.38,.10,stone);

  // Substantial two-layer cornice supports a flat observation terrace.
  slab(0,3.00,-.05,3.76,.20,3.06,.22,gold);
  slab(0,3.14,-.05,3.84,.10,3.12,.24,trim);
  slab(0,3.205,-.05,3.57,.03,2.86,.18,stone);

  // Weather Institute-inspired ribbed roof cap. One rounded volume leaves a
  // genuinely open terrace for the camera instead of becoming a telescope lab.
  const capX=-.78,capZ=-.38;
  cylinder(deck,.85,.82,capX,3.62,capZ,plaster,20);
  cylinder(deck,.90,.12,capX,3.25,capZ,gold,20);
  for(const angle of [-.90,-.30,.30,.90]){
    const pane=new THREE.Group();pane.position.set(capX+Math.sin(angle)*.853,3.66,capZ+Math.cos(angle)*.853);pane.rotation.y=angle;deck.add(pane);
    box(pane,0,0,0,.33,.52,.045,shadow);
    box(pane,0,0,.027,.25,.41,.018,turquoise);
    box(pane,0,-.28,.025,.37,.065,.08,trim);
  }
  cylinder(deck,1.015,.13,capX,4.035,capZ,gold,24);
  cylinder(deck,1.025,.045,capX,4.09,capZ,goldEdge,24);
  const cap=mesh(deck,new THREE.SphereGeometry(.97,20,10,0,Math.PI*2,0,Math.PI/2),gold,capX,4.04,capZ);
  cap.scale.y=1.085;
  for(let rib=0;rib<8;rib++){
    const yaw=rib*Math.PI*2/8;
    for(let segment=0;segment<6;segment++){
      const point=t=>[capX+Math.sin(t)*.978*Math.sin(yaw),4.04+Math.cos(t)*1.061,capZ+Math.sin(t)*.978*Math.cos(yaw)];
      beam(deck,point(segment*Math.PI/12),point((segment+1)*Math.PI/12),.018,goldEdge);
    }
  }
  cylinder(deck,.070,.070,capX,5.10,capZ,goldEdge,10);

  // Thin vertical pickets and a substantial handrail make the roof read as a
  // lookout balcony. Back-left is occupied by the roof cap, not extra clutter.
  const railY=3.71;
  for(const x of [-1.58,-1.05,-.52,.01,.54,1.07,1.60])beam(deck,[x,3.23,1.30],[x,railY,1.30],.032,gold);
  beam(deck,[-1.65,railY,1.30],[1.65,railY,1.30],.065,trim);
  for(const z of [.75,.20,-.35,-.90])beam(deck,[1.67,3.23,z],[1.67,railY,z],.032,gold);
  beam(deck,[1.67,railY,1.30],[1.67,railY,-1.20],.065,trim);
  beam(deck,[.36,railY,-1.20],[1.67,railY,-1.20],.065,trim);
  for(const x of [.42,1.02,1.62])beam(deck,[x,3.23,-1.20],[x,railY,-1.20],.032,gold);

  // Visible cloud-photography camera, correctly seated on the upper terrace.
  const camera=new THREE.Group();camera.position.set(.77,3.22,.38);camera.rotation.y=.18;deck.add(camera);
  for(const angle of [0,Math.PI*2/3,Math.PI*4/3])beam(camera,[0,.72,0],[Math.sin(angle)*.31,.025,Math.cos(angle)*.31],.032,shadow);
  box(camera,0,.87,0,.58,.35,.27,shadow);
  box(camera,-.10,1.09,0,.22,.10,.20,gold);
  const lens=cylinder(camera,.19,.25,0,.87,.23,gold,12);lens.rotation.x=Math.PI/2;
  const face=cylinder(camera,.145,.035,0,.87,.37,turquoise,12);face.rotation.x=Math.PI/2;
  cylinder(camera,.05,.035,.17,1.06,0,trim,8);

  const direction=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),deck.rotation.y);
  root.userData.entry={x:spec.x+direction.x*2.1,y:1.7,z:spec.z+direction.z*2.1};
}
