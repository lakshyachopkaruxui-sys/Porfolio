import {createMapUI} from './src/map-ui.js';
import {createDestinationUI} from './src/destination-ui.js';
import {createProjectUI} from './src/project-ui.js';
import {createCloudPhotoGallery} from './src/cloud-photo-gallery.js';
import {PHOTOGRAPHY_ROLLS} from './src/photography-rolls.js';
import {bindRoomMapNavigation} from './src/room-map-navigation.js';
import {decorateModeSelectors} from './src/mode-selector.js';
import {START} from './src/layout.js';
import {MOBILE_ENTRY_QUERIES} from './src/mobile-entry-policy.js';

const q = selector => document.querySelector(selector);
const photoDialog = q('#personal-experience');
const isReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const roomHashes = {about:'#meet-lakshya', projects:'#works-room', work:'#hobbies', music:'#oak-lab', cloud:'#cloud-lookout'};
let view = 'map', lastStop = null;

function leave(url) {
  view = 'leaving';
  location.assign(url);
}
function showMap() {
  view = 'map';
  projects.close();
  places.close();
  photographs.close({notify:false});
  if (photoDialog.open) photoDialog.close();
  if (!map.isOpen) {
    map.open(START);
    if (lastStop) q('[data-map-read="'+lastStop+'"]')?.focus({preventScroll:true});
  }
}
function backToMap() {
  if (view !== 'map' && view !== 'leaving') showMap();
}
function readStop(place, project) {
  lastStop = place;
  view = 'reading';
  if (place === 'music') {
    leave('./exhibition.html');
  } else if (place === 'projects') {
    projects.open(project);
    q('#projects-close').textContent = q('#projects-continue').textContent = 'Back to garden map';
  } else if (place === 'cloud') {
    photoDialog.showModal();
    photographs.open();
    q('[data-cloud-close]').textContent = 'Back to garden map';
  } else {
    places.open(place === 'work' ? 'collection' : place);
    q('#place-close').textContent = q('#place-continue').textContent = 'Back to garden map';
    const next = q('#place-next');
    if (next) next.textContent = next.textContent.replace(/^Ride to /,'Explore ');
  }
}
const onPortfolio = event => {
  const link = event?.target?.closest?.('[data-mode-link]');
  if (link?.dataset.modeLink === 'portfolio') {
    event.preventDefault();
    leave('/normal-portfolio/');
  }
};
const projects = createProjectUI({onOpen(){}, onClose:backToMap, onPortfolio, onContinue:backToMap});
const places = createDestinationUI({
  onOpen(){}, onClose:backToMap, onPortfolio, onContinue:backToMap, isReduced, enableRichCloud:false,
  onVisit:id=>{ map.close(); readStop(id); }, onRead:id=>{ map.close(); readStop(id); },
  onProject:id=>{ map.close(); readStop('projects',id); }
});
const photographs = createCloudPhotoGallery({
  host:photoDialog.firstElementChild, collections:PHOTOGRAPHY_ROLLS, isReduced, onClose:backToMap
});
photoDialog.addEventListener('cancel', event => { event.preventDefault(); photographs.cancel(); });
const map = createMapUI({
  onOpen(){}, onClose() {
    // Destination handlers run immediately after the map's close callback.
    queueMicrotask(()=>{ if(view==='map' && !map.isOpen) leave('./exhibition.html'); });
  },
  onPortfolio, onRead:readStop, onRide:id=>leave('./'+roomHashes[id]),
  onHelp:()=>leave('./'), onReset:()=>leave('./')
});
decorateModeSelectors(document, {mode:'play'});
bindRoomMapNavigation(document, showMap);
const exit = q('#map-close');
exit.textContent = 'Back to exhibition';
exit.setAttribute('aria-label','Back to exhibition');
q('.map-reset').hidden = true;
q('#map-help').textContent = 'Open bicycle world';
q('.map-footer > p').textContent = '';
const phoneLayout = Object.values(MOBILE_ENTRY_QUERIES).some(query=>matchMedia(query).matches);
let canRide = false;
if (!phoneLayout) {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    canRide = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* The readers and photography catalogue remain available. */ }
}
const stops = [...document.querySelectorAll('[data-map-read]')];
for (const ride of document.querySelectorAll('[data-map-ride]')) {
  ride.textContent = 'Enter 3D room';
  ride.setAttribute('aria-label','Enter 3D room: '+q('#map-stop-'+ride.dataset.mapRide).textContent);
  ride.hidden = !canRide;
}
q('.map-heading > div > p:last-child').textContent = canRide
  ? 'Explore a section or enter its 3D room.'
  : 'Choose a section to explore.';
if (!canRide) {
  q('#map-keyboard-hint').textContent = 'Use ↑ or ↓ to choose a section, Enter to explore, and Esc to go back.';
  q('#world-map').addEventListener('keydown', event => {
    const keys = ['ArrowUp','ArrowDown','w','s','Home','End'];
    if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = stops.indexOf(document.activeElement);
    if (current < 0) return;
    const next = event.key==='Home'?0:event.key==='End'?stops.length-1:
      Math.max(0, Math.min(stops.length-1,current+(['w','ArrowUp'].includes(event.key)?-1:1)));
    event.preventDefault(); event.stopImmediatePropagation();
    stops[next].focus(); stops[next].scrollIntoView({block:'nearest'});
  }, {capture:true});
}
const initial = location.hash.slice(1);
showMap();
if (!canRide) stops[0].focus({preventScroll:true});
if (initial in roomHashes) { map.close(); readStop(initial); }
