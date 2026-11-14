import { copyFile, mkdir, readFile } from 'node:fs/promises';
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
 * navegador (los que ya elige el resolver: vue.esm-browser.prod.js, etc.);
 * un import *bare* dentro de un archivo de vendor se avisa y queda como está.
 */
const NODE_MODULES_PREFIX = '/node_modules/';

export function isVendorEnabled(): boolean {
    return env.isPROD === 'true' && env.VENDOR !== 'false';
}

function vendorRoot(): string {
    const dist = (env.PATH_DIST || './dist')
        .replace(/^\.[/\\]/, '')
        .replace(/[/\\]$/, '');
    return path.join(cwd(), dist, 'vendor');
}

/** `/node_modules/vue/x.js` → `/dist/vendor/vue/x.js` (o null si no aplica). */
export function toVendorUrl(webPath: string): string | null {
    if (!webPath.startsWith(NODE_MODULES_PREFIX)) return null;
    const dist = (env.PATH_DIST || './dist')
        .replace(/^\.[/\\]/, '')
        .replace(/[/\\]$/, '');
    return `/${dist}/vendor/${webPath.slice(NODE_MODULES_PREFIX.length)}`;
}

const copied = new Set<string>();

/** Solo para tests: olvida qué archivos ya se copiaron. */
export function resetVendorCache(): void {
    copied.clear();
}

/**
 * Copia `node_modules/<rel>` a `<outDir>/vendor/<rel>` y, recursivamente, los
 * archivos que importa con rutas relativas.
 */
export async function copyVendorFile(webPath: string): Promise<void> {
    if (!webPath.startsWith(NODE_MODULES_PREFIX)) return;
    const rel = webPath.slice(NODE_MODULES_PREFIX.length).split(/[?#]/)[0]!;
    const source = path.join(cwd(), 'node_modules', rel);
    if (copied.has(source)) return;
    copied.add(source);

    const target = path.join(vendorRoot(), rel);
    try {
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(source, target);
    } catch (error) {
        logger.warn(
            `⚠️ vendor: no se pudo copiar ${rel}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
    }

    if (!/\.m?js$/.test(source)) return;
    const code = await readFile(source, 'utf-8');
    const { module } = parseSync(source, code, {
        sourceType: 'module',
        lang: 'js',
    });
    const requests = [
        ...module.staticImports.map(i => i.moduleRequest.value),
        ...module.staticExports.flatMap(e =>
            e.entries.map(entry => entry.moduleRequest?.value).filter(Boolean),
        ),
        ...module.dynamicImports
            .map(
                d =>
                    /^['"](.*)['"]$/.exec(
                        code.slice(d.moduleRequest.start, d.moduleRequest.end),
                    )?.[1],
            )
            .filter(Boolean),
    ] as string[];

    for (const request of new Set(requests)) {
        if (request.startsWith('./') || request.startsWith('../')) {
            const dep = path.posix.join(path.posix.dirname(rel), request);
            await copyVendorFile(`${NODE_MODULES_PREFIX}${dep}`);
        } else if (!/^(https?:|data:|\/)/.test(request)) {
            logger.warn(
                `⚠️ vendor: ${rel} importa "${request}" (import bare): el navegador no podrá resolverlo`,
            );
        }
    }
}
