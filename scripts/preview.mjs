import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeUpdates } from './generate-updates.mjs';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf', '.xml': 'application/xml; charset=utf-8'
};
const isFile = async file => { try { return (await stat(file)).isFile(); } catch { return false; } };

export function createPreviewServer(root = siteRoot) {
    return createServer(async (request, response) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            const pathname = decodeURIComponent(url.pathname);
            if (pathname.split('/').some(part => part.startsWith('.') || part === 'node_modules')) {
                response.writeHead(404).end('Not found');
                return;
            }
            let file = path.resolve(root, `.${pathname}`);
            const relative = path.relative(root, file);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                response.writeHead(404).end('Not found');
                return;
            }
            // Match clean page URLs before same-named asset directories (notes/, misc/).
            const clean = pathname.replace(/\/$/, '');
            const html = path.resolve(root, `.${clean}.html`);
            if (clean && !path.extname(clean) && await isFile(html)) {
                if (pathname.endsWith('/')) {
                    response.writeHead(302, { Location: clean + url.search }).end();
                    return;
                }
                file = html;
            } else if (!await isFile(file)) file = path.join(file, 'index.html');
            const found = await isFile(file);
            if (!found) file = path.join(root, '404.html');
            response.writeHead(found ? 200 : 404, {
                'Content-Type': mime[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
                'Last-Modified': (await stat(file)).mtime.toUTCString(),
                'Cache-Control': 'no-store'
            });
            if (request.method === 'HEAD') response.end();
            else createReadStream(file).on('error', () => response.destroy()).pipe(response);
        } catch {
            response.writeHead(400).end('Bad request');
        }
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const index = process.argv.indexOf('--port');
    const port = index < 0 ? 8000 : Number(process.argv[index + 1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
    const history = writeUpdates();
    console.log(`Generated ${history.updates.length} updates from main.`);
    const server = createPreviewServer();
    server.on('error', error => {
        console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Choose another port with --port.` : error.message);
        process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${port}/`;
        console.log(`Local preview: ${url}`);
        if (process.argv.includes('--open') && process.platform === 'win32') {
            const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { stdio: 'ignore', windowsHide: true });
            browser.on('error', () => console.log(`Open ${url} in your browser.`));
            browser.unref();
        }
    });
}
