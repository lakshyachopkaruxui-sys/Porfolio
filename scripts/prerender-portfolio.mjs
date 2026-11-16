import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {projectEvidencePeek} from '../public/normal-portfolio/project-evidence-peek.js';

const START = '<!-- portfolio-projects:start -->';
const END = '<!-- portfolio-projects:end -->';
const managed = /<!-- portfolio-projects:start -->[\s\S]*?<!-- portfolio-projects:end -->/g;
const emptyGrid = /<div\b(?=[^>]*\bid\s*=\s*(["'])project-grid\1)[^>]*>\s*<\/div>/gi;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));

/** Read the same catalogue, editorial overrides, covers and order as the browser. */
export async function loadPortfolioCards(publicRoot) {
  if (!publicRoot) throw new Error('A public root is required to prerender portfolio projects.');
  const root = path.resolve(publicRoot);
  const normal = path.join(root, 'normal-portfolio');
  const [{PROJECTS}, additions, {CASE_CONTEXT, normalProject}, {projectContribution}, runtime, summaries] = await Promise.all([
    import(pathToFileURL(path.join(root, 'bicycle-world/src/project-data.js')).href),
    import(pathToFileURL(path.join(normal, 'normal-projects.js')).href),
    import(pathToFileURL(path.join(normal, 'case-context.js')).href),
    import(pathToFileURL(path.join(normal, 'project-card-copy.js')).href),
    fs.readFile(path.join(normal, 'portfolio.js'), 'utf8'),
    fs.readFile(path.join(root, 'bicycle-world/dist/projects.html'), 'utf8'),
  ]);
  // Parse only a literal list of project IDs; never evaluate source text.
  const literal = /const\s+PROJECT_ORDER\s*=\s*\[([^\]]*)\]/.exec(runtime)?.[1];
  if (!literal || !/^\s*'[a-z0-9-]+'(?:\s*,\s*'[a-z0-9-]+')*\s*,?\s*$/.test(literal)) {
    throw new Error('The portfolio project order must remain a literal list of IDs.');
  }
  const order = [...literal.matchAll(/'([a-z0-9-]+)'/g)].map(match => match[1]);
  const projects = [...PROJECTS, ...additions.NORMAL_PROJECTS];
  if (order.length !== 8 || new Set(order).size !== order.length || projects.length !== order.length
      || new Set(projects.map(project => project.id)).size !== projects.length
      || projects.some(project => !order.includes(project.id))) {
    throw new Error('Prerendering requires the eight unique projects used by the current Normal catalogue.');
  }
  const contexts = {...CASE_CONTEXT, ...additions.NORMAL_PROJECT_CONTEXT};
  return Promise.all(order.map(async id => {
    const project = normalProject(projects.find(item => item.id === id));
    const cover = additions.PROJECT_COVERS[id];
    if (!cover || !/^\.\/assets\/[a-zA-Z0-9/_.-]+$/.test(cover.src)) {
      throw new Error(`Missing or unsafe portfolio cover for ${id}.`);
    }
    const asset = path.resolve(normal, cover.src);
    if (!asset.startsWith(normal + path.sep)) throw new Error(`Portfolio cover leaves its asset root: ${id}.`);
    await fs.access(asset);
    if (!new RegExp(`\\bid=["']project-${id}["']`).test(summaries)) {
      throw new Error(`The static project summary has no anchor for ${id}.`);
    }
    return {
      id, title: project.title, summary: project.summary,
      type: contexts[id]?.type || project.subtitle || project.status,
      contribution: id === 'dhan-drishti' ? '' : projectContribution(id, contexts[id]?.role || project.role),
      cover: {...cover}, href: id === 'dhan-drishti' ? './dhan-drishti-reading.html' : `../bicycle-world/dist/projects.html#project-${id}`,
    };
  }));
}

function renderCards(cards) {
  if (!Array.isArray(cards) || cards.length !== 8 || new Set(cards.map(card => card.id)).size !== 8) {
    throw new Error('Exactly eight unique portfolio cards are required.');
  }
  return cards.map(card => {
    const {id, title, summary, type, contribution, cover, href} = card;
    if (!/^[a-z0-9-]+$/.test(id) || [title, summary, type, ...(id === 'dhan-drishti' ? [] : [contribution]), cover?.alt].some(value => typeof value !== 'string' || !value.trim())
        || !/^\.\/assets\/[a-zA-Z0-9/_.-]+$/.test(cover?.src)
        || !Number.isInteger(cover?.width) || cover.width <= 0 || !Number.isInteger(cover?.height) || cover.height <= 0
        || href !== (id === 'dhan-drishti' ? './dhan-drishti-reading.html' : `../bicycle-world/dist/projects.html#project-${id}`)) {
      throw new Error(`Incomplete or unsafe portfolio card: ${id}.`);
    }
    return `      <article class="project-card" data-project="${escapeHTML(id)}">
        <a class="project-link" href="${escapeHTML(href)}" aria-labelledby="title-${escapeHTML(id)}">
          <figure class="project-art art-${escapeHTML(id)} is-project-cover" style="aspect-ratio: ${cover.width} / ${cover.height}">
            <img src="${escapeHTML(cover.src)}" alt="${escapeHTML(cover.alt)}" width="${cover.width}" height="${cover.height}" loading="${['connectaid', 'giggles'].includes(id) ? 'eager' : 'lazy'}" decoding="async">
          </figure>
          <div class="project-copy">
            <p class="project-meta">${escapeHTML(type)}</p>
            <div class="project-heading"><h3 id="title-${escapeHTML(id)}">${escapeHTML(title)}</h3></div>
            <p class="project-summary">${escapeHTML(summary)}</p>
            ${contribution ? `<p class="project-contribution">${escapeHTML(contribution)}</p>` : ''}
            <span class="project-case-label">Read project summary</span>
          </div>
        </a>
        ${['connectaid','giggles'].includes(id) ? `<a class="project-evidence-link" href="#evidence-${id}">${id === 'giggles' ? 'Follow one complete turn' : 'See what testing changed'}</a>` : ''}
      </article>`.replace(/^[ \t]+$/gm, '');
  }).join('\n');
}

/** Replace an empty grid or our own previous output; preserve authored nonempty grids. */
export function renderPortfolioFallback(html, cards) {
  if (typeof html !== 'string') throw new TypeError('Portfolio HTML must be a string.');
  const ownBlocks = [...html.matchAll(managed)];
  if (ownBlocks.length > 1) throw new Error('Duplicate prerendered project blocks.');
  const emptyGrids = [...html.matchAll(emptyGrid)];
  if (!ownBlocks.length && !emptyGrids.length) return html;
  if (emptyGrids.length > 1 || (ownBlocks.length && emptyGrids.length)) {
    throw new Error('Duplicate project grids.');
  }
  const block = `${START}\n${renderCards(cards)}\n      ${END}`;
  const outside = html.replace(managed, '');
  for (const card of cards) {
    if (new RegExp(`\\bid=["']title-${card.id}["']`).test(outside)) {
      throw new Error(`Project heading ID already exists outside the generated grid: ${card.id}.`);
    }
  }
  if (ownBlocks.length) return html.replace(managed, () => block);
  return html.replace(emptyGrid, tag => tag.replace(/>\s*<\/div>$/i, `>\n      ${block}\n      </div>`));
}

/** Build integration: returns HTML only; the caller owns writing its page. */
export async function prerenderPortfolio({html, publicRoot} = {}) {
  let result = renderPortfolioFallback(html, await loadPortfolioCards(publicRoot));
  result = result.replace(/<!-- signature-evidence:start -->[\s\S]*?<!-- signature-evidence:end -->/, () => `<!-- signature-evidence:start -->\n${projectEvidencePeek('giggles')}\n${projectEvidencePeek('connectaid')}\n<!-- signature-evidence:end -->`);
  if (!/\bid=["']toolkit-board["']/.test(result)) return result;
  const normal = path.resolve(publicRoot, 'normal-portfolio');
  const [resume, {TOOLKIT_ITEMS}, {RESUME_TOOLKIT_ADDITIONS}] = await Promise.all([
    fs.readFile(path.join(normal, 'resume-content.json'), 'utf8').then(JSON.parse),
    import(pathToFileURL(path.join(normal, 'toolkit.js')).href),
    import(pathToFileURL(path.join(normal, 'toolkit-resume.js')).href),
  ]);
  return renderProgressiveSections(result, {resume, toolkitItems: TOOLKIT_ITEMS, toolkitAdditions: RESUME_TOOLKIT_ADDITIONS});
}

const TOOLKIT_START = '<!-- portfolio-toolkit:start -->';
const TOOLKIT_END = '<!-- portfolio-toolkit:end -->';
const BACKGROUND_START = '<!-- portfolio-background:start -->';
const BACKGROUND_END = '<!-- portfolio-background:end -->';
const toolkitBlock = /<!-- portfolio-toolkit:start -->[\s\S]*?<!-- portfolio-toolkit:end -->/g;
const backgroundBlock = /<!-- portfolio-background:start -->[\s\S]*?<!-- portfolio-background:end -->/g;

/** Native disclosures and résumé facts remain useful when enhancement fails. */
export function renderProgressiveSections(html, {resume, toolkitItems, toolkitAdditions = {}}) {
  if (typeof html !== 'string') throw new TypeError('Portfolio HTML must be a string.');
  if (!resume?.identity || !Array.isArray(toolkitItems) || !toolkitItems.length) throw new Error('Verified résumé and toolkit sources are required.');
  if ([...html.matchAll(toolkitBlock)].length > 1 || [...html.matchAll(backgroundBlock)].length > 1) throw new Error('Duplicate progressive section markers.');
  // Runtime reveals the theme control only after its click handler is bound.
  html = html.replace(/<button\b(?=[^>]*\bdata-header-theme-toggle\b)[^>]*>/gi, tag => /\shidden(?:\s|=|>)/i.test(tag) ? tag : tag.replace(/>$/, ' hidden>'));
  // Enhancement writes the actual active carousel instructions after mounting.
  html = html.replace(/(<p\b(?=[^>]*\bdata-photo-help\b)[^>]*>)[\s\S]*?(<\/p>)/gi, '$1Personal photographs. JavaScript enables automatic rotation and keyboard browsing.$2');
  const toolkit = `${TOOLKIT_START}\n<div class="toolkit-static">${toolkitItems.map(item => {
    if (!/^[a-z0-9-]+$/.test(item.id) || !item.name || !item.description) throw new Error('Incomplete toolkit source.');
    const additions = toolkitAdditions[item.id] || {};
    const methods = [...new Set([...(item.methods || []), ...(additions.methods || [])])];
    const tools = [...new Set([...(item.tools || []), ...(additions.tools || [])])];
    return `<details class="toolkit-static-area"><summary>${escapeHTML(item.name)}</summary><p>${escapeHTML(item.description)}</p>${additions.note ? `<p>${escapeHTML(additions.note)}</p>` : ''}<h3>Methods &amp; skills</h3><ul>${methods.map(text => `<li>${escapeHTML(text)}</li>`).join('')}</ul>${tools.length ? `<h3>Tools I use</h3><ul>${tools.map(text => `<li>${escapeHTML(text)}</li>`).join('')}</ul>` : ''}</details>`;
  }).join('\n')}</div>\n${TOOLKIT_END}`;
  if (toolkitBlock.test(html)) html = html.replace(toolkitBlock, () => toolkit);
  else html = html.replace(/(<div\b(?=[^>]*\bid=["']toolkit-board["'])[^>]*>)\s*(<\/div>)/, (_, open, close) => `${open}\n${toolkit}\n${close}`);

  const entry = (item, kind) => `<li class="resume-timeline-item"><h3 class="resume-entry-title">${escapeHTML(kind === 'work' ? item.organization : item.qualification)}</h3><p class="resume-entry-place">${escapeHTML(kind === 'work' ? item.title : item.institution)}</p><p class="resume-entry-date">${escapeHTML(String(item.date_text || '').replace(/ - /g, ' – '))}</p>${kind === 'work' ? (item.claims || []).map(claim => `<p class="resume-entry-description">${escapeHTML(claim)}</p>`).join('') : ''}</li>`;
  const column = (title, kind, items) => `<section class="resume-journey-column" aria-labelledby="resume-static-${kind}"><h2 class="resume-journey-heading" id="resume-static-${kind}">${title}</h2><ol class="resume-timeline">${items.map(item => entry(item, kind)).join('')}</ol></section>`;
  const background = `${BACKGROUND_START}\n<section id="background" class="resume-background wrap practice-section" data-resume-background-fallback aria-label="Experience, education and courses"><div class="resume-journey-columns">${column('Experience', 'work', resume.experience || [])}${column('Education', 'education', resume.education || [])}</div>${resume.certifications?.length ? `<section class="resume-courses" aria-labelledby="resume-static-courses"><h2 class="resume-courses-heading" id="resume-static-courses">Courses &amp; workshops</h2><ul class="resume-course-list">${resume.certifications.map(course => `<li><p class="resume-course-title">${escapeHTML(course.title)}</p><p class="resume-course-provider">${escapeHTML([course.provider, course.platform].filter(Boolean).join(' · '))}</p></li>`).join('')}</ul></section>` : ''}</section>\n${BACKGROUND_END}`;
  if (backgroundBlock.test(html)) html = html.replace(backgroundBlock, () => background);
  else if (!/\bid=["']background["']/.test(html)) html = html.replace(/<section\b(?=[^>]*\bid=["']resources["'])/, () => `${background}\n\n<section`);
  return html;
}
