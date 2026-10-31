import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPage, settle } from './helpers/dom.mjs';
import { catalogEntryUrl } from '../scripts/model.js';
import { recentUpdates } from '../scripts/updates-model.js';

const data = JSON.parse(fs.readFileSync(new URL('../databases/updates.json', import.meta.url), 'utf8'));
const mock = overrides => ({ ...data.updates[0], ...overrides });

test('Home shows the latest three updates followed by navigation and research interests in both languages', async t => {
    const app = await loadPage('index');
    t.after(app.close);
    const { document } = app;
    const section = document.getElementById('recent-updates');
    assert.ok(section.previousElementSibling.matches('.hero'));
    assert.ok(section.nextElementSibling.querySelector('.navigation-grid'));
    assert.ok(section.nextElementSibling.nextElementSibling.querySelector('.interests-grid'));
    assert.equal(section.hidden, false);
    for (const language of ['en', 'ja', 'en']) {
        document.querySelector(`[data-language="${language}"]`).click();
        const rows = [...section.querySelectorAll('li')];
        assert.equal(rows.length, 3);
        assert.equal(section.querySelector('h2').textContent, language === 'ja' ? '最近の更新' : 'Recent updates');
        rows.forEach((row, index) => {
            const update = recentUpdates(data)[index];
            assert.equal(row.querySelector('time').dateTime, update.updatedAt);
            assert.equal(row.querySelector('.update-title').textContent, update.title);
            const card = row.firstElementChild;
            assert.ok(card.matches('a.update-card'));
            assert.equal(card.getAttribute('href'), catalogEntryUrl(update.category, update.targetId, language));
            assert.equal(card.querySelectorAll('a, button').length, 0);
            for (const element of row.querySelectorAll('time, .update-kind, .update-title, .update-event')) assert.equal(element.closest('a'), card);
            card.focus();
            assert.equal(document.activeElement, card);
        });
        assert.match(rows[0].querySelector('.update-kind').textContent, language === 'ja' ? /講演/ : /Talk/);
        assert.match(rows[1].querySelector('.update-event').textContent, language === 'ja' ? /第3回/ : /3rd/);
    }
    assert.deepEqual(app.errors, []);
});

test('updates arriving after a language switch use that language and its time zone, rendering text safely', async t => {
    let resolve;
    const pending = new Promise(done => { resolve = done; });
    const app = await loadPage('index', { fetchOverride: name => name === 'updates' ? { ok: true, json: () => pending } : null });
    t.after(app.close);
    app.document.querySelector('[data-language="ja"]').click();
    resolve({ updates: [mock({ updatedAt: '2026-10-30T16:00:00Z', title: '<img src=x onerror=alert(1)>', event: { en: 'Event', ja: '<b>集会</b>' } })] });
    await settle();
    const section = app.document.getElementById('recent-updates');
    assert.equal(section.querySelector('time').textContent, '2026年10月31日');
    assert.equal(section.querySelector('.update-event').textContent, '<b>集会</b>');
    assert.equal(section.querySelectorAll('img, b').length, 0);
    app.document.querySelector('[data-language="en"]').click();
    assert.equal(section.querySelector('time').textContent, 'Oct 30, 2026');
    assert.equal(section.querySelector('.update-event').textContent, 'Event');
    assert.deepEqual(app.errors, []);
});

test('empty, missing, invalid or failed history hides only the optional section', async () => {
    for (const response of [
        { ok: true, json: async () => ({ updates: [] }) },
        { ok: false, status: 404 },
        { ok: true, json: async () => ({ updates: [null, {}, mock({ updatedAt: 'invalid' })] }) },
        { ok: true, json: async () => { throw new Error('Malformed JSON'); } },
        new Error('Network unavailable')
    ]) {
        const app = await loadPage('index', { fetchOverride: name => {
            if (name !== 'updates') return null;
            if (response instanceof Error) throw response;
            return response;
        } });
        try {
            assert.equal(app.document.getElementById('recent-updates').hidden, true);
            assert.equal(app.document.querySelectorAll('.navigation-card').length, 5);
            assert.deepEqual(app.errors, []);
        } finally { app.close(); }
    }
});

test('news sorts valid events by time and enforces the three-item limit without mutating the feed', () => {
    const updates = [5, 1, 3, 2, 4].map(day => mock({ updatedAt: `2026-01-0${day}T00:00:00Z` }));
    const copy = structuredClone(updates);
    assert.deepEqual(recentUpdates({ updates }).map(update => update.updatedAt), [5, 4, 3].map(day => `2026-01-0${day}T00:00:00Z`));
    assert.deepEqual(updates, copy);
});

test('talk and note anchors resolve after loading, survive language changes and clear conflicting filters', async () => {
    const talks = JSON.parse(fs.readFileSync(new URL('../databases/talks.json', import.meta.url), 'utf8')).talks;
    const notes = JSON.parse(fs.readFileSync(new URL('../databases/notes.json', import.meta.url), 'utf8')).notes;
    for (const [page, id, query] of [
        ['talk', `talk-${talks[0].id}`, '?lang=ja&paper=Kawase2023birkhoff&tag=1-category'],
        ['notes', `note-${notes[0].id}`, '?lang=ja']
    ]) {
        const app = await loadPage(page, { query, hash: `#${id}` });
        try {
            assert.equal(app.window.lastScrolledId, id);
            assert.equal(app.document.activeElement.id, id);
            assert.equal(app.document.querySelector('.anchor-target').id, id);
            assert.equal(new URL(app.window.location).searchParams.has('paper'), false);
            app.document.querySelector('[data-language="en"]').click();
            assert.equal(app.document.querySelector('.anchor-target').id, id);
            assert.equal(app.window.location.hash, `#${id}`);
            app.window.location.hash = '#%invalid';
            await settle();
            assert.deepEqual(app.errors, []);
        } finally { app.close(); }
    }
});
