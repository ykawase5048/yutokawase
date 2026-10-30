import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { localized, sortEntries } from '../scripts/model.js';
import { loadPage, pointer, settle } from './helpers/dom.mjs';

const source = Object.assign({}, ...['papers', 'talks', 'notes', 'tags'].map(name => JSON.parse(fs.readFileSync(new URL(`../databases/${name}.json`, import.meta.url), 'utf8'))));
const counts = { paper: source.papers.length, talk: source.talks.length, notes: source.notes.length };

test('all six pages render English and Japanese with consistent navigation', async () => {
    for (const page of ['index', 'paper', 'talk', 'notes', 'cv', 'misc']) {
        for (const language of ['en', 'ja']) {
            const app = await loadPage(page, { query: `?lang=${language}` });
            try {
                assert.equal(app.document.documentElement.lang, language);
                assert.equal(app.document.querySelectorAll('#site-nav a').length, 6);
                assert.equal(app.document.querySelectorAll('#site-nav [aria-current="page"]').length, 1);
                assert.equal(app.document.querySelector('#site-nav a').textContent, language === 'ja' ? 'ホーム' : 'Home');
                const name = language === 'ja' ? '河瀬 悠人' : 'Yuto Kawase';
                assert.equal(app.document.querySelector('.site-brand [data-i18n="name"]').textContent, name);
                assert.ok(app.document.title.endsWith(name));
                if (page === 'index') assert.equal(app.document.querySelector('h1').textContent, name);
                for (const link of [...app.document.querySelectorAll('a')].filter(link => link.textContent === 'DC1')) {
                    assert.equal(link.href, language === 'ja' ? 'https://www.jsps.go.jp/j-pd/' : 'https://www.jsps.go.jp/english/e-pd/');
                }
                if (page === 'cv') for (const link of app.document.querySelectorAll('[data-i18n-html="supervisor"] a')) {
                    assert.equal(link.textContent, language === 'ja' ? '長谷川 真人' : 'Masahito Hasegawa');
                    assert.equal(link.href, language === 'ja' ? 'https://www.kurims.kyoto-u.ac.jp/~hassei/index-j.html' : 'https://www.kurims.kyoto-u.ac.jp/~hassei/');
                }
                for (const link of app.document.querySelectorAll('a[data-site-link]')) assert.match(link.href, new RegExp(`lang=${language}`));
                const count = counts[page];
                if (count) assert.equal(app.document.querySelectorAll('.entry').length, count);
                assert.deepEqual(app.errors, []);
            } finally { app.close(); }
        }
    }
});

test('paper filtering, no results, clear and language switching retain the selection and hash', async t => {
    const tags = [...source.tags, { id: 'test-empty-topic', label: { en: 'Empty test topic', ja: '該当なしの検証用タグ' } }];
    const app = await loadPage('paper', { hash: '#paper-Kawase2025profunctor', fetchOverride: name => name === 'tags' ? { ok: true, json: async () => ({ tags }) } : null });
    t.after(app.close);
    const { document, window } = app;
    assert.equal(window.lastScrolledId, 'paper-Kawase2025profunctor');
    const topic = name => [...document.querySelectorAll('.filter-chip')].find(button => button.textContent === name);
    topic('double category').click();
    const doubleCount = source.papers.filter(paper => paper.tags.includes('double-category')).length;
    assert.equal(document.querySelectorAll('.entry').length, doubleCount);
    document.querySelector('[data-language="ja"]').click();
    assert.equal(document.querySelectorAll('.entry').length, doubleCount);
    assert.equal(topic('二重圏').getAttribute('aria-pressed'), 'true');
    assert.equal(window.location.hash, '#paper-Kawase2025profunctor');
    assert.equal(window.location.search, '?lang=ja');
    document.querySelector('[data-language="en"]').click();
    assert.equal(topic('double category').getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('.entry').length, doubleCount);
    document.querySelector('[data-language="ja"]').click();
    topic('該当なしの検証用タグ').click();
    assert.equal(document.querySelectorAll('.entry').length, 0);
    assert.match(document.querySelector('#catalog-status').textContent, /該当する項目はありません/);
    document.querySelector('#catalog-status button').click();
    assert.equal(document.querySelectorAll('.entry').length, counts.paper);
});

