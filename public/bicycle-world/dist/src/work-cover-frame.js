/** Select a frequent edge color rather than averaging artwork into a muddy
 * border. Quantization tolerates source compression and excludes transparency. */
export function workCoverEdgeColors({data,width,height}){
  if(!data||width<1||height<1||data.length<width*height*4)throw new Error('Cover edge pixels are incomplete.');
  const strip=Math.min(3,width),colors=[];
  for(const right of [false,true]){
    const bins=new Map();let winning=null;
    for(let y=0;y<height;y++)for(let edge=0;edge<strip;edge++){
      const x=right?width-1-edge:edge,at=(y*width+x)*4;if(data[at+3]<192)continue;
      const r=data[at],g=data[at+1],b=data[at+2],key=((r>>4)<<8)|((g>>4)<<4)|(b>>4);
      let bin=bins.get(key);if(!bin){bin={count:0,r:0,g:0,b:0};bins.set(key,bin);}
      bin.count++;bin.r+=r;bin.g+=g;bin.b+=b;
      if(!winning||bin.count>winning.count)winning=bin;
    }
    if(!winning)throw new Error('The cover has no opaque edge background.');
    colors.push([winning.r,winning.g,winning.b].map(value=>Math.round(value/winning.count)));
  }
  return {left:colors[0],right:colors[1]};
}

/** Fit in aperture units first, then map each axis to the rounded raster.
 * Mapping the texture back to that aperture restores the exact source aspect,
 * without spending extra pixels merely to express an integer frame ratio. */
export function workCoverFrameLayout(sourceWidth,sourceHeight,{width,height},maxEdge=1536){
  if(![sourceWidth,sourceHeight,width,height,maxEdge].every(value=>Number.isFinite(value)&&value>0))throw new Error('Cover and frame dimensions must be positive.');
  const canvasWidth=Math.max(1,Math.round(maxEdge*Math.min(1,width/height))),canvasHeight=Math.max(1,Math.round(maxEdge*Math.min(1,height/width)));
  const scale=Math.min(width/sourceWidth,height/sourceHeight),drawWidth=sourceWidth*scale/width*canvasWidth,drawHeight=sourceHeight*scale/height*canvasHeight;
  return {width:canvasWidth,height:canvasHeight,x:(canvasWidth-drawWidth)/2,y:(canvasHeight-drawHeight)/2,drawWidth,drawHeight};
}

/** One canvas and one tiny readback per decoded image. The gallery background
 * and original cover share one unlit texture; no lit cream mat remains exposed.
 * The canonical 5:4 file stays untouched for the overview and image inspector. */
export function drawWorkCoverFrame(canvas,image,aperture){
  const sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
  const layout=workCoverFrameLayout(sourceWidth,sourceHeight,aperture);
  canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d');if(!context)throw new Error('A cover canvas is unavailable.');
  context.drawImage(image,0,0,64,64);
  const colors=workCoverEdgeColors(context.getImageData(0,0,64,64));
  canvas.width=layout.width;canvas.height=layout.height;
  const css=color=>`rgb(${color.join(',')})`;
  context.fillStyle=css(colors.left);context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle=css(colors.right);context.fillRect(canvas.width/2,0,canvas.width/2,canvas.height);
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  context.drawImage(image,layout.x,layout.y,layout.drawWidth,layout.drawHeight);
  return {...layout,colors};
}
