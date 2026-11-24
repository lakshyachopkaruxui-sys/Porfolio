import {mountPlayMusic} from '/bicycle-world/dist/src/play-music-ui.js';
import {WebGLRenderer} from 'three';
import {createPokemonRoom} from './src/pokemon-room.js';
import {POKEMON_COLLECTION} from './src/pokemon-collection-data.js';
import {isKeyboardShortcutBlocked} from './src/keyboard-navigation.js';
import {createPhotoRenderer} from './photo-renderer.js';

const music = mountPlayMusic();
const lobby = document.querySelector('#lobby');
const enter = document.querySelector('#enter');
let renderer, room, photoMode = false, previousTime = null, frame;
try {
  renderer = new WebGLRenderer({antialias: true, powerPreference: 'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
} catch {
  photoMode = true;
  renderer = createPhotoRenderer(() => POKEMON_COLLECTION[room.diagnostics().activeIndex]);
}
document.querySelector('#parking').append(renderer.domElement);
room = createPokemonRoom({
  renderer,
  container: document.querySelector('#exhibition'),
  isReduced: () => photoMode || matchMedia('(prefers-reduced-motion: reduce)').matches,
  returnLabel: 'Exit exhibition',
  onPortfolio: () => location.assign('/normal-portfolio/'),
  onClose() {
    music.setActive(false);
    cancelAnimationFrame(frame);
    previousTime = null;
    lobby.hidden = false;
    enter.focus();
  }
});
function draw(time) {
  if (!room.isOpen || document.hidden) return;
  room.update(previousTime === null ? 0 : (time - previousTime) / 1000);
  previousTime = time;
  frame = requestAnimationFrame(draw);
}
function openExhibition() {
  if (room.isOpen) return;
  room.open({returnFocus: enter});
  lobby.hidden = true;
  music.setActive(true);
  if (photoMode) {
    // In photo mode the image has one action, opening the complete capture.
    const host = renderer.domElement;
    host.onpointerdown = e => e.stopImmediatePropagation();
    host.onpointerup = e => e.stopImmediatePropagation();
    host.onclick = () => document.querySelector('#pokemon-view-catch')?.click();
  }
  frame = requestAnimationFrame(draw);
}
window.addEventListener('resize', () => room.resize());
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame);
  previousTime = null;
  if (room.isOpen && !document.hidden) frame = requestAnimationFrame(draw);
});
function openGardenMap() { location.assign('/bicycle-world/dist/sections.html'); }
document.querySelector('#exhibition').addEventListener('click', event => {
  if (event.target.closest('[data-room-map]')) openGardenMap();
});
document.addEventListener('keydown', event => {
  if (room.isOpen && event.key.toLowerCase() === 'm' && !event.repeat && !isKeyboardShortcutBlocked(event)) {
    event.preventDefault();
    openGardenMap();
  }
});
enter.addEventListener('click', openExhibition);
openExhibition();
