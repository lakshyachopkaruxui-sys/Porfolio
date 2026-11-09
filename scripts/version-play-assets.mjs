import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const origin = 'https://publishing.invalid';
const playRoot = 'bicycle-world/dist/';
const decodeAttribute = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const encodeAttribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function moduleFiles(directory, prefix) {
  const result = [];
  let entries;
  try { entries = await fs.readdir(directory, {withFileTypes:true}); }
  catch (error) { if (error.code === 'ENOENT') return result; throw error; }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw Error('Publishing modules must not be symbolic links.');
    if (entry.isDirectory()) result.push(...await moduleFiles(path.join(directory, entry.name), prefix + entry.name + '/'));
    else if (entry.isFile() && entry.name.endsWith('.js')) result.push(prefix + entry.name);
  }
  return result.sort();
}

/** Version the Play entry graph without changing runtime source or media URLs. */
export async function versionPlayAssets({html, publicRoot, htmlPath = playRoot + 'index.html'}) {
  if (!htmlPath.startsWith(playRoot) || !htmlPath.endsWith('.html')) return html;
  const base = new URL('/' + htmlPath, origin);
  const hashes = new Map();
  const files = (await Promise.all(['src/', 'vendor/'].map(directory =>
    moduleFiles(path.join(publicRoot, playRoot, directory), '/' + playRoot + directory)))).flat().sort();
  if (!files.length) return html;
  const localURL = value => {
    // Only local path references are owned by this publisher. Never touch external URLs.
    if (!value.startsWith('/') && !value.startsWith('./') && !value.startsWith('../')) return null;
    const url = new URL(value, base);
    return url.origin === origin && url.pathname.startsWith('/' + playRoot) ? url : null;
  };
  async function version(value) {
    const url = localURL(value);
    if (!url || !/\.(?:js|css)$/.test(url.pathname)) return value;
    if (!hashes.has(url.pathname)) {
      const bytes = await fs.readFile(path.join(publicRoot, decodeURIComponent(url.pathname.slice(1))));
      hashes.set(url.pathname, createHash('sha256').update(bytes).digest('hex').slice(0, 12));
    }
    // Keep the original relative/absolute path, fragment, and all non-version parameters.
    const hashIndex = value.indexOf('#');
    const fragment = hashIndex < 0 ? '' : value.slice(hashIndex);
    const withoutFragment = hashIndex < 0 ? value : value.slice(0, hashIndex);
    const question = withoutFragment.indexOf('?');
    const pathname = question < 0 ? withoutFragment : withoutFragment.slice(0, question);
    const query = new URLSearchParams(question < 0 ? '' : withoutFragment.slice(question + 1));
    query.set('v', hashes.get(url.pathname));
    return pathname + '?' + query.toString() + fragment;
  }

  const importMapMatch = /<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (importMapMatch) {
  const map = JSON.parse(importMapMatch[1]);
  map.imports ??= {};
  const originalEntries = Object.entries(map.imports);
  for (const [specifier, target] of originalEntries) {
    if (typeof target === 'string') map.imports[specifier] = await version(target);
  }
  for (const file of files) {
    map.imports[file] = await version(file);
    // A bare prefix mapping resolves once: add exact aliases so addon imports are versioned too.
    for (const [specifier, target] of originalEntries) {
      if (!specifier.endsWith('/') || typeof target !== 'string' || !target.endsWith('/')) continue;
      const prefix = localURL(target);
      if (prefix && file.startsWith(prefix.pathname)) map.imports[specifier + file.slice(prefix.pathname.length)] = await version(file);
    }
  }
  const json = JSON.stringify(map).replace(/</g, '\\u003c');
  html = html.slice(0, importMapMatch.index) + importMapMatch[0].replace(importMapMatch[1], () => json) + html.slice(importMapMatch.index + importMapMatch[0].length);
  }

  const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/gi)];
  for (const match of tags.reverse()) {
    const tag = match[0];
    const script = /^<script\b/i.test(tag);
    if (!script && !/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue;
    const attribute = (script ? /\bsrc\s*=\s*(["'])(.*?)\1/i : /\bhref\s*=\s*(["'])(.*?)\1/i).exec(tag);
    if (!attribute) continue;
    const next = await version(decodeAttribute(attribute[2]));
    const replacement = attribute[0].replace(attribute[2], () => encodeAttribute(next));
    const updated = tag.slice(0, attribute.index) + replacement + tag.slice(attribute.index + attribute[0].length);
    html = html.slice(0, match.index) + updated + html.slice(match.index + tag.length);
  }
  return html;
}
