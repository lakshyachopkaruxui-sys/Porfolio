import {createWelcomeAudioClass} from './welcome-context-audio.js';
import {createCaptionClock} from './woody-caption.js';
import {sampleSpeechOpening} from './woody-speech.js';
import {createVisitorBoard,VISITOR_BOARD_LOCATION} from './visitor-board.js';
import {createVisitorBoardUI} from './visitor-board-ui.js';
import {createRideReviewProgress} from './ride-review-progress.js';
import {assistAcrossRamps,supportsDeck} from './river-hop/hop-sites.js';
import {createFullGardenHop} from './river-hop/full-garden-hop.js';
import {HOP} from './river-hop/trajectory.js';
import {planRampApproach} from './river-hop/approach-route.js';
import {createAboutExperience} from './about-experience.js';
import {destinationName} from './destination-names.js';
import {decorateModeSelectors} from './mode-selector.js';
import {bindRoomMapNavigation} from './room-map-navigation.js';
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
import {createWoodyOnboarding} from './woody-onboarding.js';
import {createWoodyTour} from './woody-tour.js';
import {createWoodyTourAudio} from './woody-tour-audio.js';
import {mountWoodyTourUI} from './woody-tour-ui.js';
import {WOODY_TOUR_CLIPS} from './woody-tour-data.js';
import {WELCOME_AUDIO,WELCOME_TRANSCRIPTS} from './welcome-audio.js';
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
import {mountRidingAudioControl,isRidingAudioActivation} from './riding-audio-ui.js';
import {BICYCLE_SOUNDS} from './bicycle-sound-catalog.js';
import {mountPlayMusic} from './play-music-ui.js';
import {createFollowCamera,createCameraObstacles,ridingPickIsAllowed} from './follow-camera.js';
import {createRideObjectives} from './ride-objectives.js';
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
import {runLoadingStages} from './loading.js';
import {createGuardedFrameLoop} from './startup-lifecycle.js';

const $=id=>document.getElementById(id);
// Local composition review never changes the visitor's saved journey.
const requestedWelcomeLayout=new URLSearchParams(location.search).get('welcome-layout');
const welcomeLayoutReview=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&['field-guide','gallery','panorama'].includes(requestedWelcomeLayout);
if(welcomeLayoutReview)document.body.dataset.welcomeLayout=requestedWelcomeLayout;
const requestedWelcomeCard=new URLSearchParams(location.search).get('welcome-card');
if(welcomeLayoutReview&&requestedWelcomeLayout==='panorama'&&['soft','raised','wide'].includes(requestedWelcomeCard))document.body.dataset.welcomeCard=requestedWelcomeCard;

const sceneHost=$('scene'), reader=$('reader'), help=$('help');
const state=newState(),keys=new Set(),physicalKeys=new Set();
let touchControlInput;
let renderer,scene,camera,rider,world,sun,contactMarker,bicycleLight;
let rideObjectives;
let decorationsStarted=false;
let overviewCamera,followView,trailheadGuide,hemisphere,gardenLighting,followSky,cameraObstacles=[],ridingView='follow';
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
let welcomeAudioPreference=null;
let welcomePainted=false;
let welcomeGreetingPlaying=false,entryGreetingNeedsGesture=false;
let welcomeCurrentKind=null,departureControlsPending=false,onboarding=null,entryGuideLine='controls-yes',entryGreetingAttempted=false;
let pendingWelcomeLine=null,entryGuideStopped=false;
let tour=null,tourUI=null,tourAudio=null,tourDestination=null,tourRoom=null,pendingTourIntro=false,tourJumped=false,tourAirborne=false,tourExplored=false;
let tourFocusOrigin=null;
let tourFocused=true;
const welcomeFlow=createWelcomeFlow();
const cloudTransition=createCloudTransition(),cloudCurtain=mountCloudCurtain($('welcome-handoff'));
let cloudVolume;
const FIRST_STOP='about';
const PERSONAL_ROUTES=Object.freeze({about:'#meet-lakshya',work:'#hobbies',music:'#oak-lab',cloud:'#cloud-lookout'});
const syncCaptionClock=createCaptionClock(()=>{
  if(document.hidden)return Infinity;
  if(welcomeVoice.speaking){
    const speech=welcomeVoice.frame;
    const next=tourUI?.updateCaption(speech)??Infinity;
    return speech.playing?next:100;
  }
  const speech=tourAudio?.frame;
  if(!speech)return Infinity;
  const next=tourUI.updateCaption(speech);
  return speech.playing?next:100;
});
const welcomeVoice=createWelcomeRecordings({clips:WELCOME_AUDIO,AudioClass:createWelcomeAudioClass(),onState:syncWelcomeVoice,
  mountAudio(audio,kind){audio.hidden=true;audio.dataset.welcomeRecording=kind;document.body.append(audio);}});
