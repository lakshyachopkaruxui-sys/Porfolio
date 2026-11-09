/**
 * Present individual Pixel Mania artifacts inside the portfolio's reading flow.
 *
 * Blocks provide a kind, optional title/caption and an items array. An item can
 * provide label, caption/description, src, width, height, alt, colour/color,
 * value, role, sample, font and surface. Nested items form a named group.
 * The unit, grid and spacing item kinds draw labelled diagrams from explicit
 * data. A grid requires rows and columns; spacing uses the supplied pixel size.
 * Other artwork comes from supplied files.
 */
export function mountPixelManiaSpecimen({parent, block} = {}) {
  const document = parent?.ownerDocument || globalThis.document;
  if (!parent || !block || !document?.createElement) return () => {};

  const kinds = new Set(['origin', 'rules', 'palette', 'type', 'components', 'motion', 'flow', 'pedia']);
  if (!kinds.has(block.kind)) return () => {};
  const ordered = ['origin', 'rules', 'flow'].includes(block.kind);
  const cleanups = [];
  let disposed = false;

  function element(tag, className, container, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    container?.append(node);
    return node;
  }

  function colour(value) {
    return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
      ? value : null;
  }

  function dimension(value, maximum = 20000) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && number <= maximum ? Math.round(number) : null;
  }

  function localAsset(value) {
    if (typeof value !== 'string' || !value || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('/')) return null;
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { return null; }
    if (/[\\\u0000-\u001f?#%]/.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..')) return null;
    try {
      const url = new URL(value, import.meta.url);
      const directory = new URL('./assets/cases/pixel-mania/', import.meta.url);
      return url.origin === directory.origin && url.protocol === directory.protocol && url.pathname.startsWith(directory.pathname)
        ? url : null;
    } catch { return null; }
  }

  const root = element('div', `pixel-specimen pixel-specimen-${block.kind}`, parent);
  root.dataset.pixelSpecimen = block.kind;
  if (block.variant === 'state-trace') root.dataset.pixelVariant = 'state-trace';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', block.label || block.title || `Pixel Mania ${block.kind}`);
  if (block.title) element('h4', 'pixel-specimen-title', root, block.title);
  if (block.description) element('p', 'pixel-specimen-description', root, block.description);
  const list = element(ordered ? 'ol' : 'ul', 'pixel-specimen-grid', root);

  function media(container, item) {
    const source = localAsset(item.src);
    if (!source) {
      element('p', 'pixel-specimen-unavailable', container, item.alt || 'This project artifact is unavailable.');
      return;
    }
    let target = container;
    if (item.enlarge === true) {
      container.classList.add('story-figure');
      target = element('a', 'pixel-specimen-image-link', container);
      target.href = source.href;
      target.target = '_blank';
      target.rel = 'noopener';
      target.setAttribute('aria-label', `Open full-size image: ${item.alt || item.label || item.title || 'Pixel Mania artifact'}`);
    }
    const stage = element('div', 'pixel-specimen-media', target);
    if (['blue', 'ink', 'teal'].includes(item.surface)) stage.dataset.surface = item.surface;
    else if (colour(item.surface)) stage.style.backgroundColor = item.surface;
    const image = element('img', 'pixel-specimen-image', stage);
    image.src = source.href;
    image.alt = item.alt || item.label || item.title || 'Original Pixel Mania artifact';
    const width = dimension(item.width), height = dimension(item.height);
    if (width) image.width = width;
    if (height) image.height = height;
    image.loading = 'lazy';
    image.decoding = 'async';
    const unavailable = () => {
      if (disposed) return;
      image.hidden = true;
      element('p', 'pixel-specimen-unavailable', stage, 'This project artifact could not load.');
    };
    image.addEventListener('error', unavailable, {once: true});
    cleanups.push(() => image.removeEventListener('error', unavailable, {once: true}));
  }

  function diagram(container, item) {
    if (item.kind === 'space' && block.kind === 'rules') {
      const size = Number(item.size);
      if (!Number.isFinite(size) || size <= 0 || size > 200) return false;
      const track = element('span', 'pixel-specimen-space-track', container);
      track.setAttribute('aria-hidden', 'true');
      const bar = element('span', 'pixel-specimen-space-bar', track);
      bar.style.width = `${size / 200 * 100}%`;
      return true;
    }
    if (item.kind === 'unit') {
      const unit = element('span', 'pixel-specimen-unit', container);
      unit.setAttribute('aria-hidden', 'true');
      if (colour(item.color || item.colour)) unit.style.backgroundColor = item.color || item.colour;
      return true;
    }
    if (item.kind !== 'grid') return false;
    const columns = dimension(item.columns, 32), rows = dimension(item.rows, 24);
    if (!columns || !rows) return false;
    const grid = element('span', 'pixel-specimen-board', container);
    grid.setAttribute('aria-hidden', 'true');
    grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    grid.style.aspectRatio = `${columns} / ${rows}`;
    const cells = Array.isArray(item.cells) ? item.cells : [];
    for (let index = 0; index < columns * rows; index++) {
      const cell = element('span', 'pixel-specimen-board-cell', grid);
      const fill = colour(cells[index]);
      if (fill) cell.style.backgroundColor = fill;
    }
    return true;
  }

  function itemFigure(item, container) {
    const figure = element('figure', 'pixel-specimen-item', container);
    if (item.kind) figure.dataset.itemKind = item.kind;
    if (item.family) figure.dataset.assetFamily = item.family;
    const fill = colour(item.color || item.colour);
    if (item.src) media(figure, item);
    else if (['unit', 'grid', 'space'].includes(item.kind) && diagram(figure, item)) {
      // Geometry belongs to a labelled diagram, not a recreated source export.
    } else if (fill && ['palette', 'rules'].includes(block.kind)) {
      const swatch = element('span', 'pixel-specimen-swatch', figure);
      swatch.style.backgroundColor = fill;
      swatch.setAttribute('aria-hidden', 'true');
    } else if (item.sample !== undefined) {
      const sample = element('p', 'pixel-specimen-type-sample', figure, item.sample);
      if (item.font) sample.style.fontFamily = String(item.font);
    }
    const caption = element('figcaption', 'pixel-specimen-item-caption', figure);
    if (item.label || item.title) element('strong', 'pixel-specimen-label', caption, item.label || item.title);
    if (item.value !== undefined || (fill && ['palette', 'rules'].includes(block.kind))) {
      element('code', 'pixel-specimen-value', caption, item.value ?? fill);
    }
    if (item.role) element('span', 'pixel-specimen-role', caption, item.role);
    if (item.caption || item.description) element('span', 'pixel-specimen-detail', caption, item.caption || item.description);
    return figure;
  }

  function entries(items, container, nested = false) {
    (Array.isArray(items) ? items : []).forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const row = element('li', item.items?.length ? 'pixel-specimen-group' : 'pixel-specimen-cell', container);
      if (Array.isArray(item.items) && item.items.length) {
        if (item.label || item.title) element(block.title ? 'h5' : 'h4', 'pixel-specimen-group-title', row, item.label || item.title);
        if (item.caption || item.description) element('p', 'pixel-specimen-group-note', row, item.caption || item.description);
        const children = element('ul', 'pixel-specimen-group-items', row);
        children.dataset.itemCount = String(item.items.length);
        entries(item.items, children, true);
      } else {
        if (ordered && !nested) element('span', 'pixel-specimen-index', row, String(index + 1).padStart(2, '0'));
        itemFigure(item, row);
      }
    });
  }

  entries(block.items, list);
  if (block.caption) element('p', 'pixel-specimen-caption', root, block.caption);

  return () => {
    if (disposed) return;
    disposed = true;
    cleanups.forEach(cleanup => cleanup());
    root.remove();
  };
}
