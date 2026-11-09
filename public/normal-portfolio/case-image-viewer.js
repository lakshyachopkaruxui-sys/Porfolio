let viewerSequence = 0;

/** Enlarge existing case figures without taking visitors out of the reading flow. */
export function mountCaseImageViewer({root, reader} = {}) {
  if (!root || !reader) return () => {};
  const document = root.ownerDocument || globalThis.document;
  const view = document?.defaultView || globalThis.window;
  let viewer;
  let stage;
  let image;
  let caption;
  let modeButton;
  let status;
  let errorNotice;
  let originalLink;
  let returnLink;
  let returnScroll = 0;
  let sourceSize = {};
  let actualSize = false;
  let disposed = false;
  let opened = false;
  const cleanups = [];

  function create(tag, className, parent, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    parent?.append(item);
    return item;
  }

  function listen(target, name, handler) {
    target.addEventListener(name, handler);
    cleanups.push(() => target.removeEventListener(name, handler));
  }

  function setMode(actual) {
    actualSize = actual;
    stage.dataset.view = actual ? 'actual' : 'fit';
    modeButton.textContent = actual ? 'Fit image' : 'Actual size';
    modeButton.setAttribute('aria-label', actual ? 'Fit image to the window' : 'Actual size: show image at original size');
    if (actual) {
      const width = image.naturalWidth || sourceSize.width;
      image.style.width = width > 0 ? `${width}px` : 'auto';
    } else image.style.removeProperty('width');
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
    status.textContent = actual ? 'Original size. Scroll to inspect the image.' : 'Image fitted to the window.';
  }

  function finishClose({restoreFocus = true} = {}) {
    if (!opened) return;
    opened = false;
    if (viewer.open) viewer.close();
    image.removeAttribute('src');
    if (reader.open) {
      reader.scrollTop = returnScroll;
      if (restoreFocus) {
        const target = returnLink?.isConnected ? returnLink : root.querySelector('#case-title') || reader;
        target.focus({preventScroll: true});
      }
    }
    returnLink = null;
  }

  function ensureViewer() {
    if (viewer) return true;
    viewer = create('dialog', 'case-image-viewer');
    if (typeof viewer.showModal !== 'function') { viewer.remove(); viewer = null; return false; }
    const titleId = `case-image-viewer-title-${++viewerSequence}`;
    viewer.setAttribute('aria-labelledby', titleId);
    const header = create('header', 'case-image-viewer-header', viewer);
    const title = create('h2', 'case-image-viewer-title', header, 'Project image');
    title.id = titleId;
    const actions = create('div', 'case-image-viewer-actions', header);
    modeButton = create('button', 'case-image-viewer-mode', actions, 'Actual size');
    modeButton.type = 'button';
    const closeButton = create('button', 'case-image-viewer-close', actions, 'Close');
    closeButton.type = 'button';
    closeButton.setAttribute('autofocus', '');
    stage = create('div', 'case-image-viewer-stage', viewer);
    stage.tabIndex = 0;
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', 'Enlarged project image');
    image = create('img', 'case-image-viewer-image', stage);
    image.decoding = 'async';
    errorNotice = create('p', 'case-image-viewer-error', stage, 'This image could not load. ');
    errorNotice.hidden = true;
    originalLink = create('a', undefined, errorNotice, 'Open original image');
    originalLink.target = '_blank';
    originalLink.rel = 'noopener';
    caption = create('p', 'case-image-viewer-caption', viewer);
    status = create('span', 'case-image-viewer-status', viewer);
    status.setAttribute('role', 'status');
    listen(modeButton, 'click', () => setMode(!actualSize));
    listen(closeButton, 'click', () => finishClose());
    listen(viewer, 'cancel', event => {
      event.preventDefault();
      event.stopPropagation();
      finishClose();
    });
    listen(viewer, 'close', () => finishClose());
    listen(image, 'load', () => { if (opened && actualSize) setMode(true); });
    listen(image, 'error', () => {
      if (opened) {
        image.hidden = true;
        errorNotice.hidden = false;
        modeButton.disabled = true;
        status.textContent = 'This image could not load. An original image link is available.';
      }
    });
    reader.append(viewer);
    return true;
  }

  function activate(event) {
    if (disposed || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('.story-figure a, .case-hero-visual a[data-case-image]');
    if (!link || !root.contains(link)) return;
    const original = link.querySelector('img');
    if (!original) return;
    let source;
    try {
      source = new URL(link.href, view?.location?.href);
      if (!['http:', 'https:'].includes(source.protocol) || source.origin !== view.location.origin) return;
    } catch { return; }
    if (!ensureViewer()) return;
    returnLink = link;
    returnScroll = reader.scrollTop;
    sourceSize = {width: original.width, height: original.height};
    image.alt = original.alt;
    image.width = original.width;
    image.height = original.height;
    image.hidden = false;
    errorNotice.hidden = true;
    modeButton.disabled = false;
    originalLink.href = source.href;
    image.src = source.href;
    const sourceCaption = link.closest('figure')?.querySelector('figcaption');
    // Specimen labels and descriptions occupy separate visual rows. Preserve
    // their word boundary when the viewer presents them as one line of text.
    const captionText = sourceCaption?.matches?.('.pixel-specimen-item-caption')
      ? Array.from(sourceCaption.children).map(part => part.textContent?.trim()).filter(Boolean).join(' ')
      : sourceCaption?.textContent?.trim();
    caption.textContent = captionText || original.alt;
    setMode(false);
    try { viewer.showModal(); }
    catch { image.removeAttribute('src'); returnLink = null; return; }
    opened = true;
    event.preventDefault();
  }

  root.addEventListener('click', activate);
  return () => {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', activate);
    finishClose({restoreFocus: false});
    cleanups.forEach(cleanup => cleanup());
    viewer?.remove();
    viewer = null;
  };
}
