import {WORLD_BOUNDS,RIVER,BRIDGES,PATHS,STOPS,STOP_SIGNS,ARRIVAL_SIGN} from './layout.js';
import {groundPokemonMotion} from './pokemon-locomotion.js';
import {flyingPokemonMotion} from './pokemon-flight.js';

export const POKEMON=Object.freeze([
  {id:'pikachu',name:'Pikachu',kind:'ground',anchor:{x:7,z:11},height:1.8,bodyRadius:1.45,travel:1.4,habitat:'the arrival lawns'},
  // The personality-first arrival layout moves its pavilion and foreground
  // planting into the former search pocket. This open central lawn preserves
  // the entire walking envelope and the fixed-camera crown sightline.
  {id:'bulbasaur',name:'Bulbasaur',kind:'ground',anchor:{x:-2,z:-4},height:1.65,bodyRadius:1.3,travel:.8,habitat:'the central garden lawns'},
  {id:'charmander',name:'Charmander',kind:'ground',anchor:{x:21,z:-69},height:1.8,bodyRadius:1.5,travel:.7,habitat:'the sunny lawn near Oak’s lab'},
  {id:'vaporeon',name:'Vaporeon',kind:'swim',anchor:{x:-15,z:-51},height:1.65,bodyRadius:1.9,travel:5.5,habitat:'the river'},
  {id:'articuno',name:'Articuno',kind:'fly',anchor:{x:-1,z:-30.5},span:5.8,bodyRadius:9,travel:82,altitude:15.5,habitat:'the sky across the whole garden'},
  {id:'charizard',name:'Charizard',kind:'fly',anchor:{x:-1,z:-30.5},span:6.8,bodyRadius:9,travel:82,altitude:18.7,habitat:'a broad flying circuit around the garden'},
  {id:'snorlax',name:'Snorlax',kind:'sleep',anchor:{x:51,z:30},width:4,height:2.7,bodyRadius:3.2,travel:0,habitat:'a quiet meadow by the southern path'},
  {id:'pikachu',key:'pikachu-north',name:'Pikachu',kind:'ground',anchor:{x:-29,z:-65},height:1.8,bodyRadius:1.45,travel:1.4,habitat:'the north-west lawns'},
  {id:'bulbasaur',key:'bulbasaur-north',name:'Bulbasaur',kind:'ground',anchor:{x:28,z:-90},height:1.65,bodyRadius:1.3,travel:.8,habitat:'the north-east lawns'},
  {id:'charmander',key:'charmander-west',name:'Charmander',kind:'ground',anchor:{x:-55,z:-34},height:1.8,bodyRadius:1.5,travel:.7,habitat:'the western sunny meadow'},
  {id:'snorlax',key:'snorlax-standing',name:'Snorlax',kind:'sleep',behavior:'stand-sleep',anchor:{x:57,z:-14},height:3.4,bodyRadius:2.6,travel:0,habitat:'standing asleep in the eastern meadow'},
].map(spec=>Object.freeze({...spec,key:spec.key||spec.id})));

export function habitatIsClear(x,z,radius,obstacles=[],trees=[]){
  const b=WORLD_BOUNDS;
  if(x-radius<b.minX+1||x+radius>b.maxX-1||z-radius<b.minZ+1||z+radius>b.maxZ-1)return false;
  if(z+radius>RIVER.minZ-1&&z-radius<RIVER.maxZ+1)return false;
  if(Object.values(STOPS).some(s=>Math.hypot(x-s.focus.x,z-s.focus.z)<s.size+radius+1))return false;
  if([...Object.values(STOP_SIGNS),ARRIVAL_SIGN].some(s=>Math.hypot(x-s.x,z-s.z)<radius+3))return false;
  if(obstacles.some(c=>Math.hypot(x-c.x,z-c.z)<radius+c.radius+.5))return false;
  // Planting silhouettes are wider than their bicycle colliders. In particular,
  // berry bushes are decoration-only and have no navigation collider at all.
  // Reserve the whole roaming envelope against their actual supplied bounds,
  // rather than letting a companion repeatedly walk through a planted clump.
  if(trees.some(t=>Math.hypot(x-t.x,z-t.z)<radius+t.radius+.3))return false;
  // The following camera looks over foreground crowns. Protect the projected
  // view corridor as well as the physical lawn, so a small creature stays visible.
  if(trees.some(t=>{
    if(t.kind!=='tree')return false;
    const rise=Math.max(0,t.height*.65-.8);
    return Math.hypot(x-(t.x-rise*12/17.5),z-(t.z-rise))<radius+t.radius+.4;
  }))return false;
  for(const path of PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<path.width/2+radius+.8)return false;
  }
  return true;
}

/** Whole movement envelopes are reserved, so companions never wander onto roads. */
export function choosePokemonHabitats(obstacles=[],trees=[]){
  const result=[];
  for(const spec of POKEMON){
    if(spec.id==='vaporeon'){
      const radius=spec.travel+spec.bodyRadius;
      if(!BRIDGES.every(b=>Math.abs(spec.anchor.x-b.x)>b.width/2+radius+2))throw new Error('Vaporeon needs clear water away from the bridge lanes.');
      result.push({...spec,x:spec.anchor.x,z:spec.anchor.z,y:-.25});continue;
    }
    if(spec.kind==='fly'){result.push({...spec,x:spec.anchor.x,z:spec.anchor.z,y:spec.altitude});continue;}
    const radius=spec.bodyRadius+spec.travel+.5;
    let placement=null;
    for(let attempt=0;attempt<200;attempt++){
      const angle=attempt*2.399963,distance=attempt?1.5+Math.sqrt(attempt)*1.1:0;
      const x=spec.anchor.x+Math.cos(angle)*distance,z=spec.anchor.z+Math.sin(angle)*distance;
      if(habitatIsClear(x,z,radius,obstacles,trees)&&result.every(p=>p.kind==='fly'||p.kind==='swim'||Math.hypot(x-p.x,z-p.z)>radius+p.bodyRadius+p.travel+1)){
        placement={...spec,x,z,y:0,reservedRadius:radius};break;
      }
    }
    if(!placement)throw new Error(`There is no clear garden pocket for ${spec.name}.`);
    result.push(placement);
  }
  return result;
}

/** Deterministic, bounded ambient paths, independent of rendering frame rate. */
export function pokemonMotion(spec,time){
  if(spec.id==='snorlax')return {x:0,z:0,y:0,heading:spec.behavior==='stand-sleep'?Math.atan2(12,17.5):Math.PI+.35,moving:0,hop:0,speed:0,acceleration:0,turnRate:0};
  if(spec.kind==='fly')return flyingPokemonMotion(spec,time);
  if(spec.id==='vaporeon'){
    const phase=time*.2,dx=-Math.sin(phase)*5.5,dz=Math.cos(phase)*1.3;
    const speed=Math.hypot(dx,dz)*.2;
    return {x:Math.cos(phase)*5.5,z:Math.sin(phase)*1.3,y:Math.sin(phase*2)*.035,heading:Math.atan2(dx,dz),moving:speed/1.1,hop:0,speed,turnRate:-.2*5.5*1.3/(dx*dx+dz*dz),acceleration:0};
  }
  return groundPokemonMotion(spec,time);
}
