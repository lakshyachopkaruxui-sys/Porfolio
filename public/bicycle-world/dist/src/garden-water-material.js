import * as THREE from 'three';
import {WORLD_BOUNDS,RIVER,BRIDGES} from './layout.js';

const TAU=Math.PI*2,MAX_STEP=.1,PHASE_RATE=.23;
const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
const smooth=(low,high,value)=>{const t=clamp((value-low)/(high-low));return t*t*(3-2*t);};
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const colours=Object.freeze({
  day:{shallow:'#8ac8af',middle:'#399e9f',deep:'#206c7a',sky:'#a2d4df',foam:'#c7e8d9'},
  night:{shallow:'#477f8c',middle:'#28677e',deep:'#173f5c',sky:'#7595b7',foam:'#6e97aa'},
});
const palettes=Object.fromEntries(Object.entries(colours).map(([mode,entries])=>[mode,Object.fromEntries(Object.entries(entries).map(([key,value])=>[key,new THREE.Color(value)]))]));

/** These analytic samples support deterministic review without claiming GPU
 * pixels. Runtime evaluation stays in the existing water fragment shader. */
export function gardenWaterColorAtDepth(distance,night=0){
  distance=finite(distance);night=clamp(finite(night));
  const sample=mode=>palettes[mode].shallow.clone().lerp(palettes[mode].middle,smooth(.04,1.25,distance)).lerp(palettes[mode].deep,smooth(1.15,3.2,distance));
  return sample('day').lerp(sample('night'),night);
}

export function gardenWaterRippleNormal(x,y,phase=0,detail=1){
  x=finite(x);y=finite(y);phase=finite(phase)%TAU;detail=clamp(finite(detail,1));
  const strength=.35+.65*detail;
  const dx=(Math.cos(x*.48-phase)*.035+Math.cos(y*1.2+x*.23-phase*2)*.018)*strength;
  const dy=Math.cos(y*2.3+Math.sin(x*.17-phase)*.65+phase*2)*.065*strength;
  return new THREE.Vector3(-dx,-dy,1).normalize();
}

function pocketCenters(stones,centerZ){
  const sides=[[],[]];
  for(const stone of stones||[])if(Number.isFinite(stone.x)&&Number.isFinite(stone.z))sides[stone.z<centerZ?0:1].push(stone.x);
  return sides.map(values=>{
    values.sort((a,b)=>a-b);const groups=[];
    for(const x of values){const last=groups.at(-1);if(last&&x-last.last<=2.5){last.total+=x;last.count++;last.last=x;}else groups.push({total:x,count:1,last:x});}
    const centers=groups.map(group=>group.total/group.count);
    if(centers.length>3)return [centers[0],centers[Math.floor((centers.length-1)/2)],centers.at(-1)];
    return centers;
  });
}

/** One opaque lit material for the existing two-triangle channel. Depth colour,
 * small coherent normal ripples and localized shore contact need no captures,
 * normal textures, transparent sorting, extra lights or geometry displacement. */
