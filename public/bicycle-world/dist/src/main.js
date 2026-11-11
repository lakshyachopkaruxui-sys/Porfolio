import {createAboutExperience} from './about-experience.js';
import {destinationName} from './destination-names.js';
import {decorateModeSelectors} from './mode-selector.js';
import {isKeyboardShortcutBlocked,consumeNavigationKey} from './keyboard-navigation.js';
import {mountPlayOverlayMotion} from './play-overlay-motion.js';
import * as THREE from 'three';
import {createRider} from './rider.js';
import {loadWoodyCharacter,disposeCharacterAsset} from './character-loader.js';
import {createWoodyWelcome} from './woody-welcome.js';
import {createWelcomeFlow} from './welcome-flow.js';
import {hasEnteredGarden} from './welcome-resume.js';
import {createCloudTransition} from './cloud-transition.js';
import {mountCloudCurtain} from './cloud-curtain.js';
import {createCloudVolume} from './cloud-volume.js';
import {createWelcomeRecordings} from './welcome-recordings.js';
import {WELCOME_AUDIO} from './welcome-audio.js';
import {createWorld} from './foundation-world.js';
import {loadGarden} from './garden.js';
import {GARDEN_PALETTE} from './garden-palette.js';
import {createRenderQuality} from './render-quality.js';
import {newState,stepMotion,elevation,steeringAngle} from './motion.js';
import {createGuidedRide} from './guided-ride.js';
import {hybridUIState,createTouchRidingInput} from './hybrid-ui-state.js';
import {createDestinationUI} from './destination-ui.js';
import {STOPS,MAP_VERSION,RIDER_HALF_WHEELBASE,positionIsClear,nearbyStop} from './layout.js';
import {planRoute} from './navigation.js';
import {createMapUI} from './map-ui.js';
import {createLandmarkFramer} from './camera-framing.js';
import {createProjectUI} from './project-ui.js';
import {normalPortfolioURL} from './portfolio-route.js';
import {createRideFeedback} from './ride-feedback.js';
import {createRidingAudio} from './riding-audio.js';
import {createGardenBell} from './garden-bell.js';
import {createBicycleHeadlight} from './bicycle-headlight.js';
import {nearestRiderAccessory} from './rider-accessory-picking.js';
import {mountRidingAudioControl} from './riding-audio-ui.js';
import {BICYCLE_SOUNDS} from './bicycle-sound-catalog.js';
import {mountPlayMusic} from './play-music-ui.js';
import {createFollowCamera,createCameraObstacles,ridingPickIsAllowed} from './follow-camera.js';
import {createTrailheadGuide} from './trailhead-guide.js';
import {createGardenLighting} from './garden-lighting.js';
import {createFollowSky} from './follow-sky.js';
import {createContactMarker} from './contact-marker.js';
import {createPokemonWorld} from './pokemon-world.js';
import {WORLD_CAMERA_OFFSET,WORLD_CAMERA_NEAR,WORLD_CAMERA_FAR,WORLD_FOG_NEAR,WORLD_FOG_FAR} from './world-camera.js';
import {createPokemonAudio} from './pokemon-audio.js';
import {createPokemonProximity} from './pokemon-proximity.js';
import {mountPokemonControls} from './pokemon-ui.js';
import {createPersonalRooms} from './personal-rooms.js';
import {createOakLab} from './oak-lab.js';
import {createWorksExperience} from './works-experience.js';
import {runLoadingStages,withinDeadline} from './loading.js';
import {createGuardedFrameLoop} from './startup-lifecycle.js';

const $=id=>document.getElementById(id);
const sceneHost=$('scene'), reader=$('reader'), help=$('help');
const state=newState(),keys=new Set(),physicalKeys=new Set();
let touchControlInput;
let renderer,scene,camera,rider,world,sun,contactMarker,bicycleLight;
let overviewCamera,followView,trailheadGuide,hemisphere,gardenLighting,followSky,cameraObstacles=[],ridingView='overview';
let characterAsset,garden,companions;
let pokemonSoundPreference=null,rideSoundPreference=null,bicycleLightPreference=false;
const companionCallHistory=[];
let recordedCompanionCalls=0;
const pokemonAudio=createPokemonAudio({onState(status){
  sceneHost.dataset.companionSound=status.enabled?'on':'off';
  sceneHost.dataset.companionVoice=status.playingId||'';
  sceneHost.dataset.companionCalls=String(status.playedCount);
  sceneHost.dataset.lastCompanionVoice=status.lastPlayedId||'';
  if(status.playedCount>recordedCompanionCalls){
    recordedCompanionCalls=status.playedCount;
    companionCallHistory.push({id:status.lastPlayedId,sourceKind:status.sourceKind});
    if(companionCallHistory.length>12)companionCallHistory.shift();
    sceneHost.dataset.companionHistory=JSON.stringify(companionCallHistory);
  }
}});
const pokemonProximity=createPokemonProximity({play:(id,options)=>pokemonAudio.enabled?pokemonAudio.play(id,options):false});
const pokemonControls=mountPokemonControls(help,pokemonAudio,()=>notify('This browser could not enable Pokemon audio. The companions remain available.'),value=>{pokemonSoundPreference=value;pokemonProximity.reset();save();});
const pokemonListener={x:0,y:0,z:0,heading:0,speed:0};
const renderQuality=createRenderQuality();
let renderSettings=renderQuality.settings(innerWidth,innerHeight,devicePixelRatio);
let woodyWelcome,welcomeTime=0,guideRemaining=0,introRouteVisible=false,introRoutePoints=null,pendingWelcomeGuide=false;
let lastWaveLabel='';
let welcomeAudioPreference=null;
const welcomeFlow=createWelcomeFlow();
const cloudTransition=createCloudTransition(),cloudCurtain=mountCloudCurtain($('welcome-handoff'));
let cloudVolume,loadingCloudFrame=0,lastLoadingCloudPaint=-Infinity;
const FIRST_STOP='about';
const PERSONAL_ROUTES=Object.freeze({about:'#meet-lakshya',work:'#hobbies',music:'#oak-lab',cloud:'#cloud-lookout'});
const welcomeVoice=createWelcomeRecordings({clips:WELCOME_AUDIO,onState:syncWelcomeVoice,mountAudio(audio,kind){audio.hidden=true;audio.dataset.welcomeRecording=kind;document.body.append(audio);}});
const startupController=new AbortController();
let abandoned=false;
// Optional local QA only. Normal portfolio visits never fetch the profiler.
let rideProfile;
const profileRequested=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('rideProfile')==='1';
const companionLoadTimings=[];
function recordCompanionLoad(event){
  if(companionLoadTimings.length>=160)companionLoadTimings.shift();
  companionLoadTimings.push(event);sceneHost.dataset.companionLoading=JSON.stringify(companionLoadTimings);
}
if(profileRequested){
  import('./ride-profile.js').then(({createRideProfile})=>{if(!abandoned)rideProfile=createRideProfile();}).catch(error=>console.warn('Ride profiling is unavailable:',error));
}
let previousBicycleError=null;
const rideFeedback=createRideFeedback(),rideAudio=createRidingAudio({recordings:BICYCLE_SOUNDS,onState(status){
  sceneHost.dataset.bicyclePlayback=status.status;
  sceneHost.dataset.bicycleRoles=status.playingRoles.join(',');
  sceneHost.dataset.bicycleLoops=String(status.activeLoopCount);
  sceneHost.dataset.bicycleStarts=String(status.startedCount);
  sceneHost.dataset.bicycleBuffers=String(status.cachedBuffers);
  if(status.error!==previousBicycleError){
    previousBicycleError=status.error;
    if(status.error==='recording-unavailable')notify('The bicycle recording could not load. Short riding cues are still available.');
  }
}}),gardenBell=createGardenBell({onState(status){
  sceneHost.dataset.bellPlayback=status.status;
  sceneHost.dataset.bellVoices=String(status.activeVoices);
  sceneHost.dataset.bellBuffers=String(status.cachedBuffers);
  sceneHost.dataset.bellStarts=String(status.startedCount);
  sceneHost.dataset.bellSource=status.src;
  if(status.status==='unavailable')notify('The bell recording could not play. You can keep riding.');
}});
const rideSoundControl=mountRidingAudioControl($('ride-sounds'),rideAudio,{onPreference(value){rideSoundPreference=value;save();},onUnavailable(){notify('Sound is unavailable. All riding cues remain visible.');}});
let rideFeel={},startupComplete=false;
const rideAudioMotion={speed:0,pedaling:false,braking:false,moved:0,dt:0};
let landmarkFramer,cameraHeight=24;
let running=false,inPortfolio=false,ready=false,failed=false;
let enteredGarden=false,pendingRideAudio=false;
const mainLoop=createGuardedFrameLoop({step:frame,onError(error){
  failed=true;startupController.abort();console.error('The 3D view could not continue',error);
  showWorldFailure('The 3D view stopped unexpectedly. Retry the world, or keep reading the projects.');
}});
window.addEventListener('play-startup-cancel',()=>{
  failed=true;startupController.abort();mainLoop.stop();cancelAnimationFrame(loadingCloudFrame);
});
const playMusic=mountPlayMusic({notify});
let target=null,guidedRide=null,nearStop=null,lastTime=0,time=0,noticeTimer,saveTime=0,blockedTime=0;
let readerScroll=0,lastFocus=null,usedReader=false;
let pointerDown=null;
let placeUI,mapUI,projectUI,personalRooms,worksExperience,oakLab,aboutExperience,pendingArrival=null,hoverPointer=null;
// World coordinates for the rider's planted shoe; reuse the same terrain as wheels.
const riderGroundHeight=(x,z)=>elevation(z,x);
let rideHintVisible=false;
let readingBackdropDrawn=false;
const coarsePreference=matchMedia('(pointer: coarse)');
let coarse=coarsePreference.matches;
document.documentElement.classList.toggle('touch-input',coarse);
coarsePreference.addEventListener('change',event=>{coarse=event.matches;document.documentElement.classList.toggle('touch-input',coarse);clearInput();syncRideUI();});
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches,reducedOverride=null;
const overlayMotion=mountPlayOverlayMotion({isReduced:()=>reduced});
const focus=new THREE.Vector3(),desired=new THREE.Vector3(),cameraOffset=WORLD_CAMERA_OFFSET.clone();
const guideCameraUp=new THREE.Vector3().crossVectors(cameraOffset.clone().normalize(),new THREE.Vector3(cameraOffset.z,0,-cameraOffset.x).normalize()).normalize();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
// Leaving during preparation must not replace the last ride with startup defaults.
// Preferences and accessible reader progress can still be saved before 3D is ready.
const store={get(){try{return JSON.parse(localStorage.getItem('lakshya-bicycle-v1')||'null');}catch{return null;}},set(){try{const previous=this.get();const checkpoint=!ready&&previous?{mapVersion:previous.mapVersion,x:previous.x,z:previous.z,heading:previous.heading,ridingView:previous.ridingView,gardenNight:previous.gardenNight,automaticDaylight:previous.automaticDaylight}:{};localStorage.setItem('lakshya-bicycle-v1',JSON.stringify({enteredGarden:enteredGarden||previous?.enteredGarden===true,mapVersion:MAP_VERSION,x:state.x,z:state.z,heading:state.heading,ridingView,bicycleLight:bicycleLightPreference,gardenNight:gardenLighting?.night??false,automaticDaylight:gardenLighting?.automatic??false,pokemonSounds:pokemonSoundPreference,rideSounds:rideSoundPreference,readerScroll:reader.open?reader.scrollTop:readerScroll,reducedOverride,lighterGraphics:renderQuality.lighter,placeScrolls:placeUI?.scrolls,projectProgress:projectUI?.progress,...checkpoint}));}catch{}}};
motionPreference.addEventListener('change',e=>{if(reducedOverride===null)reduced=e.matches;if(reduced)setRidingView('overview');document.documentElement.classList.toggle('reduce-motion',reduced);});

