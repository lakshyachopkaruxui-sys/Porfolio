import {createAmbientMusic} from './ambient-music.js';
import {getMusicTrack} from './music-catalog.js';

/** A single optional music control follows the active dialog's focus boundary. */
export function mountPlayMusic({notify = () => {}} = {}) {
  const dock = document.createElement('div');
  dock.className = 'play-music-dock';
  dock.hidden = true;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.dataset.playMusic = '';
  toggle.textContent = 'Garden sound off';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.title = 'Optional background music by Kevin MacLeod';
  dock.append(toggle);
  document.body.append(dock);
  let active = false, disposed = false, lastError = null, current, musicElement = null, levelControl = null;
  const controller = createAmbientMusic({audioFactory() {
    musicElement = new Audio();
    musicElement.hidden = true;
    musicElement.dataset.gardenMusic = '';
    document.body.append(musicElement);
    return musicElement;
  }, onStatus(state) {
    current = state;
    syncLabels();
    if (state.error && state.error !== lastError) notify(state.error);
    lastError = state.error;
  }});

  function syncLabels() {
    if (!current) return;
    const retry = current.status === 'error' || current.status === 'blocked';
    const text = retry ? 'Retry garden sound' : current.enabled
      ? current.status === 'paused' ? 'Garden sound paused' : 'Garden sound on'
      : 'Garden sound off';
    for (const button of document.querySelectorAll('[data-play-music]')) {
      if (button.textContent !== text) button.textContent = text;
      const pressed = String(current.enabled);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      button.setAttribute('aria-label', retry ? 'Retry garden sound' : current.enabled ? 'Turn garden sound off' : 'Turn garden sound on');
      const title = `${getMusicTrack(current.trackId).title} — Kevin MacLeod`;
      if (button.title !== title) button.title = title;
    }
    for (const select of document.querySelectorAll('[data-play-music-track]')) {
      if (select.value !== current.trackId) select.value = current.trackId;
    }
    const percentage = String(Math.round(current.level * 100));
    for (const input of document.querySelectorAll('[data-play-music-level]')) {
      if (input.value !== percentage) input.value = percentage;
      input.setAttribute('aria-valuetext', `${percentage} percent`);
    }
    for (const output of document.querySelectorAll('[data-play-music-level-value]')) {
      const text = `${percentage}%`;
      if (output.textContent !== text) output.textContent = text;
    }
  }

  function ensureLevelControl() {
    const select = document.querySelector('#help [data-play-music-track]');
    if (!select || document.querySelector('#help [data-play-music-level]')) return;
    levelControl?.remove();
    levelControl = document.createElement('div'); levelControl.className = 'play-music-level';
    const label = document.createElement('label'); label.setAttribute('for', 'garden-music-level'); label.textContent = 'Music level';
    const output = document.createElement('output'); output.dataset.playMusicLevelValue = ''; output.setAttribute('for', 'garden-music-level'); output.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input'); input.type = 'range'; input.id = 'garden-music-level';
    input.min = '0'; input.max = '100'; input.step = '5'; input.dataset.playMusicLevel = '';
    input.setAttribute('aria-describedby', 'music-level-note');
    const note = document.createElement('p'); note.className = 'ride-sound-note'; note.id = 'music-level-note';
    note.textContent = 'Adjust music without changing Pokémon or bicycle sounds.';
    levelControl.append(label, output, input, note);
    (select.closest('label') || select).after(levelControl);
  }

  function synchronize() {
    if (disposed) return;
    ensureLevelControl();
    const dialogs = [...document.querySelectorAll('dialog[open]')];
    const dialog = dialogs.at(-1);
    const activeLayer = dialog?.querySelector('.cloud-photo-gallery:not([hidden]),#listening-photo-viewer:not([hidden]),#pokemon-viewer:not([hidden]),#pokemon-index:not([hidden]),#garba-viewer:not([hidden]),.personal-media:not([hidden]),.personal-reading:not([hidden]),.personal-places:not([hidden]),.works-reading:not([hidden]),.works-index:not([hidden]),.works-inspect:not([hidden]),.works-places:not([hidden]),.oak-places:not([hidden])');
    const childRoom = dialog?.querySelector('#listening-experience,#garba-experience');
    const boundary = activeLayer || childRoom || dialog || document.body;
    // Personal-room actions occupy the bottom edge. Keep optional music in
    // the existing header's flow instead of covering those actions with a dock.
    const headerNavigation = boundary.matches('.cloud-photo-gallery') ? boundary.querySelector('.cloud-gallery-tools') : boundary.id === 'personal-experience'
      ? boundary.querySelector('.personal-header nav')
      : boundary.matches('.works-reading,.works-index,.works-inspect,.works-places,.oak-places') || ['about','work'].includes(dialog?.dataset.kind) && boundary.matches('.personal-reading,.personal-media,.personal-places') || boundary.id === 'listening-photo-viewer' || boundary.id === 'garba-viewer' ? boundary.querySelector('header')
      : boundary.id === 'oak-lab' ? boundary.querySelector('.oak-tools')
      : boundary.id === 'help' || boundary.id === 'world-map' ? boundary.querySelector('.reader-top') : null;
    const parent = headerNavigation || boundary;
    // A modal dialog makes outside controls inert. Keep this control inside it.
    if (dock.parentElement !== parent) parent.append(dock);
    // A child viewer may have marked the dock as an inactive sibling before
    // this observer moved it into the active header. Its new owner is usable.
    if (dock.inert) dock.inert = false;
    const localControl = boundary.querySelector('[data-play-music]:not(.play-music-dock button)');
    const hidden = !active || Boolean(localControl && !localControl.closest('[hidden],[inert]'));
    if (dock.hidden !== hidden) dock.hidden = hidden;
    controller.setSuspended('not-playing', !active);
    controller.setSuspended('hidden-tab', document.hidden);
    controller.setSuspended('listening-room', Boolean(document.querySelector('dialog[open] #listening-experience')));
    controller.setSuspended('recording', [...document.querySelectorAll('video,audio:not([data-garden-music])')].some(media => !media.paused && !media.ended));
    controller.setSuspended('oak-narration', Boolean(document.querySelector('#oak-lab[open][data-narrating="true"]')));
    syncLabels();
  }

  function onClick(event) {
    const button = event.target.closest?.('[data-play-music]');
    if (!button) return;
    if (current?.status === 'error' || current?.status === 'blocked') controller.setEnabled(true);
    else controller.toggle();
  }
  function onTrackChange(event) {
    const select = event.target.closest?.('[data-play-music-track]');
    if (select) controller.setTrack(select.value);
  }
  function onLevelInput(event) {
    const input = event.target.closest?.('[data-play-music-level]');
    if (input) controller.setLevel(Number(input.value) / 100);
  }
  function pageHide(event) {
    controller.setSuspended('page-hidden', true);
    if (!event.persisted) dispose();
  }
  function pageShow() {
    controller.setSuspended('normal-portfolio', false);
    controller.setSuspended('page-hidden', false);
    synchronize();
  }
  // Riding updates HUD text and visibility on every frame. Those mutations do
  // not change audio ownership or the active modal, so do not rescan the whole
  // document for them. Media events and visibilitychange remain synchronous.
  const relevantNodes = 'dialog,.cloud-photo-gallery,#pokemon-viewer,#pokemon-index,#listening-experience,#listening-photo-viewer,#garba-experience,#garba-viewer,.personal-media,.personal-reading,.personal-places,.works-reading,.works-index,.works-inspect,.works-places,.oak-places,[data-play-music],[data-play-music-track],[data-play-music-level],video,audio:not([data-garden-music])';
  function hasRelevantNode(node) {
    if (!node?.matches || node.closest('.play-music-dock')) return false;
    if (node.matches(relevantNodes)) return true;
    return [...node.querySelectorAll(relevantNodes)].some(candidate => !candidate.closest('.play-music-dock'));
  }
  function needsSynchronization(record) {
    if (record.type === 'attributes') {
      if (record.attributeName === 'open') return record.target.matches?.('dialog');
      return hasRelevantNode(record.target);
    }
    return [...record.addedNodes, ...record.removedNodes].some(hasRelevantNode);
  }
  const observer = new MutationObserver(records => {
    if (records.some(needsSynchronization)) synchronize();
  });
  observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['open','hidden','inert','data-narrating']});
  document.addEventListener('click', onClick);
  document.addEventListener('change', onTrackChange);
  document.addEventListener('input', onLevelInput);
  document.addEventListener('change', onLevelInput);
  document.addEventListener('visibilitychange', synchronize);
  for (const name of ['play','pause','ended','emptied']) document.addEventListener(name, synchronize, true);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  synchronize();

  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    document.removeEventListener('click', onClick);
    document.removeEventListener('change', onTrackChange);
    document.removeEventListener('input', onLevelInput);
    document.removeEventListener('change', onLevelInput);
    document.removeEventListener('visibilitychange', synchronize);
    for (const name of ['play','pause','ended','emptied']) document.removeEventListener(name, synchronize, true);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    controller.dispose();
    musicElement?.remove();
    dock.remove();
    levelControl?.remove();
  }
  return {
    setActive(value) { if (active === Boolean(value)) return; active = Boolean(value); synchronize(); },
    suspend(reason, value) { controller.setSuspended(reason, value); },
    diagnostics: controller.diagnostics,
    dispose
  };
}
