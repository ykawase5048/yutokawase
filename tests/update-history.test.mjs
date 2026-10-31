import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectUpdates, detectChanges, normalizeSnapshot } from '../scripts/update-history.mjs';
import { generateUpdates } from '../scripts/generate-updates.mjs';
import { validateCatalog } from '../scripts/model.js';

const identities = {
    papers: [{ id: 'Example2026paper', titles: ['A paper'], arxiv: ['2601.00001'] }],
    talks: [{ id: 'meeting-2026', date: '2026-01', titles: ['A talk'], events: ['Meeting'], urls: ['https://example.org/meeting'] }],
    notes: [{ id: 'a-note', urls: ['./notes/a.pdf'] }]
};
const paper = { key: 'Example2026paper', title: 'A paper', publication: null, buttons: [{ type: 'arxiv', link: 'https://arxiv.org/abs/2601.00001' }] };
const talk = { id: 'meeting-2026', title: 'A talk', date: '2026-01', event: 'Meeting', 'event-url': 'https://example.org/meeting', buttons: [] };
const note = { id: 'a-note', title: 'A note', url: './notes/a.pdf' };
const base = { papers: [paper], talks: [talk], notes: [note] };
const snapshot = (catalogs, number) => ({ commit: String(number).padStart(40, '0'), updatedAt: `2026-01-0${number}T10:00:00Z`, catalogs: Object.fromEntries(Object.entries(catalogs).map(([name, entries]) => [name, { [name]: entries }])) });

test('legacy publications and preprints merge into one identity without migration announcements', () => {
    const publication = { journal: 'Journal', year: '2026', doi: '10.1234/example' };
    const old = { preprints: [{ title: 'A paper', arxiv: 'https://arxiv.org/abs/2601.00001' }], publications: [{ title: 'A paper', ...publication }] };
    const modern = { papers: [{ ...paper, publication: { ...publication, year: 2026 }, buttons: [...paper.buttons, { type: 'doi' }] }] };
    const before = normalizeSnapshot('papers', old, identities);
    const after = normalizeSnapshot('papers', modern, identities);
    assert.equal(before.size, 1);
    assert.deepEqual(detectChanges(before.get(paper.key), after.get(paper.key)), []);
    const legacyTalk = { ...talk, id: undefined, date: 'January 2026' };
    const translated = { ...talk, event: { en: 'Meeting', ja: '集会' }, 'event-url': { en: 'https://example.org/meeting', ja: 'https://example.org/ja' }, tags: ['new-tag'] };
    assert.deepEqual(normalizeSnapshot('talks', { talks: [legacyTalk] }, identities), normalizeSnapshot('talks', { talks: [translated] }, identities));
});

test('only public resource additions and link changes create updates, with one row per item and commit', () => {
    const locked = structuredClone(base);
    locked.talks[0].buttons = [{ type: 'slides', link: './slides/a.pdf', isLocked: true }];
    locked.talks[0].title = 'Corrected title';
    locked.talks[0].tags = ['a-tag'];
    const publicData = structuredClone(locked);
    publicData.talks[0].buttons[0].isLocked = false;
    publicData.talks[0].buttons.push({ type: 'youtube', link: 'https://youtu.be/example' });
    const changed = structuredClone(publicData);
    changed.talks[0].buttons[0].link = './slides/revised.pdf';
    changed.notes[0].url = './notes/revised.pdf';
    changed.papers[0].publication = { journal: 'Journal', year: 2026, doi: '10.1234/example' };
    changed.papers[0].buttons.push({ type: 'doi' });
    const result = collectUpdates([snapshot(base, 1), snapshot(locked, 2), snapshot(publicData, 3), snapshot(changed, 4)], changed, identities);
    assert.equal(result.length, 4);
    assert.equal(result.some(update => update.commit.endsWith('2')), false);
    assert.deepEqual(result.find(update => update.commit.endsWith('3')).changes, ['slides-added', 'video-added']);
    assert.deepEqual(result.find(update => update.category === 'paper').changes, ['publication']);
    assert.deepEqual(result.find(update => update.category === 'note').changes, ['links-updated']);
    assert.equal(result.filter(update => update.category === 'talk' && update.commit.endsWith('4')).length, 1);
    assert.equal(result.find(update => update.category === 'talk').title, 'Corrected title');
    const removed = { ...changed, talks: [] };
    assert.equal(collectUpdates([snapshot(base, 1), snapshot(publicData, 3), snapshot(removed, 4)], removed, identities).some(update => update.category === 'talk'), false);
});

