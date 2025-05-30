import path from 'node:path';
import { env } from 'node:process';

import { logger } from '../servicios/logger';
import { getModulePath } from '../utils/module-resolver';

import { parser } from './parser';

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
    }

    // Descartar módulos built-in de Node.js (incluyendo node: prefix)
    const cleanModuleName = moduleRequest.replace(/^node:/, '');
    if (NODE_BUILTIN_MODULES.has(cleanModuleName)) {
        return false;
    }

    // Descartar alias conocidos
    for (const alias of Object.keys(pathAlias)) {
        const aliasPattern = alias.replace('/*', '');
        if (moduleRequest.startsWith(aliasPattern)) {
            return false;
        }
    }

    // Verificar si parece ser un módulo npm (no contiene extensiones de archivo)
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

export async function replaceAliasImportStatic(
    file: string,
    code: string,
): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }
    const pathAlias = JSON.parse(env.PATH_ALIAS);
    let resultCode = code;

    // Usar regex para transformar imports estáticos
    const importRegex =
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;

    // Crear un array para procesar transformaciones async
    const matches = Array.from(resultCode.matchAll(importRegex));
    for (const match of matches) {
        const [fullMatch, moduleRequest] = match;
        if (!moduleRequest) continue; // Skip if moduleRequest is undefined

        let newMatch = fullMatch;
        let transformed = false; // 1. Verificar si es un alias conocido (lógica corregida)
        for (const [alias] of Object.entries(pathAlias)) {
            const aliasPattern = alias.replace('/*', '');
            if (moduleRequest.startsWith(aliasPattern)) {
                // Reemplazar el alias con la ruta del target
                const relativePath = moduleRequest.replace(aliasPattern, '');
                // Para alias que apuntan a la raíz (como @/* -> /src/*),
                // solo usamos PATH_DIST + relativePath
                let newImportPath = path.join(
                    '/',
                    env.PATH_DIST!,
                    relativePath,
                ); // Normalizar la ruta para eliminar ./ extra y separadores de Windows
                newImportPath = newImportPath
                    .replace(/\/\.\//g, '/')
                    .replace(/\\/g, '/');

                if (
                    newImportPath.endsWith('.ts') ||
                    newImportPath.endsWith('.vue')
                ) {
                    newImportPath = newImportPath.replace(/\.(ts|vue)$/, '.js');
                } else if (!/\.(js|mjs|css)$/.test(newImportPath)) {
                    newImportPath += '.js';
                }

                const finalPath = newImportPath;
                newMatch = fullMatch.replace(moduleRequest, finalPath);
                transformed = true;
                break;
            }
        }

        // 2. Si no es alias, verificar si es un módulo externo
        if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
            try {
                const modulePath = getModulePath(moduleRequest);
                if (modulePath) {
                    newMatch = fullMatch.replace(moduleRequest, modulePath);
                    transformed = true;
                }
            } catch (error) {
                logger.warn(
                    `Error resolviendo módulo ${moduleRequest}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }

        if (transformed) {
            resultCode = resultCode.replace(fullMatch, newMatch);
        }
    }

    return resultCode;
}

async function replaceAliasImportDynamic(
    code: string,
    _imports: any,
): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }

    const pathAlias = JSON.parse(env.PATH_ALIAS);
    const pathDist = env.PATH_DIST;
    let resultCode = code;

    // Regex para imports dinámicos normales con string (solo comillas simples y dobles)
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    // Regex para template literals (solo backticks)
    const templateLiteralRegex = /import\s*\(\s*`([^`]+)`\s*\)/g;

    // Manejar imports dinámicos normales con string
    const dynamicMatches = Array.from(resultCode.matchAll(dynamicImportRegex));
    for (const match of dynamicMatches) {
        const [fullMatch, moduleRequest] = match;
        if (!moduleRequest) continue; // Skip if moduleRequest is undefined

        let newMatch = fullMatch;
        let transformed = false; // 1. Verificar si es un alias conocido (lógica corregida)
        for (const [alias] of Object.entries(pathAlias)) {
            const aliasPattern = alias.replace('/*', '');
            if (moduleRequest.startsWith(aliasPattern)) {
                // Reemplazar el alias con la ruta del target
                const relativePath = moduleRequest.replace(aliasPattern, '');
                // Para alias que apuntan a la raíz (como @/* -> /src/*),
                // solo usamos PATH_DIST + relativePath
                let newImportPath = path.join('/', pathDist, relativePath);

                // Normalizar la ruta para eliminar ./ extra y separadores de Windows
                newImportPath = newImportPath
                    .replace(/\/\.\//g, '/')
                    .replace(/\\/g, '/');

                if (
                    newImportPath.endsWith('.ts') ||
                    newImportPath.endsWith('.vue')
                ) {
                    newImportPath = newImportPath.replace(/\.(ts|vue)$/, '.js');
                } else if (!/\.(js|mjs|css)$/.test(newImportPath)) {
                    newImportPath += '.js';
                }

                const finalPath = newImportPath;
                newMatch = fullMatch.replace(moduleRequest, finalPath);
                transformed = true;
                break;
            }
        }

        // 2. Si no es alias, verificar si es un módulo externo
        if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
            try {
                const modulePath = getModulePath(moduleRequest);
                if (modulePath) {
                    newMatch = fullMatch.replace(moduleRequest, modulePath);
                    transformed = true;
                }
            } catch (error) {
                logger.warn(
                    `Error resolviendo módulo dinámico ${moduleRequest}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }

        if (transformed) {
            resultCode = resultCode.replace(fullMatch, newMatch);
        }
    } // Manejar template literals - versión mejorada
    resultCode = resultCode.replace(
        templateLiteralRegex,
        (match, moduleRequest) => {
            let transformed = false;
            let result = match; // 1. Verificar aliases en template literals
            for (const [alias] of Object.entries(pathAlias)) {
                const aliasPattern = alias.replace('/*', '');
                if (moduleRequest.includes(aliasPattern)) {
                    const relativePath = moduleRequest.replace(
                        aliasPattern,
                        '',
                    );
                    // Para alias que apuntan a la raíz (como @/* -> /src/*),
                    // solo usamos PATH_DIST + relativePath
                    let newModuleRequest = path.join(
                        '/',
                        pathDist,
                        relativePath,
                    );
                    // Normalizar la ruta para eliminar ./ extra y barras duplicadas
                    newModuleRequest = newModuleRequest
                        .replace(/\/\.\//g, '/')
                        .replace(/\/+/g, '/')
                        .replace(/\\/g, '/'); // Normalizar separadores de Windows a Unix
                    result = match.replace(moduleRequest, newModuleRequest);
                    transformed = true;
                    break;
                }
            }

            // 2. Si no es alias y parece ser módulo externo en template literal
            if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
                try {
                    const modulePath = getModulePath(moduleRequest);
                    if (modulePath) {
                        result = match.replace(moduleRequest, modulePath);
                    }
                } catch (error) {
                    logger.warn(
                        `Error resolviendo módulo template literal ${moduleRequest}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }

            return result;
        },
    );

    return resultCode;
}

/**
 * Elimina la etiqueta "html" de una cadena de plantilla.
 * @param {string} data - La cadena de plantilla de la cual eliminar la etiqueta "html".
 * @returns {Promise<string>} - La cadena de plantilla modificada sin la etiqueta "html".
 */
const removehtmlOfTemplateString = async (data: string): Promise<string> => {
    const htmlRegExp = /html\s*`/g;

    data = data.replace(htmlRegExp, '`');

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

export async function estandarizaCode(
    code: string,
    file: string,
): Promise<{ code: string; error: string | null }> {
    try {
        const ast = await parser(file, code);
        if (ast && ast.errors && ast.errors.length > 0) {
            logger.warn(ast.errors[0]?.codeframe || 'Error sin codeframe');
            throw new Error(ast.errors[0]?.message || 'Error sin mensaje');
        }
        code = await replaceAliasImportStatic(file, code);
        code = await replaceAliasImportDynamic(
            code,
            ast?.module.dynamicImports,
        );
        code = await removehtmlOfTemplateString(code);
        code = await removeCodeTagImport(code);

        if (env.isProd === 'true') {
            code = await removePreserverComent(code);
        }

        return { code, error: null };
    } catch (error) {
        return {
            code: '',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
