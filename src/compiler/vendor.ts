import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { cwd, env } from 'node:process';

import { parseSync } from 'oxc-parser';

import { logger } from '../servicios/logger';

/**
 * Salida de producción autocontenida: en --prod los imports a
 * `/node_modules/<ruta>` se reescriben a `/<outDir>/vendor/<ruta>` y el
 * archivo se copia ahí junto con sus imports relativos (misma estructura, así
 * que sus `./x.js` siguen resolviendo). Así no hace falta desplegar
 * node_modules. Se desactiva con `vendor: false` en el config.
 *
 * ponytail: copia archivos, no hace bundling. Funciona con builds ESM para
 * navegador (los que ya elige el resolver: vue.esm-browser.prod.js, etc.).
 */
const NODE_MODULES_PREFIX = '/node_modules/';

export function isVendorEnabled(): boolean {
    return env.isPROD === 'true' && env.VENDOR !== 'false';
}

/** outDir como segmento de URL: sin `./` inicial, sin `/` final, con `/` (Windows). */
function distSegment(): string {
    return (env.PATH_DIST || './dist')
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/\/$/, '');
}

function vendorRoot(): string {
    return path.join(cwd(), distSegment(), 'vendor');
}

/** `/node_modules/vue/x.js` → `/dist/vendor/vue/x.js` (o null si no aplica). */
export function toVendorUrl(webPath: string): string | null {
    if (!webPath.startsWith(NODE_MODULES_PREFIX)) return null;
    return `/${distSegment()}/vendor/${webPath.slice(NODE_MODULES_PREFIX.length)}`;
}

const copied = new Set<string>();

/** Olvida qué archivos ya se copiaron (al inicio de cada --all y en tests). */
export function resetVendorCache(): void {
    copied.clear();
}

/** Resuelve un import bare (`vue`) a su ruta web (`/node_modules/vue/...`). */
export type BareResolver = (
    specifier: string,
    importer: string,
) => Promise<string | null>;

/**
 * Copia `node_modules/<rel>` a `<outDir>/vendor/<rel>` y, recursivamente, sus
 * imports relativos. Los imports bare dentro del archivo (`from "vue"`) se
 * resuelven con `resolveBare` y se reescriben a su ruta en vendor: si no, el
 * navegador no podría resolverlos o (con un importmap) cargaría otra copia de
 * Vue y se romperían inject/reactividad.
 */
export async function copyVendorFile(
    webPath: string,
    resolveBare?: BareResolver,
): Promise<void> {
    if (!webPath.startsWith(NODE_MODULES_PREFIX)) return;
    const rel = webPath.slice(NODE_MODULES_PREFIX.length).split(/[?#]/)[0]!;
    const source = path.join(cwd(), 'node_modules', rel);
    const target = path.join(vendorRoot(), rel);
    // existsSync: si se borró outDir entre builds (API, --watch) hay que recopiar
    if (copied.has(source) && existsSync(target)) return;
    copied.add(source);

    try {
        await mkdir(path.dirname(target), { recursive: true });
        if (!/\.m?js$/.test(source)) {
            await copyFile(source, target);
            return;
        }
    } catch (error) {
        logger.warn(
            `⚠️ vendor: no se pudo copiar ${rel}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
    }

    let code: string;
    try {
        code = await readFile(source, 'utf-8');
    } catch (error) {
        logger.warn(
            `⚠️ vendor: no se pudo leer ${rel}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
    }
    const { module } = parseSync(source, code, {
        sourceType: 'module',
        lang: 'js',
    });

    type Request = { value: string; start: number; end: number };
    const requests: Request[] = [];
    const addLiteral = (start: number, end: number) => {
        const m = /^(['"])(.*)\1$/.exec(code.slice(start, end));
        if (m) requests.push({ value: m[2]!, start, end });
    };
    for (const i of module.staticImports) {
        addLiteral(i.moduleRequest.start, i.moduleRequest.end);
    }
    for (const e of module.staticExports) {
        for (const entry of e.entries) {
            if (entry.moduleRequest) {
                addLiteral(entry.moduleRequest.start, entry.moduleRequest.end);
            }
        }
    }
    for (const d of module.dynamicImports) {
        const raw = code.slice(d.moduleRequest.start, d.moduleRequest.end);
        if (/^['"]/.test(raw))
            addLiteral(d.moduleRequest.start, d.moduleRequest.end);
        else {
            logger.warn(
                `⚠️ vendor: ${rel} tiene un import() dinámico no literal (${raw.slice(0, 40)}): sus chunks no se copian`,
            );
        }
    }

    const replacements: Array<{ start: number; end: number; value: string }> =
        [];
    for (const request of requests) {
        if (request.value.startsWith('./') || request.value.startsWith('../')) {
            const dep = path.posix.join(path.posix.dirname(rel), request.value);
            await copyVendorFile(`${NODE_MODULES_PREFIX}${dep}`, resolveBare);
            continue;
        }
        if (/^(https?:|data:|\/)/.test(request.value)) continue;
        const resolved = resolveBare
            ? await resolveBare(request.value, source)
            : null;
        const vendorUrl = resolved ? toVendorUrl(resolved) : null;
        if (!resolved || !vendorUrl) {
            logger.warn(
                `⚠️ vendor: ${rel} importa "${request.value}" (import bare) y no se pudo resolver: el navegador no podrá cargarlo`,
            );
            continue;
        }
        await copyVendorFile(resolved, resolveBare);
        replacements.push({
            start: request.start,
            end: request.end,
            value: JSON.stringify(vendorUrl),
        });
    }

    for (const r of replacements.sort((a, b) => b.start - a.start)) {
        code = code.slice(0, r.start) + r.value + code.slice(r.end);
    }
    try {
        await writeFile(target, code, 'utf-8');
    } catch (error) {
        logger.warn(
            `⚠️ vendor: no se pudo escribir ${rel}: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}