function cancelRoute(){target=null;guidedRide=null;pendingArrival=null;blockedTime=0;$('ride-status').hidden=true;if(world){world.ring.visible=false;world.setRoute(introRouteVisible?introRoutePoints:null);}}
function clearInput({stop=true}={}){physicalKeys.clear();touchControlInput?.clear();keys.clear();cancelRoute();pointerDown=null;if(stop){state.speed=0;state.steering=0;}rideFeedback.reset(state);rideFeel={};contactMarker?.reset();rideAudio.stop();gardenBell.stop();pokemonAudio.stop();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'));}
function notify(text){$('notice').textContent=text;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),3200);}
function save(){store.set();}
function restartJourney(){
  if(!ready||!rider){notify('The garden is still preparing. Restart is available once the ride is ready.');return;}
  clearInput();dismissWelcomeGuide();welcomeVoice.stop();
  Object.assign(state,newState());pokemonProximity.reset();
  rideFeedback.reset(state);contactMarker?.reset();
  focus.set(state.x-Math.sin(state.heading),0,state.z-Math.cos(state.heading));
  desired.copy(focus);followView?.reset();
  if(ridingView==='follow')followView?.update(state,cameraObstacles,0,{snap:true});
  else if(camera){camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);}
  placeRider();setNearStop(nearbyStop(state,null));
  readingBackdropDrawn=false;save();syncRideUI();
  notify('Journey restarted at arrival. Your reading progress and preferences are kept.');
  if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});
}
function setRidingView(value,{persist=true}={}){
  if(!overviewCamera||!followView)return;
  const requested=value==='follow'?'follow':'overview';
  ridingView=reduced?'overview':requested;
  camera=ridingView==='follow'?followView.camera:overviewCamera;
  if(ridingView==='follow'){followView.reset();followView.update(state,cameraObstacles,0,{snap:true});}
  else{camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);}
  scene.fog.near=ridingView==='follow'?48:WORLD_FOG_NEAR;
  scene.fog.far=ridingView==='follow'?155:WORLD_FOG_FAR;
  gardenLighting?.setPerspective(ridingView==='follow');
  updateProjection();readingBackdropDrawn=false;
  sceneHost.dataset.ridingView=ridingView;
  $('riding-view').value=ridingView;
  $('ride-camera').textContent=ridingView==='follow'?'Overview (C)':'Follow Woody (C)';
  $('ride-camera').setAttribute('aria-label',ridingView==='follow'?'Overview (C): switch to overview camera':'Follow Woody (C): switch to closer third-person camera');
  world?.wayfinding.update(camera,{follow:ridingView==='follow'});
  if(persist)save();
}
function toggleRidingView(){overlayMotion.feedback($('ride-camera'));if(reduced){notify('Reduced motion keeps the overview steady. Change this preference in Guide to try Follow Woody.');return;}setRidingView(ridingView==='overview'?'follow':'overview');}
function nearTrailhead(){return trailheadGuide&&Math.hypot(state.x-trailheadGuide.position.x,state.z-trailheadGuide.position.z)<12;}
function setGardenNight(value){gardenLighting?.setNight(value,{immediate:reduced});$('night-garden').checked=Boolean(value);$('automatic-daylight').checked=false;readingBackdropDrawn=false;save();}
function syncBicycleLight(){
  const enabled=Boolean(bicycleLight?.enabled);
  $('bicycle-light').checked=enabled;
  $('ride-light').setAttribute('aria-pressed',String(enabled));
  $('ride-light').title=enabled?'Turn bicycle light off (L)':'Turn bicycle light on (L)';
  sceneHost.dataset.bicycleLight=enabled?'on':'off';
  sceneHost.dataset.bicycleLightOutput=(bicycleLight?.output??0).toFixed(2);
}
function setBicycleLight(value){
  if(!bicycleLight)return;
  bicycleLightPreference=Boolean(value);
  bicycleLight.setEnabled(value,{immediate:reduced||hasOverlay(),reduced});
  syncBicycleLight();readingBackdropDrawn=false;save();
  notify(value?'Bicycle light on.':'Bicycle light off.');
}
function hasOverlay(){return Boolean(reader.open||help.open||placeUI?.isOpen||projectUI?.isOpen||mapUI?.isOpen||personalRooms?.isOpen||worksExperience?.isOpen||oakLab?.isOpen||aboutExperience?.isOpen);}
function ridingInputBlocked(){return failed||abandoned||document.hidden||cloudTransition.snapshot.active||!$('woody-guide').hidden;}
function syncRideUI(){
  playMusic.setActive(ready&&running&&!inPortfolio);
  const ui=hybridUIState({ready,inPortfolio,running,modalOpen:hasOverlay(),previewOpen:false,hasRoute:Boolean(target),speed:state.speed,nearStop,hintVisible:rideHintVisible,stopFocused:document.activeElement===$('stop-route'),coarse,inputBlocked:ridingInputBlocked()});
  document.body.classList.toggle('hybrid-world',!inPortfolio);
  document.body.classList.toggle('hybrid-intro',ui.intro&&$('failure').hidden);
  document.body.classList.toggle('hybrid-reading',ui.reading);
  $('world-controls').hidden=!ui.controls;$('world-bottom').hidden=!ui.controls;
  $('ride-guide').hidden=!ui.controls;$('ride-help').hidden=!ui.controls;$('back').hidden=!ui.controls;
  // Compute visibility once. Hiding and revealing this button on every frame
  // removes native focus and can cancel Enter, Space or a pointer activation.
  const guidePrompt=!nearStop&&nearTrailhead()&&ui.controls;
  $('interact').hidden=!(ui.interact||guidePrompt);$('route-hint').hidden=!ui.hint;
  if(guidePrompt&&$('interact').querySelector('.stop-caption').textContent!=='Garden guide'){
    $('interact').querySelector('.stop-caption').textContent='Garden guide';
    $('interact-label').innerHTML='Open the riding guide <kbd>Enter</kbd>';
  }
  $('ride-status').hidden=!ui.status;$('stop-route').hidden=!ui.status;
  const touchControls=$('touch-controls');
  if(!ui.touchControls&&!touchControls.hidden)touchControlInput?.clear();
  touchControls.hidden=!ui.touchControls;touchControls.inert=!ui.touchControls;
  document.body.classList.toggle('hybrid-touch-riding',ui.touchControls);
  sceneHost.tabIndex=ready&&running&&!failed?0:-1;
  sceneHost.inert=!ready||failed||cloudTransition.snapshot.active;
  if(!$('woody-guide').hidden)$('world-bottom').hidden=true;
  const status=ui.kind==='riding'?(Math.abs(state.speed)<=.05?'Stopped · Ready to explore':coarse?'Riding freely':'Riding freely · Space to brake'):null;
  if(status&&$('ride-status-label').textContent!==status)$('ride-status-label').textContent=status;
  const stopLabel='Stop';
  if($('stop-route').textContent!==stopLabel)$('stop-route').textContent=stopLabel;
}
function rideEntry(){return !ready?(!$('failure').hidden?$('failure-read'):$('read-direct')):running?sceneHost:$('start');}
function restoreRideUI(){clearInput();save();syncRideUI();if(hasOverlay()||inPortfolio)return;if(renderer)resize();if(running&&ready)sceneHost.focus({preventScroll:true});else if(lastFocus?.isConnected&&!lastFocus.closest('[hidden]')&&!lastFocus.closest('dialog')&&!lastFocus.disabled)lastFocus.focus({preventScroll:true});else rideEntry().focus({preventScroll:true});}
function prepareOverlay(kind){
  cancelWelcomeDeparture();dismissWelcomeGuide();welcomeVoice.stop();
  const origin=document.activeElement;
  if(kind!=='reader'&&reader.open){readerScroll=reader.scrollTop;reader.close();}
  if(kind!=='help'&&help.open){help.close();help.inert=true;}
  if(kind!=='map')mapUI?.close();if(kind!=='place')placeUI?.close();if(kind!=='projects')projectUI?.close();
  if(kind!=='personal')personalRooms?.close({immediate:true,notify:false});
  if(kind!=='works')worksExperience?.close({immediate:true,notify:false});
  if(kind!=='oak')oakLab?.close({immediate:true,notify:false});
  if(kind!=='about')aboutExperience?.close({immediate:true,notify:false});
  lastFocus=origin;clearInput();$('interact').hidden=true;$('touch-controls').hidden=true;$('ride-guide').hidden=true;sceneHost.style.cursor='';sceneHost.removeAttribute('title');
}
function setNearStop(kind){
  if(nearStop===kind)return;
  nearStop=kind;syncRideUI();
  const stop=STOPS[kind];
  if(stop){$('interact').querySelector('.stop-caption').textContent=destinationName(kind,stop.title);$('interact-label').innerHTML=`${kind==='cloud'?'Explore my photography':stop.action} <kbd>Enter</kbd>`;$('route-hint').hidden=true;}
}
function syncWelcomeVoice({enabled,supported,speaking,error,playback='idle',kind}={}){
  $('welcome-audio').hidden=!WELCOME_AUDIO.welcome?.src;
  for(const id of ['welcome-voice','woody-guide-voice']){
    const clip=id==='welcome-voice'?'welcome':'controls',supplied=Boolean(WELCOME_AUDIO[clip]?.src),available=supported&&supplied;
    const button=$(id);button.textContent=!supplied?'Voice pending':!supported?'Audio unavailable':enabled?'Voice on':'Voice off';button.setAttribute('aria-pressed',String(Boolean(enabled&&available)));button.disabled=!available;
    if(id==='woody-guide-voice')button.hidden=!supplied;
  }
  $('welcome-replay').hidden=!welcomeVoice.available('welcome');
  $('welcome-replay').disabled=!supported||!ready;
  $('welcome-replay').textContent=speaking?'Stop voice':'Hear welcome';
  $('welcome-replay').dataset.playback=playback;
  $('welcome-caption').textContent=!WELCOME_AUDIO.welcome?.src?'Full Woody narration is awaiting a recording of this script.':!supported?'Audio is unavailable here. Everything is written on screen.':error?'The narration couldn’t play here. Choose Hear welcome to try again.':'Recorded welcome. The full transcript is written above.';
  $('woody-guide-replay').hidden=!WELCOME_AUDIO.controls?.src;$('woody-guide-replay').disabled=!supported;$('woody-guide-replay').textContent=speaking&&kind==='controls'?'Stop voice':'Hear controls';
  $('woody-guide-audio-status').hidden=!error||!WELCOME_AUDIO.controls?.src;
  $('woody-guide-audio-status').textContent=error?'Audio couldn’t play. Choose Hear controls to try again.':'';
}
function paintClouds(){
  const snapshot=cloudTransition.snapshot;cloudCurtain.render(snapshot);
  document.body.classList.toggle('cloud-handoff',snapshot.active);
  sceneHost.inert=!ready||failed||snapshot.active;
}
function clearWelcomeHandoff(){cloudTransition.cancel();pendingWelcomeGuide=false;paintClouds();}
function cancelWelcomeDeparture(){
  welcomeFlow.cancelDeparture();clearWelcomeHandoff();
  $('welcome').dataset.phase=welcomeFlow.snapshot.phase;
  if(welcomeFlow.snapshot.phase==='welcome'){$('welcome-dialogue').textContent='Ready to explore?';$('start').disabled=!ready;}
}
function dismissWelcomeGuide(){
  const ownedFocus=$('woody-guide').contains(document.activeElement);
  guideRemaining=0;$('woody-guide').hidden=true;
  if(introRouteVisible&&!target)world?.setRoute(null);introRouteVisible=false;introRoutePoints=null;
  if(ownedFocus&&running&&ready&&!inPortfolio&&!hasOverlay())sceneHost.focus({preventScroll:true});
}
function showWelcomeGuidance(){
  if(welcomeFlow.consumeGuidance()){
    const atIntroduction=nearbyStop(state,null)===FIRST_STOP;
    const destination=atIntroduction?'Meet Lakshya here. His work comes next, then the things he loves.':'First stop: meet Lakshya. Follow the path, or open the garden guide beside arrival for riding controls.';
    $('woody-guide-destination').textContent=destination;$('woody-guide').hidden=false;guideRemaining=9;
    if(!atIntroduction){const route=planRoute(state,STOPS[FIRST_STOP].arrival,world.colliders,{preferPaths:true});if(route){introRoutePoints=[{x:state.x,z:state.z},...route];world.setRoute(introRoutePoints);introRouteVisible=true;}}
    if(welcomeVoice.enabled)welcomeVoice.play('controls');
  }
}
function completeWelcome(showGuidance=true){
  running=true;inPortfolio=false;$('welcome').hidden=true;rideHintVisible=false;
  enteredGarden=true;save();
  $('game').hidden=false;
  pendingWelcomeGuide=showGuidance;
  if(cloudTransition.snapshot.active){
    // Render the prepared garden under an opaque cover before opening it.
    renderWorld();cloudTransition.reveal({reduced});paintClouds();
  }
  if(!cloudTransition.snapshot.active&&pendingWelcomeGuide){pendingWelcomeGuide=false;showWelcomeGuidance();}
  syncRideUI();if(!hasOverlay())sceneHost.focus({preventScroll:true});
}
function unlockRideAudio(){
  if(pokemonSoundPreference!==false)void pokemonAudio.setEnabled(true);
  if(rideSoundPreference!==false)void rideAudio.setEnabled(true).catch(()=>{});
  pendingRideAudio=false;
}
function start({skipWelcome=false,resuming=false}={}){
  if(!ready||running||welcomeFlow.snapshot.phase==='departing')return;
  clearInput();
  // The explicit start gesture unlocks nearby calls. A saved mute is respected;
  // loading the page alone never requests or plays any companion recording.
  if(resuming)pendingRideAudio=true;else unlockRideAudio();
  if(skipWelcome){welcomeFlow.skip();welcomeFlow.consumeGuidance();completeWelcome(false);return;}
  const next=welcomeFlow.begin({reduced});
  if(next.phase==='departing'){cloudTransition.cover({reduced});paintClouds();}
  $('welcome').dataset.phase=next.phase;$('welcome-dialogue').textContent='Come on, I’ll show you around.';$('start').disabled=true;
  // Elevate a transparent, already-composited frame in this same task. An old
  // opaque welcome framebuffer must not briefly hide the HTML introduction.
  if(next.phase==='departing')renderWelcome();
  if(welcomeVoice.enabled)welcomeVoice.play('departure');
  if(next.phase==='riding')completeWelcome();
}
function openReader(){if(ready&&oakLab)openLandmark('music');else projectUI.open('portfolio-world');usedReader=true;}
function closeReader(){readerScroll=reader.scrollTop;reader.close();history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
function syncModeSwitches(){decorateModeSelectors(document,{mode:'play',pageURL:location.href,navigationHandled:true});}
function showPortfolio(hash=''){
  playMusic.suspend('normal-portfolio',true);
  // Capture the return URL before reader cleanup changes its hash or query.
  const returnPath=location.pathname+location.search;
  const destination=normalPortfolioURL(location.href,typeof hash==='string'?hash:'');
  aboutExperience?.close({immediate:true,notify:false});oakLab?.close({immediate:true,notify:false});worksExperience?.close({immediate:true,notify:false});personalRooms?.close({immediate:true,notify:false});
  cancelWelcomeDeparture();dismissWelcomeGuide();welcomeVoice.stop();
  if(reader.open){readerScroll=reader.scrollTop;reader.close();}if(help.open){help.close();help.inert=true;}
  mapUI?.close();placeUI?.close();projectUI?.close();clearInput();syncRideUI();
  history.replaceState(null,'',returnPath);save();
  location.assign(destination);
}
function showHelp(){if(hasOverlay()||inPortfolio)return;prepareOverlay('help');$('calm-motion').checked=reduced;$('lighter-graphics').checked=renderQuality.lighter;rideSoundControl.sync();pokemonControls.sync();help.inert=false;help.showModal();help.scrollTop=0;$('help-close').focus({preventScroll:true});}
function closeHelp(){help.close();help.inert=true;restoreRideUI();}
function bell(){
  overlayMotion.feedback($('ride-bell'));
  rider?.bell?.ring({reduced});
  const pal=companions?.reactNearby(state);if(pal)pokemonAudio.play(pal.id);
  void gardenBell.play();
  notify(pal?.kind==='sleep'?'Snorlax keeps snoozing.':pal?pal.name+' noticed your bell.':'A little hello.');
}
function openWorks(projectId){
  if(worksExperience&&ready&&!inPortfolio){
    if(!running)start({skipWelcome:true});
    try{worksExperience.open(projectId);}
    catch(error){
      worksExperience.close({immediate:true,notify:false});
      console.warn('The Works room could not open; the readable catalogue remains available.',error);
      projectUI.open(projectId);
    }
  }else projectUI.open(projectId);
}
function openLandmark(kind){
  if(kind==='about'){
    if(aboutExperience&&ready&&!inPortfolio){
      if(aboutExperience.isOpen)return;
      if(!running)start({skipWelcome:true});
      try{if(aboutExperience.open())return;}catch(error){aboutExperience.close({immediate:true,notify:false});console.warn('The studio could not open; the readable biography remains available.',error);}
    }
    placeUI.open('about');return;
  }
  if(kind==='projects'){openWorks();return;}
  if(kind==='music'){
    if(oakLab&&ready&&!inPortfolio){
    if(!running)start({skipWelcome:true});
    try{if(oakLab.open())return;}catch(error){oakLab.close({immediate:true,notify:false});console.warn('The lab could not open; its readable story remains available.',error);}
    }
    placeUI.open('music');return;
  }
  if(PERSONAL_ROUTES[kind]&&personalRooms&&ready&&!inPortfolio){
    if(!running)start({skipWelcome:true});
    try{personalRooms.open(kind);return;}
    catch(error){personalRooms.close({immediate:true,notify:false});console.warn('The personal room could not open; its readable story remains available.',error);}
  }
  if(kind==='work')placeUI.open('collection');else if(STOPS[kind]?.content)placeUI.open(STOPS[kind].content);
}
function interact(){if(nearStop)openLandmark(nearStop);else if(nearTrailhead())showHelp();}
function beginRoute(destination,preferPaths=false,onArrival=null){
  dismissWelcomeGuide();welcomeVoice.stop();
  const route=planRoute(state,destination,world.colliders,{preferPaths});
  if(!route){notify('Choose clear ground. The river is crossed at either bridge.');return false;}
  const boosting=keys.has('shift');
  clearInput({stop:false});if(boosting){physicalKeys.add('shift');keys.add('shift');}pendingArrival=onArrival;target={...destination};
  guidedRide=createGuidedRide(state,route,world.colliders,{preferPaths});
  world.ring.position.set(destination.x,elevation(destination.z,destination.x)+.05,destination.z);world.ring.visible=true;
  world.setRoute([{x:state.x,z:state.z},...guidedRide.points]);$('ride-status-label').textContent='Following your route';syncRideUI();return true;
}
function visitPlace(kind,onArrival=null){const stop=STOPS[kind];if(!stop)return;if(!ready){notify('The world is still preparing. You can read every story directly.');return;}if(help.open){help.close();help.inert=true;}if(!running)start({skipWelcome:true});if(beginRoute(stop.arrival,true,onArrival||(()=>notify(`Arrived at ${destinationName(kind,stop.title).toLowerCase()}. Choose the stop to explore.`)))){$('ride-status-label').textContent=`Riding to ${destinationName(kind,stop.title).toLowerCase()}`;notify('Steer or brake to take over at any time.');}sceneHost.focus({preventScroll:true});}
function rideFromRoom(kind,projectId){
  const destination=kind==='collection'||kind==='memory'?'work':kind;
  if(!STOPS[destination])return false;
  // Direct reading remains available when the 3D world cannot support a ride.
  if(!ready||inPortfolio){if(projectId)openWorks(projectId);else openLandmark(destination);return false;}
  prepareOverlay('ride');
  history.replaceState(null,'',location.pathname+location.search);
  readingBackdropDrawn=false;updateProjection();restoreRideUI();
  // A named project is an explicit reading request: keep that selection after
  // the visible ride. General destination choices stop outside for Enter.
  visitPlace(destination,projectId?()=>openWorks(projectId):null);return true;
}
function showMap(){if(inPortfolio||reader.open||placeUI?.isOpen||projectUI?.isOpen||personalRooms?.isOpen||worksExperience?.isOpen||oakLab?.isOpen||aboutExperience?.isOpen)return;mapUI.open(state);}
function activateLandmark(kind){const stop=STOPS[kind];if(!stop)return;if(Math.hypot(state.x-stop.x,state.z-stop.z)<=stop.radius+4)openLandmark(kind);else visitPlace(kind);}
placeUI=createDestinationUI({
  onOpen(){prepareOverlay('place');},onClose:restoreRideUI,
  onContinue(){if(!running&&ready)start({skipWelcome:true});},onPortfolio:showPortfolio,onVisit:visitPlace,onRead:openLandmark,onProject:openWorks,isReduced:()=>reduced,enableRichCloud:false
});
projectUI=createProjectUI({onOpen(){prepareOverlay('projects');},onClose:restoreRideUI,onPortfolio:showPortfolio,onContinue(){if(!running&&ready)start({skipWelcome:true});}});
mapUI=createMapUI({onOpen(){prepareOverlay('map');},onClose:restoreRideUI,onRide:visitPlace,onRead:openLandmark,onPortfolio:showPortfolio,onHelp:showHelp,getView:()=>ridingView,onReset:restartJourney});
function decorateModeSwitches(){syncModeSwitches();}
decorateModeSwitches();
// Dialogs also work before WebGL is ready, so their layout cannot depend on RAF.
const overlayObserver=new MutationObserver(()=>{readingBackdropDrawn=false;syncRideUI();});
document.querySelectorAll('dialog').forEach(dialog=>overlayObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
window.addEventListener('pagehide',event=>{if(!event.persisted)overlayObserver.disconnect();});
document.querySelectorAll('[data-visit]').forEach(button=>button.addEventListener('click',()=>visitPlace(button.dataset.visit)));
document.querySelectorAll('[data-read-place]').forEach(button=>button.addEventListener('click',()=>placeUI.open(button.dataset.readPlace)));
document.querySelectorAll('[data-open-landmark]').forEach(button=>button.addEventListener('click',()=>openLandmark(button.dataset.openLandmark)));
$('start').addEventListener('click',start);$('back').addEventListener('click',showPortfolio);$('reader-back').addEventListener('click',showPortfolio);
$('welcome-portfolio').addEventListener('click',showPortfolio);
$('welcome-wave').addEventListener('click',()=>{
  if(!ready||welcomeFlow.snapshot.phase!=='welcome')return;
  if(!reduced)woodyWelcome?.greet();
  $('welcome-dialogue').textContent='Hi there. Ready for a little wander?';
});
$('welcome').addEventListener('pointermove',event=>{
  if(!woodyWelcome||running||reduced)return;
  const x=event.clientX/Math.max(1,innerWidth)*2-1;
  const y=event.clientY/Math.max(1,innerHeight)*2-1;
  woodyWelcome.setPointer(x,y);
},{passive:true,signal:startupController.signal});
$('welcome').addEventListener('pointerleave',()=>woodyWelcome?.setPointer(0,0),{signal:startupController.signal});
function toggleWelcomeVoice(){
  welcomeAudioPreference=!welcomeVoice.enabled;
  welcomeVoice.setEnabled(!welcomeVoice.enabled);
  if(welcomeVoice.enabled&&ready)welcomeVoice.play(running?'controls':'welcome');
}
$('welcome-voice').addEventListener('click',toggleWelcomeVoice);
$('woody-guide-voice').addEventListener('click',toggleWelcomeVoice);
$('welcome-replay').addEventListener('click',()=>{if(welcomeVoice.speaking)welcomeVoice.stop();else{welcomeAudioPreference=true;welcomeVoice.setEnabled(true);welcomeVoice.play('welcome');}});
$('woody-guide-replay').addEventListener('click',()=>{if(welcomeVoice.speaking)welcomeVoice.stop();else{welcomeAudioPreference=true;welcomeVoice.setEnabled(true);welcomeVoice.play('controls');}});
$('woody-guide-dismiss').addEventListener('click',()=>{dismissWelcomeGuide();welcomeVoice.stop();syncRideUI();sceneHost.focus({preventScroll:true});});
syncWelcomeVoice({enabled:welcomeVoice.enabled,supported:welcomeVoice.supported,speaking:false});
function stopRide(){clearInput();syncRideUI();notify('Stopped. Pedal or choose another place to continue.');sceneHost.focus({preventScroll:true});}
$('stop-route').addEventListener('click',stopRide);
$('open-map')?.addEventListener('click',showMap);$('help-map').addEventListener('click',showMap);$('ride-guide').addEventListener('click',showMap);
$('ride-help').addEventListener('click',showHelp);
$('ride-camera').addEventListener('click',()=>{toggleRidingView();if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});});
$('ride-bell').addEventListener('click',()=>{bell();if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});});
$('ride-light').addEventListener('click',()=>{setBicycleLight(!bicycleLight?.enabled);if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});});
$('bicycle-light').addEventListener('change',event=>setBicycleLight(event.target.checked));
$('riding-view').addEventListener('change',event=>setRidingView(event.target.value));
$('night-garden').addEventListener('change',event=>setGardenNight(event.target.checked));
$('automatic-daylight').addEventListener('change',event=>{gardenLighting?.setAutomatic(event.target.checked);save();});
$('read-direct').addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();showPortfolio();});$('failure-read').addEventListener('click',()=>openLandmark('projects'));$('close-reader').addEventListener('click',closeReader);$('reader-continue').addEventListener('click',()=>{closeReader();if(!running&&ready)start({skipWelcome:true});});$('interact').addEventListener('click',interact);
$('lighter-graphics').addEventListener('change',e=>{renderQuality.setLighter(e.target.checked);applyRenderQuality();garden?.update({time,reduced,lighter:!renderSettings.ambientMotion,camera,sun,night:gardenLighting?.progress??0});readingBackdropDrawn=false;save();});
$('help-close').addEventListener('click',closeHelp);$('help-resume').addEventListener('click',closeHelp);$('help-back').addEventListener('click',showPortfolio);$('calm-motion').addEventListener('change',e=>{reduced=e.target.checked;reducedOverride=reduced;if(reduced)setRidingView('overview');document.documentElement.classList.toggle('reduce-motion',reduced);save();});
$('touch-help').addEventListener('click',showHelp);$('help-read').addEventListener('click',openReader);$('skip-read').addEventListener('click',()=>projectUI.open());$('help-reset').addEventListener('click',()=>{closeHelp();restartJourney();});$('help-bell').addEventListener('click',bell);
reader.addEventListener('cancel',e=>{e.preventDefault();closeReader();});help.addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
reader.querySelectorAll('.case-sections a').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();reader.querySelector(link.getAttribute('href')).scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}));
const workbench={
  route:{title:'A route with something around the bend.',body:'The first circular track felt repetitive. A winding circuit now alternates long sweeps, tighter bends and two bridge crossings. Short pull-offs lead to five personal stops.',tradeoff:'Trade-off: a longer route asks for more time. The map can take you to a stop, or open its story immediately.'},
  landmarks:{title:'Know a place by its silhouette.',body:'One Works garden atelier, an open sky ring, a hobbies courtyard, a bandshell and an introduction studio give each stop a different shape. Their approaches stay clear, and the bicycle was enlarged with its rider.',tradeoff:'Trade-off: recognisable structures need space. The camera frames the local landmark and bicycle together instead of showing the whole map at once.'},
  reading:{title:'Park the bicycle. Keep your place.',body:'A native HTML reader pauses the world. Projects have short sections, visible evidence limits and a shared chooser. Closing a story restores the same riding position; project reading progress is remembered.',tradeoff:'Trade-off: reading covers the scene. That separation keeps motion from competing with the work. The map also opens every story without a ride.'}
};
document.querySelectorAll('[data-workbench]').forEach(button=>button.addEventListener('click',()=>{const choice=workbench[button.dataset.workbench];document.querySelectorAll('[data-workbench]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));$('workbench-title').textContent=choice.title;$('workbench-body').textContent=choice.body;$('workbench-tradeoff').textContent=choice.tradeoff;}));
document.addEventListener('keydown',e=>{
  if(hasOverlay()||inPortfolio||!ready||isKeyboardShortcutBlocked(e,{allowShift:true}))return;
  const key=e.key.toLowerCase();
  if(cloudTransition.snapshot.active){if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','shift'].includes(key))e.preventDefault();return;}
  if(!running){if(key==='enter'&&document.activeElement===sceneHost){e.preventDefault();start();}return;}
  if(key==='escape'&&!e.repeat){consumeNavigationKey(e);stopRide();return;}
  // Keep native button/keyboard activation. Riding input belongs to the canvas.
  if(document.activeElement!==sceneHost&&e.key!=='Escape')return;
  if(key==='p'&&!e.repeat){e.preventDefault();showPortfolio();return;}
  // Shift changes pace without cancelling a click-to-ride route. Its keyup and
  // the existing blur/overlay cleanup release it just like the riding keys.
  if(key==='shift'){e.preventDefault();physicalKeys.add(key);keys.add(key);return;}
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' '].includes(key)){e.preventDefault();cancelRoute();physicalKeys.add(key);keys.add(key);if(e.shiftKey){physicalKeys.add('shift');keys.add('shift');}else{physicalKeys.delete('shift');keys.delete('shift');}}
  if(e.repeat)return;
  if(key==='enter'){e.preventDefault();interact();}
  if(key==='?'||key==='h')showHelp();
  if(key==='m')showMap();
  if(key==='c')toggleRidingView();
  if(key==='n')setGardenNight(!gardenLighting?.night);
  if(key==='r'||key==='b'){e.preventDefault();bell();}
  if(key==='l'){e.preventDefault();overlayMotion.feedback($('ride-light'));setBicycleLight(!bicycleLight?.enabled);}
});
function unlockResumedAudio(event){if(event.isTrusted&&pendingRideAudio&&ready&&running)unlockRideAudio();}
document.addEventListener('keydown',unlockResumedAudio,{capture:true});
document.addEventListener('pointerdown',unlockResumedAudio,{capture:true});
document.addEventListener('keyup',e=>{const key=e.key.toLowerCase();physicalKeys.delete(key);keys.delete(key);touchControlInput?.sync();});
help.addEventListener('keydown',event=>{
  if(!help.open||isKeyboardShortcutBlocked(event)||event.repeat)return;
  if(event.key.toLowerCase()==='m'){consumeNavigationKey(event);showMap();}
});
window.addEventListener('blur',()=>{clearInput();welcomeVoice.stop();save();});
sceneHost.addEventListener('blur',e=>{if(!coarse&&!e.relatedTarget?.closest('#ride-status,#ride-camera,#ride-bell,#ride-light')&&!(rideProfile&&e.relatedTarget?.closest('#ride-performance')))clearInput();});
$('stop-route').addEventListener('blur',e=>{if(e.relatedTarget!==sceneHost)clearInput();});
document.addEventListener('visibilitychange',()=>{
  renderQuality.resetSamples();
  if(document.hidden){
    const deferredGuide=running&&pendingWelcomeGuide;
    clearInput();cancelWelcomeDeparture();pendingWelcomeGuide=deferredGuide;welcomeVoice.stop();save();
  }else if(pendingWelcomeGuide&&running&&!inPortfolio&&!hasOverlay()){
    pendingWelcomeGuide=false;showWelcomeGuidance();syncRideUI();sceneHost.focus({preventScroll:true});
  }
});
window.addEventListener('pagehide',save);
window.addEventListener('pagehide',event=>{
  const deferredGuide=running&&pendingWelcomeGuide;
  welcomeVoice.stop();clearInput();clearWelcomeHandoff();
  if(event.persisted){pendingWelcomeGuide=deferredGuide;return;}
  abandoned=true;overlayMotion.dispose();touchControlInput?.dispose();mainLoop.stop();bicycleLight?.dispose();rider?.bell?.dispose();aboutExperience?.dispose();oakLab?.dispose();worksExperience?.dispose();personalRooms?.dispose();trailheadGuide?.dispose();gardenLighting?.dispose();followSky?.dispose();world?.wayfinding.dispose();cancelAnimationFrame(loadingCloudFrame);cloudVolume?.dispose();cloudCurtain.dispose();rideProfile?.dispose();startupController.abort();pokemonControls.dispose();pokemonAudio.dispose();rideSoundControl.dispose();gardenBell.dispose();rideAudio.dispose();companions?.dispose();welcomeVoice.dispose();garden?.dispose();world?.studioDisplays.dispose();world?.landmarks.dispose();woodyWelcome?.dispose();disposeCharacterAsset(characterAsset);characterAsset=null;
  renderer?.dispose();renderer?.domElement.remove();
});
touchControlInput=createTouchRidingInput({buttons:$('touch-controls').querySelectorAll('[data-key]'),keys,physicalKeys,releaseTarget:window,onStart:cancelRoute,isActive:()=>coarse&&ready&&running&&!inPortfolio&&!hasOverlay()&&!ridingInputBlocked()});
$('touch-help').textContent='Guide';
function selectGround(e){
  if(!ready||!running||cloudTransition.snapshot.active||hasOverlay()||inPortfolio)return;
  sceneHost.focus({preventScroll:true});const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const landmarkHit=raycaster.intersectObjects([...world.landmarks.roots.values()],true)[0],companionHit=companions?.pick(raycaster.ray);
  const guideHit=trailheadGuide&&raycaster.intersectObjects(trailheadGuide.hitMeshes,true)[0];
  const bellHit=rider.bell?.pick(raycaster.ray,camera,rect.height);
  const lightHit=bicycleLight?.pick(raycaster.ray,camera,rect.height);
  const nearestWorld=Math.min(landmarkHit?.distance??Infinity,companionHit?.distance??Infinity,guideHit?.distance??Infinity);
  const accessoryHit=nearestRiderAccessory(bellHit,lightHit);
  if(accessoryHit&&accessoryHit.distance<nearestWorld){
    if(accessoryHit.object.userData.bicycleLight)setBicycleLight(!bicycleLight.enabled);else bell();
    return;
  }
  if(guideHit&&(!landmarkHit||guideHit.distance<landmarkHit.distance)&&(!companionHit||guideHit.distance<companionHit.distance)){showHelp();return;}
  const picked=companionHit&&(!landmarkHit||companionHit.distance<landmarkHit.distance)?companionHit:landmarkHit;
  if(picked){let object=picked.object;while(object&&!object.userData.stop&&!object.userData.pokemon)object=object.parent;if(object){if(object.userData.pokemon){clearInput();const pal=companions.react(object.userData.pokemon);if(pal){pokemonAudio.play(pal.id);notify(pal.kind==='sleep'?'Snorlax is sound asleep.':`${pal.name} says hello.`);}}else activateLandmark(object.userData.stop);return;}}
  if(raycaster.ray.intersectPlane(groundPlane,hit)){
    if(!ridingPickIsAllowed(hit,state,{perspective:ridingView==='follow'})){notify('Choose a nearby part of the garden path, or use Map for a distant stop.');return;}
    if(beginRoute({x:hit.x,z:hit.z})){if(e.shiftKey){physicalKeys.add('shift');keys.add('shift');}else{physicalKeys.delete('shift');keys.delete('shift');}}
  }
}
sceneHost.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;sceneHost.focus({preventScroll:true});pointerDown={x:e.clientX,y:e.clientY,id:e.pointerId};});
sceneHost.addEventListener('pointerup',e=>{if(!pointerDown||e.pointerId!==pointerDown.id)return;const travel=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(travel<=8)selectGround(e);});
sceneHost.addEventListener('pointercancel',()=>pointerDown=null);
sceneHost.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')hoverPointer={x:e.clientX,y:e.clientY};});
sceneHost.addEventListener('pointerleave',()=>{hoverPointer=null;sceneHost.style.cursor='';sceneHost.removeAttribute('title');});

function updateProjection(){const aspect=innerWidth/innerHeight;if(camera.isPerspectiveCamera)camera.aspect=aspect;else{camera.left=-cameraHeight*aspect/2;camera.right=cameraHeight*aspect/2;camera.top=cameraHeight/2;camera.bottom=-cameraHeight/2;}camera.updateProjectionMatrix();}
let portraitWidth=0,portraitHeight=0;
function renderCloudEntry(){cloudVolume?.render(renderer,cloudTransition.snapshot,innerWidth,innerHeight);}
function drawLoadingCloud(now=0){
  if(!cloudVolume||ready||failed||abandoned||inPortfolio||document.hidden)return;
  const host=document.querySelector('.loading-clouds'),rect=host.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  cloudVolume.renderLoading(renderer,{x:rect.left,y:innerHeight-rect.bottom,width:rect.width,height:rect.height},now/1000,{reduced});
  host.dataset.volumeReady='true';
}
function animateLoadingCloud(now){
  if(abandoned||ready||failed)return;
  loadingCloudFrame=requestAnimationFrame(animateLoadingCloud);
  try{
  if(document.hidden||inPortfolio||now-lastLoadingCloudPaint<(reduced?250:1000/24))return;
  lastLoadingCloudPaint=now;
  if(woodyWelcome&&!enteredGarden)renderWelcome();
  else{const parent=$('welcome-portrait');if(renderer.domElement.parentElement!==parent)parent.append(renderer.domElement);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.setScissorTest(false);renderer.setClearColor('#ffffff',0);renderer.clear();}
  drawLoadingCloud(now);
  }catch(error){
    failed=true;startupController.abort();console.error('The loading view could not continue',error);
    showWorldFailure('The 3D view could not prepare. Retry, or read the projects directly.');
  }
}
function renderWelcome(dt=0){
  if(!renderer||!woodyWelcome)return;
  const rect=$('welcome-portrait').getBoundingClientRect(),w=innerWidth,h=innerHeight;
  const cloudActive=cloudTransition.snapshot.active;
  // Reuse the single renderer as a transparent layer above the HTML lettering.
  // During the cloud handoff it returns to the full-screen world layer.
  const canvasParent=cloudActive?sceneHost:$('welcome-portrait');
  if(renderer.domElement.parentElement!==canvasParent)canvasParent.append(renderer.domElement);
  renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.setClearColor('#ffffff',0);renderer.clear();
  const left=Math.max(0,rect.left),right=Math.min(w,rect.right),top=Math.max(0,rect.top),bottom=Math.min(h,rect.bottom);
  if(rect.width<1||rect.height<1||right<=left||bottom<=top){renderCloudEntry();return;}
  if(rect.width!==portraitWidth||rect.height!==portraitHeight){portraitWidth=rect.width;portraitHeight=rect.height;woodyWelcome.resize(rect.width,rect.height,{framing:'entrance'});}
  welcomeTime+=dt;woodyWelcome.update({dt,time:welcomeTime,reduced,phase:welcomeFlow.snapshot.phase==='departing'?'departure':'welcome',speaking:welcomeVoice.speaking});
  const waveButton=$('welcome-wave'),canWave=ready&&(reduced||woodyWelcome.canGreet);
  if(waveButton.disabled!==!canWave)waveButton.disabled=!canWave;
  const waveLabel=!ready?'Preparing Woody…':canWave?'Wave hello':'Saying hello…';
  if(lastWaveLabel!==waveLabel){waveButton.textContent=waveLabel;lastWaveLabel=waveLabel;}
  renderer.setViewport(rect.left,h-rect.bottom,rect.width,rect.height);renderer.setScissor(left,h-bottom,right-left,bottom-top);renderer.setScissorTest(true);
  const background=woodyWelcome.scene.background;
  woodyWelcome.scene.background=null;
  try{renderer.render(woodyWelcome.scene,woodyWelcome.camera);}
  finally{woodyWelcome.scene.background=background;renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);}
  renderCloudEntry();
}
function renderWorld(){if(renderer.domElement.parentElement!==sceneHost)sceneHost.append(renderer.domElement);gardenLighting?.update(0,{paused:true,reduced,focus});followSky?.update({camera,focus,time,active:ridingView==='follow',reduced,lighter:!renderSettings.ambientMotion,night:gardenLighting?.progress??0});garden?.update({time,reduced,lighter:!renderSettings.ambientMotion,camera,sun,night:gardenLighting?.progress??0});companions?.update({time,reduced,lighter:!renderSettings.ambientMotion,camera,player:state,active:running&&!hasOverlay()&&!inPortfolio});renderer.render(scene,camera);renderCloudEntry();}
function renderBackdrop(){if(aboutExperience?.isOpen){aboutExperience.update(0);return;}if(oakLab?.isOpen){oakLab.update(0);return;}if(personalRooms?.isOpen){personalRooms.update(0);return;}if(worksExperience?.isOpen){worksExperience.update(0);return;}if(!running&&!inPortfolio&&!enteredGarden&&!$('welcome').hidden&&woodyWelcome)renderWelcome();else renderWorld();}
function applyRenderQuality(){
  renderSettings=renderQuality.settings(innerWidth,innerHeight,devicePixelRatio);
  document.documentElement.dataset.graphics=renderSettings.level;
  if(!renderer)return;
  renderer.setPixelRatio(renderSettings.pixelRatio);
  if(sun&&sun.shadow.mapSize.x!==renderSettings.shadowSize){
    sun.shadow.map?.dispose();sun.shadow.map=null;
    sun.shadow.mapPass?.dispose();sun.shadow.mapPass=null;
    sun.shadow.mapSize.setScalar(renderSettings.shadowSize);sun.shadow.needsUpdate=true;
  }
}
function resize(){if(!renderer)return;readingBackdropDrawn=false;const w=innerWidth,h=innerHeight;renderer.setSize(w,h);applyRenderQuality();if(aboutExperience?.isOpen){aboutExperience.resize();return;}if(oakLab?.isOpen){oakLab.resize();return;}if(worksExperience?.isOpen){worksExperience.resize();return;}if(personalRooms?.isOpen){personalRooms.resize();return;}cameraHeight=Math.max(24,16*h/w);updateProjection();if(ready)renderBackdrop();}
function showWorldFailure(message){
  mainLoop.stop();window.__playStartup?.finish('failed');
  for(const owner of [aboutExperience,oakLab,worksExperience,personalRooms]){
    try{owner?.close({immediate:true,notify:false});}
    catch(error){console.warn('A destination could not finish closing after the 3D view stopped.',error);}
  }
  if([...Object.values(PERSONAL_ROUTES),'#works-room'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search);
  cancelAnimationFrame(loadingCloudFrame);
  cancelWelcomeDeparture();dismissWelcomeGuide();welcomeVoice.stop();
  
  readingBackdropDrawn=false;
  ready=false;clearInput();syncRideUI();$('start').disabled=true;$('welcome-wave').disabled=true;
  $('route-hint').hidden=true;$('failure').querySelector('h1').textContent=startupComplete?'The world paused.':'The world couldn’t start.';
  $('loading-state').setAttribute('aria-busy','false');$('loading-status').textContent='The world needs another try.';
  document.querySelector('.loading-clouds')?.removeAttribute('data-volume-ready');
  $('failure-message').textContent=message;$('failure').hidden=false;$('welcome').hidden=true;
  syncRideUI();
  
  if(!inPortfolio&&!hasOverlay())$('failure-retry').focus({preventScroll:true});
}
function placeRider(){
  const half=RIDER_HALF_WHEELBASE;
  const front=elevation(state.z-Math.cos(state.heading)*half,state.x-Math.sin(state.heading)*half);
  const rear=elevation(state.z+Math.cos(state.heading)*half,state.x+Math.sin(state.heading)*half);
  rider.group.position.set(state.x,(front+rear)/2,state.z);
  rider.group.rotation.set(Math.atan2(front-rear,half*2),state.heading,0,'YXZ');
}
async function initialize(){
  let displayImages=[];
  try{
  if(document.body.dataset.startupState==='failed')return;
  const saved=store.get();
  enteredGarden=hasEnteredGarden(saved,{mapVersion:MAP_VERSION,spawn:newState()});
  document.body.dataset.gardenEntry=enteredGarden?'resume':'welcome';
  if(enteredGarden){
    $('welcome').removeAttribute('aria-labelledby');$('welcome').setAttribute('aria-label','Returning to your ride');
    $('loading-status').textContent='Returning to your ride…';
  }else{$('welcome').removeAttribute('aria-label');$('welcome').setAttribute('aria-labelledby','welcome-title');}
  bicycleLightPreference=saved?.bicycleLight===true;
  pokemonSoundPreference=typeof saved?.pokemonSounds==='boolean'?saved.pokemonSounds:null;
  rideSoundPreference=typeof saved?.rideSounds==='boolean'?saved.rideSounds:null;
  if(saved){renderQuality.setLighter(saved.lighterGraphics===true);readerScroll=Number.isFinite(saved.readerScroll)?Math.max(0,saved.readerScroll):0;reducedOverride=typeof saved.reducedOverride==='boolean'?saved.reducedOverride:null;reduced=reducedOverride??motionPreference.matches;placeUI.restoreScrolls(saved.placeScrolls);projectUI.restoreProgress(saved.projectProgress);}
  document.documentElement.classList.toggle('reduce-motion',reduced);
  const initialHash=location.hash;
  if(location.hash.startsWith('#project-'))projectUI.open(location.hash.slice(9));
  
    await runLoadingStages([
      {id:'view',label:'Preparing the 3D view…',timeoutMs:10000,run(){
        renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;sceneHost.append(renderer.domElement);
        renderer.setPixelRatio(renderSettings.pixelRatio);renderer.setSize(innerWidth,innerHeight);
        renderer.setClearColor('#ffffff',1);renderer.clear();
        cloudVolume=createCloudVolume();loadingCloudFrame=requestAnimationFrame(animateLoadingCloud);
        renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!startupComplete){failed=true;startupController.abort();}showWorldFailure('The 3D view was interrupted. Retry the world, or keep reading the projects.');});
        renderer.domElement.addEventListener('webglcontextrestored',()=>{
          if(!startupComplete||failed)return;
          ready=true;window.__playStartup?.finish('ready');mainLoop.start();$('failure').hidden=true;$('start').disabled=false;if(!running){if(enteredGarden)start({skipWelcome:true,resuming:true});else $('welcome').hidden=false;}
          $('loading-status').textContent='Ready to ride.';
          syncRideUI();notify('The view is back. Continue when you are ready.');
          if(!inPortfolio&&!hasOverlay())(running?sceneHost:$('start')).focus({preventScroll:true});
        });
        scene=new THREE.Scene();scene.background=new THREE.Color(GARDEN_PALETTE.outer);scene.fog=new THREE.Fog(GARDEN_PALETTE.outer,WORLD_FOG_NEAR,WORLD_FOG_FAR);
        camera=overviewCamera=new THREE.OrthographicCamera(-15,15,10,-10,WORLD_CAMERA_NEAR,WORLD_CAMERA_FAR);followView=createFollowCamera();
        hemisphere=new THREE.HemisphereLight('#fff6df','#a5b390',1.8);scene.add(hemisphere);
        sun=new THREE.DirectionalLight('#fff1d5',2.5);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:80});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun,sun.target);
      }},
      {id:'world',label:'Preparing Woody and the bicycle…',timeoutMs:35000,async run(){
        aboutExperience?.dispose();aboutExperience=null;personalRooms?.dispose();personalRooms=null;worksExperience?.dispose();worksExperience=null;oakLab?.dispose();oakLab=null;
        bicycleLight?.dispose();rider?.bell?.dispose();
        world=createWorld(scene);trailheadGuide=createTrailheadGuide(scene);world.colliders.push(...trailheadGuide.colliders);rider=createRider(THREE);
        gardenLighting=createGardenLighting({scene,sun,hemisphere,world});gardenLighting.setNight(saved?.gardenNight===true,{immediate:true});gardenLighting.setAutomatic(saved?.automaticDaylight===true);
        bicycleLight=createBicycleHeadlight(rider.group,{enabled:bicycleLightPreference});
        bicycleLight.update(0,{night:gardenLighting.progress,reduced});syncBicycleLight();
        followSky=createFollowSky(scene);
        characterAsset=await loadWoodyCharacter({signal:startupController.signal});
        if(abandoned||startupController.signal.aborted){disposeCharacterAsset(characterAsset);characterAsset=null;throw new DOMException('World loading cancelled','AbortError');}
        woodyWelcome=createWoodyWelcome(THREE,characterAsset);rider.attachCharacter(characterAsset);
        scene.add(rider.group);contactMarker=createContactMarker(scene,'#29433e');
        landmarkFramer=createLandmarkFramer(world.landmarks.roots,cameraOffset,{localMinHeights:{projects:18}});
        personalRooms=createPersonalRooms({renderer,isReduced:()=>reduced,onPortfolio:showPortfolio,onWorks:()=>rideFromRoom('projects'),onPlace:rideFromRoom,onOakLab:()=>rideFromRoom('music'),onSoundState:playing=>playMusic.suspend('sound-sketch',playing),
          onOpen(kind){prepareOverlay('personal');history.replaceState(null,'',location.pathname+location.search+(PERSONAL_ROUTES[kind]||PERSONAL_ROUTES.work));},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        worksExperience=createWorksExperience({renderer,isReduced:()=>reduced,onPortfolio:showPortfolio,onPlace:rideFromRoom,
          onOpen(){prepareOverlay('works');history.replaceState(null,'',location.pathname+location.search+'#works-room');},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        oakLab=createOakLab({renderer,isReduced:()=>reduced,onPortfolio:showPortfolio,onPlace:rideFromRoom,
          onOpen(){prepareOverlay('oak');history.replaceState(null,'',location.pathname+location.search+'#oak-lab');},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        aboutExperience=createAboutExperience({renderer,isReduced:()=>reduced,onPortfolio:showPortfolio,onPlace:rideFromRoom,onProject:id=>rideFromRoom('projects',id),
          onOpen(){prepareOverlay('about');history.replaceState(null,'',location.pathname+location.search+PERSONAL_ROUTES.about);},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        decorateModeSwitches();
        if(saved?.mapVersion===MAP_VERSION&&Number.isFinite(saved.heading)&&positionIsClear(saved,world.colliders))Object.assign(state,{x:saved.x,z:saved.z,heading:saved.heading});
        rideFeedback.reset(state);focus.set(state.x-5,0,state.z+1);placeRider();resize();window.addEventListener('resize',resize);
        camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);scene.updateMatrixWorld(true);renderBackdrop();
      }},
      {id:'assets',label:'Preparing the garden, companions and displays…',async run(){
        garden=await loadGarden(scene,world,{signal:startupController.signal});
        startupController.signal.throwIfAborted();
        cameraObstacles=createCameraObstacles(world,garden,[trailheadGuide.root]);setRidingView(saved?.ridingView,{persist:false});
        try{companions=createPokemonWorld({scene,obstacles:world.colliders,trees:garden.nature.placements,onLoadTiming:profileRequested?recordCompanionLoad:undefined});}
        catch(error){console.warn('Optional garden companions unavailable:',error);}
        // Build the three costly procedural gaits while the real loading
        // curtain is up. Duplicates reuse prepared templates; other species
        // remain optional proximity loads. This is bounded preparation, not a
        // hidden all-map download or an artificial minimum loading duration.
        await companions?.prepareRiding({yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0))});
        startupController.signal.throwIfAborted();
        if(!positionIsClear(state,world.colliders)){Object.assign(state,newState());focus.set(state.x-5,0,state.z+1);placeRider();}
        displayImages=await world.studioDisplays.ready;
        if(abandoned)throw new DOMException('World loading cancelled','AbortError');
        startupController.signal.throwIfAborted();
        await withinDeadline(renderer.compileAsync(scene,camera),15000,{signal:startupController.signal});
        // Prepare the optional sky material during real loading rather than
        // paying its first shader compilation when the visitor changes view.
        followSky.root.visible=true;
        try{await withinDeadline(renderer.compileAsync(scene,followView.camera),15000,{signal:startupController.signal});}
        finally{followSky.root.visible=ridingView==='follow';}
        if(abandoned)throw new DOMException('World loading cancelled','AbortError');
        await withinDeadline(renderer.compileAsync(woodyWelcome.scene,woodyWelcome.camera),15000,{signal:startupController.signal});
        await withinDeadline(renderer.compileAsync(cloudVolume.scene,cloudVolume.camera),15000,{signal:startupController.signal});
        if(abandoned)throw new DOMException('World loading cancelled','AbortError');
        if(renderer.getContext().isContextLost())throw new Error('The 3D context was lost during preparation');
        renderBackdrop();
      }}
    ],{
      signal:startupController.signal,onTimeout:()=>startupController.abort(),
      onStage(id,status,label){if(abandoned)throw new DOMException('World loading cancelled','AbortError');const step=document.querySelector(`[data-load-stage="${id}"]`);step.dataset.state=status;if(status==='working'){step.setAttribute('aria-current','step');$('loading-status').textContent=label;}else step.removeAttribute('aria-current');},
      // Yield a paint opportunity between real tasks, without an artificial delay.
      yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0)),
    });
    cancelAnimationFrame(loadingCloudFrame);startupComplete=true;ready=true;if(!enteredGarden)woodyWelcome?.greet();$('failure').hidden=true;if(!running)$('welcome').hidden=false;$('start').disabled=false;$('start').textContent='Let’s start';
    window.__playStartup?.finish('ready');
    $('loading-state').setAttribute('aria-busy','false');$('loading-state').dataset.ready='true';
    const missingOptional=[];
    if(!displayImages.every(Boolean))missingOptional.push('display images');
    if(garden?.decorationStatus&&Object.values(garden.decorationStatus).some(loaded=>!loaded))missingOptional.push('garden decorations');
    $('loading-status').textContent=missingOptional.length?`Ready to ride. Some ${missingOptional.join(' and ')} could not load; every case study is still available.`:'Ready to ride.';
    if(enteredGarden&&!running&&!inPortfolio)start({skipWelcome:true,resuming:true});
    syncRideUI();
    // A mode change during loading cancels a stale immersive deep link.
    if(location.hash===initialHash&&!inPortfolio){const personal=Object.keys(PERSONAL_ROUTES).find(kind=>PERSONAL_ROUTES[kind]===initialHash||(kind==='work'&&initialHash==='#memory-pavilion')||(kind==='music'&&['#music-corner','#making-of'].includes(initialHash)));if(personal)openLandmark(personal);else if(initialHash==='#works-room')openWorks();}
    mainLoop.start();
    syncWelcomeVoice({enabled:welcomeVoice.enabled,supported:welcomeVoice.supported,speaking:welcomeVoice.speaking});
  }catch(error){if(abandoned)return;failed=true;startupController.abort();companions?.dispose();console.error('World could not initialize',error);showWorldFailure('The 3D world could not finish loading. Retry, or read the projects directly.');}
}
function frame(now){
  if(abandoned)return;
  const frameMs=now-lastTime;const dt=Math.min(frameMs/1000||.016,.12);lastTime=now;
  // Reads the preceding completed frame's counters, aligned with its RAF interval.
  rideProfile?.sample({now,frameMs,renderer,settings:renderSettings,riding:running&&ready&&!cloudTransition.snapshot.active&&!document.hidden&&!inPortfolio&&!hasOverlay(),player:state,companions});
  if(renderQuality.sample({frameMs,active:running&&ready&&!cloudTransition.snapshot.active&&!document.hidden&&!inPortfolio&&!hasOverlay()}))applyRenderQuality();
  if(document.hidden||inPortfolio||!ready)return;
  const wasCloudActive=cloudTransition.snapshot.active;
  if(wasCloudActive){
    if(reduced)cloudTransition.cancel();else cloudTransition.advance(dt);
    paintClouds();
    if(!cloudTransition.snapshot.active&&running&&pendingWelcomeGuide){
      pendingWelcomeGuide=false;showWelcomeGuidance();sceneHost.focus({preventScroll:true});
    }
  }
  syncRideUI();
  if(aboutExperience?.isOpen){aboutExperience.update(dt);return;}
  if(oakLab?.isOpen){oakLab.update(dt);return;}
  if(worksExperience?.isOpen){worksExperience.update(dt);return;}
  if(personalRooms?.isOpen){personalRooms.update(dt);return;}
  gardenLighting?.update(dt,{paused:hasOverlay()||!running,reduced,focus});
  if(gardenLighting){$('night-garden').checked=gardenLighting.night;$('automatic-daylight').checked=gardenLighting.automatic;sceneHost.dataset.daylight=gardenLighting.progress.toFixed(2);}
  if(!running&&!hasOverlay()){
    if(reduced&&welcomeFlow.snapshot.phase==='departing'){welcomeFlow.skip();clearWelcomeHandoff();}
    const phase=welcomeFlow.advance(dt);
    if(phase.phase==='riding')completeWelcome();
    else{
      renderWelcome(dt);return;
    }
  }
  if(guideRemaining>0&&!hasOverlay()){
    guideRemaining=Math.max(0,guideRemaining-dt);
    if(!guideRemaining){dismissWelcomeGuide();welcomeVoice.stop();syncRideUI();}
  }
  const paused=hasOverlay();
  // Remove the physical preview from the paused backdrop before reading HTML.
  if(paused){if(!readingBackdropDrawn){renderBackdrop();readingBackdropDrawn=true;}return;}
  readingBackdropDrawn=false;
  if(!paused){time+=dt;
    let pedaling=false,movingIntent=false,turnIntent=0;
    if(running){let input=cloudTransition.snapshot.active?{brake:true,turn:0}:{forward:keys.has('w')||keys.has('arrowup'),reverse:keys.has('s')||keys.has('arrowdown'),brake:keys.has(' '),boost:keys.has('shift'),turn:(keys.has('a')||keys.has('arrowleft')?1:0)-(keys.has('d')||keys.has('arrowright')?1:0)};
      if(guidedRide){
        input=guidedRide.update(state,dt,{boost:keys.has('shift')});
        if(input.blocked){cancelRoute();input={brake:true};notify('There isn’t room for this turn. Reverse a little, or choose clearer ground.');}
        else if(input.arrived){const callback=pendingArrival;cancelRoute();input={brake:true};callback?.();if(hasOverlay())return;}
      }
      movingIntent=Boolean(input.forward)!==Boolean(input.reverse);
      movingIntent=movingIntent&&!input.brake;
      turnIntent=input.turnIntent??input.turn??0;
      // Lift the planted foot before starting either direction. This handoff
      // happens only at rest and never changes braking or a rolling trajectory.
      if(movingIntent&&Math.abs(state.speed)<.025&&!rider.readyToRide)input={...input,forward:false,reverse:false,brake:true};
      const previousDistance=state.distance;stepMotion(state,input,dt,world.colliders);
      pedaling=Boolean((input.forward||input.reverse)&&!input.brake&&!state.contact?.blocked);
      rideFeel=rideFeedback.update({state,input,dt,reduced});if(rideFeel.notice)notify(rideFeel.notice);
      rideAudioMotion.speed=state.speed;rideAudioMotion.pedaling=pedaling;rideAudioMotion.braking=Boolean(input.brake);rideAudioMotion.moved=Math.max(0,state.distance-previousDistance);rideAudioMotion.dt=dt;
      rideAudio.update(rideFeel,rideAudioMotion);contactMarker.update(state,rideFeel,input,dt,reduced);
      if(target&&(input.forward||input.reverse)&&state.contact?.blocked&&state.distance-previousDistance<.001){blockedTime+=dt;if(blockedTime>1.2){cancelRoute();state.speed=0;notify('The route is blocked. Reverse away, or choose another point.');}}else blockedTime=0;
      if(state.distance>7)rideHintVisible=false;
      setNearStop(nearbyStop(state,nearStop));
    }
    placeRider();rider.update({speed:state.speed,steering:state.steering,wheelSteering:steeringAngle(state.steering,state.speed),movingIntent,turnIntent,groundHeight:riderGroundHeight,time,dt,pedaling,reduced,feedback:rideFeel,navigationActive:Boolean(target)});
    if(running)desired.set(state.x-Math.sin(state.heading)*1.0,0,state.z-Math.cos(state.heading)*1.0);else if(innerWidth<700)desired.set(state.x+.4,0,state.z+7.5);else desired.set(state.x-5,0,state.z+1);
    // Keep the complete local landmark and enlarged rider in view, even in a narrow pane.
    let framing=running?landmarkFramer(state,innerWidth,innerHeight,desired):{target:desired,height:Math.max(24,16*innerHeight/innerWidth)};
    // Keep the bicycle above the one-time guide on a narrow screen, retaining
    // its scale and the same viewing angle instead of covering it with text.
    if(innerWidth<700&&!$('woody-guide').hidden){const guide=$('woody-guide').getBoundingClientRect();framing.target.addScaledVector(guideCameraUp,-Math.min(guide.height*.4,innerHeight*.22)/innerHeight*framing.height);}
    desired.copy(framing.target);
    const nextHeight=reduced?framing.height:THREE.MathUtils.lerp(cameraHeight,framing.height,1-Math.exp(-3.5*dt));
    if(Math.abs(nextHeight-cameraHeight)>.001){cameraHeight=nextHeight;updateProjection();}
    if(reduced)focus.copy(desired);else focus.lerp(desired,1-Math.exp(-4.4*dt));
    if(ridingView==='follow'){followView.update(state,cameraObstacles,dt);focus.copy(followView.target);}
    else{camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus.x,focus.y,focus.z);}
    world.wayfinding.update(camera,{follow:ridingView==='follow'});
    gardenLighting.update(0,{paused:true,reduced,focus});
    if(hoverPointer&&running){
      const rect=renderer.domElement.getBoundingClientRect();
      if(rect.width&&rect.height){
        pointer.set((hoverPointer.x-rect.left)/rect.width*2-1,-(hoverPointer.y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
        const landmarkPick=raycaster.intersectObjects([...world.landmarks.roots.values(),...trailheadGuide.hitMeshes],true)[0],palPick=companions?.pick(raycaster.ray);
        let pick=palPick&&(!landmarkPick||palPick.distance<landmarkPick.distance)?palPick:landmarkPick;
        const bellPick=rider.bell?.pick(raycaster.ray,camera,rect.height);
        const lightPick=bicycleLight?.pick(raycaster.ray,camera,rect.height);
        const accessoryPick=nearestRiderAccessory(bellPick,lightPick);
        if(accessoryPick&&accessoryPick.distance<(pick?.distance??Infinity))pick=accessoryPick;
        let object=pick?.object;
        while(object&&!object.userData.stop&&!object.userData.pokemon&&!object.userData.gardenGuide&&!object.userData.bicycleBell&&!object.userData.bicycleLight)object=object.parent;
        sceneHost.style.cursor=object?'pointer':'';
        if(object)sceneHost.title=object.userData.bicycleLight?(bicycleLight.enabled?'Turn bicycle light off (L)':'Turn bicycle light on (L)'):object.userData.bicycleBell?'Ring bicycle bell (R)':object.userData.gardenGuide?'Open the garden riding guide':object.userData.pokemon?'Say hello to '+object.name:`Open ${destinationName(object.userData.stop,STOPS[object.userData.stop].title).toLowerCase()}`;
        else sceneHost.removeAttribute('title');
      }
    }
    world.update(time,reduced,dt);
    saveTime+=dt;if(saveTime>3){save();saveTime=0;}
  }
  bicycleLight?.update(dt,{night:gardenLighting?.progress??0,reduced});
  if(bicycleLight)sceneHost.dataset.bicycleLightOutput=bicycleLight.output.toFixed(2);
  renderWorld();
  if(running&&pokemonAudio.enabled&&!cloudTransition.snapshot.active){
    Object.assign(pokemonListener,{x:state.x,y:elevation(state.z,state.x),z:state.z,heading:state.heading,speed:state.speed});
    pokemonProximity.update({time,player:pokemonListener,sources:companions?.audioSources??[],active:true});
  }
}
initialize();