test('legacy deep links reach exactly the migrated paper after asynchronous loading', async t => {
    const app = await loadPage('paper', { query: '?lang=ja', hash: '#preprint-4' });
    t.after(app.close);
    assert.equal(app.window.lastScrolledId, 'paper-Kawase2025profunctor');
    assert.equal(app.document.querySelector('.anchor-target .entry-title').textContent, 'Double categories of profunctors');
    assert.equal(app.document.querySelectorAll('#preprint-4').length, 1);
    assert.equal(app.document.querySelectorAll('#publish-3').length, 1);
});

test('related links are numbered per talk, correctly localized and disabled slides do not navigate', async t => {
    const app = await loadPage('talk');
    t.after(app.close);
    for (const article of app.document.querySelectorAll('.entry')) {
        const links = [...article.querySelectorAll('.related-link')];
        assert.deepEqual(links.map(link => link.textContent), links.length > 1 ? links.map((_, index) => `Related paper ${index + 1}`) : links.map(() => 'Related paper'));
        for (const link of links) assert.match(link.href, /\/paper\?lang=en#paper-Kawase/);
    }
    assert.equal(app.document.querySelectorAll('.resource-link[aria-disabled="true"]').length, source.talks.flatMap(talk => talk.buttons).filter(button => button.isLocked).length);
    assert.equal(app.document.querySelectorAll('a[aria-disabled="true"]').length, 0);
    app.document.querySelector('[data-language="ja"]').click();
    for (const link of app.document.querySelectorAll('.related-link')) {
        assert.match(link.textContent, /^関連論文/);
        assert.match(link.href, /lang=ja/);
    }
});

test('all talk event names and URLs follow the language without changing the entry order', async t => {
    const app = await loadPage('talk', { query: '?lang=ja' });
    t.after(app.close);
    const talks = sortEntries(source.talks);
    for (const language of ['ja', 'en', 'ja']) {
        app.document.querySelector(`[data-language="${language}"]`).click();
        const entries = [...app.document.querySelectorAll('.entry')];
        assert.equal(entries.length, talks.length);
        entries.forEach((entry, index) => {
            const talk = talks[index];
            assert.equal(entry.querySelector('.entry-title').textContent, talk.title);
            const event = entry.querySelector('.event-name');
            assert.equal(event.textContent, localized(talk.event, language));
            assert.equal(event.querySelector('a').href, localized(talk['event-url'], language));
            assert.equal(event.querySelector('a').target, '_blank');
            assert.equal(event.querySelector('a').rel, 'noopener noreferrer');
        });
        assert.deepEqual(app.errors, []);
    }
});

test('talk events accept shared text, localized values, English fallbacks and optional links', async t => {
    const events = [
        { event: 'Shared event', 'event-url': 'https://example.com/shared' },
        { event: { en: '<em>English event</em>', ja: '日本語の集会' }, 'event-url': { en: 'https://example.com/en', ja: 'https://example.com/ja' } },
        { event: { en: 'English fallback' }, 'event-url': { en: 'https://example.com/fallback' } },
        { event: { en: 'No URL', ja: 'URLなし' }, 'event-url': undefined },
        { event: 'Optional localized URL', 'event-url': { en: 'https://example.com/optional', ja: '' } },
        { event: undefined, 'event-url': 'https://example.com/unused' }
    ];
    const talks = events.map((event, index) => ({ ...source.talks[0], title: `Talk ${index}`, ...event }));
    const app = await loadPage('talk', { query: '?lang=ja', fetchOverride: name => name === 'talks' ? { ok: true, json: async () => ({ talks }) } : null });
    t.after(app.close);
    for (const language of ['ja', 'en', 'ja']) {
        app.document.querySelector(`[data-language="${language}"]`).click();
        const entries = [...app.document.querySelectorAll('.entry')];
        assert.deepEqual(entries.map(entry => entry.querySelector('.event-name')?.textContent ?? ''), [
            'Shared event', language === 'ja' ? '日本語の集会' : '<em>English event</em>', 'English fallback',
            language === 'ja' ? 'URLなし' : 'No URL', 'Optional localized URL', ''
        ]);
        assert.deepEqual(entries.map(entry => entry.querySelector('.event-name a')?.href ?? ''), [
            'https://example.com/shared', `https://example.com/${language}`, 'https://example.com/fallback',
            '', language === 'ja' ? '' : 'https://example.com/optional', ''
        ]);
        assert.equal(app.document.querySelectorAll('.event-name em').length, 0);
        assert.equal(entries[5].querySelector('.event-name'), null);
        assert.deepEqual(app.errors, []);
    }
});

test('preview closes on pointer exit, blur, Escape and touch click, while allowing entry into the card', async t => {
    const app = await loadPage('talk');
    t.after(app.close);
    const { document, window } = app;
    const link = document.querySelector('.related-link');
    const preview = document.querySelector('#paper-preview');
    pointer(window, link, 'pointerenter');
    assert.equal(preview.hidden, false);
    assert.match(preview.textContent, /Double categories of profunctors/);
    pointer(window, link, 'pointerleave', preview);
    assert.equal(preview.hidden, false);
    pointer(window, preview, 'pointerleave', document.body);
    assert.equal(preview.hidden, true);
    assert.equal(link.hasAttribute('aria-describedby'), false);
    pointer(window, link, 'pointerenter');
    pointer(window, link, 'pointerleave', document.body);
    assert.equal(preview.hidden, true);
    pointer(window, link, 'pointerenter', null, 'touch');
    assert.equal(preview.hidden, true);
    link.matches = selector => selector === ':focus-visible';
    link.focus();
    assert.equal(preview.hidden, false);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(preview.hidden, true);
    link.blur();
    link.focus();
    assert.equal(preview.hidden, false);
    link.blur();
    assert.equal(preview.hidden, true);
    pointer(window, link, 'pointerenter');
    link.addEventListener('click', event => event.preventDefault(), { once: true });
    link.click();
    assert.equal(preview.hidden, true);
});

test('linked paper notes switch languages and preview links support keyboard focus and Escape', async t => {
    const papers = await loadPage('paper');
    const talks = await loadPage('talk');
    t.after(papers.close);
    t.after(talks.close);
    for (const language of ['en', 'ja', 'en']) {
        for (const app of [papers, talks]) app.document.querySelector(`[data-language="${language}"]`).click();
        const expectedName = language === 'ja' ? '奈須隼大' : 'Hayato Nasu';
        const expectedNote = language === 'ja' ? '奈須隼大氏との共著' : 'joint with Hayato Nasu';
        const note = papers.document.querySelector('#paper-KawaseNasu2026decomposition .entry-detail');
        assert.equal(note.textContent, expectedNote);
        assert.equal(note.querySelector('a').textContent, expectedName);
        assert.equal(note.querySelector('a').href, 'https://hayatonasu.github.io/');
        const { document, window } = talks;
        const trigger = [...document.querySelectorAll('.related-link')].find(link => link.hash === '#paper-KawaseNasu2026decomposition');
        trigger.matches = selector => selector === ':focus-visible';
        trigger.focus();
        const preview = document.querySelector('#paper-preview');
        assert.equal(preview.hidden, false);
        assert.equal(preview.getAttribute('role'), 'dialog');
        assert.equal(trigger.nextElementSibling, preview);
        const coauthor = preview.querySelector('a');
        assert.equal(coauthor.textContent, expectedName);
        assert.equal(coauthor.href, 'https://hayatonasu.github.io/');
        assert.ok(preview.textContent.includes(expectedNote));
        coauthor.focus();
        assert.equal(preview.hidden, false);
        assert.equal(document.activeElement, coauthor);
        document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(preview.hidden, true);
        assert.equal(document.activeElement, trigger);
        assert.equal(trigger.getAttribute('aria-expanded'), 'false');
        trigger.blur();
        trigger.focus();
        preview.querySelector('a').focus();
        document.querySelector('.menu-toggle').focus();
        assert.equal(preview.hidden, true);
        assert.deepEqual(talks.errors, []);
        assert.deepEqual(papers.errors, []);
    }
});

test('JSON note fragments display markup as text and generate only their specified links', async t => {
    const data = JSON.parse(fs.readFileSync(new URL('../databases/papers.json', import.meta.url), 'utf8'));
    data.papers[0].note = { en: ['<strong>Text</strong> ', { text: '<em>Name</em>', url: 'https://example.com/person' }] };
    const app = await loadPage('paper', { fetchOverride: name => name === 'papers' ? { ok: true, json: async () => data } : null });
    t.after(app.close);
    const note = app.document.querySelector(`#paper-${data.papers[0].key} .entry-detail`);
    assert.equal(note.textContent, '<strong>Text</strong> <em>Name</em>');
    assert.equal(note.querySelectorAll('strong, em').length, 0);
    assert.equal(note.querySelectorAll('a').length, 1);
    assert.equal(note.querySelector('a').href, 'https://example.com/person');
});

test('Notes reflects changed JSON titles, URLs, tags and same-month editorial order', async t => {
    const data = JSON.parse(fs.readFileSync(new URL('../databases/notes.json', import.meta.url), 'utf8'));
    const tag = source.tags[0];
    data.notes = [
        { title: 'JSON-only update A', date: '2026-10', url: './notes/FPTerminal.pdf', language: 'ja', tags: [tag.id] },
        { title: 'JSON-only update B', date: '2026-10', url: './notes/RegularCat.pdf', language: 'en', tags: [] }
    ];
    const app = await loadPage('notes', { fetchOverride: name => name === 'notes' ? { ok: true, json: async () => data } : null });
    t.after(app.close);
    assert.deepEqual([...app.document.querySelectorAll('.entry-title')].map(heading => heading.textContent), ['JSON-only update A', 'JSON-only update B']);
    assert.match(app.document.querySelector('.entry-title a').href, /FPTerminal.pdf$/);
    [...app.document.querySelectorAll('.filter-chip')].find(button => button.textContent === tag.label.en).click();
    assert.equal(app.document.querySelectorAll('.entry').length, 1);
});

test('JSON failures show translated retry controls and recover on retry', async t => {
    let fail = true;
    const app = await loadPage('notes', { fetchOverride: name => name === 'notes' && fail ? { ok: false, status: 503 } : null });
    t.after(app.close);
    assert.match(app.document.querySelector('#catalog-status').textContent, /could not be loaded/);
    app.document.querySelector('[data-language="ja"]').click();
    assert.match(app.document.querySelector('#catalog-status').textContent, /読み込めません/);
    fail = false;
    app.document.querySelector('#catalog-status button').click();
    await settle();
    assert.equal(app.document.querySelectorAll('.entry').length, counts.notes);
});

test('saved language, blocked storage, navigation menu and full-card links work', async () => {
    const saved = await loadPage('index', { query: '', saved: 'ja' });
    try {
        assert.equal(saved.document.documentElement.lang, 'ja');
        const menu = saved.document.querySelector('#menu-toggle');
        menu.click();
        assert.equal(menu.getAttribute('aria-expanded'), 'true');
        saved.document.dispatchEvent(new saved.window.KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(menu.getAttribute('aria-expanded'), 'false');
        assert.equal(saved.document.querySelectorAll('a.navigation-card').length, 5);
        assert.equal(saved.document.querySelectorAll('.navigation-card a, .navigation-card button').length, 0);
    } finally { saved.close(); }
    const blocked = await loadPage('index', { query: '?lang=ja', storageBlocked: true });
    try {
        assert.equal(blocked.document.documentElement.lang, 'ja');
        blocked.document.querySelector('[data-language="en"]').click();
        assert.equal(blocked.document.documentElement.lang, 'en');
        assert.deepEqual(blocked.errors, []);
    } finally { blocked.close(); }
});
