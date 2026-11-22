import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Source order is the approved 31-link Normal cascade, not alphabetical order.
// Keep authoring stylesheets: repeat builds must read current source bytes.
export const PORTFOLIO_CSS_SOURCES = Object.freeze([
  'styles.css', 'personal-sections.css', 'sections.css', 'toolkit.css',
  'resume-ui.css', 'photo-carousel.css', 'portfolio-extras.css', 'case-reader.css',
  'refinements.css', 'editorial.css', 'editorial-toolkit.css', 'editorial-case.css',
  'portfolio-motion.css', 'toolkit-motion.css', 'case-motion.css', 'welcome-intro.css',
  'identity.css', 'typography.css', 'footer-ui.css', 'assistant-ui.css',
  'project-cover-ui.css', 'cover-artwork.css', 'case-presentation.css',
  'pixel-mania-presentation.css', 'case-hero-art.css', 'case-image-viewer.css',
  'mode-selector.css', 'normal-actions.css', 'normal-reading.css',
  'approved-opening.css', 'resources-section.css', 'dhan-drishti.css', 'homepage-release.css',
]);

const ORIGIN = 'https://portfolio.invalid';
const PLAY_CSS_SOURCES = Object.freeze([
  'src/style.css', 'src/destinations.css', 'src/foundation.css',
  'src/exploration.css', 'src/hobby-interactions.css', 'src/riding.css',
  'src/diegetic.css', 'src/hybrid-ui.css', 'src/welcome-fonts.css',
  'src/welcome.css', 'src/clouds.css', 'src/mobile-entry.css',
  'src/play-typography.css', 'src/garden-polish.css', 'src/collection-experience.css',
  'src/works-experience.css', 'src/personal-rooms.css', 'src/cloud-photo-gallery.css',
  'src/listening-room.css', 'src/garba-room.css', 'src/pokemon-room.css',
  'src/oak-lab.css', 'src/about-experience.css', 'src/about-journal-reader.css',
  'src/play-music.css', 'src/identity.css', 'src/play-controls.css',
  'src/map-guide.css', 'src/riding-options.css', 'src/mode-selector.css',
  'src/play-navigation-trial.css', 'src/play-overlay-motion.css', 'src/river-hop.css',
  'src/play-interface-controls.css', 'src/visitor-board.css', 'src/award-play-craft.css',
  'src/woody-tour.css',
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3]]));

function quotedEnd(css, start) {
  const quote = css[start];
  for (let i = start + 1; i < css.length; i++) {
    if (css[i] === '\\') { i++; continue; }
    if (css[i] === quote) return i + 1;
  }
  throw new Error('Unterminated CSS string.');
}

function urlEnd(css, start) {
  for (let i = start; i < css.length; i++) {
    if (css[i] === '"' || css[i] === "'") { i = quotedEnd(css, i) - 1; continue; }
    if (css[i] === '\\') { i++; continue; }
    if (css[i] === ')') return i;
  }
  throw new Error('Unterminated CSS url().');
}

function valueOf(raw) {
  const value = raw.trim();
  if (!value) return '';
  if (value[0] === '"' || value[0] === "'") {
    if (quotedEnd(value, 0) !== value.length) throw new Error('Unsupported CSS URL expression.');
    return value.slice(1, -1);
  }
  return value;
}

function rebaseURL(raw, sourceRoute, bundleRoute) {
  const value = valueOf(raw);
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(value)) return raw;
  // A general CSS escape decoder is intentionally outside this small bundler.
  // Fail rather than silently changing the destination of an escaped URL.
  if (value.includes('\\')) throw new Error(`Unsupported escaped CSS URL in ${sourceRoute}`);
  const resolved = new URL(value, ORIGIN + sourceRoute);
  const relative = path.posix.relative(path.posix.dirname(bundleRoute), resolved.pathname);
  const url = relative + resolved.search + resolved.hash;
  return JSON.stringify(url.startsWith('.') ? url : './' + url);
}

