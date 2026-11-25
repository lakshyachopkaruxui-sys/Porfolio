import {createAboutJournalReader} from '../src/about-journal-reader.js';
import {ABOUT_JOURNAL} from '../src/about-journal-content.js';
import {ABOUT_JOURNAL_PHOTOS} from '../src/about-journal-photo-data.js';
import {bindRoomMapNavigation} from '../src/room-map-navigation.js';

const gardenMap = '../sections.html';
bindRoomMapNavigation(document, () => location.assign(gardenMap));
document.querySelector('.about-shell').dataset.paper = new URLSearchParams(location.search).get('paper') === 'toys' ? 'toys' : 'plain';
const reader = createAboutJournalReader({
  host: document.querySelector('.about-shell'),
  content: ABOUT_JOURNAL,
  photos: ABOUT_JOURNAL_PHOTOS,
  onClose: () => location.assign('../#meet-lakshya'),
  onNavigate(destination) {
    if (destination.startsWith('project:')) {
      location.assign('../projects.html#project-' + destination.slice('project:'.length));
    } else {
      location.assign(gardenMap + (destination === 'garden' ? '' : '#' + destination));
    }
  }
});
reader.open();
