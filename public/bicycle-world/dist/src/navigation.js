import {PATHS,RIVER,BRIDGES,RIDER_RADIUS,RIDER_HALF_WHEELBASE,STRUCTURE_COLLIDERS,isPassable,positionIsClear} from './layout.js';

const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
const copy=point=>({x:point.x,z:point.z});
const ROUTE_MARGIN=1;
const TURNING_MARGIN=RIDER_HALF_WHEELBASE+RIDER_RADIUS;
const ROAD_GRID_SIZE=8,roadGrid=new Map();
for(const path of PATHS)for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],halfWidth=path.width/2;
  const segment={a,b,halfWidth,dx:b.x-a.x,dz:b.z-a.z,lengthSquared:(b.x-a.x)**2+(b.z-a.z)**2};
  for(let x=Math.floor((Math.min(a.x,b.x)-halfWidth)/ROAD_GRID_SIZE);x<=Math.floor((Math.max(a.x,b.x)+halfWidth)/ROAD_GRID_SIZE);x++){
    for(let z=Math.floor((Math.min(a.z,b.z)-halfWidth)/ROAD_GRID_SIZE);z<=Math.floor((Math.max(a.z,b.z)+halfWidth)/ROAD_GRID_SIZE);z++){
      const key=`${x},${z}`;if(!roadGrid.has(key))roadGrid.set(key,[]);roadGrid.get(key).push(segment);
    }
  }
}

export function pointOnRoad(point,margin=RIDER_RADIUS){
  const segments=roadGrid.get(`${Math.floor(point.x/ROAD_GRID_SIZE)},${Math.floor(point.z/ROAD_GRID_SIZE)}`)||[];
  return segments.some(({a,dx,dz,lengthSquared,halfWidth})=>{
    const t=lengthSquared?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/lengthSquared)):0;
    return Math.hypot(point.x-a.x-dx*t,point.z-a.z-dz*t)<=halfWidth-margin;
  });
}

export function segmentFollowsRoad(start,end,margin=RIDER_RADIUS){
  const steps=Math.max(1,Math.ceil(distance(start,end)/.3));
  for(let i=0;i<=steps;i++){const t=i/steps;if(!pointOnRoad({x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t},margin))return false;}
  return true;
}

function pointIsClear(point,colliders,margin){return isPassable(point.x,point.z,margin)&&colliders.every(c=>distance(point,c)>=c.radius+margin);}
function endpointMargin(point,colliders){
  if(pointIsClear(point,colliders,ROUTE_MARGIN))return ROUTE_MARGIN;
  let low=RIDER_RADIUS,high=ROUTE_MARGIN;
  for(let i=0;i<12;i++){const middle=(low+high)/2;if(pointIsClear(point,colliders,middle))low=middle;else high=middle;}
  return low;
}
// Structure clearance includes the complete bicycle turning envelope. A tight
// clicked endpoint can taper to its real lateral clearance only near that end;
// it must not reduce clearance for the rest of a long route segment.
function routeSegmentIsClear(start,end,colliders=STRUCTURE_COLLIDERS){
  const terrainMargin=Math.min(endpointMargin(start,[]),endpointMargin(end,[]));
  if(!segmentIsClear(start,end,[],terrainMargin))return false;
  const dx=end.x-start.x,dz=end.z-start.z,lengthSquared=dx*dx+dz*dz,length=Math.sqrt(lengthSquared);
  for(const obstacle of colliders){
    const t=lengthSquared?Math.max(0,Math.min(1,((obstacle.x-start.x)*dx+(obstacle.z-start.z)*dz)/lengthSquared)):0;
    const startClearance=Math.min(TURNING_MARGIN,distance(start,obstacle)-obstacle.radius);
    const endClearance=Math.min(TURNING_MARGIN,distance(end,obstacle)-obstacle.radius);
    const margin=Math.min(TURNING_MARGIN,startClearance+t*length,endClearance+(1-t)*length);
    if(Math.hypot(start.x+dx*t-obstacle.x,start.z+dz*t-obstacle.z)<obstacle.radius+Math.max(RIDER_RADIUS,margin)-1e-8)return false;
  }
  return true;
}

/** Test the whole swept segment, including the rider's radius, rather than only its ends. */
export function segmentIsClear(start,end,colliders=STRUCTURE_COLLIDERS,margin=RIDER_RADIUS){
  if(!isPassable(start.x,start.z,margin)||!isPassable(end.x,end.z,margin))return false;
  const dx=end.x-start.x,dz=end.z-start.z,lengthSquared=dx*dx+dz*dz;
  for(const obstacle of colliders){
    const t=lengthSquared?Math.max(0,Math.min(1,((obstacle.x-start.x)*dx+(obstacle.z-start.z)*dz)/lengthSquared)):0;
    if(Math.hypot(start.x+dx*t-obstacle.x,start.z+dz*t-obstacle.z)<obstacle.radius+margin)return false;
  }
  // The portion intersecting the river must remain inside one bridge corridor.
  const low=RIVER.minZ-margin,high=RIVER.maxZ+margin;
  let enter=0,exit=1;
  if(Math.abs(dz)<1e-9){if(start.z<=low||start.z>=high)return true;}
  else{
    const a=(low-start.z)/dz,b=(high-start.z)/dz;
    enter=Math.max(0,Math.min(a,b));exit=Math.min(1,Math.max(a,b));
    if(exit<=enter)return true;
  }
  const firstX=start.x+dx*enter,lastX=start.x+dx*exit;
  return BRIDGES.some(bridge=>Math.abs(firstX-bridge.x)<=bridge.width/2-margin&&Math.abs(lastX-bridge.x)<=bridge.width/2-margin);
}