test('initial imports are baselines; later entries are added and reordering or metadata edits are ignored', () => {
    const later = structuredClone(base);
    later.notes.push({ id: 'second-note', title: 'Second note', url: './notes/second.pdf' });
    later.papers.push({ key: 'Other2026paper', title: 'Other paper', publication: null, buttons: [] });
    const reordered = structuredClone(later);
    reordered.notes.reverse();
    reordered.papers.reverse();
    reordered.talks[0].date = '2026-02';
    reordered.talks[0].event = { en: 'Updated event', ja: '集会' };
    const result = collectUpdates([snapshot(base, 1), snapshot(later, 2), snapshot(reordered, 3)], reordered, identities);
    assert.equal(result.length, 2);
    assert.ok(result.every(update => update.changes.join() === 'added' && update.commit.endsWith('2')));
});

test('Git generation follows main first parents, handles moved files and never dates unmerged or dirty work', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-update-history-'));
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const git = (date, ...args) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-c', 'user.name=History Test', '-c', 'user.email=history@example.invalid', ...args], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
        env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
    }).trim();
    const date = '2026-01-01T00:00:00Z';
    const write = (name, value) => fs.writeFileSync(path.join(root, name), JSON.stringify(value));
    fs.mkdirSync(path.join(root, 'databases'));
    fs.mkdirSync(path.join(root, 'scripts'));
    write('scripts/history-identities.json', identities);
    for (const [name, entries] of Object.entries(base)) write(`databases/${name}.json`, { [name]: entries });
    git(date, 'init', '-b', 'main');
    git(date, 'add', '.');
    git(date, 'commit', '-m', 'Initial import');
    git(date, 'mv', 'databases/talks.json', 'talks.json');
    git(date, 'commit', '-m', 'Move catalog');
    git(date, 'mv', 'talks.json', 'databases/talks.json');
    git(date, 'commit', '-m', 'Move it back');
    git(date, 'checkout', '-b', 'feature');
    const updated = structuredClone(base.talks);
    updated[0].buttons = [{ type: 'slides', link: './slides/a.pdf' }];
    write('databases/talks.json', { talks: updated });
    git(date, 'add', '.');
    git('2026-01-02T00:00:00Z', 'commit', '-m', 'Publish slides');
    assert.equal(generateUpdates({ root, ref: 'main' }).updates.length, 0);
    git(date, 'checkout', 'main');
    git('2026-01-04T12:00:00+09:00', 'merge', '--no-ff', 'feature', '-m', 'Merge slides');
    updated[0].title = 'Current title';
    updated.push({ ...talk, id: 'uncommitted-talk' });
    write('databases/talks.json', { talks: updated });
    const result = generateUpdates({ root, ref: 'main' });
    assert.equal(result.updates.length, 1);
    assert.equal(result.updates[0].commit, git(date, 'rev-parse', 'main'));
    assert.equal(result.updates[0].updatedAt, '2026-01-04T12:00:00+09:00');
    assert.equal(result.updates[0].title, 'Current title');
    fs.writeFileSync(path.join(root, '.git/shallow'), `${result.sourceCommit}\n`);
    assert.throws(() => generateUpdates({ root, ref: 'main' }), /full Git checkout/);
});

test('real backfill includes the October 29 talk but not locked slides or schema migration', () => {
    const { updates } = generateUpdates({ ref: 'd0938f6' });
    const workshop = updates.find(update => update.category === 'talk' && update.targetId === 'virtual-double-categories-2026');
    assert.equal(workshop.updatedAt, '2026-10-29T19:55:44+09:00');
    assert.deepEqual(workshop.changes, ['added']);
    for (const commit of ['6afca84', 'b485bf3', '1cba6f8', 'e25e679', '1ab3443']) assert.equal(updates.some(update => update.commit.startsWith(commit)), false);
    assert.equal(updates.some(update => update.commit.startsWith('a12dac2') && update.targetId === 'Kawase2023elimination'), false);
    assert.equal(new Set(updates.map(update => `${update.commit}:${update.category}:${update.targetId}`)).size, updates.length);
});

test('catalog validation rejects missing and duplicate permanent IDs', () => {
    const data = Object.assign({}, ...['papers', 'talks', 'notes', 'tags'].map(name => JSON.parse(fs.readFileSync(new URL(`../databases/${name}.json`, import.meta.url), 'utf8'))));
    data.talks[0].id = data.talks[1].id;
    delete data.notes[0].id;
    const errors = validateCatalog(data).join('\n');
    assert.match(errors, /duplicate talk id/);
    assert.match(errors, /duplicate note id/);
});
