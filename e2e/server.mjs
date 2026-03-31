/**
 * Static file server para tests Playwright.
 * Sirve archivos desde la raíz del proyecto (node_modules/, public/, e2e/).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.cjs':  'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
    '.woff2':'font/woff2',
    '.woff': 'font/woff',
    '.ttf':  'font/ttf',
};

const server = http.createServer((req, res) => {
    // Ignorar query strings
    let urlPath = (req.url ?? '/').split('?')[0];

    // Raíz → página de test
    if (urlPath === '/' || urlPath === '/index.html') {
        urlPath = '/e2e/index.html';
    }

    const filePath = path.join(ROOT, urlPath);

    // Seguridad: evitar path traversal fuera de ROOT
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, {
            'Content-Type': MIME[ext] ?? 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
        });
        res.end(content);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not found: ${urlPath}`);
    }
});

server.listen(PORT, () => {
    console.log(`[e2e-server] http://localhost:${PORT}`);
});
