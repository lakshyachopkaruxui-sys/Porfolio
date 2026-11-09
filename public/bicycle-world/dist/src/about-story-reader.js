// Semantic reading belongs beside the room, without another canvas or renderer.
function element(tag, text, parent, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function photograph(parent, photo, index, {lead = false} = {}) {
  const figure = element('figure', undefined, parent, 'about-story-photo');
  figure.dataset.orientation = photo.height > photo.width ? 'portrait' : 'landscape';
  const button = element('button', undefined, figure, 'about-photo-open');
  button.type = 'button';
  button.dataset.aboutPhoto = String(index);
  button.setAttribute('aria-label', `View photograph: ${photo.caption}`);
  const image = element('img', undefined, button);
  image.width = photo.width;
  image.height = photo.height;
  image.alt = photo.alt;
  image.decoding = 'async';
  image.loading = lead ? 'eager' : 'lazy';
  image.src = new URL('../' + photo.src.replace(/^\.\//, ''), import.meta.url).href;
  const caption = element('figcaption', photo.caption, figure);
  image.addEventListener('error', () => {
    image.hidden = true;
    button.disabled = true;
    caption.textContent = `${photo.caption}. Photograph unavailable; the story is still here.`;
  }, {once: true});
  return figure;
}

export function renderAboutStory(article, content, selected) {
  const chapter = content.chapters[selected];
  const photos = content.media.filter(item => item.type === 'image');
  article.replaceChildren();
  article.className = 'about-story';
  article.dataset.chapter = chapter.id;
  const navigation = element('nav', undefined, article, 'about-story-navigation');
  navigation.setAttribute('aria-label', 'About stories');
  content.chapters.forEach((item, index) => {
    const button = element('button', item.label, navigation);
    button.type = 'button';
    button.dataset.aboutStory = String(index);
    button.setAttribute('aria-pressed', String(index === selected));
  });
  const hero = element('div', undefined, article, 'about-story-hero');
  const intro = element('div', undefined, hero, 'about-story-intro');
  element('p', content.eyebrow, intro, 'personal-eyebrow');
  const heading = element('h1', chapter.title, intro);
  heading.id = 'personal-story-title';
  element('p', chapter.reader.lead, intro, 'personal-deck');
  const leadIndex = photos.findIndex(photo => photo.id === chapter.reader.photoId);
  if (leadIndex >= 0) photograph(hero, photos[leadIndex], leadIndex, {lead: true});
  const details = element('div', undefined, article, 'about-story-details');
  for (const section of chapter.reader.sections) {
    const block = element('section', undefined, details);
    element('h2', section.title, block);
    element('p', section.body, block);
  }
  const supporting = chapter.photoIds.filter(id => id !== chapter.reader.photoId);
  if (supporting.length) {
    const gallery = element('div', undefined, article, 'about-story-moments');
    for (const id of supporting) {
      const index = photos.findIndex(photo => photo.id === id);
      if (index >= 0) photograph(gallery, photos[index], index);
    }
  }
  const next = element('footer', undefined, article, 'about-story-next');
  element('p', selected === 1 ? 'See those ideas in practice.' : selected === 2 ? 'There’s more of that side of me here.' : 'See how I approach a design problem.', next);
  const destinations = selected === 0 ? [['story:1', 'How I work']]
    : selected === 1 ? [['works', 'Explore my projects']]
    : [['work', 'Singing & Garba'], ['cloud', 'My cloud photographs'], ['oak', 'The story behind this garden']];
  for (const [destination, label] of destinations) {
    const button = element('button', label, next);
    button.type = 'button';
    button.dataset.aboutDestination = destination;
  }
}
