import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = fileURLToPath(new URL('../../', import.meta.url));

export async function loadPage(page, { query = '?lang=en', hash = '', saved, fetchOverride, headOverride, storageBlocked = false } = {}) {
    const errors = [];
    const console = new VirtualConsole();
    console.on('jsdomError', error => errors.push(error.message));
    console.on('error', error => errors.push(String(error)));
    const dom = new JSDOM(fs.readFileSync(path.join(root, `${page}.html`), 'utf8'), {
        url: `http://localhost/${page === 'index' ? '' : page}${query}${hash}`,
        runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
    });
    const { window } = dom;
    const { document } = window;
    if (saved) window.localStorage.setItem('site-language', saved);
    if (storageBlocked) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
    window.Element.prototype.scrollIntoView = function () { window.lastScrolledId = this.id; };
    window.requestAnimationFrame = callback => { callback(); return 1; };
    window.fetch = async (input, options = {}) => {
        if (options.method === 'HEAD') return headOverride
            ? headOverride(input, options)
            : { ok: true, headers: new Headers({ 'Last-Modified': 'Fri, 30 Oct 2026 16:00:00 GMT' }) };
        const name = String(input).match(/([^/]+)\.json$/)[1];
        const custom = await fetchOverride?.(name);
        if (custom) return custom;
        return { ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, 'databases', `${name}.json`), 'utf8')) };
    };
    const modules = new Map();
    const context = dom.getInternalVMContext();
    function getModule(url) {
        if (!modules.has(url)) modules.set(url, new vm.SourceTextModule(fs.readFileSync(fileURLToPath(url), 'utf8'), { context, identifier: url }));
        return modules.get(url);
    }
    const entry = new vm.SourceTextModule([...document.querySelectorAll('script[type="module"]')]
        .map(script => `import ${JSON.stringify(script.getAttribute('src'))};`).join('\n'), {
        context, identifier: pathToFileURL(path.join(root, 'test-entry.js')).href
    });
    await entry.link((specifier, parent) => getModule(specifier.startsWith('/')
        ? pathToFileURL(path.join(root, specifier.slice(1))).href
        : new URL(specifier, parent.identifier).href));
    await entry.evaluate();
    await settle();
    return { dom, window, document, errors, close: () => window.close() };
}

export async function settle() {
    for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve));
}

export function pointer(window, element, type, relatedTarget = null, pointerType = 'mouse') {
    const event = new window.Event(type);
    Object.defineProperties(event, { relatedTarget: { value: relatedTarget }, pointerType: { value: pointerType } });
    element.dispatchEvent(event);
}
