import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {versionPlayAssets} from './version-play-assets.mjs';

const block = /<!-- portfolio-publishing:start -->[\s\S]*?<!-- portfolio-publishing:end -->\s*/g;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const decodeHTML = value => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name) => {
  if (name[0] !== '#') return ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'})[name.toLowerCase()];
  const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2),16) : Number(name.slice(1));
  return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
});
const attribute = (tag, name) => new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,'i').exec(tag)?.[2];
const homepageTitle = 'Lakshya Chopkar | Product Designer';
const homepageDescription = 'Lakshya Chopkar, Product Designer focused on digital UX/UI. Explore user research, Figma design systems and prototypes. View case studies, resume and contact.';
const previewImage = '/normal-portfolio/assets/social/portfolio-preview-v1.png';
const previewAlt = 'Lakshya Chopkar, Product Designer focused on digital UX/UI, beside original ConnectAid healthcare-app interface designs.';
const indexCandidates = new Set(['index.html','normal-portfolio/index.html','normal-portfolio/map.html','bicycle-world/dist/index.html','bicycle-world/dist/projects.html','bicycle-world/dist/story.html']);

export function resolveConfiguration(config, env = {}) {
  const projectName = config.projectName;
  if (typeof projectName !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/.test(projectName)) throw Error('Choose a valid, stable Cloudflare Pages projectName.');
  let url;
  try { url = new URL(env.PUBLIC_ORIGIN || config.publicOrigin); } catch { throw Error('PUBLIC_ORIGIN must be the final HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.port) throw Error('PUBLIC_ORIGIN must be an HTTPS origin without credentials, port, path, query or fragment.');
  const verification = env.GOOGLE_SITE_VERIFICATION ?? config.googleSiteVerification ?? '';
  if (typeof verification !== 'string' || (verification && !/^[A-Za-z0-9_-]{10,256}$/.test(verification))) throw Error('GOOGLE_SITE_VERIFICATION must contain only the verification token, not an HTML tag.');
  const productionBranch = config.productionBranch || 'main';
  const preview = env.CF_PAGES === '1' && Boolean(env.CF_PAGES_BRANCH) && env.CF_PAGES_BRANCH !== productionBranch;
  return {projectName,publicOrigin:url.origin,productionBranch,googleSiteVerification:verification,preview};
}

export async function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await fs.readdir(directory,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) throw Error('Publishing files must not be symbolic links.');
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(path.join(directory,entry.name),relative+'/'));
    else if (entry.isFile()) files.push(relative);
    else throw Error('Unexpected publishing file type.');
  }
  return files.sort();
}

// Pages redirects .html URLs to their extensionless equivalents automatically.
export function canonicalPath(file) {
  if (file === 'index.html') return '/';
  return '/' + (file.endsWith('/index.html') ? file.slice(0,-10) : file.replace(/\.html$/,''));
}

function isNoindex(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => /\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(tag) && /\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(tag));
}

