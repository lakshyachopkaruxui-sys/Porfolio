import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {configureSite, listFiles} from './configure.mjs';

// Build only this isolated, current release. Never recollect stale workspace sources.
const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = await configureSite({siteRoot});
const publicRoot = path.join(siteRoot, 'public');
const files = [];
for (const name of await listFiles(publicRoot)) {
  const bytes = await fs.readFile(path.join(publicRoot, name));
  files.push({path: name, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(path.join(siteRoot, 'release-manifest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), publicOrigin: report.publicOrigin, files,
}, null, 2) + '\n');
console.log(JSON.stringify({...report, publicFiles: files.length, published: false}, null, 2));
