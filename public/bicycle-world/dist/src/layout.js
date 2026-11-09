import {CatmullRomCurve3,Vector3} from 'three';
import {LANDMARK_SCALE} from './landmark-proportions.js';

// Foundation contract: rendering, movement, navigation and the map share these dimensions.
export const MAP_VERSION='winding-garden-personal-sequence-v5';
export const WORLD_BOUNDS={minX:-68,maxX:66,minZ:-106,maxZ:45};
export const RIDER_SCALE=1.7;
// Camera composition includes Woody's hat and the small riding gestures.
// This changes framing clearance, not bicycle collision dimensions.
export const RIDER_HEADROOM=2.4*RIDER_SCALE;
export const RIDER_RADIUS=.42*RIDER_SCALE;
export const RIDER_HALF_WHEELBASE=.58*RIDER_SCALE;
export const START={x:18,z:22,heading:1.4};
export const RIVER={minZ:-55,maxZ:-47};
export const BRIDGES=[
  {id:'west',x:-40,minZ:-58,maxZ:-44,width:9.2,height:.65},
  {id:'east',x:44,minZ:-58,maxZ:-44,width:10.2,height:.65}
];
// Sweep, west switchback, northern hook, open esses, eastern bend, southern return.
// Bridge control points remain aligned with the shared crossing corridors.
export const LOOP_POINTS=[[18,22],[0,20],[-14,10],[-25,7.5],[-36,16],[-48,18],[-54,8],[-54,-6],[-49,-18],[-37,-23],[-24,-20],[-16,-21],[-11,-26],[-12,-33],[-18,-38],[-29,-39],[-37,-41],[-40,-48],[-40,-56],[-40,-60],[-46,-69],[-50,-78],[-45,-87],[-35,-91],[-26,-87],[-24,-75],[-20,-66],[-9,-62],[6,-63],[22,-65],[33,-67],[40,-62],[44,-56],[44,-46],[37,-35],[30,-30],[26,-23],[30,-16],[41,-9],[50,1],[51,12],[43,21],[29,24]];
export const SPURS=[
  {id:'about',points:[[-36,16],[-40,7],[-35,-2]]},
  {id:'projects',points:[[-50,-78],[-58,-82],[-59,-88]]},
  {id:'work',points:[[-26,-87],[-18,-91],[-10,-92]]},
  {id:'music',points:[[6,-63],[9,-71],[13,-78]]},
  {id:'cloud',points:[[30,-16],[39,-20],[47,-22]]}
];
export const STOPS={
  about:{number:'01',x:-35,z:-5,radius:6,title:'MEET LAKSHYA',action:'Start a conversation',arrival:{x:-35,z:-2,heading:0},focus:{x:-35,z:-6},size:10,description:'A short introduction to Lakshya, his personality and the things he loves.',content:'about',next:'projects'},
  projects:{number:'02',x:-59,z:-88,radius:5.5,title:'WORKS',action:'Browse the projects',arrival:{x:-58.5,z:-85.5,heading:0},focus:{x:-60,z:-89},size:6.5,description:'Project overviews and the process behind this portfolio.',content:'projects',next:'work'},
  work:{number:'03',x:-10,z:-91,radius:5.5,title:'HOBBIES',action:'Explore my hobbies',arrival:{x:-13,z:-91,heading:-1.4},focus:{x:-10,z:-92},size:7,description:'Singing and Garba: music, movement and moments with people.',content:'collection',next:'music'},
  music:{number:'04',x:13,z:-79,radius:6,title:'OAK’S LAB',action:'Meet Oak and explore the collection',arrival:{x:11,z:-76,heading:-.45},focus:{x:13,z:-80},size:8,description:'Pokémon GO catches, childhood memories and how this garden was made.',content:'music',next:'cloud'},
  cloud:{number:'05',x:46,z:-22,radius:6,title:'CLOUD LOOKOUT',action:'Frame a quiet moment',arrival:{x:43,z:-21,heading:-Math.PI/2},focus:{x:47,z:-22},size:7.2,description:'Cloud photography, a quieter view and an illustrated postcard to take away.',content:'cloud',next:null}
};
export const STOP_SEQUENCE=Object.freeze(Object.keys(STOPS));

// One physical Works destination. Adding a project changes its indoor catalogue,
// not the garden's land allocation or the original approach road.
export const PROJECT_PLOTS=[{x:-61,z:-94}];
export const ARRIVAL_SIGN={x:START.x,z:START.z+8};
// The landmarks sit behind the arrival points, leaving the foreground for riding.
// Raised plinths share the solid landmark footprints used for riding clearance.
export const LANDMARKS={
  projects:{kind:'works-gallery',x:-61,z:-94,plots:PROJECT_PLOTS,radius:3.2,height:8.0,yaw:Math.atan2(2.5,8.5)},
  cloud:{kind:'sky-frame',x:50,z:-29,radius:3.132,height:8.0},
  work:{kind:'collection-pavilion',x:-8,z:-99,radius:3.77,height:7.5},
  music:{kind:'oak-lab',x:15,z:-85.2,radius:4.35,height:7.5},
  about:{kind:'pavilion',x:-35,z:-11.5,radius:3.596,height:7.6}
};
// Place sign corners within the solid base and face the actual approach.
// Sign size is independent of architectural scaling; its text is never stretched.
function gardenStopSign(id,width){
  const place=LANDMARKS[id],arrival=STOPS[id].arrival;
  const yaw=Math.atan2(arrival.x-place.x,arrival.z-place.z);
  const offset=Math.sqrt(place.radius**2-(width/2+.12)**2)-.12;
  return {x:place.x+Math.sin(yaw)*offset,z:place.z+Math.cos(yaw)*offset,
    y:3.1,width,height:1.0,yaw,text:STOPS[id].title,fontSize:100,fontScale:.70,framed:true};
}
export const STOP_SIGNS={
  projects:{x:LANDMARKS.projects.x+Math.sin(LANDMARKS.projects.yaw)*2.68*LANDMARK_SCALE.projects.xz,z:LANDMARKS.projects.z+Math.cos(LANDMARKS.projects.yaw)*2.68*LANDMARK_SCALE.projects.xz,y:3.98*LANDMARK_SCALE.projects.y,width:3.2,height:.7,text:'WORKS',fontSize:180,fontScale:.82,yaw:LANDMARKS.projects.yaw,attached:true},
  cloud:gardenStopSign('cloud',3.8),
  work:gardenStopSign('work',4.0),
  music:gardenStopSign('music',4.6),
  about:gardenStopSign('about',4.0)
};

