import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadPage, settle } from './helpers/dom.mjs';

const source = Object.assign({}, ...['papers', 'talks', 'tags'].map(name => JSON.parse(fs.readFileSync(new URL(`../databases/${name}.json`, import.meta.url), 'utf8'))));
const key = 'Kawase2025profunctor';
const related = source.talks.filter(talk => talk['related-papers'].includes(key));
const excludedTopic = source.tags.find(tag => related.every(talk => !talk.tags.includes(tag.id)));
const entries = app => [...app.document.querySelectorAll('.entry')];
const topic = (app, text) => [...app.document.querySelectorAll('#catalog-filters .filter-chip')].find(button => button.textContent === text);
function choosePaper(app, value) {
    const select = app.document.querySelector('#related-paper-filter');
    select.value = value;
    select.dispatchEvent(new app.window.Event('change', { bubbles: true }));
}
async function traverse(app, direction) {
    const changed = new Promise(resolve => app.window.addEventListener('popstate', resolve, { once: true }));
    app.window.history[direction]();
    await changed;
    await settle();
}

test('every paper links to its related talks in both languages', async t => {
    const papers = await loadPage('paper');
    t.after(papers.close);
    for (const language of ['en', 'ja']) {
        papers.document.querySelector(`[data-language="${language}"]`).click();
        const links = [...papers.document.querySelectorAll('.related-talks-link')];
        assert.equal(links.length, source.papers.length);
        for (const link of links) {
            const paperKey = link.closest('.entry').id.slice('paper-'.length);
            const url = new URL(link.href);
            assert.equal(url.pathname, '/talk');
            assert.equal(url.searchParams.get('paper'), paperKey);
            assert.equal(url.searchParams.get('lang'), language);
            assert.equal(link.textContent, language === 'ja' ? '関連講演' : 'Related talks');
            const talks = await loadPage('talk', { query: url.search });
            try {
                const expected = source.talks.filter(talk => talk['related-papers'].includes(paperKey));
                assert.equal(talks.document.querySelector('#related-paper-filter').value, paperKey);
                assert.deepEqual(entries(talks).map(entry => entry.querySelector('.entry-title').textContent).sort(), expected.map(talk => talk.title).sort());
                assert.equal(talks.document.querySelector('#catalog-count').textContent, language === 'ja' ? `${expected.length}件` : `${expected.length} entries`);
                assert.equal(talks.document.querySelectorAll('#related-paper-filter option').length, source.papers.length + 1);
                assert.deepEqual(talks.errors, []);
            } finally { talks.close(); }
        }
    }
    assert.deepEqual(papers.errors, []);
});

test('related-paper and tag filters combine, survive language changes and reloads, and follow browser history', async t => {
    const app = await loadPage('talk', { query: '?lang=en&keep=1', hash: '#main' });
    t.after(app.close);
    const { document, window } = app;
    const select = document.querySelector('#related-paper-filter');
    select.focus();
    choosePaper(app, key);
    assert.equal(entries(app).length, related.length);
    assert.equal(document.activeElement, select);
    topic(app, 'double category').click();
    document.querySelector('[data-language="ja"]').click();
    assert.equal(select.value, key);
    assert.equal(topic(app, '二重圏').getAttribute('aria-pressed'), 'true');
    assert.equal(window.location.hash, '#main');
    const params = new URLSearchParams(window.location.search);
    assert.equal(params.get('paper'), key);
    assert.equal(params.get('tag'), 'double-category');
    assert.equal(params.get('lang'), 'ja');
    assert.equal(params.get('keep'), '1');
    const reloaded = await loadPage('talk', { query: window.location.search, hash: window.location.hash });
    try {
        assert.equal(reloaded.document.querySelector('#related-paper-filter').value, key);
        assert.equal(topic(reloaded, '二重圏').getAttribute('aria-pressed'), 'true');
        assert.equal(entries(reloaded).length, related.filter(talk => talk.tags.includes('double-category')).length);
    } finally { reloaded.close(); }
    topic(app, excludedTopic.label.ja).click();
    assert.equal(entries(app).length, 0);
    assert.match(document.querySelector('#catalog-status').textContent, /この条件に該当する講演はありません/);
    document.querySelector('#clear-talk-filters').click();
    assert.equal(entries(app).length, source.talks.length);
    assert.equal(select.value, '');
    assert.equal(document.activeElement, select);
    assert.equal(document.querySelector('#clear-talk-filters').hidden, true);
    assert.equal(new URLSearchParams(window.location.search).has('paper'), false);
    assert.equal(new URLSearchParams(window.location.search).has('tag'), false);
    assert.equal(window.location.hash, '#main');
    await traverse(app, 'back');
    assert.equal(select.value, key);
    assert.equal(topic(app, excludedTopic.label.ja).getAttribute('aria-pressed'), 'true');
    assert.equal(entries(app).length, 0);
    await traverse(app, 'forward');
    assert.equal(select.value, '');
    assert.equal(entries(app).length, source.talks.length);
    assert.deepEqual(app.errors, []);
});

