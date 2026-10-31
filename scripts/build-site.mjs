import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeUpdates } from './generate-updates.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const destination = path.join(root, '.cache', 'site');
const relative = path.relative(root, destination);
if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Build output must stay inside the project.');

writeUpdates();
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const file of fs.readdirSync(root)) {
    if (/\.(html|xml|ico)$/.test(file) || ['CNAME', 'robots.txt'].includes(file)) fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
for (const directory of ['styles', 'databases', 'icons', 'img', 'slides', 'notes', 'misc', 'yutokawase']) {
    fs.cpSync(path.join(root, directory), path.join(destination, directory), { recursive: true });
}
fs.mkdirSync(path.join(destination, 'scripts'));
for (const file of fs.readdirSync(path.join(root, 'scripts')).filter(name => name.endsWith('.js'))) {
    fs.copyFileSync(path.join(root, 'scripts', file), path.join(destination, 'scripts', file));
}
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
console.log(`Static site ready: ${destination}`);
