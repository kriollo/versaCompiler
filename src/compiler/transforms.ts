import path from 'node:path';
import { env } from 'node:process';

import { logger } from '../servicios/logger';
import { EXCLUDED_MODULES } from '../utils/excluded-modules';
import { getModuleSubPath } from '../utils/module-resolver';

import { analyzeAndFormatMultipleErrors } from './error-reporter';
import { integrityValidator } from './integrity-validator';
import {
    getOptimizedAliasPath,
    getOptimizedModulePath,
} from './module-resolution-optimizer';
import { parser } from './parser';

// ✨ OPTIMIZACIÓN CRÍTICA: Cache de PATH_ALIAS parseado
let cachedPathAlias: any = null;
let lastPathAliasString: string | null = null;

export function getParsedPathAlias(): any {
    if (!env.PATH_ALIAS) return null;

    // Solo parsear si el string cambió
    if (cachedPathAlias && lastPathAliasString === env.PATH_ALIAS) {
        return cachedPathAlias;
    }

    cachedPathAlias = JSON.parse(env.PATH_ALIAS);
    lastPathAliasString = env.PATH_ALIAS;
    return cachedPathAlias;
}

// Módulos built-in de Node.js que no deben ser resueltos
const NODE_BUILTIN_MODULES = new Set([
    'fs',
    'path',
    'os',
    'crypto',
    'http',
    'https',
    'url',
    'util',
    'events',
    'stream',
    'buffer',
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'net',
    'readline',
    'repl',
    'tls',
    'tty',
    'vm',
    'zlib',
    'assert',
    'module',
    'process',
    'querystring',
    'string_decoder',
    'timers',
    'v8',
    'worker_threads',
]);

/**
 * Determina si un moduleRequest es un módulo externo que debe ser resuelto
 * @param moduleRequest - El string del import (ej: 'vue', './local', '/absolute')
 * @param pathAlias - Objeto con los alias definidos
 * @returns true si es un módulo externo que debe resolverse
 */
function isExternalModule(
    moduleRequest: string,
    pathAlias: Record<string, any>,
): boolean {
    // Descartar rutas relativas y absolutas
    if (
        moduleRequest.startsWith('./') ||
        moduleRequest.startsWith('../') ||
        moduleRequest.startsWith('/')
    ) {
        return false;
    }

    // Descartar rutas que parecen ser locales (contienen carpetas conocidas del proyecto)
    const localPaths = [
        'public/',
        'src/',
        'dist/',
        'components/',
        'utils/',
        'assets/',
        'styles/',
    ];
    if (localPaths.some(localPath => moduleRequest.startsWith(localPath))) {
        return false;
    } // Descartar módulos built-in de Node.js (incluyendo node: prefix)
    const cleanModuleName = moduleRequest.replace(/^node:/, '');
    if (NODE_BUILTIN_MODULES.has(cleanModuleName)) {
        return false;
    } // NUEVA LÓGICA: Verificar PRIMERO si es un módulo excluido antes de verificar alias
    // Esto es importante porque algunos módulos excluidos pueden tener nombres que
    // coinciden con patrones de alias (como @vue/compiler-sfc con @/*)
    if (EXCLUDED_MODULES.has(moduleRequest)) {
        return true;
    } // Descartar alias conocidos
    for (const alias of Object.keys(pathAlias)) {
        // Quitar solo el '*' final para conservar el separador '/'
        // Ejemplo: '@/*' → '@/', así '@vueuse/core' no hace match pero '@/foo' sí
        const aliasPattern = alias.replace('*', '');
        if (moduleRequest.startsWith(aliasPattern)) {
            return false;
        }
    } // Verificar si parece ser un módulo npm (no contiene extensiones de archivo)
    if (
        moduleRequest.includes('.js') ||
        moduleRequest.includes('.ts') ||
        moduleRequest.includes('.vue') ||
        moduleRequest.includes('.css') ||
        moduleRequest.includes('.json')
    ) {
        return false;
    }

    // Si llegamos aquí, es probablemente un módulo externo
    return true;
}

