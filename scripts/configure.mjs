import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const block = /<!-- portfolio-publishing:start -->[\s\S]*?<!-- portfolio-publishing:end -->\s*/g;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const indexCandidates = new Set(['normal-portfolio/index.html','normal-portfolio/map.html','bicycle-world/dist/index.html','bicycle-world/dist/projects.html','bicycle-world/dist/story.html']);

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
    // Some existing generated attribution pages use a valid implicit HTML head.
    if (!/<\/head>/i.test(html) && !/<title\b/i.test(html)) throw Error(`Missing metadata insertion point in ${file}`);
    const noindex = isNoindex(html);
    const canonical = config.publicOrigin + canonicalPath(file);
    html = html.replace(/<link\b[^>]*>/gi,tag => /\brel\s*=\s*["']canonical["']/i.test(tag) ? '' : tag)
      .replace(/<meta\b[^>]*>/gi,tag => /\bproperty\s*=\s*["']og:(?:url|image|title|description|type)["']/i.test(tag) || /\bname\s*=\s*["'](?:google-site-verification|twitter:card)["']/i.test(tag) ? '' : tag);
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || 'Lakshya Chopkar — Portfolio';
    const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match=>match[0]).find(tag=>/\bname\s*=\s*["']description["']/i.test(tag));
    const description = /\bcontent\s*=\s*"([^"]*)"/i.exec(descriptionTag || '')?.[1];
    const metadata = [
      '<!-- portfolio-publishing:start -->',
      `<link rel="canonical" href="${escapeHTML(canonical)}">`,
      `<meta property="og:url" content="${escapeHTML(canonical)}">`,
      '<meta property="og:type" content="website">',
      `<meta property="og:title" content="${title.replace(/"/g,'&quot;')}">`,
      ...(description ? [`<meta property="og:description" content="${description}">`] : []),
      `<meta property="og:image" content="${config.publicOrigin}/normal-portfolio/assets/identity/shared-curve/icon-512.png">`,
      '<meta name="twitter:card" content="summary">',
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
  const csp = `default-src 'self'; script-src 'self' ${[...hashes].sort().join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers = `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000\n  Cache-Control: public, max-age=0, must-revalidate\n  Content-Security-Policy: ${csp}\n${config.preview ? '  X-Robots-Tag: noindex, nofollow\n' : ''}`;
  if (headers.split('\n').some(line=>line.length>2000)) throw Error('Cloudflare header line exceeds its 2,000 character limit.');
  await fs.writeFile(path.join(publicRoot,'_headers'),headers);
  await fs.writeFile(path.join(publicRoot,'_redirects'),'/ /normal-portfolio/ 308\n/normal-portfolio /normal-portfolio/ 308\n/bicycle-world/dist /bicycle-world/dist/ 308\n');
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
