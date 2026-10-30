import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { localized, validateApplications } from '../scripts/model.js';
import { loadPage, settle } from './helpers/dom.mjs';

const source = JSON.parse(fs.readFileSync(new URL('../databases/applications.json', import.meta.url), 'utf8'));
const titles = app => [...app.document.querySelectorAll('.application-title')].map(title => title.textContent);

test('application documents render from JSON and switch both text and links with the site language', async t => {
    const app = await loadPage('misc');
    t.after(app.close);
    for (const language of ['en', 'ja', 'en']) {
        app.document.querySelector(`[data-language="${language}"]`).click();
        assert.deepEqual(titles(app), source.applications.map(application => localized(application.title, language)));
        const entries = [...app.document.querySelectorAll('.application-entry')];
        entries.forEach((entry, index) => {
            const application = source.applications[index];
            const link = entry.querySelector('.resource-link');
            const titleLink = entry.querySelector('.application-title a');
            assert.equal(link.href, new URL(localized(application.url, language), app.window.location.href).href);
            assert.equal(link.textContent, 'PDF');
            assert.equal(titleLink.href, link.href);
            assert.equal(titleLink.textContent, localized(application.title, language));
            assert.equal(titleLink.target, '_blank');
            assert.equal(titleLink.rel, 'noopener noreferrer');
            assert.equal(link.target, '_blank');
            assert.equal(link.rel, 'noopener noreferrer');
            assert.ok(link.getAttribute('aria-label').includes(localized(application.title, language)));
            assert.equal(entry.querySelector('.application-description')?.textContent ?? '', localized(application.description, language));
        });
        assert.equal(app.document.querySelector('#applications').getAttribute('aria-busy'), 'false');
        assert.equal(app.document.querySelector('#applications-status').textContent, '');
        assert.deepEqual(app.errors, []);
    }
});

test('adding and reordering applications requires only JSON, with optional descriptions and localized document URLs', async t => {
    const data = { applications: [
        {
            title: { en: '<strong>New application</strong>', ja: '新しい申請書' },
            description: { en: 'New description', ja: '新しい説明' },
            url: { en: './misc/new-en.pdf', ja: './misc/new-ja.pdf' }
        },
        { title: 'Shared title', url: './misc/dc.pdf' }
    ] };
    const app = await loadPage('misc', { query: '?lang=ja', fetchOverride: name => name === 'applications' ? { ok: true, json: async () => data } : null });
    t.after(app.close);
    assert.deepEqual(titles(app), ['新しい申請書', 'Shared title']);
    assert.equal(app.document.querySelectorAll('.application-description').length, 1);
    for (const link of app.document.querySelectorAll('.application-entry:first-child a')) assert.match(link.href, /new-ja\.pdf$/);
    app.document.querySelector('[data-language="en"]').click();
    assert.deepEqual(titles(app), ['<strong>New application</strong>', 'Shared title']);
    assert.equal(app.document.querySelectorAll('#applications strong').length, 0);
    for (const link of app.document.querySelectorAll('.application-entry:first-child a')) assert.match(link.href, /new-en\.pdf$/);
    assert.equal(app.document.querySelectorAll('.social-links a').length, 3);
    assert.deepEqual(app.errors, []);
});

test('application loading errors and retries follow the selected language', async t => {
    let fail = true;
    const app = await loadPage('misc', { fetchOverride: name => name === 'applications' && fail ? { ok: false, status: 503 } : null });
    t.after(app.close);
    assert.equal(app.document.querySelectorAll('.application-entry').length, 0);
    assert.match(app.document.querySelector('#applications-status').textContent, /could not be loaded/);
    app.document.querySelector('[data-language="ja"]').click();
    assert.match(app.document.querySelector('#applications-status').textContent, /読み込めません/);
    fail = false;
    app.document.querySelector('#applications-status button').click();
    await settle();
    assert.deepEqual(titles(app), source.applications.map(application => localized(application.title, 'ja')));
    assert.equal(app.document.querySelector('#applications-status').textContent, '');
});

test('empty and malformed application lists show an appropriate message', async () => {
    for (const applications of [[], { title: 'Wrong shape' }]) {
        const app = await loadPage('misc', { query: '?lang=ja', fetchOverride: name => name === 'applications' ? { ok: true, json: async () => ({ applications }) } : null });
        try {
            assert.equal(app.document.querySelectorAll('.application-entry').length, 0);
            const message = app.document.querySelector('#applications-status').textContent;
            assert.match(message, Array.isArray(applications) ? /公開している申請書はまだありません/ : /読み込めません/);
            assert.equal(app.document.querySelectorAll('.social-links a').length, 3);
            assert.equal(app.document.querySelector('#applications').getAttribute('aria-busy'), 'false');
        } finally { app.close(); }
    }
});

test('application validation requires a title and document URL and accepts shared or localized fields', () => {
    assert.deepEqual(validateApplications(source.applications), []);
    assert.deepEqual(validateApplications([]), []);
    assert.deepEqual(validateApplications([{ title: 'Title', url: './misc/dc.pdf' }]), []);
    assert.deepEqual(validateApplications([{ title: { en: 'Title' }, url: { en: './misc/dc.pdf' } }]), []);
    assert.ok(validateApplications(null).length > 0);
    assert.ok(validateApplications([null]).length > 0);
    assert.ok(validateApplications([{ title: '', url: './misc/dc.pdf' }]).length > 0);
    assert.ok(validateApplications([{ title: 'Title', url: '' }]).length > 0);
    assert.ok(validateApplications([{ title: 'Title', url: './misc/dc.pdf', description: { en: 123 } }]).length > 0);
});