export async function configureSite({siteRoot,env = process.env} = {}) {
  if (!siteRoot) throw Error('A publishing repository is required.');
  const config = resolveConfiguration(JSON.parse(await fs.readFile(path.join(siteRoot,'config.json'),'utf8')),env);
  const publicRoot = path.join(siteRoot,'public');
  const files = await listFiles(publicRoot);
  const sitemap = [];
  const hashes = new Set();
  for (const file of files.filter(name => name.endsWith('.html'))) {
    const target = path.join(publicRoot,file);
    // Match HTML parser newline normalization before calculating script hashes.
    let html = (await fs.readFile(target,'utf8')).replace(/\r\n?/g,'\n').replace(block,'');
    html = await versionPlayAssets({html, publicRoot, htmlPath:file});
    // Some existing generated attribution pages use a valid implicit HTML head.
    if (!/<\/head>/i.test(html) && !/<title\b/i.test(html)) throw Error(`Missing metadata insertion point in ${file}`);
    const noindex = isNoindex(html);
    const canonical = config.publicOrigin + canonicalPath(file);
    const homepage = file === 'normal-portfolio/index.html';
    const normal = file === 'index.html' || file.startsWith('normal-portfolio/');
    html = html.replace(/<link\b[^>]*>/gi,tag => /\brel\s*=\s*["']canonical["']/i.test(tag) ? '' : tag)
      .replace(/<meta\b[^>]*>/gi,tag => /\bproperty\s*=\s*["']og:(?:url|image(?::(?:width|height|type|alt))?|title|description|type)["']/i.test(tag) || /\bname\s*=\s*["'](?:google-site-verification|twitter:(?:card|title|description|image(?::alt)?))["']/i.test(tag) ? '' : tag);
    if (homepage) {
      html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i,`<title>${escapeHTML(homepageTitle)}</title>`);
      let replacedDescription = false;
      html = html.replace(/<meta\b[^>]*>/gi, tag => {
        if (!/^description$/i.test(attribute(tag,'name') || '')) return tag;
        if (replacedDescription) return '';
        replacedDescription = true;
        return `<meta name="description" content="${escapeHTML(homepageDescription)}">`;
      });
      if (!replacedDescription) html = html.replace(/<title\b/i,`<meta name="description" content="${escapeHTML(homepageDescription)}">\n<title`);
    }
    const title = decodeHTML(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || 'Lakshya Chopkar — Portfolio');
    const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]).find(tag=>/\bname\s*=\s*["']description["']/i.test(tag));
    const rawDescription = attribute(descriptionTag || '', 'content');
    const description = rawDescription === undefined ? undefined : decodeHTML(rawDescription);
    const image = config.publicOrigin + (normal ? previewImage : '/normal-portfolio/assets/identity/shared-curve/icon-512.png');
    const imageAlt = normal ? previewAlt : 'Lakshya Chopkar portfolio logo';
    const profile = homepage ? {
      '@context':'https://schema.org', '@type':'ProfilePage', url:canonical,
      mainEntity:{'@type':'Person', name:'Lakshya Chopkar', jobTitle:'Product Designer', url:canonical,
        sameAs:['https://www.linkedin.com/in/lakshyachopkar/','https://www.behance.net/lakshyachopkaruiux']},
    } : null;
    const metadata = [
      '<!-- portfolio-publishing:start -->',
      ...(file !== '404.html' && !config.preview ? ['<script defer src="/entrance/visit-session.js"></script>'] : []),
      ...(file !== '404.html' && !config.preview ? ['<script defer src="/entrance/simple-analytics.js?v=20261114"></script>'] : []),
      ...(file !== '404.html' && file !== 'index.html' ? ['<script src="/entrance/app-route.js"></script>'] : []),
      `<link rel="canonical" href="${escapeHTML(canonical)}">`,
      `<meta property="og:url" content="${escapeHTML(canonical)}">`,
      '<meta property="og:type" content="website">',
      `<meta property="og:title" content="${escapeHTML(title)}">`,
      ...(description ? [`<meta property="og:description" content="${escapeHTML(description)}">`] : []),
      `<meta property="og:image" content="${escapeHTML(image)}">`,
      `<meta property="og:image:width" content="${normal ? 1200 : 512}">`,
      `<meta property="og:image:height" content="${normal ? 630 : 512}">`,
      '<meta property="og:image:type" content="image/png">',
      `<meta property="og:image:alt" content="${escapeHTML(imageAlt)}">`,
      `<meta name="twitter:card" content="${normal ? 'summary_large_image' : 'summary'}">`,
      `<meta name="twitter:title" content="${escapeHTML(title)}">`,
      ...(description ? [`<meta name="twitter:description" content="${escapeHTML(description)}">`] : []),
      `<meta name="twitter:image" content="${escapeHTML(image)}">`,
      `<meta name="twitter:image:alt" content="${escapeHTML(imageAlt)}">`,
      ...(profile ? [`<script type="application/ld+json">${JSON.stringify(profile).replace(/</g,'\\u003c')}</script>`] : []),
      ...(config.googleSiteVerification && file === 'normal-portfolio/index.html' ? [`<meta name="google-site-verification" content="${config.googleSiteVerification}">`] : []),
      ...(config.preview ? ['<meta name="robots" content="noindex, nofollow">'] : []),
      '<!-- portfolio-publishing:end -->',
    ].join('\n')+'\n';
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i,metadata+'</head>') : html.replace(/<title\b/i,metadata+'<title');
    await fs.writeFile(target,html);
    if (indexCandidates.has(file) && !noindex && !config.preview) sitemap.push(canonical);
    for (const [,attributes,code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (!/(?:^|\s)src\s*=/.test(attributes) && code.trim()) hashes.add(`'sha256-${createHash('sha256').update(code).digest('base64')}'`);
    }
  }
  const csp = `default-src 'self'; script-src 'self' ${[...hashes].sort().join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`;
  const headers = `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000\n  Cache-Control: public, max-age=0, must-revalidate\n  Content-Security-Policy: ${csp}\n${config.preview ? '  X-Robots-Tag: noindex, nofollow\n' : ''}`;
  if (headers.split('\n').some(line=>line.length>2000)) throw Error('Cloudflare header line exceeds its 2,000 character limit.');
  await fs.writeFile(path.join(publicRoot,'_headers'),headers);
  await fs.writeFile(path.join(publicRoot,'_redirects'),'/normal-portfolio /normal-portfolio/ 308\n/bicycle-world/dist /bicycle-world/dist/ 308\n');
  await fs.writeFile(path.join(publicRoot,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n');
  // Crawlers must be allowed to read the preview's noindex response/meta directive.
  await fs.writeFile(path.join(publicRoot,'robots.txt'),config.preview ? 'User-agent: *\nAllow: /\nDisallow: /api/\n' : `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${config.publicOrigin}/sitemap.xml\n`);
  await fs.writeFile(path.join(publicRoot,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.sort().map(url=>`  <url><loc>${escapeHTML(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
  const library = path.join(siteRoot,'functions','_lib');
  await fs.mkdir(library,{recursive:true});
  await fs.writeFile(path.join(library,'config.mjs'),`export const publicOrigin = ${JSON.stringify(config.publicOrigin)};\n`);
  const report = {publicOrigin:config.publicOrigin,projectName:config.projectName,productionBranch:config.productionBranch,preview:config.preview,googleVerificationConfigured:Boolean(config.googleSiteVerification),indexedURLs:sitemap.sort(),published:false};
  await fs.writeFile(path.join(siteRoot,'publishing-report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  console.log(JSON.stringify(await configureSite({siteRoot}),null,2));
}