async function resolveModuleRequest(
    moduleRequest: string,
    file: string | undefined,
    pathAlias: Record<string, any>,
): Promise<string | null> {
    let newPath: string | null = null;
    let transformed = false;

    if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
        try {
            const optimizedResult = await getOptimizedModulePath(
                moduleRequest,
                file,
            );
            if (optimizedResult.excluded) {
                return null;
            }
            if (optimizedResult.path) {
                newPath = optimizedResult.path;
                transformed = true;
            } else {
                const modulePath = getModuleSubPath(moduleRequest, file);
                if (modulePath === null) {
                    return null;
                }
                if (modulePath) {
                    newPath = modulePath;
                    transformed = true;
                }
            }
        } catch (error) {
            if (env.VERBOSE === 'true')
                logger.warn(
                    `Error resolviendo módulo ${moduleRequest}: ${error instanceof Error ? error.message : String(error)}`,
                );
        }
    }

    if (!transformed) {
        const aliasPath = getOptimizedAliasPath(moduleRequest);
        if (aliasPath) {
            let newImportPath = aliasPath;
            if (
                newImportPath.endsWith('.ts') ||
                newImportPath.endsWith('.vue')
            ) {
                newImportPath = newImportPath.replace(/\.(ts|vue)$/, '.js');
            } else if (!/\.(js|mjs|css|json)$/.test(newImportPath)) {
                newImportPath += '.js';
            }
            newPath = newImportPath;
            transformed = true;
        } else {
            for (const [alias] of Object.entries(pathAlias)) {
                const aliasPattern = alias.replace('*', '');
                if (moduleRequest.startsWith(aliasPattern)) {
                    const relativePath = moduleRequest.replace(
                        aliasPattern,
                        '',
                    );
                    let newImportPath = path.join(
                        '/',
                        env.PATH_DIST!,
                        relativePath,
                    );
                    newImportPath = newImportPath
                        .replace(/\/\.\//g, '/')
                        .replace(/\\/g, '/');

                    if (
                        newImportPath.endsWith('.ts') ||
                        newImportPath.endsWith('.vue')
                    ) {
                        newImportPath = newImportPath.replace(
                            /\.(ts|vue)$/,
                            '.js',
                        );
                    } else if (!/\.(js|mjs|css|json)$/.test(newImportPath)) {
                        newImportPath += '.js';
                    }
                    newPath = newImportPath;
                    transformed = true;
                    break;
                }
            }
        }
    }

    if (
        !transformed &&
        (moduleRequest.startsWith('./') || moduleRequest.startsWith('../'))
    ) {
        let relativePath = moduleRequest;
        if (relativePath.endsWith('.ts') || relativePath.endsWith('.vue')) {
            relativePath = relativePath.replace(/\.(ts|vue)$/, '.js');
            newPath = relativePath;
            transformed = true;
        } else if (!/\.(js|mjs|css|json)$/.test(relativePath)) {
            newPath = relativePath + '.js';
            transformed = true;
        }
    }

    return transformed ? newPath : null;
}

function extractLiteralValue(
    raw: string,
): { quote: string; value: string } | null {
    if (!raw || raw.length < 2) return null;
    const quote = raw[0];
    const last = raw[raw.length - 1];
    if ((quote !== '"' && quote !== "'" && quote !== '`') || last !== quote) {
        return null;
    }
    if (quote === '`' && raw.includes('${')) {
        return null;
    }
    return { quote, value: raw.slice(1, -1) };
}

