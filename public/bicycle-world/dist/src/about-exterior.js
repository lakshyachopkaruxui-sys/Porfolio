import * as THREE from 'three';

/** A compact trainer's home, inspired by the inspected Pallet Town architecture.
 * Real openings, deep eaves and a recessed porch remain inside the existing plot.
 * All surfaces are opaque and join the shared static architecture batch. */
export function buildAboutExterior({root,spec,mesh,box,material}){
  const cream=material('#eddfb8','About warm plaster');
  const trim=material('#f8efd7','About limestone highlights');
  const roof=material('#aa4b38','About terracotta roof');
  const roofEdge=material('#793b30','About roof shadow');
  const mint=material('#83b8a4','About painted joinery');
  const glass=material('#a4d8d2','About recessed sky glazing');
  const stone=material('#bcb49e','About foundation stone');
  const dark=material('#344b43','About interior shade');
  const wood=material('#a2784e','About porch timber');
  root.name='Landmark: Lakshya’s trainer home';
  root.userData.entry={x:spec.x,y:1.8,z:spec.z+2.3};

  const outline=(points)=>{
    const shape=new THREE.Shape();
    points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
    shape.closePath();return shape;
  };
  const extrude=(parent,shape,depth,mat,x,y,z,bevel=0)=>mesh(parent,
    new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,
      bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:4}),mat,x,y,z);
  function windowFrame(parent,x,y,z,width,height){
    // Glass sits behind the outer jambs instead of on their front face.
    box(parent,x,y,z-.09,width-.13,height-.13,.045,glass);
    for(const side of [-1,1])box(parent,x+side*(width/2-.045),y,z,.09,height,.15,trim);
    for(const side of [-1,1])box(parent,x,y+side*(height/2-.045),z,width,.09,.15,trim);
    box(parent,x,y,z+.008,.055,height-.13,.10,mint);
    box(parent,x,y-.035,z+.008,width-.13,.055,.10,mint);
    box(parent,x,y-height/2-.035,z+.055,width+.16,.12,.28,stone);
  }

  // A full-height house volume replaces the former thin open frame.
  box(root,0,.42,-.16,3.95,.20,3.28,stone);
  box(root,0,.56,-.16,3.79,.10,3.12,trim);
  box(root,0,1.82,-1.67,3.62,2.52,.17,cream);
  box(root,-1.76,1.82,-.24,.16,2.52,2.84,cream);
  // Right wall is divided around the side window, keeping its inset glass visible.
  box(root,1.76,1.82,-1.31,.16,2.52,.70,cream);
  box(root,1.76,1.82,.59,.16,2.52,1.18,cream);
  box(root,1.76,.97,-.48,.16,.82,.96,cream);
  box(root,1.76,2.77,-.48,.16,.62,.96,cream);
  box(root,0,.72,-.17,3.68,.24,3.04,stone);
  box(root,0,3.0,-.24,3.72,.16,3.02,trim);

  // Front wall is built around a broad window and an offset open doorway.
  const facade=1.18;
  box(root,-.91,.91,facade,1.82,.50,.18,cream);
  box(root,-.91,2.72,facade,1.82,.58,.18,cream);
  for(const x of [-1.69,-.13])box(root,x,1.77,facade,.26,1.30,.18,cream);
  box(root,.91,2.78,facade,1.82,.46,.18,cream);
  box(root,1.65,1.70,facade,.34,2.18,.18,cream);
  box(root,.08,1.70,facade,.16,2.18,.18,cream);
  windowFrame(root,-.91,1.77,facade+.115,1.32,1.28);

  // Visible depth behind the threshold, with a partially open solid door.
  box(root,.78,1.60,.65,1.27,2.02,.10,dark);
  box(root,.78,.65,1.48,1.30,.09,1.58,wood);
  for(const x of [.14,1.44])box(root,x,1.65,1.28,.13,2.15,.27,trim);
  box(root,.79,2.72,1.28,1.43,.13,.27,trim);
  const doorPivot=new THREE.Group();doorPivot.position.set(1.37,.64,.86);doorPivot.rotation.y=.52;root.add(doorPivot);
  box(doorPivot,-.30,.94,0,.60,1.88,.10,mint);
  box(doorPivot,-.30,1.22,.06,.43,.77,.035,glass);
  box(doorPivot,-.30,.44,.06,.43,.43,.035,cream);
  mesh(doorPivot,new THREE.SphereGeometry(.045,6,4),wood,-.51,.89,.10);

  // A real gable opening keeps the small upper window recessed as well.
  const gable=outline([[-1.82,3.04],[1.82,3.04],[0,4.43]]);
  const upperHole=new THREE.Path();
  upperHole.moveTo(-.31,3.28);upperHole.lineTo(-.31,3.87);upperHole.lineTo(.31,3.87);upperHole.lineTo(.31,3.28);upperHole.closePath();
  gable.holes.push(upperHole);
  extrude(root,gable,.15,cream,0,0,1.16);
  extrude(root,outline([[-1.82,3.04],[1.82,3.04],[0,4.43]]),.15,cream,0,0,-1.76);
  windowFrame(root,0,3.575,1.33,.64,.61);

  // Thick roof planes and pale fascia create a readable house silhouette.
  const leftRoof=outline([[-2.04,2.94],[0,4.48],[0,4.62],[-2.10,3.08]]);
  const rightRoof=outline([[0,4.48],[2.04,2.94],[2.10,3.08],[0,4.62]]);
  extrude(root,leftRoof,3.54,roof,0,0,-1.93,.018);
  extrude(root,rightRoof,3.54,roof,0,0,-1.93,.018);
  const fasciaLeft=outline([[-2.06,2.94],[0,4.49],[0,4.40],[-2.06,2.85]]);
  const fasciaRight=outline([[0,4.49],[2.06,2.94],[2.06,2.85],[0,4.40]]);
  for(const z of [-1.96,1.60]){
    extrude(root,fasciaLeft,.08,trim,0,0,z);
    extrude(root,fasciaRight,.08,trim,0,0,z);
  }
  box(root,0,4.61,-.16,.13,.10,3.66,roofEdge);
  for(const x of [-2.04,2.04])box(root,x,2.93,-.16,.11,.12,3.58,roofEdge);
  // Sparse broad tile courses, not a texture or a high-density tiled mesh.
  for(const side of [-1,1])for(const distance of [.50,1.02,1.54]){
    const course=box(root,side*distance,4.58-distance*.739,-.16,.034,.035,3.57,roofEdge);
    course.rotation.z=-side*.636;
  }

  // A shallow porch is offset from the broad window, as in the reference home.
  const porchRoof=outline([[1.17,2.72],[2.14,2.49],[2.16,2.60],[1.17,2.85]]);
  const porch=extrude(root,porchRoof,1.56,roof,0,0,0);
  // The profile is drawn in z/y; rotate it into the house's x/z orientation.
  porch.rotation.y=-Math.PI/2;porch.position.set(1.55,0,0);
  box(root,.77,2.51,2.12,1.66,.13,.13,trim);
  for(const x of [.05,1.49]){
    box(root,x,1.52,1.98,.19,1.88,.19,trim);
    box(root,x,.67,1.98,.29,.24,.29,stone);
    box(root,x,2.42,1.98,.30,.14,.26,mint);
  }
  box(root,.76,.52,1.85,1.73,.18,1.0,stone);
  box(root,.65,.43,2.44,1.70,.14,.32,stone);
  box(root,.65,.39,2.61,1.78,.07,.14,trim);

  // A side window and a single planter add domestic cues without clutter.
  const sideWindow=new THREE.Group();sideWindow.position.set(1.855,1.91,-.48);sideWindow.rotation.y=Math.PI/2;root.add(sideWindow);
  windowFrame(sideWindow,0,0,0,.91,1.05);
  box(root,-1.44,.73,1.79,.89,.36,.51,roof);
  box(root,-1.44,.93,1.79,.96,.09,.56,trim);
  for(const [x,r]of [[-1.68,.24],[-1.30,.29]])mesh(root,new THREE.IcosahedronGeometry(r,0),mint,x,1.10,1.80);
  // Porch lantern uses mounted opaque geometry; its lens joins the existing light batch.
  box(root,-.12,2.35,1.40,.15,.24,.17,dark);
  box(root,-.12,2.35,1.50,.11,.16,.07,cream);
  mesh(root,new THREE.ConeGeometry(.15,.13,4),roof,-.12,2.53,1.45);
  root.userData.entranceLenses=[{position:[-.12,2.35,1.54],size:[.11,.16,.012],yaw:0}];
}
