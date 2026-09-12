/**
 * Static file server para tests Playwright.
 * Sirve archivos desde la raíz del proyecto (node_modules/, public/, e2e/).
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.cjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
};

/**
 * Los import maps de los HTML de e2e fijan rutas exactas dentro de
 * node_modules/.pnpm/<paquete>@<version>[_peerHash]/... para paquetes que
 * pnpm no hoistea a la raíz (dependencias transitivas). Como no hay
 * pnpm-lock.yaml commiteado, cada `pnpm install` puede resolver una versión
 * distinta y esa ruta exacta queda obsoleta (404). Este fallback busca en
 * .pnpm/ cualquier carpeta que empiece con el mismo nombre de paquete y
 * sirve desde ahí, sin necesidad de tocar los HTML cada vez que una
 * dependencia sube de versión.
 */
function resolvePnpmFallback(filePath) {
    const marker = `${path.sep}.pnpm${path.sep}`;
    const idx = filePath.indexOf(marker);
    if (idx === -1) return null;

    const pnpmDir = filePath.slice(0, idx + marker.length);
    const rest = filePath.slice(idx + marker.length);
    const sepIdx = rest.indexOf(path.sep);
    if (sepIdx === -1) return null;

    const requestedEntry = rest.slice(0, sepIdx);
    const tailParts = rest
        .slice(sepIdx + 1)
        .split(path.sep)
        .filter(Boolean);

    // Nombre del paquete = todo antes del "@" de versión. Los scoped
    // packages se codifican como "@scope+name" (empiezan con "@"), así que
    // ese primer "@" no cuenta como separador de versión.
    const atIdx = requestedEntry.indexOf(
        '@',
        requestedEntry.startsWith('@') ? 1 : 0,
    );
    if (atIdx === -1) return null;
    const pkgName = requestedEntry.slice(0, atIdx);

    let entries;
    try {
        entries = fs.readdirSync(pnpmDir);
    } catch {
        return null;
    }
    const match = entries.find(e => e.startsWith(`${pkgName}@`));
    if (!match) return null;

    return path.join(pnpmDir, match, ...tailParts);
}

const server = http.createServer((req, res) => {
    // Ignorar query strings
    let urlPath = (req.url ?? '/').split('?')[0];

    // Raíz → página de test
    if (urlPath === '/' || urlPath === '/index.html') {
        urlPath = '/e2e/index.html';
    }

    // /__versa/ → archivos HMR del compilador (src/hrm/)
    let filePath;
    if (urlPath.startsWith('/__versa/')) {
        const file = urlPath.slice('/__versa/'.length);
        filePath = path.join(ROOT, 'src', 'hrm', file);
    } else {
        filePath = path.join(ROOT, urlPath);
    }

    // Seguridad: evitar path traversal fuera de ROOT
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        let content;
        try {
            content = fs.readFileSync(filePath);
        } catch (err) {
            const fallbackPath = resolvePnpmFallback(filePath);
            if (!fallbackPath) throw err;
            content = fs.readFileSync(fallbackPath);
        }
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