function resolveAliasTemplateLiteral(
    raw: string,
    pathAlias: Record<string, any>,
): string | null {
    if (!raw.startsWith('`')) return null;
    const exprIndex = raw.indexOf('${');
    if (exprIndex === -1) return null;

    const prefix = raw.slice(1, exprIndex);
    if (!prefix) return null;

    const sortedAliases = Object.entries(pathAlias).sort((a, b) => {
        const aliasA = a[0].replace('/*', '');
        const aliasB = b[0].replace('/*', '');
        return aliasB.length - aliasA.length;
    });

    for (const [alias, target] of sortedAliases) {
        const aliasPattern = alias.replace('/*', '');
        if (!prefix.startsWith(aliasPattern)) continue;

        const relativePath = prefix.replace(aliasPattern, '');
        const targetArray = Array.isArray(target) ? target : [target];
        const targetPath = targetArray[0];
        if (!targetPath) continue;

        let newPrefix: string;
        if (targetPath.startsWith('/')) {
            newPrefix = path.join('/', env.PATH_DIST!, relativePath);
        } else {
            const cleanTarget = targetPath.replace('./', '').replace('/*', '');
            const normalizedPathDist = env.PATH_DIST!.replace('./', '');
            if (cleanTarget === normalizedPathDist) {
                newPrefix = path.join('/', normalizedPathDist, relativePath);
            } else {
                newPrefix = path.join(
                    '/',
                    normalizedPathDist,
                    cleanTarget,
                    relativePath,
                );
            }
        }

        newPrefix = newPrefix
            .replace(/\/\.\//g, '/')
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/');

        return `\`${newPrefix}${raw.slice(exprIndex)}`;
    }

    return null;
}

async function replaceAliasImportsAst(
    code: string,
    file: string,
    ast: any,
): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }

    const pathAlias = getParsedPathAlias();
    if (!pathAlias) return code;

    const replacements: Array<{ start: number; end: number; value: string }> =
        [];
    const staticImports = ast?.module?.staticImports || [];
    for (const item of staticImports) {
        const moduleRequest = item?.moduleRequest?.value;
        const start = item?.moduleRequest?.start;
        const end = item?.moduleRequest?.end;
        if (typeof moduleRequest !== 'string') continue;
        if (typeof start !== 'number' || typeof end !== 'number') continue;

        const newPath = await resolveModuleRequest(
            moduleRequest,
            file,
            pathAlias,
        );
        if (!newPath || newPath === moduleRequest) continue;

        const raw = code.slice(start, end);
        const literal = extractLiteralValue(raw);
        if (!literal) continue;
        replacements.push({
            start,
            end,
            value: `${literal.quote}${newPath}${literal.quote}`,
        });
    }

    const dynamicImports = ast?.module?.dynamicImports || [];
    for (const item of dynamicImports) {
        const start = item?.moduleRequest?.start;
        const end = item?.moduleRequest?.end;
        if (typeof start !== 'number' || typeof end !== 'number') continue;

        const raw = code.slice(start, end);
        const literal = extractLiteralValue(raw);
        if (!literal) {
            const replaced = resolveAliasTemplateLiteral(raw, pathAlias);
            if (replaced) {
                replacements.push({ start, end, value: replaced });
            }
            continue;
        }

        const newPath = await resolveModuleRequest(
            literal.value,
            file,
            pathAlias,
        );
        if (!newPath || newPath === literal.value) continue;

        replacements.push({
            start,
            end,
            value: `${literal.quote}${newPath}${literal.quote}`,
        });
    }

    if (replacements.length === 0) return code;

    replacements.sort((a, b) => b.start - a.start);
    let resultCode = code;
    for (const replacement of replacements) {
        resultCode =
            resultCode.slice(0, replacement.start) +
            replacement.value +
            resultCode.slice(replacement.end);
    }

    return resultCode;
}

/**
 * Recolecta, recursivamente, las posiciones {start, end} de todos los
 * literales de string "reales" del AST (Literal con value string, y
 * TemplateLiteral totalmente estático sin interpolación). Excluye
 * deliberadamente comentarios (no forman parte del AST) y regex literals
 * (Literal con .regex en vez de un value string).
 */