// The heading and deck carry the first two spoken sentences; do not repeat them.
$('welcome-about').textContent=WELCOME_TRANSCRIPTS.welcome.split('world. ')[1] || '';
$('welcome-controls-question').textContent=WELCOME_TRANSCRIPTS['controls-offer'];
const startupController=new AbortController();
let abandoned=false;
// Optional local QA only. Normal portfolio visits never fetch the profiler.
let rideProfile;
const showRideMeter=new URLSearchParams(location.search).get('rideProfile')==='1';
const profileRequested=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&showRideMeter;
const companionLoadTimings=[];
function recordCompanionLoad(event){
  if(companionLoadTimings.length>=160)companionLoadTimings.shift();
  companionLoadTimings.push(event);sceneHost.dataset.companionLoading=JSON.stringify(companionLoadTimings);
}
if(showRideMeter){
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
let visitorBoard=null,visitorUI=null;
const reviewProgress=createRideReviewProgress(()=>sessionStorage);
const feedbackInviteKey='visitor-feedback-after-hobbies';
let feedbackInvited=false;try{feedbackInvited=sessionStorage.getItem(feedbackInviteKey)==='1';}catch{}
function inviteFeedback(onLeave){if(feedbackInvited){onLeave?.();return;}feedbackInvited=true;tour?.emit('feedback-invited');try{sessionStorage.setItem(feedbackInviteKey,'1');}catch{}visitorUI?.invite({onLeave});}
function openVisitorBoard(){if(!visitorUI)return;feedbackInvited=true;tour?.emit('feedback-invited');try{sessionStorage.setItem(feedbackInviteKey,'1');}catch{}cancelRoute();state.speed=0;visitorUI.open({invite:true});}
let enteredGarden=false,pendingRideAudio=false;
let riverHop=null,hopBoost=false,rampApproach=false;
sceneHost.setAttribute('aria-label',sceneHost.getAttribute('aria-label')+' Ride onto River Hop to jump automatically. Riding resumes after landing. Q toggles boost.');
const mainLoop=createGuardedFrameLoop({step:frame,onError(error){
  failed=true;startupController.abort();console.error('The 3D view could not continue',error);
  showWorldFailure('The 3D view stopped unexpectedly. Retry the world, or keep reading the projects.');
}});
window.addEventListener('play-startup-cancel',()=>{
  failed=true;startupController.abort();mainLoop.stop();
});
const playMusic=mountPlayMusic({notify});
let target=null,guidedRide=null,nearStop=null,lastTime=0,time=0,noticeTimer,saveTime=0,blockedTime=0;
let readerScroll=0,lastFocus=null,usedReader=false;
let pointerDown=null;
let placeUI,mapUI,projectUI,personalRooms,worksExperience,oakLab,aboutExperience,pendingArrival=null,hoverPointer=null;
// World coordinates for the rider's planted shoe; reuse the same terrain as wheels.
const riderGroundHeight=(x,z)=>Math.max(elevation(z,x),riverHop?.rampHeight(x,z)??0);
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
const store={get(){try{return JSON.parse(localStorage.getItem('lakshya-bicycle-v1')||'null');}catch{return null;}},set(){if(welcomeLayoutReview)return;try{const previous=this.get();const checkpoint=!ready&&previous?{mapVersion:previous.mapVersion,x:previous.x,z:previous.z,heading:previous.heading,ridingView:previous.ridingView,gardenNight:previous.gardenNight,automaticDaylight:previous.automaticDaylight}:{};localStorage.setItem('lakshya-bicycle-v1',JSON.stringify({enteredGarden:enteredGarden||previous?.enteredGarden===true,mapVersion:MAP_VERSION,x:state.x,z:state.z,heading:state.heading,ridingView,bicycleLight:bicycleLightPreference,gardenNight:gardenLighting?.night??false,riverDaylight:gardenLighting?.automatic??previous?.riverDaylight??true,automaticDaylight:gardenLighting?.automatic??false,pokemonSounds:pokemonSoundPreference,rideSounds:rideSoundPreference,tourVoice:welcomeAudioPreference,readerScroll:reader.open?reader.scrollTop:readerScroll,reducedOverride,lighterGraphics:renderQuality.lighter,placeScrolls:placeUI?.scrolls,projectProgress:projectUI?.progress,...checkpoint}));}catch{}}};
motionPreference.addEventListener('change',e=>{if(reducedOverride===null)reduced=e.matches;if(reduced)setRidingView('overview');document.documentElement.classList.toggle('reduce-motion',reduced);});

function cancelRoute(){tourDestination=null;rampApproach=false;target=null;guidedRide=null;pendingArrival=null;blockedTime=0;$('ride-status').hidden=true;if(world){world.ring.visible=false;world.setRoute(introRouteVisible?introRoutePoints:null);}}
function clearInput({stop=true}={}){riverHop?.cancel();hopBoost=false;physicalKeys.clear();touchControlInput?.clear();keys.clear();cancelRoute();pointerDown=null;if(stop){state.speed=0;state.steering=0;}rideFeedback.reset(state);rideFeel={};contactMarker?.reset();rideAudio.stop();gardenBell.stop();pokemonAudio.stop();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('pressed'));}
function notify(text){$('notice').textContent=text;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),3200);}
function save(){if(!riverHop?.active)store.set();}
function restartJourney(){
  if(!ready||!rider){notify('The garden is still preparing. Restart is available once the ride is ready.');return;}
  clearInput();dismissWelcomeGuide();
  Object.assign(state,newState());pokemonProximity.reset();
  rideFeedback.reset(state);contactMarker?.reset();
  focus.set(state.x-Math.sin(state.heading),0,state.z-Math.cos(state.heading));
  desired.copy(focus);followView?.reset();
  if(ridingView==='follow')followView?.update(state,cameraObstacles,0,{snap:true});
  else if(camera){camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);}
  placeRider();setNearStop(nearbyStop(state,null));
  readingBackdropDrawn=false;save();syncRideUI();
  notify('Journey restarted at arrival. Your reading progress and preferences are kept.');
  syncTourContext();tour?.emit('action',{clipId:'restart'});
  if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});
}
function setRidingView(value,{persist=true}={}){
  if(!overviewCamera||!followView)return;
  const requested=value==='overview'?'overview':'follow';
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
  $('ride-camera').innerHTML=(ridingView==='follow'?'Overview':'Follow Woody')+' <kbd>C</kbd>';
  $('ride-camera').setAttribute('aria-label',ridingView==='follow'?'Overview C: switch to overview camera':'Follow Woody C: switch to closer third-person camera');
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
function hasOverlay(){return Boolean(visitorUI?.invitationHost||visitorUI?.isOpen||reader.open||help.open||placeUI?.isOpen||projectUI?.isOpen||mapUI?.isOpen||personalRooms?.isOpen||worksExperience?.isOpen||oakLab?.isOpen||aboutExperience?.isOpen);}
function ridingInputBlocked(){return failed||abandoned||document.hidden||cloudTransition.snapshot.active;}
function setHidden(element,hidden){if(element.hidden!==hidden)element.hidden=hidden;}
function syncRideUI(){
  playMusic.setActive(ready&&running&&!inPortfolio);
  const ui=hybridUIState({ready,inPortfolio,running,modalOpen:hasOverlay(),previewOpen:false,hasRoute:Boolean(target),speed:state.speed,nearStop,hintVisible:rideHintVisible,stopFocused:document.activeElement===$('stop-route'),coarse,inputBlocked:ridingInputBlocked()});
  document.body.classList.toggle('hybrid-world',!inPortfolio);
  document.body.classList.toggle('hybrid-intro',ui.intro&&$('failure').hidden);
  document.body.classList.toggle('hybrid-reading',ui.reading);
  if(!ui.controls||riverHop?.active||cloudTransition.snapshot.active)rideObjectives?.hide();
  setHidden($('world-controls'),!ui.controls);
  setHidden($('world-bottom'),!ui.controls||!$('woody-guide').hidden);
  setHidden($('ride-guide'),!ui.controls);setHidden($('ride-help'),!ui.controls);setHidden($('back'),!ui.controls);
  // Compute visibility once. Hiding and revealing this button on every frame
  // removes native focus and can cancel Enter, Space or a pointer activation.
  const guidePrompt=!nearStop&&nearTrailhead()&&ui.controls;
  setHidden($('interact'),!(ui.interact||guidePrompt));setHidden($('route-hint'),!ui.hint);
  if(guidePrompt&&$('interact').querySelector('.stop-caption').textContent!=='Garden guide'){
    $('interact').querySelector('.stop-caption').textContent='Garden guide';
    $('interact-label').innerHTML='Open the riding guide <kbd>Enter</kbd>';
  }
  setHidden($('ride-status'),!ui.status);setHidden($('stop-route'),!ui.status);
  const touchControls=$('touch-controls');
  if(!ui.touchControls&&!touchControls.hidden)touchControlInput?.clear();
  setHidden(touchControls,!ui.touchControls);if(touchControls.inert!==!ui.touchControls)touchControls.inert=!ui.touchControls;
  document.body.classList.toggle('hybrid-touch-riding',ui.touchControls);
  const tabIndex=ready&&running&&!failed?0:-1;
  if(sceneHost.tabIndex!==tabIndex)sceneHost.tabIndex=tabIndex;
  const inert=!ready||failed||cloudTransition.snapshot.active;
  if(sceneHost.inert!==inert)sceneHost.inert=inert;
  const status=ui.kind==='riding'?(Math.abs(state.speed)<=.05?'Stopped · Ready to explore':coarse?'Riding freely':'Riding freely · Space to brake'):null;
  if(status&&$('ride-status-label').textContent!==status)$('ride-status-label').textContent=status;
  const stopLabel='Stop';
  if($('stop-route').textContent!==stopLabel)$('stop-route').textContent=stopLabel;
}
function rideEntry(){return !ready?(!$('failure').hidden?$('failure-read'):$('loading-status')):running?sceneHost:$('start');}
function restoreRideUI(){clearInput();save();syncRideUI();if(hasOverlay()||inPortfolio)return;if(renderer)resize();if(running&&ready)sceneHost.focus({preventScroll:true});else if(lastFocus?.isConnected&&!lastFocus.closest('[hidden]')&&!lastFocus.closest('dialog')&&!lastFocus.disabled)lastFocus.focus({preventScroll:true});else rideEntry().focus({preventScroll:true});}
function prepareOverlay(kind){
  $('quick-tips').hidePopover?.();
  tourJumped=false;
  tour?.update({overlay:true});
  cancelWelcomeDeparture();dismissWelcomeGuide();
  const origin=document.activeElement;
  if(kind!=='visitor'&&visitorUI?.isOpen)visitorUI.close();
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
  oakLab?.syncGuideVoice();
  const greetingPlaying=kind==='welcome'&&playback==='playing'&&!running;
  // Greeting pose samples the active recording clock in renderWelcome.
  welcomeGreetingPlaying=greetingPlaying;
  if(greetingPlaying)entryGreetingNeedsGesture=false;
  else if(error&&!running&&!enteredGarden&&welcomeAudioPreference!==false)entryGreetingNeedsGesture=true;
  welcomeCurrentKind=kind||null;
  if(tourUI&&tour)renderGuidePanel(tour.snapshot);
  $('welcome-dialogue').setAttribute('aria-live',enabled?'off':'polite');
  const inEntryGuide=onboarding?.snapshot.phase==='guide';
  $('help-welcome-intro').hidden=!inEntryGuide;
  $('help-welcome-caption').setAttribute('aria-live',enabled?'off':'polite');
  $('help-welcome-caption').textContent=WELCOME_TRANSCRIPTS[entryGuideLine];
  $('help-welcome-stop').hidden=!(inEntryGuide&&speaking);
  $('help-welcome-error').textContent=inEntryGuide&&error?'Voice unavailable. The instructions stay here to read.':'';
  playMusic.suspend('woody-welcome',playback==='playing');
  $('welcome-audio').hidden=!WELCOME_AUDIO.welcome?.src;
  for(const id of ['woody-guide-voice']){
    const clip='controls',supplied=Boolean(WELCOME_AUDIO[clip]?.src),available=supported&&supplied;
    const button=$(id);button.textContent=!supplied?'Voice pending':!supported?'Audio unavailable':enabled?'Tour voice on':'Tour voice off';button.setAttribute('aria-pressed',String(Boolean(enabled&&available)));button.disabled=!available;
    if(id==='woody-guide-voice')button.hidden=!supplied;
  }
  $('welcome-replay').hidden=!welcomeVoice.available('welcome');
  $('welcome-replay').disabled=!supported||!ready;
  $('welcome-replay').textContent=speaking?'Mute Woody':onboarding?.snapshot.phase==='choice'?'Hear Woody’s question':'Hear Woody';
  $('welcome-replay').dataset.playback=playback;
  $('woody-guide-replay').hidden=onboarding?.snapshot.phase==='choice'||!WELCOME_AUDIO.controls?.src;$('woody-guide-replay').disabled=!supported;$('woody-guide-replay').textContent=speaking?'Stop voice':'Hear controls';
  $('woody-guide-controls').hidden=Boolean(onboarding?.snapshot.answer||onboarding?.snapshot.phase==='choice');
  syncCaptionClock();
  if(running&&onboarding?.snapshot.answer==='no'&&!speaking&&!$('woody-guide').hidden)dismissWelcomeGuide();
}
function paintClouds(){
  const snapshot=cloudTransition.snapshot;cloudCurtain.render(snapshot);
  document.body.classList.toggle('cloud-handoff',snapshot.active);
  sceneHost.inert=!ready||failed||snapshot.active;
}
function clearWelcomeHandoff(){cloudTransition.cancel();pendingWelcomeGuide=false;paintClouds();}
function cancelWelcomeDeparture(){
  if(welcomeFlow.snapshot.phase==='departing')onboarding?.cancelDeparture();
  welcomeFlow.cancelDeparture();clearWelcomeHandoff();
  $('welcome').dataset.phase=welcomeFlow.snapshot.phase;
  if(welcomeFlow.snapshot.phase==='welcome'){$('welcome-dialogue').textContent='Ready to explore?';$('start').disabled=!ready;}
}
function dismissWelcomeGuide(){
  if(onboarding?.snapshot.phase==='choice')onboarding.markRiding();
  $('welcome-controls-choice').hidden=true;
  departureControlsPending=false;
  const ownedFocus=$('woody-guide').contains(document.activeElement);
  guideRemaining=0;$('woody-guide').hidden=true;
  if(introRouteVisible&&!target)world?.setRoute(null);introRouteVisible=false;introRoutePoints=null;
  if(ownedFocus&&running&&ready&&!inPortfolio&&!hasOverlay())sceneHost.focus({preventScroll:true});
}
function showWelcomeGuidance(){
  if(!welcomeFlow.consumeGuidance()||entryGuideStopped)return;
  requestWelcomeLine('arrival-guide');
}
function completeWelcome(showGuidance=true){
  onboarding?.markRiding();
  running=true;inPortfolio=false;$('welcome').hidden=true;rideHintVisible=false;
  enteredGarden=true;save();
  $('game').hidden=false;
  pendingWelcomeGuide=showGuidance;
  if(cloudTransition.snapshot.active){
    // Render the prepared garden under an opaque cover before opening it.
    renderWorld();cloudTransition.reveal({reduced});paintClouds();
  }
  if(!cloudTransition.snapshot.active&&pendingWelcomeGuide){pendingWelcomeGuide=false;showWelcomeGuidance();}
  if(welcomeVoice.speaking)syncWelcomeVoice({enabled:welcomeVoice.enabled,supported:welcomeVoice.supported,speaking:true,playback:welcomeVoice.playback,kind:welcomeCurrentKind});
  syncRideUI();if(!hasOverlay())sceneHost.focus({preventScroll:true});
}
function unlockRideAudio({resumeMusic=true}={}){
  if(resumeMusic)playMusic.resumePreference();
  if(pokemonSoundPreference!==false)void pokemonAudio.setEnabled(true);
  if(rideSoundPreference!==false)void rideAudio.setEnabled(true).catch(()=>{});
  pendingRideAudio=false;
}
function start({skipWelcome=false,resuming=false}={}){
  if(!ready||running||welcomeFlow.snapshot.phase==='departing')return;
  clearInput();
  // The explicit start gesture unlocks nearby calls. A saved mute is respected;
  // loading the page alone never requests or plays any companion recording.
  if(resuming)pendingRideAudio=true;else {unlockRideAudio();pendingRideAudio=true;}
  if(skipWelcome){welcomeFlow.skip();welcomeFlow.consumeGuidance();completeWelcome(false);return;}
  const next=welcomeFlow.begin({reduced});
  if(next.phase==='departing'){cloudTransition.cover({reduced});paintClouds();}
  $('welcome').dataset.phase=next.phase;$('welcome-dialogue').textContent='See you in the garden.';$('start').disabled=true;
  // Elevate a transparent, already-composited frame in this same task. An old
  // opaque welcome framebuffer must not briefly hide the HTML introduction.
  if(next.phase==='departing')renderWelcome();
  // The cloud handoff is shorter than the departure recording. Starting that
  // line here cuts it off when the garden guide question begins. Keep the
  // transition quiet and let the invitation speak once the garden is visible.
  if(next.phase==='riding')completeWelcome();
}
function greetAtEntry(){
  if(!ready||!welcomePainted||entryGreetingAttempted||document.hidden||enteredGarden||running||inPortfolio||hasOverlay()||welcomeAudioPreference===false||onboarding?.snapshot.phase!=='hello')return;
  // A Play-mode entry can retain the preceding user gesture. Browsers may
  // still reject autoplay; the written greeting and explicit replay survive.
  entryGreetingAttempted=true;setTourEnabled(true,{announce:false});welcomeVoice.play('welcome');
}
function openReader(){if(ready&&oakLab)openLandmark('music');else projectUI.open('portfolio-world');usedReader=true;}
function closeReader(){readerScroll=reader.scrollTop;reader.close();history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
function syncModeSwitches(){decorateModeSelectors(document,{mode:'play',pageURL:location.href,navigationHandled:true});}
function showPortfolio(hash='',skipFeedback=false){
  tourJumped=false;
  tour?.update({riding:false,overlay:true});
  if(hash?.preventDefault){hash.preventDefault();hash='';}
  observeReviewProgress();
  if(running&&visitorUI&&reviewProgress.canInvite&&!skipFeedback&&!feedbackInvited){cancelRoute();clearInput();state.speed=0;inviteFeedback(()=>showPortfolio(hash,true));return;}
  visitorUI?.close();
  playMusic.suspend('normal-portfolio',true);
  // Capture the return URL before reader cleanup changes its hash or query.
  const returnPath=location.pathname+location.search;
  const destination=normalPortfolioURL(location.href,typeof hash==='string'?hash:'');
  aboutExperience?.close({immediate:true,notify:false});oakLab?.close({immediate:true,notify:false});worksExperience?.close({immediate:true,notify:false});personalRooms?.close({immediate:true,notify:false});
  cancelWelcomeDeparture();dismissWelcomeGuide();
  if(reader.open){readerScroll=reader.scrollTop;reader.close();}if(help.open){help.close();help.inert=true;}
  mapUI?.close();placeUI?.close();projectUI?.close();clearInput();syncRideUI();
  history.replaceState(null,'',returnPath);save();
  if (globalThis.portfolioShellNavigate) {
    globalThis.portfolioShellNavigate(destination);
  } else {
    location.assign(destination);
  }
}
function showHelp(){if(hasOverlay()||inPortfolio)return;if(running)rideObjectives?.readBoard();prepareOverlay('help');$('calm-motion').checked=reduced;$('lighter-graphics').checked=renderQuality.lighter;rideSoundControl.sync();pokemonControls.sync();$('help-resume').textContent=!running&&onboarding?.snapshot.phase==='guide'?'Start the ride':running?'Back to the ride':'Back to Woody';help.inert=false;help.showModal();help.scrollTop=0;$('help-close').focus({preventScroll:true});}
function closeHelp(){if(running){dismissWelcomeGuide();onboarding?.markRiding();}else onboarding?.leaveGuide();help.close();help.inert=true;restoreRideUI();}
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
  if(worksExperience?.isOpen||projectUI?.isOpen)tour?.emit('works-opened');
}
function openLandmark(kind){
  tour?.emit('room-enter',{stopId:kind});
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
function interact(){if(visitorBoard?.near){openVisitorBoard();return;}if(nearStop)openLandmark(nearStop);else if(nearTrailhead())showHelp();}
function beginRoute(destination,preferPaths=false,onArrival=null){
  tourJumped=false;
  if(riverHop?.active){notify("Let the jump finish before choosing a destination.");return false;}
  dismissWelcomeGuide();
  const route=planRoute(state,destination,world.colliders,{preferPaths});
  if(!route){notify('Choose clear ground. The river is crossed at either bridge.');syncTourContext();tour?.emit('action',{clipId:'route-unavailable'});return false;}
  const boosting=keys.has('shift');
  clearInput({stop:false});if(boosting){physicalKeys.add('shift');keys.add('shift');}pendingArrival=onArrival;target={...destination};
  guidedRide=createGuidedRide(state,route,world.colliders,{preferPaths});
  world.ring.position.set(destination.x,elevation(destination.z,destination.x)+.05,destination.z);world.ring.visible=true;
  world.setRoute([{x:state.x,z:state.z},...guidedRide.points]);$('ride-status-label').textContent='Following your route';syncRideUI();return true;
}
function visitPlace(kind,onArrival=null){const stop=STOPS[kind];if(!stop)return;if(!ready){notify('The world is still preparing. You can read every story directly.');return;}if(help.open){help.close();help.inert=true;}if(!running)start({skipWelcome:true});if(beginRoute(stop.arrival,true,onArrival||(()=>notify(`Arrived at ${destinationName(kind,stop.title).toLowerCase()}. Choose the stop to explore.`)))){tourDestination=kind;syncTourContext();$('ride-status-label').textContent=`Riding to ${destinationName(kind,stop.title).toLowerCase()}`;notify('Steer or brake to take over at any time.');}sceneHost.focus({preventScroll:true});}
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
projectUI=createProjectUI({onOpen(){prepareOverlay('projects');queueMicrotask(()=>{if(projectUI?.isOpen)tour?.emit('works-opened');});},onClose:restoreRideUI,onPortfolio:showPortfolio,onContinue(){if(!running&&ready)start({skipWelcome:true});}});
bindRoomMapNavigation(document,()=>mapUI.open(state));
mapUI=createMapUI({onOpen(){prepareOverlay('map');},onClose:restoreRideUI,onRide:visitPlace,onRead:openLandmark,onPortfolio:showPortfolio,onHelp:showHelp,getView:()=>ridingView,onReset:restartJourney});
// One optional guide, separate from music and from Oak's existing voice owner.
const tourPreference=document.createElement('label');tourPreference.className='check';
tourPreference.innerHTML='<input type="checkbox" id="tour-narration"> Woody’s tour narration';
help.querySelector('.field-guide-settings h3').after(tourPreference);
const tourHelp=document.createElement('div');tourHelp.className='woody-tour-help';
const tourTopicLabel=document.createElement('label');tourTopicLabel.className='music-choice';tourTopicLabel.textContent='Guide topic';
const tourTopic=document.createElement('select');tourTopic.id='tour-topic';
for(const [id,label]of [['welcome','Welcome to the garden'],['controls','Riding controls'],['controls-takeover','Taking over a guided ride'],['arrival-guide','The garden guide board'],['free-explore','Choosing your own route']]){
  const option=document.createElement('option');option.value=id;option.textContent=label;tourTopic.append(option);
}
tourTopicLabel.append(tourTopic);tourHelp.append(tourTopicLabel);
const hearTourTopic=document.createElement('button');hearTourTopic.type='button';hearTourTopic.textContent='Hear guide';
hearTourTopic.addEventListener('click',()=>{
  if(!running){entryGuideLine=tourTopic.value;setTourEnabled(true,{announce:false});welcomeVoice.play(entryGuideLine);replayTourLine.disabled=false;return;}
  closeHelp();stopGuideVoice();setTourEnabled(true,{announce:false});syncTourContext();tour.emit('manual',{clipId:tourTopic.value});sceneHost.focus({preventScroll:true});
});
const replayTourLine=document.createElement('button');replayTourLine.type='button';replayTourLine.textContent='Replay last guide line';replayTourLine.disabled=true;
replayTourLine.addEventListener('click',()=>{
  if(!running){setTourEnabled(true,{announce:false});welcomeVoice.play(entryGuideLine);return;}
  closeHelp();setTourEnabled(true,{announce:false});replayGuideVoice();sceneHost.focus({preventScroll:true});
});
tourHelp.append(hearTourTopic,replayTourLine);
tourPreference.after(tourHelp);
const tourTranscript=document.createElement('details'),tourSummary=document.createElement('summary'),tourLines=document.createElement('dl');
tourTranscript.className='woody-tour-transcript';tourSummary.textContent='Read the tour lines';tourTranscript.append(tourSummary,tourLines);tourHelp.after(tourTranscript);
const tourPlaces={about:'Meet Lakshya',projects:'Works',work:'Hobbies',music:'Oak’s lab',cloud:'The Viewfinder',visitor:'the visitor board'};
const entryTourLabels={'controls-offer':'Inside the garden: choosing the guide','controls-yes':'Choosing to read controls','controls-no':'Choosing to ride straight away'};
const tourStages={approach:'On the way to',arrive:'Arriving at',room:'Inside',return:'Returning from'};
for(const clip of Object.values(WOODY_TOUR_CLIPS)){
  const [stage,id]=clip.id.split(':'),title=document.createElement('dt'),text=document.createElement('dd');
  title.textContent=entryTourLabels[clip.id]||(tourStages[stage]?`${tourStages[stage]} ${tourPlaces[id]}`:clip.id==='feedback-nearby'?'Passing the visitor board':clip.id==='works-skipped'?'Choosing whether to visit Works':clip.id==='ramp-airborne'?'In the air':clip.id==='ramp-landed'?'After a safe landing':clip.id==='welcome'?'Welcome':clip.id==='departure'?'Setting off':clip.id==='controls'?'Riding controls':clip.id==='controls-takeover'?'Taking over':clip.id==='arrival-guide'?'The garden guide':clip.id==='route-unavailable'?'When a route is unavailable':clip.id==='route-cancelled'?'Stopping a ride':clip.id==='restart'?'Restarting':clip.id==='mute'?'Turning narration off':'Choosing your own route');
  text.textContent=clip.text;tourLines.append(title,text);
}
tourAudio=createWoodyTourAudio({onPlaying:playing=>{playMusic.suspend('woody-tour',playing);syncCaptionClock();},mountAudio(audio){document.body.append(audio);}});
tour=createWoodyTour({clips:WOODY_TOUR_CLIPS,feedbackAlreadyInvited:feedbackInvited,play(clip,callbacks){return tourAudio.play(clip,callbacks);},onState(snapshot){
  const ownedFocus=tourUI?.element.contains(document.activeElement);
  renderGuidePanel(snapshot);syncCaptionClock();$('tour-narration').checked=snapshot.enabled;
  if(ownedFocus&&(tourUI.element.hidden||document.activeElement.hidden))returnTourFocus();
  replayTourLine.disabled=running?!snapshot.clip:!welcomeVoice.available(entryGuideLine);
  sceneHost.dataset.tourPlayback=snapshot.status;sceneHost.dataset.tourClip=snapshot.clip?.id||'';
  if(snapshot.feedbackInvited&&!feedbackInvited){
    feedbackInvited=true;try{sessionStorage.setItem(feedbackInviteKey,'1');}catch{}
  }
}});
tourUI=mountWoodyTourUI({onEnable:value=>setTourEnabled(value),onReplay:replayGuideVoice,onStop:stopGuideVoice,
  onVisitWorks(){tour.emit('visit-works');if(tourRoom)openLandmark('projects');else visitPlace('projects');},onStay(){tour.emit('stay');sceneHost.focus({preventScroll:true});}});
tourUI.render(tour.snapshot);
$('tour-narration').addEventListener('change',event=>setTourEnabled(event.target.checked));
document.addEventListener('focusin',event=>{
  const previous=event.relatedTarget instanceof Element?event.relatedTarget:null;
  if(tourUI.element.contains(event.target)&&!tourUI.element.contains(previous))tourFocusOrigin=previous;
});
function returnTourFocus(){
  const visible=node=>node?.nodeType===1&&node.isConnected&&!node.closest('[hidden],[inert]')&&node.getClientRects().length;
  const modal=renderer?.domElement?.closest('dialog[open]');
  if(visible(tourFocusOrigin)&&(!modal||modal.contains(tourFocusOrigin))){tourFocusOrigin.focus({preventScroll:true});return;}
  const host=renderer?.domElement?.closest('[tabindex="0"]');
  if(visible(host)){host.focus({preventScroll:true});return;}
  const control=modal&&[...modal.querySelectorAll('button,a[href],input,select')].find(node=>!tourUI.element.contains(node)&&!node.disabled&&visible(node));
  (control||sceneHost).focus({preventScroll:true});
}
function setTourEnabled(value,{announce=true}={}){
  if(!value)pendingWelcomeLine=null;
  welcomeAudioPreference=Boolean(value);welcomeVoice.setEnabled(value);tour.setEnabled(value,{announce:false});
  pendingTourIntro=Boolean(value&&announce);syncTourContext();if(ready)save();
}
function requestWelcomeLine(name){
  if(!welcomeVoice.enabled)return;
  if(welcomeVoice.speaking||tour?.snapshot.speaking)pendingWelcomeLine=name;
  else welcomeVoice.play(name);
}
function stopGuideVoice(){
  entryGuideStopped=true;pendingWelcomeLine=null;
  welcomeVoice.stop();
  tour?.stop({quiet:true});
}
function replayGuideVoice(){
  const kind=welcomeCurrentKind;
  pendingWelcomeLine=null;
  if(kind)welcomeVoice.play(kind);
  else tour?.replay();
}
function renderGuidePanel(state){
  oakLab?.syncGuideVoice();
  // The welcome card already contains the greeting in full.
  if(!$('welcome').hidden){
    tourUI?.render({...state,suspended:true});
    return;
  }
  if(tourUI)moveGuidePanel();
  if(welcomeVoice.speaking&&welcomeCurrentKind){
    tourUI?.render({...state,enabled:true,speaking:true,suspended:false,clip:WOODY_TOUR_CLIPS[welcomeCurrentKind],error:null});
  }else tourUI?.render(state);
}
function moveGuidePanel(){
  const modal=document.activeElement?.closest('dialog:modal')||[...document.querySelectorAll('dialog:modal')].at(-1);
  const narrationHost=modal||document.body;
  if(tourUI.element.parentElement!==narrationHost)narrationHost.append(tourUI.element);
}
function activeTourRoom(){
  const personal=personalRooms?.tourContext;
  return visitorUI?.isOpen?'visitor':aboutExperience?.phase==='studio'?'about':['viewing','index'].includes(worksExperience?.phase)?'projects':personal?.ready?personal.kind:null;
}
function observeReviewProgress(room=activeTourRoom()){
  if(running&&!inPortfolio)reviewProgress.visit(room??(oakLab?.isOpen?'music':null));
}
function syncTourContext(){
  if(!tour)return;
  if(pendingWelcomeLine&&!welcomeVoice.speaking&&!tour.snapshot.speaking&&!document.hidden){
    const next=pendingWelcomeLine;
    pendingWelcomeLine=null;
    welcomeVoice.play(next);
  }
  const roomId=activeTourRoom();
  observeReviewProgress(roomId);
  const overlay=hasOverlay()&&!roomId;
  if(roomId&&roomId!=='visitor'||state.distance>35)tourExplored=true;
  if(running&&onboarding?.snapshot.phase==='choice'&&(roomId||overlay||target||Math.abs(state.speed)>.3)){dismissWelcomeGuide();}
  tour.update({stopId:nearStop,destinationId:tourDestination,roomId,stopped:Math.abs(state.speed)<.3,
    riding:Boolean(ready&&running&&!inPortfolio),overlay:overlay||welcomeVoice.speaking,hidden:document.hidden||!tourFocused,jumping:Boolean(riverHop?.active&&riverHop.pose?.air),explorationStarted:tourExplored});
  sceneHost.dataset.tourExplored=String(tourExplored);
  if(!tourUI.element.hidden)moveGuidePanel();
  if(roomId){tourRoom=roomId;
    if(roomId==='projects')tour.emit('works-opened');tour.emit('room-enter',{stopId:roomId});
  }else if(!roomId&&tourRoom&&!hasOverlay()&&tourFocused&&!document.hidden&&!welcomeVoice.speaking){const previous=tourRoom;tourRoom=null;if(previous!=='visitor'&&previous!=='cloud')tour.emit('room-return',{stopId:previous});
  }
  if(oakLab?.isOpen)pendingTourIntro=false;
  if(pendingTourIntro&&!overlay&&running&&!welcomeVoice.speaking&&tour.emit('enable-intro'))pendingTourIntro=false;
  if(!roomId&&!overlay&&nearStop&&!target)tour.emit('arrive',{stopId:nearStop});
  if(tourDestination){const arrival=STOPS[tourDestination]?.arrival;
    const distance=arrival?Math.hypot(state.x-arrival.x,state.z-arrival.z):Infinity;
    if(distance<=18&&distance>5)tour.emit('approach',{stopId:tourDestination});
  }
  // Landing is a moment, never a queued speech waiting behind a room or guide.
  if(tourJumped&&!riverHop?.active)tourJumped=false;
  const inAir=Boolean(riverHop?.active&&riverHop.pose?.air);
  if(inAir&&!tourAirborne){sceneHost.dataset.riverHopAirborneAt=String(performance.now());if(!overlay)tour.emit('ramp-airborne');}
  tourAirborne=inAir;
  if(ready&&running&&welcomeAudioPreference&&!riverHop?.active)tourAudio.prime(WOODY_TOUR_CLIPS['ramp-airborne']);
}
function decorateModeSwitches(){syncModeSwitches();}
decorateModeSwitches();
// Dialogs also work before WebGL is ready, so their layout cannot depend on RAF.
const overlayObserver=new MutationObserver(()=>{readingBackdropDrawn=false;syncRideUI();});
document.querySelectorAll('dialog').forEach(dialog=>overlayObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
window.addEventListener('pagehide',event=>{if(!event.persisted)overlayObserver.disconnect();});
document.querySelectorAll('[data-visit]').forEach(button=>button.addEventListener('click',()=>visitPlace(button.dataset.visit)));
document.querySelectorAll('[data-read-place]').forEach(button=>button.addEventListener('click',()=>placeUI.open(button.dataset.readPlace)));
document.querySelectorAll('[data-open-landmark]').forEach(button=>button.addEventListener('click',()=>openLandmark(button.dataset.openLandmark)));
function renderEntryChoice(snapshot){
  const choosing=snapshot.phase==='choice';
  $('welcome-controls-choice').hidden=!choosing;
  $('woody-guide-dismiss').hidden=choosing;
  $('woody-guide-replay').hidden=choosing;
  $('welcome-controls-back').hidden=choosing;
  document.querySelector('#welcome .welcome-actions').hidden=choosing;
  $('start').hidden=choosing;
  if(snapshot.phase==='ready')$('start').textContent='Let’s ride';
}
onboarding=createWoodyOnboarding({onState:renderEntryChoice,
  onQuestion(){
    const choice=$('welcome-controls-choice');$('woody-guide').append(choice);
    $('woody-guide').hidden=false;guideRemaining=0;
    $('woody-guide-destination').textContent="Click Lakshya's Garden board, or press ? anytime, for shortcuts and the guide.";
    $('woody-guide-controls').hidden=true;
    requestWelcomeLine('controls-offer');
    // A held Enter that opened the question must not also answer it.
    $('welcome-controls-question').focus({preventScroll:true});
  },
  onGuide(){
    entryGuideLine='controls-yes';
    showHelp();
    $('help-welcome-intro').hidden=false;
    $('help-welcome-caption').textContent=WELCOME_TRANSCRIPTS['controls-yes'];
    replayTourLine.disabled=false;
    requestWelcomeLine('controls-yes');
  },
  onDepart(){
    if(running){
      dismissWelcomeGuide();onboarding.markRiding();
      if(onboarding.snapshot.answer==='no'&&welcomeVoice.enabled){
        requestWelcomeLine('controls-no');
      }
      syncRideUI();
    }else start();
  }
});
renderEntryChoice(onboarding.snapshot);
function requestEntryRide(){if(ready&&!running){if(welcomeAudioPreference!==false)setTourEnabled(true,{announce:false});start();}}
$('start').addEventListener('click',requestEntryRide);$('back').addEventListener('click',showPortfolio);$('reader-back').addEventListener('click',showPortfolio);
$('welcome-controls-yes').addEventListener('click',()=>onboarding.choose('yes'));
$('welcome-controls-no').addEventListener('click',()=>onboarding.choose('no'));
$('welcome-controls-back').textContent='Keep exploring';
$('welcome-controls-back').addEventListener('click',()=>{dismissWelcomeGuide();sceneHost.focus({preventScroll:true});});
$('help-welcome-stop').addEventListener('click',stopGuideVoice);
$('welcome-portfolio').addEventListener('click',showPortfolio);
$('welcome').addEventListener('pointermove',event=>{
  if(!woodyWelcome||running||reduced)return;
  const x=event.clientX/Math.max(1,innerWidth)*2-1;
  const y=event.clientY/Math.max(1,innerHeight)*2-1;
  woodyWelcome.setPointer(x,y);
},{passive:true,signal:startupController.signal});
$('welcome').addEventListener('pointerleave',()=>woodyWelcome?.setPointer(0,0),{signal:startupController.signal});
function toggleWelcomeVoice(){
  setTourEnabled(!welcomeVoice.enabled,{announce:false});
  if(welcomeVoice.enabled&&ready){tour.stop();welcomeVoice.play(running?'controls':onboarding.snapshot.phase==='choice'?'controls-offer':'welcome');}
}
$('woody-guide-voice').addEventListener('click',toggleWelcomeVoice);
$('welcome-replay').addEventListener('click',()=>{if(welcomeVoice.speaking)setTourEnabled(false,{announce:false});else{setTourEnabled(true,{announce:false});tour.stop();welcomeVoice.play(onboarding.snapshot.phase==='choice'?'controls-offer':'welcome');}});
$('woody-guide-replay').addEventListener('click',()=>{if(welcomeVoice.speaking)stopGuideVoice();else{setTourEnabled(true,{announce:false});tour.stop();welcomeVoice.play('controls');}});
$('woody-guide-dismiss').addEventListener('click',()=>{dismissWelcomeGuide();syncRideUI();sceneHost.focus({preventScroll:true});});
syncWelcomeVoice({enabled:welcomeVoice.enabled,supported:welcomeVoice.supported,speaking:false});
function stopRide(){clearInput();syncRideUI();syncTourContext();tour?.emit('action',{clipId:'route-cancelled'});notify('Stopped. Pedal or choose another place to continue.');sceneHost.focus({preventScroll:true});}
$('stop-route').addEventListener('click',stopRide);
$('open-map')?.addEventListener('click',showMap);$('help-map').addEventListener('click',showMap);$('ride-guide').addEventListener('click',showMap);
$('quick-full-guide').addEventListener('click',()=>{ $('quick-tips').hidePopover(); showHelp(); });
$('ride-camera').addEventListener('click',()=>{toggleRidingView();if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});});
$('ride-bell').addEventListener('click',()=>{bell();if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});});
$('ride-light').addEventListener('click',()=>{setBicycleLight(!bicycleLight?.enabled);if(running&&!hasOverlay())sceneHost.focus({preventScroll:true});});
$('bicycle-light').addEventListener('change',event=>setBicycleLight(event.target.checked));
$('riding-view').addEventListener('change',event=>setRidingView(event.target.value));
$('night-garden').addEventListener('change',event=>setGardenNight(event.target.checked));
$('automatic-daylight').addEventListener('change',event=>{gardenLighting?.setAutomatic(event.target.checked);save();});
$('read-direct').addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();showPortfolio();});$('failure-read').addEventListener('click',()=>openLandmark('projects'));$('close-reader').addEventListener('click',closeReader);$('reader-continue').addEventListener('click',()=>{closeReader();if(!running&&ready)start({skipWelcome:true});});$('interact').addEventListener('click',interact);
$('lighter-graphics').addEventListener('change',e=>{renderQuality.setLighter(e.target.checked);applyRenderQuality();garden?.update({time,reduced,lighter:!renderSettings.ambientMotion,camera,sun,night:gardenLighting?.progress??0});readingBackdropDrawn=false;save();});
$('help-close').addEventListener('click',closeHelp);$('help-resume').addEventListener('click',()=>{
  if(onboarding.snapshot.phase==='guide'){
    help.close();help.inert=true;restoreRideUI();onboarding.continueFromGuide();
  }else closeHelp();
});$('help-back').addEventListener('click',showPortfolio);$('calm-motion').addEventListener('change',e=>{reduced=e.target.checked;reducedOverride=reduced;if(reduced)setRidingView('overview');document.documentElement.classList.toggle('reduce-motion',reduced);save();});
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
  if(!running){if(key==='enter'&&document.activeElement===sceneHost){e.preventDefault();requestEntryRide();}return;}
  // The stunt owns its full trajectory; Escape resumes its normal role after landing.
  if(key==='escape'&&riverHop?.active){consumeNavigationKey(e);return;}
  if(key==='escape'&&!e.repeat){consumeNavigationKey(e);stopRide();return;}
  // Keep native button/keyboard activation. Riding input belongs to the canvas.
  if(document.activeElement!==sceneHost&&!document.activeElement?.closest('#touch-controls')&&e.key!=='Escape')return;
  if(key==='q'&&!e.repeat){e.preventDefault();hopBoost=!hopBoost;notify(hopBoost?'Boost on. Tap Q to switch it off.':'Normal riding speed.');return;}
  if(key==='p'&&!e.repeat){e.preventDefault();showPortfolio();return;}
  // Shift changes pace without cancelling a click-to-ride route. Its keyup and
  // the existing blur/overlay cleanup release it just like the riding keys.
  if(key==='shift'){e.preventDefault();physicalKeys.add(key);keys.add(key);return;}
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' '].includes(key)){
    e.preventDefault();const takingOver=Boolean(guidedRide);cancelRoute();
    if(takingOver&&!e.repeat){syncTourContext();tour.emit('route-cancelled');}
    physicalKeys.add(key);keys.add(key);if(e.shiftKey){physicalKeys.add('shift');keys.add('shift');}else{physicalKeys.delete('shift');keys.delete('shift');}
  }
  if(e.repeat)return;
  if(key==='enter'){e.preventDefault();interact();}
  if(key==='?'||key==='h')showHelp();
  if(key==='m')showMap();
  if(key==='c')toggleRidingView();
  if(key==='n')setGardenNight(!gardenLighting?.night);
  if(key==='r'||key==='b'){e.preventDefault();bell();}
  if(key==='l'){e.preventDefault();overlayMotion.feedback($('ride-light'));setBicycleLight(!bicycleLight?.enabled);}
});
function unlockResumedAudio(event){
  if(isRidingAudioActivation(event)&&pendingRideAudio&&ready&&running){
    unlockRideAudio({resumeMusic:!event.target?.closest?.('[data-play-music]')});
  }
}
document.addEventListener('keydown',unlockResumedAudio,{capture:true});
document.addEventListener('pointerdown',unlockResumedAudio,{capture:true});
document.addEventListener('pointerup',unlockResumedAudio,{capture:true});
document.addEventListener('click',unlockResumedAudio,{capture:true});
document.addEventListener('keyup',e=>{const key=e.key.toLowerCase();physicalKeys.delete(key);keys.delete(key);touchControlInput?.sync();});
help.addEventListener('keydown',event=>{
  if(!help.open||isKeyboardShortcutBlocked(event)||event.repeat)return;
  if(event.key.toLowerCase()==='m'){consumeNavigationKey(event);showMap();}
});
window.addEventListener('blur',()=>{tourFocused=false;departureControlsPending=false;clearInput();tour?.update({hidden:true});save();});
window.addEventListener('focus',()=>{tourFocused=true;syncTourContext();});
for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{tourFocused=true;},{capture:true});
window.addEventListener('pageshow',event=>{if(event.persisted){tourFocused=document.hasFocus();syncTourContext();}});
sceneHost.addEventListener('blur',e=>{if(!coarse&&!e.relatedTarget?.closest('#ride-status,#ride-camera,#ride-bell,#ride-light,.woody-tour')&&!(rideProfile&&e.relatedTarget?.closest('#ride-performance')))clearInput();});
$('stop-route').addEventListener('blur',e=>{if(e.relatedTarget!==sceneHost)clearInput();});
document.addEventListener('visibilitychange',()=>{
  syncCaptionClock();
  renderQuality.resetSamples();
  if(document.hidden){
    const deferredGuide=running&&pendingWelcomeGuide;
    departureControlsPending=false;clearInput();cancelWelcomeDeparture();pendingWelcomeGuide=deferredGuide;tour?.update({hidden:true});save();
  }else if(pendingWelcomeGuide&&running&&!inPortfolio&&!hasOverlay()){
    pendingWelcomeGuide=false;showWelcomeGuidance();syncRideUI();sceneHost.focus({preventScroll:true});
  }else if(!running)greetAtEntry();
});
window.addEventListener('pagehide',save);
window.addEventListener('pagehide',event=>{
  const deferredGuide=running&&pendingWelcomeGuide;
  departureControlsPending=false;pendingWelcomeLine=null;welcomeVoice.stop();tour?.stop();tour?.update({hidden:true});clearInput();clearWelcomeHandoff();
  if(event.persisted){pendingWelcomeGuide=deferredGuide;return;}
  abandoned=true;tour?.dispose();tourAudio?.dispose();tourUI?.dispose();visitorBoard?.dispose();visitorUI?.dispose();riverHop?.dispose();overlayMotion.dispose();touchControlInput?.dispose();mainLoop.stop();bicycleLight?.dispose();rider?.bell?.dispose();aboutExperience?.dispose();oakLab?.dispose();worksExperience?.dispose();personalRooms?.dispose();rideObjectives?.dispose();trailheadGuide?.dispose();gardenLighting?.dispose();followSky?.dispose();world?.wayfinding.dispose();cloudVolume?.dispose();cloudCurtain.dispose();rideProfile?.dispose();startupController.abort();pokemonControls.dispose();pokemonAudio.dispose();rideSoundControl.dispose();gardenBell.dispose();rideAudio.dispose();companions?.dispose();welcomeVoice.dispose();garden?.dispose();world?.studioDisplays.dispose();world?.landmarks.dispose();woodyWelcome?.dispose();disposeCharacterAsset(characterAsset);characterAsset=null;
  renderer?.dispose();renderer?.domElement.remove();
});
touchControlInput=createTouchRidingInput({buttons:$('touch-controls').querySelectorAll('[data-key]'),keys,physicalKeys,releaseTarget:window,onStart:cancelRoute,isActive:()=>coarse&&ready&&running&&!inPortfolio&&!hasOverlay()&&!ridingInputBlocked()});
$('touch-help').textContent='Guide';
function selectGround(e){
  // The guided jump owns movement until landing or explicit cancellation.
  // In-world companion picking must not silently reset an airborne rider.
  if(!ready||!running||riverHop?.active||cloudTransition.snapshot.active||hasOverlay()||inPortfolio)return;
  sceneHost.focus({preventScroll:true});const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  if(visitorBoard?.pick(raycaster)){openVisitorBoard();return;}
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
let nextHoverCheck=0;
const HOVER_INTERVAL_MS=80;
sceneHost.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')hoverPointer={x:e.clientX,y:e.clientY};});
sceneHost.addEventListener('pointerleave',()=>{hoverPointer=null;nextHoverCheck=0;sceneHost.style.cursor='';sceneHost.removeAttribute('title');});

function updateProjection(){const aspect=innerWidth/innerHeight;if(camera.isPerspectiveCamera)camera.aspect=aspect;else{camera.left=-cameraHeight*aspect/2;camera.right=cameraHeight*aspect/2;camera.top=cameraHeight/2;camera.bottom=-cameraHeight/2;}camera.updateProjectionMatrix();}
let portraitWidth=0,portraitHeight=0;
function renderCloudEntry(){cloudVolume?.render(renderer,cloudTransition.snapshot,innerWidth,innerHeight);}
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
  welcomeTime+=dt;woodyWelcome.update({dt,time:welcomeTime,reduced,phase:welcomeFlow.snapshot.phase==='departing'?'departure':'welcome',speaking:welcomeVoice.playback==='playing',speech:welcomeVoice.frame,mouthOpen:sampleSpeechOpening(welcomeVoice.frame)});
  const greetingMetrics=woodyWelcome.speechFrame,greetingTime=greetingMetrics.elapsed;
  $('welcome').dataset.gesturePhase=greetingMetrics.reduced?'rest':greetingTime<.12?'rest':greetingTime<.62?'raise':greetingTime<1.87?(greetingMetrics.sweep>=0?'sweep-left':'sweep-right'):greetingTime<2.05?'hold':greetingTime<2.6?'lower':'rest';
  $('welcome').dataset.greetingTime=greetingTime.toFixed(3);$('welcome').dataset.mouthOpen=greetingMetrics.mouthOpen.toFixed(3);$('welcome').dataset.blink=greetingMetrics.blink.toFixed(3);$('welcome').dataset.explain=greetingMetrics.explain.toFixed(3);
  renderer.setViewport(rect.left,h-rect.bottom,rect.width,rect.height);renderer.setScissor(left,h-bottom,right-left,bottom-top);renderer.setScissorTest(true);
  const background=woodyWelcome.scene.background;
  woodyWelcome.scene.background=null;
  try{renderer.render(woodyWelcome.scene,woodyWelcome.camera);}
  finally{woodyWelcome.scene.background=background;renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);}
  if(!welcomePainted&&ready){welcomePainted=true;requestAnimationFrame(greetAtEntry);}
  renderCloudEntry();
}
function syncRiverHopUI(){
 document.body.classList.toggle('river-hop-near',Boolean(riverHop&&(riverHop.active||riverHop.near())));
 if(riverHop?.active)$('ride-status').hidden=true;
 const phase=riverHop?.phase||'preparing';if(sceneHost.dataset.riverHop!==phase)sceneHost.dataset.riverHop=phase;
}
function renderWorld(){syncRiverHopUI();if(renderer.domElement.parentElement!==sceneHost)sceneHost.append(renderer.domElement);gardenLighting?.update(0,{paused:true,reduced,focus});followSky?.update({camera,focus,time,active:ridingView==='follow',reduced,lighter:!renderSettings.ambientMotion,night:gardenLighting?.progress??0});garden?.update({time,reduced,lighter:!renderSettings.ambientMotion,camera,sun,night:gardenLighting?.progress??0});companions?.update({time,reduced,lighter:!renderSettings.ambientMotion,camera,player:state,active:running&&!hasOverlay()&&!inPortfolio});renderer.render(scene,camera);renderCloudEntry();}
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
  $('play-loading-veil')?.remove();
  departureControlsPending=false;tour?.update({riding:false,overlay:true});
  mainLoop.stop();window.__playStartup?.finish('failed');
  for(const owner of [aboutExperience,oakLab,worksExperience,personalRooms]){
    try{owner?.close({immediate:true,notify:false});}
    catch(error){console.warn('A destination could not finish closing after the 3D view stopped.',error);}
  }
  if([...Object.values(PERSONAL_ROUTES),'#works-room'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search);
  cancelWelcomeDeparture();dismissWelcomeGuide();
  
  readingBackdropDrawn=false;
  ready=false;clearInput();syncRideUI();$('start').disabled=true;
  $('route-hint').hidden=true;$('failure').querySelector('h1').textContent=startupComplete?'The world paused.':'The world couldn’t start.';
  $('loading-state').setAttribute('aria-busy','false');$('loading-status').textContent='The world needs another try.';
  $('failure-message').textContent=message;$('failure').hidden=false;$('welcome').hidden=true;
  syncRideUI();
  
  if(!inPortfolio&&!hasOverlay())$('failure-retry').focus({preventScroll:true});
}
function placeRider(){
  const half=RIDER_HALF_WHEELBASE;
  const front=riderGroundHeight(state.x-Math.sin(state.heading)*half,state.z-Math.cos(state.heading)*half);
  const rear=riderGroundHeight(state.x+Math.sin(state.heading)*half,state.z+Math.cos(state.heading)*half);
  rider.group.position.set(state.x,(front+rear)/2,state.z);
  rider.group.rotation.set(Math.atan2(front-rear,half*2),state.heading,0,'YXZ');
}
async function initialize(){
  try{
  if(document.body.dataset.startupState==='failed')return;
  const saved=store.get();
  enteredGarden=!welcomeLayoutReview&&hasEnteredGarden(saved,{mapVersion:MAP_VERSION,spawn:newState()});
  document.body.dataset.gardenEntry=enteredGarden?'resume':'preparing';
  if(enteredGarden){
    $('welcome').removeAttribute('aria-labelledby');$('welcome').setAttribute('aria-label','Returning to your ride');
  }
  bicycleLightPreference=saved?.bicycleLight===true;
  pokemonSoundPreference=typeof saved?.pokemonSounds==='boolean'?saved.pokemonSounds:null;
  rideSoundPreference=typeof saved?.rideSounds==='boolean'?saved.rideSounds:null;
  welcomeAudioPreference=typeof saved?.tourVoice==='boolean'?saved.tourVoice:true;
  setTourEnabled(welcomeAudioPreference,{announce:false});
  if(saved){renderQuality.setLighter(saved.lighterGraphics===true);readerScroll=Number.isFinite(saved.readerScroll)?Math.max(0,saved.readerScroll):0;reducedOverride=typeof saved.reducedOverride==='boolean'?saved.reducedOverride:null;reduced=reducedOverride??motionPreference.matches;placeUI.restoreScrolls(saved.placeScrolls);projectUI.restoreProgress(saved.projectProgress);}
  document.documentElement.classList.toggle('reduce-motion',reduced);
  const initialHash=location.hash;
  if(location.hash.startsWith('#project-'))projectUI.open(location.hash.slice(9));
  
    await runLoadingStages([
      {id:'view',label:'Preparing the 3D view…',timeoutMs:10000,run(){
        renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;sceneHost.append(renderer.domElement);
        renderer.setPixelRatio(renderSettings.pixelRatio);renderer.setSize(innerWidth,innerHeight);
        renderer.setClearColor('#ffffff',1);renderer.clear();
        cloudVolume=createCloudVolume();
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
        visitorBoard?.dispose();visitorUI?.dispose();help.querySelector('[data-visitor-feedback]')?.remove();
        world=createWorld(scene);visitorUI=createVisitorBoardUI({onOpen(){prepareOverlay('visitor');syncRideUI();},onClose:restoreRideUI,onChange(reviews){visitorBoard?.setReviews(reviews);},onDismissInvitation(){if(running&&!inPortfolio&&!hasOverlay())sceneHost.focus({preventScroll:true});}});visitorBoard=createVisitorBoard(scene,{onOpen:openVisitorBoard});world.colliders.push({...VISITOR_BOARD_LOCATION.pole,radius:.65,height:9.4});const feedbackLink=document.createElement('button');feedbackLink.type='button';feedbackLink.dataset.visitorFeedback='';feedbackLink.textContent='Leave ride feedback';feedbackLink.addEventListener('click',openVisitorBoard);help.querySelector('.reader-top').append(feedbackLink);trailheadGuide=createTrailheadGuide(scene);world.colliders.push(...trailheadGuide.colliders);rider=createRider(THREE);
        gardenLighting=createGardenLighting({scene,sun,hemisphere,world});gardenLighting.setNight(saved?.gardenNight===true,{immediate:true});gardenLighting.setAutomatic((saved?.riverDaylight ?? true));
        bicycleLight=createBicycleHeadlight(rider.group,{enabled:bicycleLightPreference});
        bicycleLight.update(0,{night:gardenLighting.progress,reduced});syncBicycleLight();
        followSky=createFollowSky(scene);
        characterAsset=await loadWoodyCharacter({signal:startupController.signal});
        if(abandoned||startupController.signal.aborted){disposeCharacterAsset(characterAsset);characterAsset=null;throw new DOMException('World loading cancelled','AbortError');}
        woodyWelcome=createWoodyWelcome(THREE,characterAsset);rider.attachCharacter(characterAsset);
        scene.add(rider.group);contactMarker=createContactMarker(scene,'#29433e');
        landmarkFramer=createLandmarkFramer(world.landmarks.roots,cameraOffset,{localMinHeights:{projects:18}});
        personalRooms=createPersonalRooms({renderer,cloudVolume,isReduced:()=>reduced,onPortfolio:showPortfolio,onWorks:()=>rideFromRoom('projects'),onPlace:rideFromRoom,onOakLab:()=>rideFromRoom('music'),onSoundState:playing=>{playMusic.suspend('sound-sketch',playing);},
          onOpen(kind){prepareOverlay('personal');history.replaceState(null,'',location.pathname+location.search+(PERSONAL_ROUTES[kind]||PERSONAL_ROUTES.work));},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        worksExperience=createWorksExperience({renderer,isReduced:()=>reduced,onPortfolio:showPortfolio,onPlace:rideFromRoom,
          onOpen(){prepareOverlay('works');history.replaceState(null,'',location.pathname+location.search+'#works-room');},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        oakLab=createOakLab({renderer,guideSpeaking:()=>Boolean(welcomeVoice.speaking||tour?.snapshot.speaking),isReduced:()=>reduced,onPortfolio:showPortfolio,onPlace:rideFromRoom,
          onOpen(){prepareOverlay('oak');tourRoom='music';history.replaceState(null,'',location.pathname+location.search+'#oak-lab');},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        aboutExperience=createAboutExperience({renderer,isReduced:()=>reduced,onPortfolio:showPortfolio,onPlace:rideFromRoom,onProject:id=>rideFromRoom('projects',id),
          onOpen(){prepareOverlay('about');history.replaceState(null,'',location.pathname+location.search+PERSONAL_ROUTES.about);},
          onClose(){updateProjection();readingBackdropDrawn=false;history.replaceState(null,'',location.pathname+location.search);restoreRideUI();}
        });
        decorateModeSwitches();
        if(saved?.mapVersion===MAP_VERSION&&Number.isFinite(saved.heading)&&positionIsClear(saved,world.colliders,supportsDeck))Object.assign(state,{x:saved.x,z:saved.z,heading:saved.heading});
        rideFeedback.reset(state);focus.set(state.x-5,0,state.z+1);placeRider();resize();window.addEventListener('resize',resize);
        camera.position.copy(focus).add(cameraOffset);camera.lookAt(focus);scene.updateMatrixWorld(true);renderBackdrop();
      }},
      {id:'assets',label:'Preparing the garden, companions and displays…',async run(){
        garden=await loadGarden(scene,world,{signal:startupController.signal});
        riverHop=createFullGardenHop({scene,world,garden,rider,state,notify,onFinish(){if(!riverHop.manual){keys.clear();physicalKeys.clear();}rideFeedback.reset(state);contactMarker.reset();world.setRoute(null);save();tourJumped=Boolean(riverHop.pose?.done);sceneHost.dataset.riverHopResult=tourJumped?'landed':'cancelled';if(tourJumped){rideObjectives?.landed();sceneHost.dataset.riverHopLandedAt=String(performance.now());}}});
        startupController.signal.throwIfAborted();
        rideObjectives=createRideObjectives(scene,trailheadGuide);
        cameraObstacles=createCameraObstacles(world,garden,[trailheadGuide.root]);setRidingView(saved?.ridingView,{persist:false});
        try{companions=createPokemonWorld({scene,obstacles:world.colliders,trees:garden.nature.placements,onLoadTiming:profileRequested?recordCompanionLoad:undefined});}
        catch(error){console.warn('Optional garden companions unavailable:',error);}
        if(!positionIsClear(state,world.colliders,supportsDeck)){Object.assign(state,newState());focus.set(state.x-5,0,state.z+1);placeRider();}
        startupController.signal.throwIfAborted();
        void world.studioDisplays.ready.catch(error=>console.warn('Optional displays unavailable:',error));
        if(renderer.getContext().isContextLost())throw new Error('The 3D context was lost during preparation');
        renderBackdrop();
      }}
    ],{
      signal:startupController.signal,onTimeout:()=>startupController.abort(),
      // Yield a paint opportunity between real tasks, without an artificial delay.
      yieldControl:()=>new Promise(resolve=>setTimeout(resolve,0)),
    });
    let veil;
    if (!reduced && !document.hidden && typeof Element.prototype.animate === 'function') {
      veil=document.createElement('div');veil.id='play-loading-veil';veil.setAttribute('aria-hidden','true');
      document.body.append(veil);
      await veil.animate([{opacity:0},{opacity:1}],{duration:280,easing:'ease-in-out',fill:'forwards'}).finished.catch(()=>{});
      if(abandoned||failed){veil.remove();return;}
    }
    startupComplete=true;ready=true;$('failure').hidden=true;if(!running)$('welcome').hidden=false;$('start').disabled=false;$('start').textContent='Let’s start';
    window.__playStartup?.finish('ready');
    if(!enteredGarden){
      document.body.dataset.gardenEntry='welcome';
      $('welcome').removeAttribute('aria-label');
      $('welcome').setAttribute('aria-labelledby','welcome-title');
    }
    $('loading-state').setAttribute('aria-busy','false');$('loading-state').dataset.ready='true';
    $('loading-status').textContent='Ready to ride.';
    if(enteredGarden&&!running&&!inPortfolio)start({skipWelcome:true,resuming:true});
    syncRideUI();
    // A mode change during loading cancels a stale immersive deep link.
    if(location.hash===initialHash&&!inPortfolio){const personal=Object.keys(PERSONAL_ROUTES).find(kind=>PERSONAL_ROUTES[kind]===initialHash||(kind==='work'&&initialHash==='#memory-pavilion')||(kind==='music'&&['#music-corner','#making-of'].includes(initialHash)));if(personal)openLandmark(personal);else if(initialHash==='#works-room')openWorks();}
    mainLoop.start();
    if(veil)requestAnimationFrame(()=>{
      veil.animate([{opacity:1},{opacity:0}],{duration:450,easing:'ease-in-out',fill:'forwards'})
        .finished.then(()=>veil.remove(),()=>veil.remove());
    });
    greetAtEntry();
  }catch(error){if(abandoned)return;failed=true;startupController.abort();companions?.dispose();console.error('World could not initialize',error);showWorldFailure(error.message.includes('WebGL')?'The browser lost access to 3D graphics. You can still browse the projects or try the ride again.':'The ride couldn’t finish preparing. You can open the projects now or try the ride again.');}
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
  syncTourContext();
  if(aboutExperience?.isOpen){aboutExperience.update(dt);return;}
  if(oakLab?.isOpen){oakLab.update(dt);return;}
  if(worksExperience?.isOpen){worksExperience.update(dt);return;}
  if(personalRooms?.isOpen){personalRooms.update(dt);return;}
  visitorBoard?.update(state,running&&!inPortfolio&&!hasOverlay()&&!riverHop?.active,gardenLighting?.night);
  gardenLighting?.update(dt,{paused:hasOverlay()||!running,reduced,focus,riderZ:state.z});
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
    if(!guideRemaining&&!welcomeVoice.speaking){dismissWelcomeGuide();syncRideUI();}
  }
  const paused=hasOverlay();
  // Remove the physical preview from the paused backdrop before reading HTML.
  if(paused){if(!readingBackdropDrawn){renderBackdrop();readingBackdropDrawn=true;}return;}
  readingBackdropDrawn=false;
  if(!paused){time+=dt;
    let pedaling=false,movingIntent=false,turnIntent=0;
    if(riverHop?.active){riverHop.step(dt,reduced);pedaling=riverHop.active&&!riverHop.pose?.air;movingIntent=riverHop.active;}
    else if(running){let input=cloudTransition.snapshot.active?{brake:true,turn:0}:{forward:keys.has('w')||keys.has('arrowup'),reverse:keys.has('s')||keys.has('arrowdown'),brake:keys.has(' '),boost:keys.has('shift')||hopBoost,turn:(keys.has('a')||keys.has('arrowleft')?1:0)-(keys.has('d')||keys.has('arrowright')?1:0)};
      if(guidedRide){
        input=guidedRide.update(state,dt,{boost:keys.has('shift')||hopBoost});
        if(input.blocked){cancelRoute();input={brake:true};notify('There isn’t room for this turn. Reverse a little, or choose clearer ground.');}
        else if(input.arrived){const callback=pendingArrival;cancelRoute();input={brake:true};callback?.();if(hasOverlay())return;}
      }
      if(!guidedRide)input=assistAcrossRamps(state,input);
      movingIntent=Boolean(input.forward)!==Boolean(input.reverse);
      movingIntent=movingIntent&&!input.brake;
      turnIntent=input.turnIntent??input.turn??0;
      // Lift the planted foot before starting either direction. This handoff
      // happens only at rest and never changes braking or a rolling trajectory.
      if(movingIntent&&Math.abs(state.speed)<.025&&!rider.readyToRide)input={...input,forward:false,reverse:false,brake:true};
      const previousDistance=state.distance;let launched=false;
      stepMotion(state,input,dt,world.colliders,previous=>{const intercepted=riverHop?.automatic(previous,reduced)??false;launched=Boolean(riverHop?.active);return intercepted;},supportsDeck);
      if(launched){cancelRoute();world.setRoute(null);sceneHost.dataset.riverHopResult='running';sceneHost.dataset.riverHopStunt=riverHop.stunt;}

      pedaling=Boolean((input.forward||input.reverse)&&!input.brake&&!state.contact?.blocked);
      rideFeel=rideFeedback.update({state,input,dt,reduced});if(rideFeel.notice)notify(rideFeel.notice);
      rideAudioMotion.speed=state.speed;rideAudioMotion.pedaling=pedaling;rideAudioMotion.braking=Boolean(input.brake);rideAudioMotion.moved=Math.max(0,state.distance-previousDistance);rideAudioMotion.dt=dt;
      rideAudio.update(rideFeel,rideAudioMotion);contactMarker.update(state,rideFeel,input,dt,reduced);
      if(target&&(input.forward||input.reverse)&&state.contact?.blocked&&state.distance-previousDistance<.001){blockedTime+=dt;if(blockedTime>1.2){cancelRoute();state.speed=0;notify('The route is blocked. Reverse away, or choose another point.');}}else blockedTime=0;
      if(state.distance>7)rideHintVisible=false;
      setNearStop(nearbyStop(state,nearStop));
    }
    if(riverHop?.active)riverHop.prepareRider();else placeRider();rider.update({mouthOpen:sampleSpeechOpening(welcomeVoice.frame.playing?welcomeVoice.frame:tourAudio?.frame),speed:state.speed,steering:state.steering,wheelSteering:steeringAngle(state.steering,state.speed),movingIntent,turnIntent,groundHeight:riderGroundHeight,time,dt,pedaling,reduced,feedback:rideFeel,navigationActive:Boolean(target),poseModifier:riverHop?.active?riverHop.modifyRiderPose:undefined});riverHop?.finishRider();
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
    riverHop?.updateCamera(camera,dt);
    if(!decorationsStarted&&running&&!paused&&!cloudTransition.snapshot.active&&garden){
      decorationsStarted=true;
      void garden.loadDecorations();
    }
    if(running&&!riverHop?.active&&!cloudTransition.snapshot.active)rideObjectives?.update(state,camera,innerHeight,time,dt,reduced);
    else rideObjectives?.hide();
    world.wayfinding.update(camera,{follow:ridingView==='follow'});
    // Pointer activation still performs an immediate, independent hit test.
    if(hoverPointer&&running&&now>=nextHoverCheck){
      nextHoverCheck=now+HOVER_INTERVAL_MS;
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