test('All papers removes only the paper condition and the empty-state reset clears both filters', async t => {
    const app = await loadPage('talk', { query: `?lang=en&paper=${key}&tag=double-category` });
    t.after(app.close);
    choosePaper(app, '');
    assert.equal(topic(app, 'double category').getAttribute('aria-pressed'), 'true');
    assert.equal(entries(app).length, source.talks.filter(talk => talk.tags.includes('double-category')).length);
    assert.equal(new URLSearchParams(app.window.location.search).has('paper'), false);
    assert.equal(new URLSearchParams(app.window.location.search).get('tag'), 'double-category');
    choosePaper(app, key);
    topic(app, excludedTopic.label.en).click();
    assert.equal(entries(app).length, 0);
    assert.match(app.document.querySelector('#catalog-status').textContent, /No talks match these filters/);
    app.document.querySelector('#catalog-status button').click();
    assert.equal(entries(app).length, source.talks.length);
    assert.equal(new URLSearchParams(app.window.location.search).has('paper'), false);
    assert.equal(new URLSearchParams(app.window.location.search).has('tag'), false);
    assert.deepEqual(app.errors, []);
});

test('papers with no related talks show an empty state and unknown filter values are removed', async t => {
    const withoutRelatedTalks = { talks: source.talks.map(talk => ({ ...talk, 'related-papers': talk['related-papers'].filter(paper => paper !== key) })) };
    const empty = await loadPage('talk', { query: `?lang=ja&paper=${key}`, fetchOverride: name => name === 'talks' ? { ok: true, json: async () => withoutRelatedTalks } : null });
    t.after(empty.close);
    assert.equal(empty.document.querySelector('#related-paper-filter').value, key);
    assert.equal(entries(empty).length, 0);
    assert.match(empty.document.querySelector('#catalog-status').textContent, /この条件に該当する講演はありません/);
    assert.equal(new URLSearchParams(empty.window.location.search).get('paper'), key);
    for (const paper of [key, 'UnknownPaper']) {
        const app = await loadPage('talk', { query: `?lang=en&paper=${paper}&tag=unknown-topic&keep=1` });
        try {
            assert.equal(app.document.querySelector('#related-paper-filter').value, paper === key ? key : '');
            assert.equal(entries(app).length, paper === key ? related.length : source.talks.length);
            const params = new URLSearchParams(app.window.location.search);
            assert.equal(params.has('tag'), false);
            assert.equal(params.has('paper'), paper === key);
            assert.equal(params.get('keep'), '1');
            assert.deepEqual(app.errors, []);
        } finally { app.close(); }
    }
});

test('related-paper selection is restored after a failed JSON load is retried', async t => {
    let fail = true;
    const app = await loadPage('talk', { query: `?lang=en&paper=${key}&tag=double-category`, fetchOverride: name => name === 'papers' && fail ? { ok: false, status: 503 } : null });
    t.after(app.close);
    assert.equal(app.document.querySelector('#related-paper-controls').hidden, true);
    assert.match(app.document.querySelector('#catalog-status').textContent, /could not be loaded/);
    fail = false;
    app.document.querySelector('#catalog-status button').click();
    await settle();
    assert.equal(app.document.querySelector('#related-paper-controls').hidden, false);
    assert.equal(app.document.querySelector('#related-paper-filter').value, key);
    assert.equal(topic(app, 'double category').getAttribute('aria-pressed'), 'true');
    assert.equal(entries(app).length, related.filter(talk => talk.tags.includes('double-category')).length);
});
