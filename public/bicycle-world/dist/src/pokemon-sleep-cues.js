import * as THREE from 'three';

/** Three shared vector glyphs, not a font atlas or per-frame text rendering. */
export function createSleepCues(){
  const shape=new THREE.Shape();shape.moveTo(-.35,.45);
  for(const [x,y]of [[.35,.45],[.35,.29],[-.12,-.29],[.35,-.29],[.35,-.45],[-.35,-.45],[-.35,-.29],[.12,.29],[-.35,.29]])shape.lineTo(x,y);
  shape.closePath();const geometry=new THREE.ShapeGeometry(shape),root=new THREE.Group();root.name='Snorlax sleep ZZZ';
  const glyphs=[0,1,2].map(()=>{const material=new THREE.MeshBasicMaterial({color:'#29433e',transparent:true,depthWrite:false,side:THREE.DoubleSide});const glyph=new THREE.Mesh(geometry,material);root.add(glyph);return glyph;});
  const cameraRotation=new THREE.Quaternion();let disposed=false;
  return {root,update({anchor,time=0,quiet=false,camera}={}){
    if(disposed)return;root.position.copy(anchor);if(camera)camera.getWorldQuaternion(cameraRotation);root.quaternion.copy(cameraRotation);
    glyphs.forEach((glyph,index)=>{
      glyph.visible=!quiet||index===0;
      const phase=quiet?.25:((time/3.9+index/3)%1+1)%1;
      glyph.position.set(1.6+phase*.55,.35+phase*1.7,0);glyph.scale.setScalar(.32+phase*.27);
      glyph.material.opacity=quiet?.85:Math.sin(phase*Math.PI)*.9;
    });
  },dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometry.dispose();glyphs.forEach(glyph=>glyph.material.dispose());}};
}
