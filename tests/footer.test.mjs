import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPage, settle } from './helpers/dom.mjs';

test('every page shows the same publication instant with English UTC and Japanese UTC+9 dates', async () => {
    for (const page of ['index', 'paper', 'talk', 'notes', 'cv', 'misc', '404']) {
        const requests = [];
        const app = await loadPage(page, {
            headOverride: (input, options) => {
                requests.push({ input, method: options.method, cache: options.cache });
                return { ok: true, headers: new Headers({ 'Last-Modified': 'Fri, 30 Oct 2026 16:00:00 GMT' }) };
            }
        });
        try {
            const footer = app.document.querySelector('footer');
            assert.equal(footer.hidden, false);
            assert.equal(app.document.querySelectorAll('footer').length, 1);
            assert.equal(footer.querySelector('time').dateTime, '2026-10-30T16:00:00.000Z');
            assert.equal(footer.textContent, 'Last updated: October 30, 2026');
            app.document.querySelector('[data-language="ja"]').click();
            assert.equal(footer.textContent, '最終更新日： 2026年10月31日');
            app.document.querySelector('[data-language="en"]').click();
            assert.equal(footer.textContent, 'Last updated: October 30, 2026');
            assert.deepEqual(requests, [{ input: '/', method: 'HEAD', cache: 'no-cache' }]);
            assert.deepEqual(app.errors, []);
        } finally { app.close(); }
    }
});

test('a publication response arriving after a language change uses the selected time zone', async t => {
    let resolveHead;
    const head = new Promise(resolve => { resolveHead = resolve; });
    const app = await loadPage('index', { headOverride: () => head });
    t.after(app.close);
    assert.equal(app.document.querySelector('footer').hidden, true);
    app.document.querySelector('[data-language="ja"]').click();
    resolveHead({ ok: true, headers: new Headers({ 'Last-Modified': 'Fri, 30 Oct 2026 16:00:00 GMT' }) });
    await settle();
    assert.equal(app.document.querySelector('footer').textContent, '最終更新日： 2026年10月31日');
    assert.equal(app.document.querySelector('footer').hidden, false);
    assert.deepEqual(app.errors, []);
});

test('missing, invalid and failed publication metadata never produce a fabricated update date', async () => {
    const responses = [
        () => ({ ok: true, headers: new Headers() }),
        () => ({ ok: true, headers: new Headers({ 'Last-Modified': 'invalid' }) }),
        () => ({ ok: false, headers: new Headers({ 'Last-Modified': 'Fri, 30 Oct 2026 16:00:00 GMT' }) }),
        () => { throw new Error('Offline'); }
    ];
    for (const headOverride of responses) {
        const app = await loadPage('index', { headOverride });
        try {
            assert.equal(app.document.querySelector('footer').hidden, true);
            assert.equal(app.document.querySelector('footer time').hasAttribute('datetime'), false);
            assert.deepEqual(app.errors, []);
        } finally { app.close(); }
    }
});
