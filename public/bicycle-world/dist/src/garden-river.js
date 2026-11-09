import * as THREE from 'three';
import {WORLD_BOUNDS,RIVER,BRIDGES} from './layout.js';
import {GARDEN_PALETTE} from './garden-palette.js';
import {createGardenStonePrototype} from './garden-stones.js';
import {createGardenWaterMaterial} from './garden-water-material.js';

// The river's physical interval never changes. All dressing lives inside it,
// leaving the imported decks, approach signs and riding corridor untouched.
export function createGardenRiver(natureSource){
  const root=new THREE.Group();root.name='River garden';
  const stonePrototype=createGardenStonePrototype(natureSource);
  const geometries=[],materials=[],placements=[];
  const ownGeometry=g=>(geometries.push(g),g);
  const ownMaterial=m=>(materials.push(m),m);
  const matte=color=>ownMaterial(new THREE.MeshStandardMaterial({color,roughness:1}));
  const add=(geometry,material,name)=>{
    const mesh=new THREE.Mesh(ownGeometry(geometry),material);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const width=WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX,centerX=(WORLD_BOUNDS.maxX+WORLD_BOUNDS.minX)/2;
  const waterEffect=createGardenWaterMaterial();
  const waterMaterial=waterEffect.material;
  const water=add(new THREE.PlaneGeometry(width,RIVER.maxZ-RIVER.minZ),waterMaterial,'Quiet flowing water');
  water.rotation.x=-Math.PI/2;water.position.set(centerX,-.006,(RIVER.minZ+RIVER.maxZ)/2);

  const bankPositions=[],bankColors=[],bankIndices=[];
  const grass=new THREE.Color(GARDEN_PALETTE.ground),moss=new THREE.Color('#66865d'),shore=new THREE.Color('#a8a58a');
  const segments=134;
  const bridgeFade=x=>BRIDGES.reduce((fade,b)=>Math.min(fade,THREE.MathUtils.smoothstep(Math.abs(x-b.x),b.width/2+2,b.width/2+5)),1);
  for(const side of [-1,1]){
    const start=bankPositions.length/3,boundary=side<0?RIVER.minZ:RIVER.maxZ;
    for(let i=0;i<=segments;i++){
      const x=WORLD_BOUNDS.minX+width*i/segments;
      const inset=(.54+.19*Math.sin(x*.39)+.13*Math.sin(x*.87+1.2))*bridgeFade(x);
      // A low planted lip and a thin mineral edge soften the straight channel.
      for(const [fraction,y,color] of [[0,-.003,grass],[.7,.005,moss],[1,-.004,shore]]){
        bankPositions.push(x,y,boundary-side*inset*fraction);bankColors.push(color.r,color.g,color.b);
      }
      if(i<segments)for(let row=0;row<2;row++){
        const a=start+i*3+row,b=a+1,c=a+3,d=c+1;
        if(side<0)bankIndices.push(a,c,b,b,c,d);else bankIndices.push(a,b,c,b,d,c);
      }
    }
  }
  const banks=new THREE.BufferGeometry();banks.setAttribute('position',new THREE.Float32BufferAttribute(bankPositions,3));banks.setAttribute('color',new THREE.Float32BufferAttribute(bankColors,3));banks.setIndex(bankIndices);banks.computeVertexNormals();
  add(banks,ownMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide})),'Soft planted riverbanks');

  function safe(x,z,radius){
    return x-radius>=WORLD_BOUNDS.minX+1&&x+radius<=WORLD_BOUNDS.maxX-1&&z-radius>=RIVER.minZ&&z+radius<=RIVER.maxZ&&
      BRIDGES.every(b=>Math.abs(x-b.x)>=b.width/2+2+radius);
  }
  const stones=[],reeds=[],pads=[];
  // Alternating small planting pockets leave long stretches of open water.
  [-49,-31,-10,13,34,54].forEach((x,i)=>{
    const side=i%2?-1:1,boundary=side<0?RIVER.minZ:RIVER.maxZ;
    for(let j=0;j<2;j++){
      const px=x-1.4+j*.65,pz=boundary-side*(.7+j*.3),radius=.26,height=1+(i+j)%3*.18;
      if(safe(px,pz,radius)){const item={kind:'reeds',x:px,z:pz,radius,height,angle:i*1.4+j};reeds.push(item);placements.push(item);}
    }
  });
  // More riverbank locations, with the same eighteen stones in nine small pairs.
  [-58,-48,-30,-18,-5,10,26,35,58].forEach((x,i)=>{
    const side=i%2?-1:1,boundary=side<0?RIVER.minZ:RIVER.maxZ;
    for(let j=0;j<2;j++){
      const height=.3+((i+j)%3)*.045,scale=height/stonePrototype.height;
      const radius=stonePrototype.radius*scale+.035;
      const px=x+(j-.5)*1.35,pz=boundary-side*(radius+.13+j*.08);
      if(safe(px,pz,radius)){const item={kind:'stone',x:px,z:pz,radius,height,scale,angle:i*1.3+j*.8};stones.push(item);placements.push(item);}
    }
  });
  [[-52,-51.8],[-18,-49.1],[2,-53],[23,-50.9],[57,-49.7]].forEach(([x,z],i)=>{
    for(let j=0;j<3;j++){
      const px=x+j*.7,pz=z+Math.sin(j*2+i)*.45,radius=.25+(i+j)%3*.08;
      if(safe(px,pz,radius)){const item={kind:'lily',x:px,z:pz,radius,height:.02,angle:i*1.7+j};pads.push(item);placements.push(item);}
    }
  });
  waterEffect.setShoreContacts(stones);
  const stoneGeometry=ownGeometry(stonePrototype.geometry),stoneMaterial=stonePrototype.material;
  const stoneMesh=new THREE.InstancedMesh(stoneGeometry,stoneMaterial,stones.length);stoneMesh.name='Water-edge stones';stoneMesh.receiveShadow=true;root.add(stoneMesh);
  const dummy=new THREE.Object3D();
  stones.forEach((p,i)=>{dummy.position.set(p.x,-.015,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();stoneMesh.setMatrixAt(i,dummy.matrix);});
  stoneMesh.instanceMatrix.needsUpdate=true;stoneMesh.computeBoundingSphere();
  const reedPositions=[];
  for(const p of reeds)for(let blade=0;blade<5;blade++){
    const angle=p.angle+blade*2.4,dx=Math.cos(angle),dz=Math.sin(angle),h=p.height*(.68+blade*.08),w=.065;
    const bx=p.x+dx*.12,bz=p.z+dz*.12;
    reedPositions.push(bx-dz*w,-.002,bz+dx*w,bx+dz*w,-.002,bz-dx*w,p.x+dx*.24,h,p.z+dz*.24);
  }
  const reedGeometry=new THREE.BufferGeometry();reedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(reedPositions,3));reedGeometry.computeVertexNormals();
  add(reedGeometry,ownMaterial(new THREE.MeshStandardMaterial({color:'#668458',roughness:1,side:THREE.DoubleSide})),'Sparse river reeds');
  const padPositions=[];
  for(const p of pads)for(let wedge=0;wedge<10;wedge++){
    const a=p.angle+.25+wedge*(Math.PI*2-.5)/10,b=p.angle+.25+(wedge+1)*(Math.PI*2-.5)/10;
    padPositions.push(p.x,.004,p.z,p.x+Math.cos(b)*p.radius,.004,p.z+Math.sin(b)*p.radius,p.x+Math.cos(a)*p.radius,.004,p.z+Math.sin(a)*p.radius);
  }
  const padGeometry=new THREE.BufferGeometry();padGeometry.setAttribute('position',new THREE.Float32BufferAttribute(padPositions,3));padGeometry.computeVertexNormals();
  add(padGeometry,matte('#729763'),'Small lily-pad clusters');
  let disposed=false;
  return {root,placements,waterEffect,update(options={}){waterEffect.update(options);},dispose(){
    if(disposed)return;disposed=true;root.removeFromParent();stoneMesh.dispose();waterEffect.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }};
}