function collectStringLiteralRanges(
    node: any,
    ranges: Array<{ start: number; end: number }>,
    seen: Set<any> = new Set(),
): void {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    if (
        node.type === 'Literal' &&
        typeof node.value === 'string' &&
        typeof node.start === 'number' &&
        typeof node.end === 'number'
    ) {
        ranges.push({ start: node.start, end: node.end });
    } else if (
        node.type === 'TemplateLiteral' &&
        Array.isArray(node.expressions) &&
        node.expressions.length === 0 &&
        Array.isArray(node.quasis) &&
        node.quasis.length === 1
    ) {
        const quasi = node.quasis[0];
        if (
            typeof quasi?.start === 'number' &&
            typeof quasi?.end === 'number'
        ) {
            ranges.push({ start: quasi.start, end: quasi.end });
        }
    }

    for (const key in node) {
        if (key === 'start' || key === 'end' || key === 'range') continue;
        const value = node[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                collectStringLiteralRanges(item, ranges, seen);
            }
        } else if (value && typeof value === 'object') {
            collectStringLiteralRanges(value, ranges, seen);
        }
    }
}

/**
 * Reemplaza alias en strings del código JavaScript (no solo en imports)
 * Maneja casos como: link.href = 'P@/vendor/sweetalert2/sweetalert2.dark.min.css';
 *
 * Solo toca literales de string cuya posición viene confirmada por el AST
 * (ver collectStringLiteralRanges), en vez de escanear todo el texto con un
 * regex global: eso evitaba distinguir un string real de contenido dentro de
 * un comentario o de un regex literal, y podía corromper strings de datos
 * de usuario que por coincidencia empezaran con el mismo prefijo de alias.
 * @param code - El código JavaScript a transformar
 * @param ast - AST ya parseado de `code` (mismas posiciones de byte)
 * @returns El código con los alias reemplazados en strings
 */
async function replaceAliasInStrings(code: string, ast: any): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }

    const pathAlias = getParsedPathAlias();
    const pathDist = env.PATH_DIST;

    const stringRanges: Array<{ start: number; end: number }> = [];
    collectStringLiteralRanges(ast?.program, stringRanges);
    if (stringRanges.length === 0) return code;

    // Ordenar alias por longitud (más largos primero) para priorizar alias más específicos
    const sortedAliases = Object.entries(pathAlias).sort((a, b) => {
        const aliasA = a[0].replace('/*', '');
        const aliasB = b[0].replace('/*', '');
        return aliasB.length - aliasA.length;
    });

    const replacements: Array<{ start: number; end: number; value: string }> =
        [];

    for (const { start, end } of stringRanges) {
        const raw = code.slice(start, end);
        if (raw.length < 2) continue;
        const openQuote = raw[0];
        const closeQuote = raw[raw.length - 1];
        if (
            openQuote !== closeQuote ||
            (openQuote !== '"' && openQuote !== "'" && openQuote !== '`')
        ) {
            continue;
        }
        const stringContent = raw.slice(1, -1);
        if (!stringContent) continue;

        for (const [alias, target] of sortedAliases) {
            const aliasPattern = alias.replace('/*', '');

            // Verificar coincidencia exacta del alias seguido de '/' o al final del string
            const aliasRegex = new RegExp(
                `^${aliasPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=/|$)`,
            );
            if (!aliasRegex.test(stringContent)) continue;

            // IMPORTANTE: Verificar si es un módulo excluido antes de transformar
            if (
                isExternalModule(stringContent, pathAlias) &&
                EXCLUDED_MODULES.has(stringContent)
            ) {
                continue;
            }

            // Reemplazar el alias con la ruta del target
            const relativePath = stringContent.replace(aliasPattern, '');

            // Construir la nueva ruta basada en la configuración del target
            let newPath: string;

            // El target puede ser un array de strings o un string
            const targetArray = Array.isArray(target) ? target : [target];
            const targetPath = targetArray[0];
            if (targetPath.startsWith('/')) {
                // Si el target empieza con /, es una ruta absoluta desde la raíz del proyecto
                // Para targets como "/src/*", solo usamos PATH_DIST + relativePath
                // sin incluir el directorio del target en la ruta final
                newPath = path.join('/', pathDist, relativePath);
                if (env.VERBOSE === 'true') {
                    console.log(
                        `  ✅ Ruta absoluta: pathDist="${pathDist}", relativePath="${relativePath}", newPath="${newPath}"`,
                    );
                }
            } else {
                // Si es una ruta relativa, verificar si ya apunta al directorio de distribución
                const cleanTarget = targetPath
                    .replace('./', '')
                    .replace('/*', '');
                const normalizedPathDist = pathDist.replace('./', '');

                if (cleanTarget === normalizedPathDist) {
                    // Si el target es el mismo que PATH_DIST, no duplicar
                    newPath = path.join('/', normalizedPathDist, relativePath);
                } else {
                    // Si es diferente, usar PATH_DIST como base
                    newPath = path.join(
                        '/',
                        normalizedPathDist,
                        cleanTarget,
                        relativePath,
                    );
                }
            }

            // Normalizar la ruta para eliminar ./ extra y separadores de Windows
            newPath = newPath
                .replace(/\/\.\//g, '/')
                .replace(/\\/g, '/')
                .replace(/\/+/g, '/');

            // Para archivos estáticos (CSS, JS, imágenes, etc.), mantener la extensión original
            // No agregar .js automáticamente como hacemos con imports
            replacements.push({
                start,
                end,
                value: `${openQuote}${newPath}${closeQuote}`,
            });
            break;
        }
    }

    if (replacements.length === 0) return code;

    replacements.sort((a, b) => b.start - a.start);
    let resultCode = code;
    for (const replacement of replacements) {
        resultCode =
            resultCode.slice(0, replacement.start) +
            replacement.value +
            resultCode.slice(replacement.end);
    }

    return resultCode;
}