function sample(points,closed){const curve=new CatmullRomCurve3(points.map(([x,z])=>new Vector3(x,0,z)),closed,'centripetal');curve.arcLengthDivisions=2000;const count=Math.ceil(curve.getLength()/.8);return curve.getSpacedPoints(count).map(p=>({x:p.x,z:p.z}));}
export const PATHS=[{id:'circuit',width:7.2,closed:true,points:sample(LOOP_POINTS,true)},...SPURS.map(spur=>({...spur,width:5.2,closed:false,points:sample(spur.points,false)}))];
// Colliders represent the few structural objects, not decorative vegetation.
export const STRUCTURE_COLLIDERS=[
  ...PROJECT_PLOTS.map(p=>({...p,radius:LANDMARKS.projects.radius,kind:'landmark',stop:'projects'})),
  ...['cloud','work','music','about'].map(id=>({x:LANDMARKS[id].x,z:LANDMARKS[id].z,radius:LANDMARKS[id].radius,kind:'landmark',stop:id})),
  ...[ARRIVAL_SIGN,STOP_SIGNS.projects].map(p=>({...p,radius:.15,kind:'sign'}))
];
export function bridgeAt(x,z){return BRIDGES.find(b=>z>=b.minZ&&z<=b.maxZ&&Math.abs(x-b.x)<=b.width/2);}
export function isPassable(x,z,margin=RIDER_RADIUS){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<WORLD_BOUNDS.minX+margin||x>WORLD_BOUNDS.maxX-margin||z<WORLD_BOUNDS.minZ+margin||z>WORLD_BOUNDS.maxZ-margin)return false;
  if(z>RIVER.minZ-margin&&z<RIVER.maxZ+margin){const bridge=bridgeAt(x,z);return Boolean(bridge&&Math.abs(x-bridge.x)<=bridge.width/2-margin);}
  return true;
}
export function terrainHeight(z,x=0){
  const edgeBlend=(distance,halfWidth)=>{const t=Math.max(0,Math.min(1,(halfWidth-distance)/1));return t*t*(3-2*t);};
  const bridge=bridgeAt(x,z);if(bridge)return Math.sin(Math.PI*(z-bridge.minZ)/(bridge.maxZ-bridge.minZ))*bridge.height*edgeBlend(Math.abs(x-bridge.x),bridge.width/2);
  return 0;
}
export function riderAxles(position){
  const dx=Math.sin(position.heading)*RIDER_HALF_WHEELBASE,dz=Math.cos(position.heading)*RIDER_HALF_WHEELBASE;
  return {front:{x:position.x-dx,z:position.z-dz},rear:{x:position.x+dx,z:position.z+dz}};
}
export function positionIsClear(position,colliders=STRUCTURE_COLLIDERS){
  if(!isPassable(position.x,position.z))return false;
  if(!Number.isFinite(position.heading))return colliders.every(c=>Math.hypot(position.x-c.x,position.z-c.z)>=c.radius+RIDER_RADIUS);
  const {front,rear}=riderAxles(position);
  if(!isPassable(front.x,front.z)||!isPassable(rear.x,rear.z))return false;
  const dx=rear.x-front.x,dz=rear.z-front.z,lengthSquared=dx*dx+dz*dz;
  // Clip the entire axle segment to the widened river interval. Sampling only
  // the wheels can miss a diagonal overlap at a bridge's bank-side corner.
  const low=RIVER.minZ-RIDER_RADIUS,high=RIVER.maxZ+RIDER_RADIUS;
  let enter=0,exit=1,overlapsRiver=true;
  if(Math.abs(dz)<1e-9)overlapsRiver=front.z>low&&front.z<high;
  else{const first=(low-front.z)/dz,last=(high-front.z)/dz;enter=Math.max(0,Math.min(first,last));exit=Math.min(1,Math.max(first,last));overlapsRiver=exit>enter;}
  if(overlapsRiver){const firstX=front.x+dx*enter,lastX=front.x+dx*exit;if(!BRIDGES.some(b=>Math.abs(firstX-b.x)<=b.width/2-RIDER_RADIUS&&Math.abs(lastX-b.x)<=b.width/2-RIDER_RADIUS))return false;}
  return colliders.every(c=>{
    const t=Math.max(0,Math.min(1,((c.x-front.x)*dx+(c.z-front.z)*dz)/lengthSquared));
    return Math.hypot(front.x+dx*t-c.x,front.z+dz*t-c.z)>=c.radius+RIDER_RADIUS-1e-7;
  });
}
export function nearbyStop(position,current){const distance=stop=>Math.hypot(position.x-stop.x,position.z-stop.z);if(STOPS[current]&&distance(STOPS[current])<STOPS[current].radius+.7)return current;return Object.keys(STOPS).find(key=>distance(STOPS[key])<STOPS[key].radius)||null;}