export function createGardenWaterMaterial({width=WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX,depth=RIVER.maxZ-RIVER.minZ,centerX=(WORLD_BOUNDS.maxX+WORLD_BOUNDS.minX)/2,centerZ=(RIVER.minZ+RIVER.maxZ)/2,bridges=BRIDGES}={}){
  if(![width,depth,centerX,centerZ].every(Number.isFinite)||width<=0||depth<=0||bridges.length!==2)throw new Error('Garden water needs the existing channel and its two crossings.');
  const uniforms={
    gardenRiverTime:{value:0},gardenRiverNight:{value:0},gardenRiverDetail:{value:1},gardenRiverHalfDepth:{value:depth/2},gardenRiverCenterX:{value:centerX},
    gardenRiverNorthPockets:{value:new THREE.Vector3(1e4,1e4,1e4)},gardenRiverSouthPockets:{value:new THREE.Vector3(1e4,1e4,1e4)},
    gardenRiverBridgeA:{value:new THREE.Vector2(bridges[0].x,bridges[0].width/2)},gardenRiverBridgeB:{value:new THREE.Vector2(bridges[1].x,bridges[1].width/2)},
  };
  for(const mode of ['day','night'])for(const [key,color]of Object.entries(palettes[mode]))uniforms[`gardenRiver${mode==='day'?'Day':'Night'}${key[0].toUpperCase()+key.slice(1)}`]={value:color.clone()};
  const material=new THREE.MeshStandardMaterial({color:colours.day.middle,roughness:.44,metalness:0});material.name='Garden river water';
  let disposed=false,lastTime=null,pockets=[[],[]];
  const declaration=`
    varying vec2 gardenRiverPosition;
    varying vec3 gardenRiverTangent;
    varying vec3 gardenRiverBitangent;
    uniform float gardenRiverTime, gardenRiverNight, gardenRiverDetail, gardenRiverHalfDepth, gardenRiverCenterX;
    uniform vec2 gardenRiverBridgeA, gardenRiverBridgeB;
    uniform vec3 gardenRiverNorthPockets, gardenRiverSouthPockets;
    uniform vec3 gardenRiverDayShallow, gardenRiverDayMiddle, gardenRiverDayDeep, gardenRiverDaySky, gardenRiverDayFoam;
    uniform vec3 gardenRiverNightShallow, gardenRiverNightMiddle, gardenRiverNightDeep, gardenRiverNightSky, gardenRiverNightFoam;
    float gardenRiverBridgeFade(float x) {
      float a=smoothstep(gardenRiverBridgeA.y+2.0,gardenRiverBridgeA.y+5.0,abs(x-gardenRiverBridgeA.x));
      float b=smoothstep(gardenRiverBridgeB.y+2.0,gardenRiverBridgeB.y+5.0,abs(x-gardenRiverBridgeB.x));
      return min(a,b);
    }
    vec2 gardenRiverSlope(vec2 p) {
      float phase=gardenRiverTime;
      float strength=.35+.65*gardenRiverDetail;
      return vec2(cos(p.x*.48-phase)*.035+cos(p.y*1.2+p.x*.23-phase*2.0)*.018,
        cos(p.y*2.3+sin(p.x*.17-phase)*.65+phase*2.0)*.065)*strength;
    }
  `;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec2 gardenRiverPosition;\nvarying vec3 gardenRiverTangent;\nvarying vec3 gardenRiverBitangent;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      gardenRiverPosition=position.xy;
      gardenRiverTangent=normalize(normalMatrix*vec3(1.0,0.0,0.0));
      gardenRiverBitangent=normalize(normalMatrix*vec3(0.0,1.0,0.0));`);
    shader.fragmentShader=declaration+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 riverP=gardenRiverPosition;
      float riverX=riverP.x+gardenRiverCenterX;
      float riverBridge=gardenRiverBridgeFade(riverX);
      // Match the existing scalloped bank geometry. No terrain is moved.
      float riverInset=(.54+.19*sin(riverX*.39)+.13*sin(riverX*.87+1.2))*riverBridge;
      float riverDistance=gardenRiverHalfDepth-abs(riverP.y)-riverInset;
      vec3 riverShallow=mix(gardenRiverDayShallow,gardenRiverNightShallow,gardenRiverNight);
      vec3 riverMiddle=mix(gardenRiverDayMiddle,gardenRiverNightMiddle,gardenRiverNight);
      vec3 riverDeep=mix(gardenRiverDayDeep,gardenRiverNightDeep,gardenRiverNight);
      vec3 riverSky=mix(gardenRiverDaySky,gardenRiverNightSky,gardenRiverNight);
      vec3 riverFoam=mix(gardenRiverDayFoam,gardenRiverNightFoam,gardenRiverNight);
      vec3 riverColour=mix(riverShallow,riverMiddle,smoothstep(.04,1.25,riverDistance));
      riverColour=mix(riverColour,riverDeep,smoothstep(1.15,3.2,riverDistance));
      float riverWave=sin(riverP.y*3.6+sin(riverP.x*.18-gardenRiverTime)*.8-gardenRiverTime*2.0);
      float riverDash=smoothstep(-.15,.7,sin(riverP.x*.42-gardenRiverTime));
      float riverAA=max(fwidth(riverWave),.006);
      float riverStreak=smoothstep(.94-riverAA,.995,riverWave)*riverDash*smoothstep(.35,1.4,riverDistance);
      riverColour=mix(riverColour,riverSky,riverStreak*(.035+.04*gardenRiverDetail)*(1.0-.55*gardenRiverNight));
      vec3 riverPockets=riverP.y>0.0?gardenRiverNorthPockets:gardenRiverSouthPockets;
      vec3 riverPocketDistance=abs(vec3(riverX)-riverPockets);
      float riverNearestPocket=min(riverPocketDistance.x,min(riverPocketDistance.y,riverPocketDistance.z));
      float riverContact=1.0-smoothstep(1.2,3.2,riverNearestPocket);
      float riverShore=smoothstep(.005,.045,riverDistance)*(1.0-smoothstep(.13,.25,riverDistance));
      float riverBroken=smoothstep(.2,.7,sin(riverX*2.7+sin(riverX*.51)+riverP.y*.8));
      riverColour=mix(riverColour,riverFoam,riverShore*riverContact*riverBroken*riverBridge*(.28-.12*gardenRiverNight));
      diffuseColor.rgb=riverColour;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 riverSlope=gardenRiverSlope(gardenRiverPosition);
      normal=normalize(normal-gardenRiverTangent*riverSlope.x-gardenRiverBitangent*riverSlope.y);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      // A gentle sky-facing sheen, not a reflection capture or emissive body.
      float riverFresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0);
      outgoingLight=mix(outgoingLight,riverSky,riverFresnel*(.09-.035*gardenRiverNight));
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'garden-river-depth-flow-v2';
  return {
    material,
    setShoreContacts(stones){
      if(disposed)return;pockets=pocketCenters(stones,centerZ);
      uniforms.gardenRiverNorthPockets.value.fromArray([...pockets[0],1e4,1e4,1e4].slice(0,3));
      uniforms.gardenRiverSouthPockets.value.fromArray([...pockets[1],1e4,1e4,1e4].slice(0,3));
    },
    update({time=0,night=0,reduced=false,lighter=false}={}){
      if(disposed)return;
      time=Number.isFinite(time)?time:lastTime??0;
      const step=lastTime===null?0:clamp(time-lastTime,0,MAX_STEP);
      if(!reduced&&!lighter){
        const phase=lastTime===null?((Math.max(0,time)*PHASE_RATE)%TAU):uniforms.gardenRiverTime.value+step*PHASE_RATE;
        uniforms.gardenRiverTime.value=phase%TAU;
      }
      lastTime=time;uniforms.gardenRiverNight.value=clamp(finite(night));uniforms.gardenRiverDetail.value=lighter?0:1;
    },
    diagnostics(){return {phase:uniforms.gardenRiverTime.value,night:uniforms.gardenRiverNight.value,detail:uniforms.gardenRiverDetail.value,pockets:pockets.map(values=>values.slice()),disposed};},
    dispose(){if(disposed)return;disposed=true;material.dispose();},
  };
}
