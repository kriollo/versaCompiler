import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { cwd, env } from 'node:process';
import { parseEnv } from 'node:util';

import { parseSync, Visitor } from 'oxc-parser';

/** Solo las variables con este prefijo llegan al navegador (el resto puede ser secreto). */
export const CLIENT_ENV_PREFIX = 'VERSA_';

export function getMode(): string {
    return env.MODE || (env.isPROD === 'true' ? 'production' : 'development');
}

/**
 * `import.meta.env` del cliente: variables `VERSA_*` de `.env`, `.env.local`,
 * `.env.<mode>` y `.env.<mode>.local` (en ese orden de prioridad creciente) y
 * del entorno del proceso (gana sobre los archivos, útil en CI), más
 * `MODE`, `PROD` y `DEV`.
 */
export function loadClientEnv(): Record<string, string | boolean> {
    const mode = getMode();
    const vars: Record<string, string> = {};
    for (const name of [
        '.env',
        '.env.local',
        `.env.${mode}`,
        `.env.${mode}.local`,
    ]) {
        try {
            Object.assign(
                vars,
                parseEnv(readFileSync(path.join(cwd(), name), 'utf8')),
            );
        } catch {
            // archivo inexistente: se ignora
        }
    }
    for (const [key, value] of Object.entries(env)) {
        if (key.startsWith(CLIENT_ENV_PREFIX) && value !== undefined)
            vars[key] = value;
    }

    const clientEnv: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(vars)) {
        if (key.startsWith(CLIENT_ENV_PREFIX)) clientEnv[key] = value;
    }
    const isProd = env.isPROD === 'true';
    return { ...clientEnv, MODE: mode, PROD: isProd, DEV: !isProd };
}

let envSignature: string | null = null;

/**
 * Firma de todo lo que puede cambiar el código generado por import.meta.env:
 * modo, archivos .env* y variables VERSA_* del proceso. Va en la clave del
 * cache de compilación. Se calcula una vez por proceso (ver invalidateClientEnv).
 */
export function clientEnvSignature(): string {
    if (envSignature === null) envSignature = JSON.stringify(loadClientEnv());
    return envSignature;
}

/** Llamar cuando cambie un .env (watch) o el modo (API). */
export function invalidateClientEnv(): void {
    envSignature = null;
}

type Replacement = {
    start: number;
    end: number;
    value: string;
    /** No filtrar por `skip` (shorthand: la Property y su clave tienen el mismo rango) */
    force?: boolean;
};

/**
 * Sustituye `import.meta.env.X` por su valor literal y aplica `define` del
 * config (`{ __VERSION__: '"1.0.0"', 'process.env.NODE_ENV': '"production"' }`;
 * el valor es una expresión JS, como en Vite). Trabaja sobre el AST, así que
 * no toca strings ni comentarios. Al quedar literales, el minificador elimina
 * ramas como `if (import.meta.env.DEV) { ... }` en --prod.
 */
export function applyClientEnv(code: string, file = 'file.js'): string {
    let defines: Record<string, string> = {};
    try {
        defines = JSON.parse(env.DEFINE || '{}');
    } catch {
        defines = {};
    }
    const defineKeys = Object.keys(defines);
    const usesEnv = code.includes('import.meta');
    if (!usesEnv && !defineKeys.some(key => code.includes(key))) return code;

    const { program } = parseSync(file, code, {
        sourceType: 'module',
        // a esta altura .vue/.ts ya son JS, salvo un .ts aún sin transpilar
        lang: /\.[mc]?ts$/.test(file) ? 'ts' : 'js',
    });
    const clientEnv = usesEnv ? loadClientEnv() : {};
    const found: Replacement[] = [];
    // Posiciones donde un nombre definido NO es un uso: declaraciones, claves,
    // imports/exports, lados izquierdos de asignación y parámetros. Reemplazar
    // ahí produciría JS inválido (`const "1.0" = ...`). esbuild hace lo mismo.
    const skip: Array<[number, number]> = [];
    const skipNode = (n: any) => n && skip.push([n.start, n.end]);
    const skipParams = (n: any) => n.params?.forEach(skipNode);

    new Visitor({
        VariableDeclarator: (n: any) => skipNode(n.id),
        AssignmentExpression: (n: any) => skipNode(n.left),
        UpdateExpression: (n: any) => skipNode(n.argument),
        ImportSpecifier: skipNode,
        ImportDefaultSpecifier: skipNode,
        ImportNamespaceSpecifier: skipNode,
        ExportSpecifier: skipNode,
        FunctionDeclaration: (n: any) => {
            skipNode(n.id);
            skipParams(n);
        },
        FunctionExpression: (n: any) => {
            skipNode(n.id);
            skipParams(n);
        },
        ArrowFunctionExpression: skipParams,
        ClassDeclaration: (n: any) => skipNode(n.id),
        MethodDefinition: (n: any) => !n.computed && skipNode(n.key),
        PropertyDefinition: (n: any) => !n.computed && skipNode(n.key),
        Property(n: any) {
            if (n.shorthand && n.key?.name in defines) {
                // { __VERSION__ } → { __VERSION__: "1.0" }
                found.push({
                    start: n.start,
                    end: n.end,
                    value: `${n.key.name}: ${defines[n.key.name]}`,
                    force: true,
                });
                skipNode(n.key);
            } else if (!n.computed) {
                skipNode(n.key);
            }
        },
        MemberExpression(node: any) {
            const text = code.slice(node.start, node.end);
            if (text in defines) {
                found.push({
                    start: node.start,
                    end: node.end,
                    value: String(defines[text]),
                });
                return;
            }
            const isEnv =
                node.object?.type === 'MetaProperty' &&
                node.object.meta?.name === 'import' &&
                node.object.property?.name === 'meta' &&
                !node.computed &&
                node.property?.name === 'env';
            if (!isEnv) return;
            // `import.meta.env.KEY` → valor de KEY; `import.meta.env` → objeto completo
            const key = /^\.([A-Za-z_$][\w$]*)/.exec(code.slice(node.end));
            if (key) {
                const name = key[1]!;
                found.push({
                    start: node.start,
                    end: node.end + key[0].length,
                    value:
                        name in clientEnv
                            ? JSON.stringify(clientEnv[name])
                            : 'undefined',
                });
            } else {
                found.push({
                    start: node.start,
                    end: node.end,
                    value: JSON.stringify(clientEnv),
                });
            }
        },
        Identifier(node: any) {
            if (!(node.name in defines)) return;
            // obj.__VERSION__ es una propiedad, no el identificador definido
            if (
                /\.\s*$/.test(
                    code.slice(Math.max(0, node.start - 8), node.start),
                )
            )
                return;
            found.push({
                start: node.start,
                end: node.end,
                value: String(defines[node.name]),
            });
        },
    }).visit(program);

    const inSkip = (r: Replacement) =>
        skip.some(([a, b]) => r.start >= a && r.end <= b);
    const usable = found.filter(r => r.force || !inSkip(r));
    if (usable.length === 0) return code;
    // Exteriores primero; se descartan los anidados (p. ej. el Identifier dentro
    // de un MemberExpression ya reemplazado)
    usable.sort(
        (a, b) =>
            a.start - b.start ||
            b.end - a.end ||
            Number(!!b.force) - Number(!!a.force),
    );
    const kept: Replacement[] = [];
    for (const r of usable) {
        const last = kept[kept.length - 1];
        if (last && r.start < last.end) continue;
        kept.push(r);
    }
    for (const r of kept.reverse()) {
        code = code.slice(0, r.start) + r.value + code.slice(r.end);
    }
    return code;
}