/** Build the existing Normal cascade without modifying index.html.
 * Returns replacement HTML and an evidence manifest; caller owns integration.
 * Local imports are inlined in-place and their asset URLs rebased to the bundle.
 * Conditional imports are rejected rather than changing layer/media semantics.
 */
export async function bundlePortfolioCSS({siteRoot, html, write = true} = {}) {
  return bundleStylesheets({siteRoot, html, write, directory: 'normal-portfolio', name: 'portfolio-bundle.css', sourceFiles: PORTFOLIO_CSS_SOURCES});
}

export function bundlePlayCSS({siteRoot, html, write = true}) {
  return bundleStylesheets({siteRoot, html, write, directory: 'bicycle-world/dist', name: 'play-bundle.css', sourceFiles: PLAY_CSS_SOURCES});
}

async function bundleStylesheets({siteRoot, html, write, directory, name, sourceFiles}) {
  const indexRoute = '/' + directory + '/index.html';
  const bundleRoute = '/' + directory + '/' + name;
  if (!siteRoot) throw new Error('siteRoot is required.');
  const root = path.resolve(siteRoot);
  const publicRoot = path.join(root, 'public');
  const indexFile = path.join(publicRoot, directory, 'index.html');
  html ??= await fs.readFile(indexFile, 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => ({match, attrs: attributes(match[0])}))
    .filter(({attrs}) => attrs.rel?.toLowerCase().split(/\s+/).includes('stylesheet'));
  const routes = links.map(({attrs}) => new URL(attrs.href || '', ORIGIN + indexRoute));
  const alreadyBundled = routes.length === 1 && routes[0].origin === ORIGIN && routes[0].pathname === bundleRoute;
  const expected = sourceFiles.map(file => '/' + directory + '/' + file);
  if (!alreadyBundled && (routes.length !== expected.length || routes.some((url, i) => url.origin !== ORIGIN || url.pathname !== expected[i]))) {
    throw new Error('Stylesheet links differ from the approved source order; update the explicit source manifest deliberately.');
  }
  for (const {attrs} of links) {
    if (Object.keys(attrs).some(key => !['rel', 'href'].includes(key))) {
      throw new Error('Stylesheet attributes require explicit handling before bundling.');
    }
  }
  if (!alreadyBundled && links.length > 1) {
    const betweenLinks = html.slice(links[0].match.index, links.at(-1).match.index);
    if (/<style\b/i.test(betweenLinks)) throw new Error('Interleaved inline styles require explicit cascade handling.');
  }
  for (const {match} of links) {
    const remainder = match[0].replace(/^<link\b/i, '').replace(/\/?\s*>$/, '')
      .replace(/[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*')/g, '').trim();
    if (remainder) throw new Error('Unquoted or boolean stylesheet attributes require explicit handling.');
  }
  const sources = [];
  const sourceBytes = new Map();

  async function compile(route, ancestry = []) {
    if (ancestry.includes(route)) throw new Error(`Cyclic CSS import: ${[...ancestry, route].join(' -> ')}`);
    const file = path.resolve(publicRoot, '.' + route);
    const relative = path.relative(publicRoot, file);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('CSS source escapes public root.');
    const actual = await fs.realpath(file);
    if (path.relative(await fs.realpath(publicRoot), actual).startsWith('..')) throw new Error('CSS source resolves outside public root.');
    const bytes = await fs.readFile(actual);
    const css = bytes.toString('utf8').replace(/^\uFEFF/, '');
    if (!sourceBytes.has(route)) {
      sourceBytes.set(route, bytes);
      sources.push({path: route.slice(1), bytes: bytes.length, sha256: hash(bytes), imported: ancestry.length > 0});
    }
    let output = '', prefixOnly = true;
    for (let i = 0; i < css.length;) {
      if (css.startsWith('/*', i)) {
        const end = css.indexOf('*/', i + 2);
        if (end < 0) throw new Error(`Unterminated CSS comment in ${route}`);
        output += css.slice(i, end + 2); i = end + 2; continue;
      }
      if (css[i] === '"' || css[i] === "'") {
        const end = quotedEnd(css, i); output += css.slice(i, end); i = end; prefixOnly = false; continue;
      }
      if (/^@charset\b/i.test(css.slice(i))) {
        const declaration = /^@charset\s+["']utf-8["']\s*;/i.exec(css.slice(i));
        if (!prefixOnly || !declaration) throw new Error(`Unsupported CSS charset in ${route}`);
        i += declaration[0].length; continue;
      }
      if (/^@import\b/i.test(css.slice(i))) {
        if (!prefixOnly) throw new Error(`CSS import appears after rules in ${route}`);
        let cursor = i + 7;
        while (/\s/.test(css[cursor] || '') && cursor < css.length) cursor++;
        let raw;
        if (/^url\s*\(/i.test(css.slice(cursor))) {
          const opening = css.indexOf('(', cursor), end = urlEnd(css, opening + 1);
          raw = css.slice(opening + 1, end); cursor = end + 1;
        } else if (css[cursor] === '"' || css[cursor] === "'") {
          const end = quotedEnd(css, cursor); raw = css.slice(cursor, end); cursor = end;
        } else throw new Error(`Unsupported CSS import in ${route}`);
        while (/\s/.test(css[cursor] || '') && cursor < css.length) cursor++;
        if (css[cursor] !== ';') throw new Error(`Conditional CSS imports require explicit handling in ${route}`);
        const value = valueOf(raw);
        if (value.includes('\\')) throw new Error(`Unsupported escaped CSS import in ${route}`);
        const imported = new URL(value, ORIGIN + route);
        if (imported.origin !== ORIGIN || imported.search || imported.hash || !imported.pathname.endsWith('.css')) throw new Error(`Only plain local CSS imports are supported in ${route}`);
        output += await compile(imported.pathname, [...ancestry, route]);
        i = cursor + 1; continue;
      }
      if (/^@namespace\b/i.test(css.slice(i))) throw new Error(`CSS namespaces need explicit bundling support in ${route}`);
      if (/^url\s*\(/i.test(css.slice(i)) && (i === 0 || !/[\w-]/.test(css[i - 1]))) {
        const opening = css.indexOf('(', i), end = urlEnd(css, opening + 1);
        output += css.slice(i, opening + 1) + rebaseURL(css.slice(opening + 1, end), route, bundleRoute) + ')';
        i = end + 1; prefixOnly = false; continue;
      }
      output += css[i];
      if (!/\s/.test(css[i])) prefixOnly = false;
      i++;
    }
    return `/* Source: ${route.slice(1)} */\n${output.trimEnd()}\n`;
  }

  const chunks = [];
  for (const route of expected) chunks.push(await compile(route));
  const mode = directory === 'normal-portfolio' ? 'Normal' : 'Play';
  const css = `/* Generated from the approved ${mode} stylesheet order. Edit source files, then rebuild. */\n` + chunks.join('\n');
  const sha256 = hash(css);
  const href = './' + name + '?v=' + sha256.slice(0, 16);
  const replacement = `<link rel="stylesheet" href="${href}">`;
  let updatedHTML = html;
  // Replace in reverse so original match offsets remain valid. Scripts and all
  // other markup retain their relative position; only CSS requests are removed.
  for (let i = links.length - 1; i >= 0; i--) {
    const match = links[i].match;
    updatedHTML = updatedHTML.slice(0, match.index) + (i === 0 ? replacement : '') + updatedHTML.slice(match.index + match[0].length);
  }
  const relativePath = bundleRoute.slice(1);
  if (write) await fs.writeFile(path.join(publicRoot, relativePath), css);
  return {
    html: updatedHTML,
    css,
    bundle: {path: relativePath, href, bytes: Buffer.byteLength(css), sha256},
    sourceLinks: [...sourceFiles],
    sources,
    directStylesheetRequests: {before: sourceFiles.length, after: 1},
  };
}
