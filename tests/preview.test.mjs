import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createPreviewServer } from '../scripts/preview.mjs';

test('HTTP preview resolves all clean routes, assets, legacy paths and unknown pages', async t => {
    const server = createPreviewServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => server.close());
    const base = `http://127.0.0.1:${server.address().port}`;
    const metadata = await fetch(base, { method: 'HEAD' });
    assert.equal(metadata.status, 200);
    assert.equal(metadata.headers.get('last-modified'), fs.statSync(new URL('../index.html', import.meta.url)).mtime.toUTCString());
    assert.equal(await metadata.text(), '');
    for (const page of ['index', 'paper', 'talk', 'notes', 'cv', 'misc']) {
        for (const lang of ['en', 'ja']) {
            const route = page === 'index' ? '/' : `/${page}`;
            const response = await fetch(`${base}${route}?lang=${lang}`);
            assert.equal(response.status, 200);
            assert.equal(await response.text(), fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8'));
        }
    }
    for (const asset of ['styles/site.css', 'scripts/catalog.js', 'scripts/applications.js', 'databases/notes.json', 'databases/applications.json', 'notes/FPTerminal.pdf', 'misc/dc.pdf', 'yutokawase/paper.html']) {
        const response = await fetch(`${base}/${asset}`);
        assert.equal(response.status, 200, asset);
        await response.arrayBuffer();
    }
    const redirect = await fetch(`${base}/notes/?lang=ja`, { redirect: 'manual' });
    assert.equal(redirect.headers.get('location'), '/notes?lang=ja');
    const missing = await fetch(`${base}/not-a-page`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
    assert.equal((await fetch(`${base}/.git/config`)).status, 404);
});

test('legacy redirects preserve language and paper fragments, including PDF paths', () => {
    const pages = ['index', 'paper', 'talk', 'notes', 'cv', 'misc'];
    for (const page of pages) {
        const html = fs.readFileSync(new URL(`../yutokawase/${page}.html`, import.meta.url), 'utf8');
        const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
        let redirected;
        const location = {
            origin: 'https://example.test', pathname: `/yutokawase/${page}.html`, search: '?lang=ja', hash: '#preprint-4',
            replace(url) { redirected = url; }
        };
        vm.runInNewContext(script, { window: { location } });
        assert.equal(redirected, `https://example.test/${page === 'index' ? '' : page}?lang=ja#preprint-4`);
    }
    const script = fs.readFileSync(new URL('../404.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
    let redirected;
    const location = { origin: 'https://example.test', pathname: '/yutokawase/notes/FPTerminal.pdf', search: '?lang=ja', hash: '#page=2', replace(url) { redirected = url; } };
    vm.runInNewContext(script, { window: { location } });
    assert.equal(redirected, 'https://example.test/notes/FPTerminal.pdf?lang=ja#page=2');
});
