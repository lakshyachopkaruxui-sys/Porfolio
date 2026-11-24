import {consumeNavigationKey, isKeyboardShortcutBlocked} from './keyboard-navigation.js';

export const roomMapButton = '<button type="button" data-room-map aria-keyshortcuts="M">Garden map <kbd>M</kbd></button>';

const rooms = '#oak-lab,#personal-experience,#works-experience,#about-experience,#project-reader,#place-reader,#reader';

export function bindRoomMapNavigation(doc, openMap) {
  function inRoom(target) {
    const dialog = target?.closest?.('dialog[open]');
    return dialog?.matches(rooms) && !target.closest('[hidden],[inert]');
  }

  doc.addEventListener('click', event => {
    const button = event.target.closest?.('[data-room-map]');
    if (button && inRoom(button)) openMap();
  });
  doc.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'm' || event.repeat || isKeyboardShortcutBlocked(event)) return;
    if (!inRoom(event.target)) return;
    consumeNavigationKey(event);
    openMap();
  }, {capture: true});
}