function buildGraph(){
  const nodes=[],edges=[],paths=[];
  function addNode(point){const id=nodes.length;nodes.push(copy(point));edges.push([]);return id;}
  function connect(a,b){
    if(a===b||edges[a].some(edge=>edge.to===b)||!routeSegmentIsClear(nodes[a],nodes[b]))return;
    const length=distance(nodes[a],nodes[b]);edges[a].push({to:b,length});edges[b].push({to:a,length});
  }
  for(const path of PATHS){
    const samples=path.closed?path.points.slice(0,-1):path.points;
    const ids=samples.map(addNode);paths.push({path,ids});
    for(let i=1;i<ids.length;i++)connect(ids[i-1],ids[i]);
    if(path.closed)connect(ids.at(-1),ids[0]);
  }
  const circuit=paths.find(item=>item.path.id==='circuit');
  // Spline samples need not fall exactly on a spur's control-point junction.
  // Join the spur to its closest visible circuit samples, on both sides.
  for(const {path,ids}of paths){
    if(path.id==='circuit')continue;
    const first=ids[0];
    for(const near of circuit.ids.map(id=>({id,d:distance(nodes[first],nodes[id])})).sort((a,b)=>a.d-b.d).slice(0,4))connect(first,near.id);
  }
  return {nodes,edges};
}

// Geometry is static for this foundation. Reuse the graph for every pointer request.
const graph=buildGraph();

function simplify(start,points,colliders,preferPaths){
  const result=[];let anchor=start,index=0,last=points.length-1;
  const startConnector=preferPaths&&!pointOnRoad(start,ROUTE_MARGIN);
  const endConnector=preferPaths&&!pointOnRoad(points.at(-1),ROUTE_MARGIN);
  if(startConnector){result.push(copy(points[0]));anchor=points[0];index=1;}
  if(endConnector)last--;
  while(index<=last){
    let next=last;
    while(next>index&&(!routeSegmentIsClear(anchor,points[next],colliders)||(preferPaths&&!segmentFollowsRoad(anchor,points[next],ROUTE_MARGIN))))next--;
    result.push(copy(points[next]));anchor=points[next];index=next+1;
  }
  if(endConnector)result.push(copy(points.at(-1)));
  return result;
}

function nearbyConnections(point,colliders){
  const candidates=graph.nodes.map((node,id)=>({id,distance:distance(point,node)})).sort((a,b)=>a.distance-b.distance);
  const connected=[];let nearest=Infinity;
  for(const candidate of candidates){
    if(candidate.distance>nearest+2.5||connected.length>=8)break;
    if(routeSegmentIsClear(point,graph.nodes[candidate.id],colliders)){nearest=Math.min(nearest,candidate.distance);connected.push(candidate.id);}
  }
  return new Set(connected);
}

/** Return reachable waypoints, excluding start and including target; null means no safe route. */
export function planRoute(start,target,colliders=STRUCTURE_COLLIDERS,{preferPaths=false}={}){
  if(!positionIsClear(start,colliders)||!positionIsClear(target,colliders))return null;
  if(routeSegmentIsClear(start,target,colliders)&&(!preferPaths||segmentFollowsRoad(start,target,ROUTE_MARGIN)))return [copy(target)];
  const {nodes,edges}=graph,count=nodes.length;
  const startConnections=preferPaths?nearbyConnections(start,colliders):null,endConnections=preferPaths?nearbyConnections(target,colliders):null;
  const costs=new Float64Array(count).fill(Infinity),previous=new Int32Array(count).fill(-1),visited=new Uint8Array(count);
  const endCosts=new Float64Array(count).fill(Infinity);
  for(let id=0;id<count;id++){
    if((!startConnections||startConnections.has(id))&&routeSegmentIsClear(start,nodes[id],colliders))costs[id]=distance(start,nodes[id]);
    if((!endConnections||endConnections.has(id))&&routeSegmentIsClear(nodes[id],target,colliders))endCosts[id]=distance(nodes[id],target);
  }
  let best=Infinity,finish=-1;
  for(let pass=0;pass<count;pass++){
    let current=-1,cost=Infinity;
    for(let id=0;id<count;id++)if(!visited[id]&&costs[id]<cost){current=id;cost=costs[id];}
    if(current<0||cost>=best)break;
    visited[current]=1;
    if(cost+endCosts[current]<best){best=cost+endCosts[current];finish=current;}
    for(const edge of edges[current]){
      if(visited[edge.to])continue;
      if(colliders!==STRUCTURE_COLLIDERS&&!routeSegmentIsClear(nodes[current],nodes[edge.to],colliders))continue;
      const candidate=cost+edge.length;
      if(candidate<costs[edge.to]){costs[edge.to]=candidate;previous[edge.to]=current;}
    }
  }
  if(finish<0)return null;
  const route=[copy(target)];
  for(let id=finish;id>=0;id=previous[id])route.push(nodes[id]);
  route.reverse();
  return simplify(start,route,colliders,preferPaths);
}

export function routeDistance(start,route){if(!route)return Infinity;let total=0,previous=start;for(const point of route){total+=distance(previous,point);previous=point;}return total;}
