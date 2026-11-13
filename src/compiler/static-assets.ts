import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { env } from 'node:process';

/**
 * Archivos no-código importables desde JS/TS/Vue. Sin bundler, el navegador
 * no puede importar `.json`, `.css` ni imágenes como módulos: se copian a
 * outDir y junto a cada uno se genera `<archivo>.js` (transforms.ts reescribe
 * `./x.css` → `./x.css.js`):
 * - `.json` → `export default {...}`
 * - `.css`  → inyecta un `<link rel="stylesheet">` (una sola vez) y exporta la URL
 * - resto   → `export default` con la URL absoluta del archivo
 */
export const STATIC_ASSET_EXTENSIONS = [
    'json',
    'css',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'webp',
    'avif',
    'ico',
    'bmp',
    'woff',
    'woff2',
    'ttf',
    'otf',
    'eot',
    'mp4',
    'webm',
    'ogg',
    'mp3',
    'wav',
    'pdf',
    'txt',
];

const EXT_SET = new Set(STATIC_ASSET_EXTENSIONS);

export function isStaticAsset(file: string): boolean {
    return EXT_SET.has(path.extname(file).slice(1).toLowerCase());
}

/** El input de Tailwind lo procesa Tailwind: copiarlo podría pisar su salida. */
function isTailwindInput(file: string): boolean {
    try {
        const input = JSON.parse(env.tailwindcss || 'false')?.input;
        return !!input && path.resolve(input) === path.resolve(file);
    } catch {
        return false;
    }
}

function wrapperFor(file: string, content: string): string {
    const url = `new URL(${JSON.stringify(`./${path.basename(file)}`)}, import.meta.url).href`;
    const ext = path.extname(file).toLowerCase();
    if (ext === '.json') {
        // JSON.parse valida el archivo: un JSON roto falla aquí y no en el navegador
        return `export default ${JSON.stringify(JSON.parse(content))};\n`;
    }
    if (ext === '.css') {
        return `const href = ${url};
if (typeof document !== 'undefined' && !document.querySelector(\`link[data-versa-css="\${href}"]\`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.versaCss = href;
    document.head.appendChild(link);
}
export default href;
`;
    }
    return `export default ${url};\n`;
}

/**
 * Copia `file` a `outFile` y escribe su módulo `outFile + '.js'`.
 * @returns `false` si se omitió (input de Tailwind).
 */
export async function emitStaticAsset(
    file: string,
    outFile: string,
): Promise<boolean> {
    if (isTailwindInput(file)) return false;
    await mkdir(path.dirname(outFile), { recursive: true });
    const content = /\.json$/i.test(file) ? await readFile(file, 'utf-8') : '';
    await copyFile(file, outFile);
    await writeFile(`${outFile}.js`, wrapperFor(file, content), 'utf-8');
    return true;
}
