import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { localized, validateApplications, validateCatalog, resourceHref } from './model.js';

const data = Object.assign({}, ...['papers', 'talks', 'notes', 'tags'].map(name => JSON.parse(fs.readFileSync(`databases/${name}.json`, 'utf8'))));
assert.deepEqual(validateCatalog(data), [], 'Catalog validation');
const { applications } = JSON.parse(fs.readFileSync('databases/applications.json', 'utf8'));
assert.deepEqual(validateApplications(applications), [], 'Application documents validation');
for (const file of fs.readdirSync('scripts').filter(file => /\.(?:js|mjs)$/.test(file))) execFileSync(process.execPath, ['--check', `scripts/${file}`]);
const links = new Set(data.notes.map(note => note.url));
for (const talk of data.talks) for (const language of ['en', 'ja']) {
    const href = localized(talk['event-url'], language);
    if (href) links.add(href);
}
for (const application of applications) for (const language of ['en', 'ja']) links.add(localized(application.url, language));
for (const entry of [...data.papers, ...data.talks]) for (const button of entry.buttons ?? []) {
    const href = resourceHref(button, entry);
    if (href) links.add(href);
}
for (const file of fs.readdirSync('.').filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)) links.add(match[1]);
}
for (const href of links) {
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const pathname = decodeURIComponent(new URL(href, 'https://local.test/').pathname).slice(1);
    const file = pathname || 'index.html';
    assert.ok(fs.existsSync(file) || (!path.extname(file) && fs.existsSync(`${file}.html`)), `Missing local link: ${href}`);
}
console.log(`Checks passed: ${data.papers.length} papers, ${data.talks.length} talks, ${data.notes.length} notes, ${data.tags.length} tags, ${applications.length} application documents; syntax and local links.`);
