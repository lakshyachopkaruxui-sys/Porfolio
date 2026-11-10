// Case-specific hero artwork; generated presentation imagery is labelled explicitly.
import {GIGGLES_PRESENTATION_MOCKUP} from './giggles-presentation.js?v=20261108-care-mockups';

function element(tag, className, parent) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  parent?.append(item);
  return item;
}

function sourceImage(parent, {src, alt, width, height}, className = '', {decorative = false} = {}) {
  const image = element('img', className, parent);
  image.src = src;
  image.alt = decorative ? '' : alt;
  image.width = width;
  image.height = height;
  image.loading = 'eager';
  image.decoding = 'async';
  if (decorative) image.setAttribute('aria-hidden', 'true');
  image.addEventListener('error', () => {
    if (decorative) {
      (parent.closest('.case-hero-game-device') || parent).hidden = true;
      return;
    }
    const notice = element('p', 'case-hero-unavailable');
    notice.textContent = 'This project image is unavailable.';
    image.replaceWith(notice);
  }, {once: true});
  return image;
}

function local(path) {
  return new URL(path, import.meta.url).href;
}

/** Populate a figure with source-based visual staging; the caller owns captions. */
export function mountCaseHeroArt(figure, {project, artifact, artifactUrl}) {
  if (!figure || !project || !artifact) return;
  figure.classList.add('case-hero-visual');
  figure.dataset.heroProject = project.id;
  const stage = element('div', 'case-hero-stage');
  figure.replaceChildren(stage);

  if (artifact.src?.includes('/approved-20261110/')) {
    figure.dataset.presentation = 'generated';
    const ratio = artifact.width / artifact.height;
    stage.style.aspectRatio = `${artifact.width} / ${artifact.height}`;
    stage.style.maxWidth = `min(100%, calc(var(--case-media-height) * ${ratio}))`;
    const link = element('a', 'case-hero-mockup-link', stage);
    link.dataset.caseImage = '';
    link.href = artifactUrl.replace(/\.webp$/, '.png');
    link.target = '_blank'; link.rel = 'noopener';
    link.setAttribute('aria-label', `Open full-size ${project.title} cover illustration`);
    sourceImage(link, {...artifact, src: artifactUrl}, 'case-hero-source');
    return {caption: artifact.caption};
  }

  if (project.id === 'connectaid') {
    figure.dataset.presentation = 'generated';
    const link = element('a', 'case-hero-mockup-link', stage);
    link.dataset.caseImage = '';
    link.href = artifactUrl.replace(/\.webp$/, '.png');
    link.target = '_blank'; link.rel = 'noopener';
    link.setAttribute('aria-label', 'Open full-size ConnectAid presentation mockup');
    sourceImage(link, {...artifact, src: artifactUrl}, 'case-hero-source');
    return {caption: artifact.caption};
  }

  if (project.id === 'giggles') {
    const mockup = GIGGLES_PRESENTATION_MOCKUP;
    figure.dataset.presentation = 'generated';
    const link = element('a', 'case-hero-mockup-link', stage);
    link.dataset.caseImage = '';
    link.href = local(mockup.src); link.target = '_blank'; link.rel = 'noopener';
    link.setAttribute('aria-label', 'Open full-size Giggles presentation mockup');
    sourceImage(link, {...mockup, src: local(mockup.previewSrc)}, 'case-hero-source');
    return {caption: mockup.caption};
  }

  sourceImage(stage, {
    src: artifactUrl,
    alt: artifact.alt,
    width: artifact.width,
    height: artifact.height,
  }, 'case-hero-source');
}