/**
 * Elimina la etiqueta "html" de una cadena de plantilla.
 * @param {string} data - La cadena de plantilla de la cual eliminar la etiqueta "html".
 * @returns {Promise<string>} - La cadena de plantilla modificada sin la etiqueta "html".
 */
const removehtmlOfTemplateString = async (data: string): Promise<string> => {
    // Regex más específico que busca la etiqueta html seguida de un template literal
    // Debe estar al inicio de línea o después de espacios/operadores, no después de punto
    const htmlRegExp = /(?:^|[^.])html\s*`/g;

    data = data.replace(htmlRegExp, match => {
        // Preservar el carácter que no es punto antes de html
        const beforeHtml = match.charAt(0) !== 'h' ? match.charAt(0) : '';
        return beforeHtml + '`';
    });

    //remove ""
    const htmlGetterRegExp = /,\s*get\s+html\(\)\s*{\s*return\s*html\s*}/g;
    data = data.replace(htmlGetterRegExp, '');

    return data;
};

/**
 * Elimina los comentarios con la etiqueta @preserve de la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada sin los comentarios @preserve.
 */
const removePreserverComent = async (data: string): Promise<string> => {
    const preserverRegExp =
        /\/\*[\s\S]*?@preserve[\s\S]*?\*\/|\/\/.*?@preserve.*?(?=\n|$)/g;
    data = data.replace(preserverRegExp, (match: string) =>
        match.replace(/@preserve/g, ''),
    );
    return data;
};

/**
 * Elimina la declaración de importación para 'code-tag' de la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada sin la importación de 'code-tag'.
 */
