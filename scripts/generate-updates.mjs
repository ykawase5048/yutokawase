import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogNames, collectUpdates } from './update-history.mjs';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const paths = catalogNames.flatMap(name => [`databases/${name}.json`, `${name}.json`]);

export function generateUpdates({ root = siteRoot, ref = process.env.UPDATES_REF || 'main' } = {}) {
    root = path.resolve(root);
    const git = (...args) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], {
        cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
    }).trim();
    if (git('rev-parse', '--is-shallow-repository') === 'true') throw new Error('Update history needs a full Git checkout (fetch-depth: 0).');
    const sourceCommit = git('rev-parse', '--verify', `${ref}^{commit}`);
    const identities = JSON.parse(fs.readFileSync(path.join(root, 'scripts/history-identities.json'), 'utf8'));
    const current = Object.fromEntries(catalogNames.map(name => [name, JSON.parse(fs.readFileSync(path.join(root, `databases/${name}.json`), 'utf8'))[name]]));
    const lines = git('log', '--first-parent', '--reverse', '--format=%H%x09%cI', sourceCommit, '--', ...paths).split('\n').filter(Boolean);
    const snapshots = lines.map(line => {
        const [commit, updatedAt] = line.split('\t');
        const files = new Set(git('ls-tree', '-r', '--name-only', commit, '--', ...paths).split('\n'));
        const catalogs = Object.fromEntries(catalogNames.map(name => {
            const file = [`databases/${name}.json`, `${name}.json`].find(candidate => files.has(candidate));
            return [name, file ? JSON.parse(git('show', `${commit}:${file}`)) : null];
        }));
        return { commit, updatedAt, catalogs };
    });
    return { sourceCommit, updates: collectUpdates(snapshots, current, identities) };
}

export function writeUpdates(options = {}) {
    const data = generateUpdates(options);
    const destination = path.join(options.root ?? siteRoot, 'databases/updates.json');
    fs.writeFileSync(destination, `${JSON.stringify(data, null, 4)}\n`);
    return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const index = process.argv.indexOf('--ref');
    const result = writeUpdates(index < 0 ? {} : { ref: process.argv[index + 1] });
    console.log(`Generated ${result.updates.length} updates from ${result.sourceCommit.slice(0, 7)}.`);
}
