// Rendering quality is independent of riding speed, physics and content.
// Pixel budgets bound drawing-buffer work on large and high-DPI displays.
const LEVELS=Object.freeze([
  Object.freeze({level:'full',maxPixelRatio:1.6,pixelBudget:3_200_000,shadowSize:2048,ambientMotion:true}),
  Object.freeze({level:'balanced',maxPixelRatio:1.25,pixelBudget:2_200_000,shadowSize:1024,ambientMotion:false}),
  Object.freeze({level:'light',maxPixelRatio:1,pixelBudget:1_500_000,shadowSize:1024,ambientMotion:false}),
]);
const WARMUP_MS=2500,WINDOW_MS=3000,MIN_SAMPLES=30;
const SLOW_FRAME_MS=30,MIN_MEAN_MS=32,SLOW_SHARE=.75,MAX_SAMPLE_MS=500;

/** Small, downward-only automatic quality policy for active rendering.
 * `sample` consumes raw RAF intervals, never the clamped simulation timestep.
 * Pause/visibility changes and long gaps restart observation, not quality. */
export function createRenderQuality({lighter=false}={}){
  let manualLight=lighter===true,automaticLevel=0;
  let warmupMs=0,warmupSamples=0,windowMs=0,windowSamples=0,slowSamples=0;
  function resetSamples(){warmupMs=0;warmupSamples=0;windowMs=0;windowSamples=0;slowSamples=0;}
  function clearWindow(){windowMs=0;windowSamples=0;slowSamples=0;}
  return {
    get lighter(){return manualLight;},
    get level(){return LEVELS[manualLight?2:automaticLevel].level;},
    setLighter(value){
      const next=value===true;
      if(next===manualLight)return false;
      manualLight=next;resetSamples();return true;
    },
    resetSamples,
    sample({frameMs,active=false}={}){
      if(!active||!Number.isFinite(frameMs)||frameMs<=0||frameMs>=MAX_SAMPLE_MS){resetSamples();return false;}
      if(manualLight||automaticLevel===LEVELS.length-1)return false;
      // Loading/compile stalls and resume frames do not immediately lower quality.
      if(warmupMs<WARMUP_MS||warmupSamples<MIN_SAMPLES){warmupMs+=frameMs;warmupSamples++;return false;}
      windowMs+=frameMs;windowSamples++;if(frameMs>SLOW_FRAME_MS)slowSamples++;
      if(windowMs<WINDOW_MS||windowSamples<MIN_SAMPLES)return false;
      const sustainedSlow=windowMs/windowSamples>=MIN_MEAN_MS&&slowSamples/windowSamples>=SLOW_SHARE;
      clearWindow();
      if(!sustainedSlow)return false;
      automaticLevel++;resetSamples();return true;
    },
    settings(width,height,deviceDPR=1){
      const preset=LEVELS[manualLight?2:automaticLevel];
      const safeWidth=Number.isFinite(width)&&width>0?width:1;
      const safeHeight=Number.isFinite(height)&&height>0?height:1;
      const nativeRatio=Number.isFinite(deviceDPR)&&deviceDPR>0?deviceDPR:1;
      return {
        level:preset.level,
        pixelRatio:Math.min(nativeRatio,preset.maxPixelRatio,Math.sqrt(preset.pixelBudget/(safeWidth*safeHeight))),
        shadowSize:preset.shadowSize,
        ambientMotion:preset.ambientMotion,
      };
    },
  };
}