const removeCodeTagImport = async (data: string): Promise<string> => {
    // remove import if exist code-tag
    const codeTagRegExp = /import\s+{.*}\s+from\s+['"].*code-tag.*['"];/g;
    data = data.replace(codeTagRegExp, '');
    return data;
};

/**
 * Comprueba si un archivo de salida está excluido de la inyección HMR
 * según los patrones definidos en `hmrExclude` de la configuración (`env.HMR_EXCLUDE`).
 *
 * Acepta:
 *  - Nombres de archivo exactos: `'early-init.js'`
 *  - Sufijos de ruta:            `'js/early-init.js'`
 *  - Globs simples con `*`:      `'*.legacy.js'`
 */
export function isHmrExcluded(outPath: string): boolean {
    const excludeList: string[] = JSON.parse(env.HMR_EXCLUDE || '[]');
    if (excludeList.length === 0) return false;
    const normalized = outPath.replace(/\\/g, '/');
    const basename = path.posix.basename(normalized);

    if (env.VERBOSE === 'true') {
        logger.info(
            `[HMR] isHmrExcluded check — basename: "${basename}" outPath: "${normalized}" excludeList: ${JSON.stringify(excludeList)}`,
        );
    }

    const excluded = excludeList.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(
                '^' +
                    pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') +
                    '$',
            );
            return regex.test(basename) || regex.test(normalized);
        }
        return basename === pattern || normalized.endsWith('/' + pattern);
    });

    if (env.VERBOSE === 'true' && excluded) {
        logger.info(`[HMR] Shim omitido para: "${basename}"`);
    }
    return excluded;
}

export async function estandarizaCode(
    code: string,
    file: string,
): Promise<{ code: string; error: string | null }> {
    const originalCode = code; // Guardar código original para validación
    try {
        const ast = await parser(file, code);
        if (ast && ast.errors && ast.errors.length > 0) {
            // Debug: mostrar la estructura del error para entender mejor qué información tenemos
            if (env.VERBOSE === 'true') {
                console.info(
                    'DEBUG - Estructura del error:',
                    JSON.stringify(ast.errors[0], null, 2),
                );
            }

            // Usar el nuevo sistema de reporte de errores
            const detailedErrorReport = analyzeAndFormatMultipleErrors(
                ast.errors,
                code,
                file,
            );

            if (env.VERBOSE === 'true') {
                logger.error(detailedErrorReport);
            }

            // También mantener el mensaje simple para el sistema existente
            const firstError = ast.errors[0];
            throw new Error(firstError?.message || 'Error sin mensaje');
        }
        code = await replaceAliasImportsAst(code, file, ast);
        // Re-parsear: replaceAliasImportsAst puede haber cambiado longitudes
        // de string, así que las posiciones del AST original ya no
        // coinciden con el código actual (cache hit si el contenido no cambió).
        const astAfterImports = await parser(file, code);
        code = await replaceAliasInStrings(code, astAfterImports);
        code = await removehtmlOfTemplateString(code);
        code = await removeCodeTagImport(code);

        if (env.isPROD === 'true') {
            code = await removePreserverComent(code);
        }

        // VALIDACIÓN DE INTEGRIDAD - Solo si flag está activo
        if (env.CHECK_INTEGRITY === 'true') {
            const validation = integrityValidator.validate(
                originalCode,
                code,
                `transforms:${path.basename(file)}`,
                {
                    skipSyntaxCheck: false, // SÍ validar sintaxis en transformaciones
                    verbose: env.VERBOSE === 'true',
                    throwOnError: true,
                },
            );

            if (!validation.valid) {
                logger.error(
                    `❌ Validación de integridad fallida en transformaciones para ${path.basename(file)}`,
                    validation.errors.join(', '),
                );
                throw new Error(
                    `Transform integrity check failed for ${path.basename(file)}: ${validation.errors.join(', ')}`,
                );
            }

            if (env.VERBOSE === 'true') {
                logger.info(
                    `✅ Validación de transformaciones OK para ${path.basename(file)} (${validation.metrics.duration.toFixed(2)}ms)`,
                );
            }
        }

        return { code, error: null };
    } catch (error) {
        return {
            code: '',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
