import {WebGLRenderer} from 'three';
import {mountPlayMusic} from './src/play-music-ui.js';
import {createOakLab} from './src/oak-lab.js';
import {POKEMON_COLLECTION} from './src/pokemon-collection-data.js';
import {bindRoomMapNavigation} from './src/room-map-navigation.js';
import {createPhotoRenderer} from './photo-renderer.js';

const music = mountPlayMusic();
let renderer, lab, photoMode = false, previousTime = null, frame;
try {
  renderer = new WebGLRenderer({antialias: true, powerPreference: 'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
} catch {
  photoMode = true;
  renderer = createPhotoRenderer(() => POKEMON_COLLECTION[lab.diagnostics().collection?.activeIndex]);
  const surface = renderer.domElement;
  surface.onpointerdown = surface.onpointerup = event => event.stopImmediatePropagation();
  surface.onclick = () => document.querySelector('#pokemon-view-catch')?.click();
}
document.querySelector('#parking').append(renderer.domElement);

lab = createOakLab({
  renderer,
  renderLabScene: !photoMode,
  isReduced: () => photoMode || matchMedia('(prefers-reduced-motion: reduce)').matches,
  onPortfolio: () => location.assign('/normal-portfolio/'),
  onPlace: place => location.assign('./sections.html#' + place),
  onClose() {
    music.setActive(false);
    cancelAnimationFrame(frame);
    location.assign('./');
  }
});
bindRoomMapNavigation(document, () => location.assign('./sections.html'));
lab.open({exhibitionFirst: true});
music.setActive(true);

function draw(time) {
  if (!lab.isOpen || document.hidden) return;
  lab.update(previousTime === null ? 0 : (time - previousTime) / 1000);
  previousTime = time;
  frame = requestAnimationFrame(draw);
}
window.addEventListener('resize', () => lab.resize());
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame);
  previousTime = null;
  if (lab.isOpen && !document.hidden) frame = requestAnimationFrame(draw);
});
frame = requestAnimationFrame(draw);
