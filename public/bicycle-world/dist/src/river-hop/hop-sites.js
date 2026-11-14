import {HOP} from './trajectory.js';
import {rampHeight,edgeCrossing,launchCandidate,createManualFlight,rampSteeringAssist} from './manual-flight.js';
const REF={x:HOP.x,z:(HOP.launch+HOP.land)/2};
export const HOP_SITES=Object.freeze([
 Object.freeze({id:'first',label:'First bridge',x:REF.x,z:REF.z,yaw:0}),
 Object.freeze({id:'return',label:'Return bridge - open lawn',x:32,z:-51,yaw:-15*Math.PI/180}),
]);
export function localPoint(point,site){const x=point.x-site.x,z=point.z-site.z,c=Math.cos(site.yaw),s=Math.sin(site.yaw);return {x:REF.x+c*x-s*z,z:REF.z+s*x+c*z};}
export function worldPoint(point,site){const x=point.x-REF.x,z=point.z-REF.z,c=Math.cos(site.yaw),s=Math.sin(site.yaw);return {x:site.x+c*x+s*z,z:site.z-s*x+c*z};}
export function localPose(pose,site){return {...pose,...localPoint(pose,site),heading:pose.heading-site.yaw};}
export function worldPose(pose,site){const result={...pose,...worldPoint(pose,site),heading:pose.heading+site.yaw};if(Number.isFinite(pose.pivotX)&&Number.isFinite(pose.pivotZ)){const p=worldPoint({x:pose.pivotX,z:pose.pivotZ},site);result.pivotX=p.x;result.pivotZ=p.z;}return result;}
export function transformRoot(root,site){const origin=worldPoint({x:0,z:0},site);root.position.set(origin.x,0,origin.z);root.rotation.y=site.yaw;root.updateMatrixWorld(true);}
export function networkHeight(x,z){return Math.max(...HOP_SITES.map(site=>{const p=localPoint({x,z},site);return rampHeight(p.x,p.z);}));}
// A 0.12-unit lip tolerance covers one maximum-speed 1/120-second collision slice.
// The swept wheel crossing immediately hands control to flight; the river gap stays blocked.
export function supportsDeck(x,z){return HOP_SITES.some(site=>{const p=localPoint({x,z},site);return Math.abs(p.x-HOP.x)<=HOP.width/2-.04&&((p.z>=HOP.launchStart-1e-6&&p.z<=HOP.launch+.12)||(p.z>=HOP.land-.12&&p.z<=HOP.landingEnd+1e-6));});}
export function findCrossing(previous,state){for(const site of HOP_SITES){const a=localPose(previous,site),b=localPose(state,site);if(edgeCrossing(a,b))return {site,candidate:launchCandidate(a,b),local:b};}return null;}
export function networkFlight(state,direction,stunt,site){const flight=createManualFlight(localPose(state,site),direction,stunt);return {...flight,destination:worldPose(flight.destination,site),sample:(time,reduced)=>worldPose(flight.sample(time,reduced),site)};}
export function assistAcrossRamps(state,input){for(const site of HOP_SITES){const helped=rampSteeringAssist(localPose(state,site),input);if(helped!==input)return helped;}return input;}
export function reviewStart(siteId,bank){const site=HOP_SITES.find(s=>s.id===siteId)||HOP_SITES[0];return worldPose({x:HOP.x,z:bank==='south'?-66:-36,heading:bank==='south'?Math.PI:0},site);}

