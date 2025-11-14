import path from 'node:path';
import { env } from 'node:process';

import { logger } from '../servicios/logger';
import { EXCLUDED_MODULES } from '../utils/excluded-modules';
import { getModuleSubPath } from '../utils/module-resolver';

import { analyzeAndFormatMultipleErrors } from './error-reporter';
import {
    getOptimizedAliasPath,
    getOptimizedModulePath,
} from './module-resolution-optimizer';
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
        const aliasPattern = alias.replace('/*', '');
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
        const [, moduleRequest] = match;
        if (!moduleRequest) continue; // Skip if moduleRequest is undefined
        let newPath: string | null = null;
        let transformed = false; // 1. PRIMERO: Verificar si es un módulo excluido (prioridad máxima)
        if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
            try {
                // Usar el sistema optimizado primero
                const optimizedPath = await getOptimizedModulePath(
                    moduleRequest,
                    file,
                );
                if (optimizedPath === null) {
                    // Si el optimizador retorna null, significa que es un módulo excluido
                    continue;
                }
                if (optimizedPath) {
                    newPath = optimizedPath;
                    transformed = true;
                } else {
                    // Fallback al sistema anterior
                    const modulePath = getModuleSubPath(moduleRequest, file);
                    if (modulePath === null) {
                        continue;
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
        } // 2. Si no es módulo externo/excluido, verificar si es un alias conocido
        if (!transformed) {
            // Usar el sistema optimizado de alias
            const aliasPath = getOptimizedAliasPath(moduleRequest);
            if (aliasPath) {
                let newImportPath = aliasPath;

                // Transformar extensiones
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
                // Fallback al sistema anterior
                for (const [alias] of Object.entries(pathAlias)) {
                    const aliasPattern = alias.replace('/*', '');
                    if (moduleRequest.startsWith(aliasPattern)) {
                        // Reemplazar el alias con la ruta del target
                        const relativePath = moduleRequest.replace(
                            aliasPattern,
                            '',
                        );
                        // Para alias que apuntan a la raíz (como @/* -> /src/*),
                        // solo usamos PATH_DIST + relativePath
                        let newImportPath = path.join(
                            '/',
                            env.PATH_DIST!,
                            relativePath,
                        );

                        // Normalizar la ruta para eliminar ./ extra y separadores de Windows
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
                        } else if (
                            !/\.(js|mjs|css|json)$/.test(newImportPath)
                        ) {
                            newImportPath += '.js';
                        }

                        newPath = newImportPath;
                        transformed = true;
                        break;
                    }
                }
            }
        }

        // 3. Si no es alias ni módulo externo, verificar si es ruta relativa que necesita extensión .js
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

        // 4. Reemplazar solo el path en las comillas, no toda la línea
        if (transformed && newPath) {
            // Buscar y reemplazar solo la parte entre comillas
            const pathRegex = new RegExp(
                `(['"\`])${moduleRequest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`,
                'g',
            );
            resultCode = resultCode.replace(pathRegex, `$1${newPath}$1`);
        }
    }
    return resultCode;
}

export async function replaceAliasImportDynamic(
    code: string,
    _imports: any,
    file?: string,
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
        const [, moduleRequest] = match;
        if (!moduleRequest) continue; // Skip if moduleRequest is undefined

        let newPath: string | null = null;
        let transformed = false; // 1. PRIMERO: Verificar si es un módulo excluido (prioridad máxima)
        if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
            try {
                // Usar el sistema optimizado primero
                const optimizedPath = await getOptimizedModulePath(
                    moduleRequest,
                    file,
                );
                if (optimizedPath === null) {
                    // Si el optimizador retorna null, significa que es un módulo excluido
                    continue;
                }
                if (optimizedPath) {
                    newPath = optimizedPath;
                    transformed = true;
                } else {
                    // Fallback al sistema anterior
                    const modulePath = getModuleSubPath(moduleRequest, file);
                    if (modulePath === null) {
                        continue;
                    }
                    if (modulePath) {
                        newPath = modulePath;
                        transformed = true;
                    }
                }
            } catch (error) {
                if (env.VERBOSE === 'true')
                    logger.warn(
                        `Error resolviendo módulo dinámico ${moduleRequest}: ${error instanceof Error ? error.message : String(error)}`,
                    );
            }
        } // 2. Si no es módulo externo/excluido, verificar si es un alias conocido
        if (!transformed) {
            // Usar el sistema optimizado de alias
            const aliasPath = getOptimizedAliasPath(moduleRequest);
            if (aliasPath) {
                let newImportPath = aliasPath;

                // Transformar extensiones
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
                // Fallback al sistema anterior
                for (const [alias] of Object.entries(pathAlias)) {
                    const aliasPattern = alias.replace('/*', '');
                    if (moduleRequest.startsWith(aliasPattern)) {
                        // Reemplazar el alias con la ruta del target
                        const relativePath = moduleRequest.replace(
                            aliasPattern,
                            '',
                        );
                        // Para alias que apuntan a la raíz (como @/* -> /src/*),
                        // solo usamos PATH_DIST + relativePath
                        let newImportPath = path.join(
                            '/',
                            pathDist,
                            relativePath,
                        );

                        // Normalizar la ruta para eliminar ./ extra y separadores de Windows
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
                        } else if (
                            !/\.(js|mjs|css|json)$/.test(newImportPath)
                        ) {
                            newImportPath += '.js';
                        }

                        newPath = newImportPath;
                        transformed = true;
                        break;
                    }
                }
            }
        }

        // 3. Si no es alias ni módulo externo, verificar si es ruta relativa que necesita extensión .js
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

        // 4. Reemplazar solo el path en las comillas, no toda la expresión
        if (transformed && newPath) {
            // Buscar y reemplazar solo la parte entre comillas en import()
            const pathRegex = new RegExp(
                `import\\s*\\(\\s*(['"])${moduleRequest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*\\)`,
                'g',
            );
            resultCode = resultCode.replace(
                pathRegex,
                `import($1${newPath}$1)`,
            );
        }
    }

    // Manejar template literals - versión mejorada
    resultCode = resultCode.replace(
        templateLiteralRegex,
        (match, moduleRequest) => {
            let transformed = false;
            let result = match;

            // 1. PRIMERO: Verificar si es un módulo excluido (prioridad máxima)
            if (!transformed && isExternalModule(moduleRequest, pathAlias)) {
                try {
                    const modulePath = getModuleSubPath(moduleRequest, file);
                    if (modulePath === null) {
                        // Si getModuleSubPath retorna null, significa que es un módulo excluido
                        // No transformar y retornar el match original
                        return match;
                    }
                    if (modulePath) {
                        result = match.replace(moduleRequest, modulePath);
                        transformed = true;
                    }
                } catch (error) {
                    if (env.VERBOSE === 'true')
                        logger.warn(
                            `Error resolviendo módulo template literal ${moduleRequest}: ${error instanceof Error ? error.message : String(error)}`,
                        );
                }
            }

            // 2. Verificar aliases en template literals
            if (!transformed) {
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

                        // Transformar extensiones .ts y .vue a .js en template literals
                        newModuleRequest = newModuleRequest
                            .replace(/\.ts(\b|`|\$)/g, '.js$1')
                            .replace(/\.vue(\b|`|\$)/g, '.js$1');

                        result = match.replace(moduleRequest, newModuleRequest);
                        transformed = true;
                        break;
                    }
                }
            }

            // 3. Si no es alias ni módulo externo, verificar si necesita transformación de extensión para rutas relativas
            if (!transformed) {
                // Para template literals que contienen rutas relativas, solo transformar extensiones
                let newModuleRequest = moduleRequest;
                if (
                    moduleRequest.includes('./') ||
                    moduleRequest.includes('../')
                ) {
                    // Transformar extensiones .ts y .vue a .js en template literals relativos
                    newModuleRequest = moduleRequest
                        .replace(/\.ts(\b|`)/g, '.js$1')
                        .replace(/\.vue(\b|`)/g, '.js$1');
                    if (newModuleRequest !== moduleRequest) {
                        result = match.replace(moduleRequest, newModuleRequest);
                    }
                }
            }

            return result;
        },
    );

    return resultCode;
}

/**
 * Reemplaza alias en strings del código JavaScript (no solo en imports)
 * Maneja casos como: link.href = 'P@/vendor/sweetalert2/sweetalert2.dark.min.css';
 * @param code - El código JavaScript a transformar
 * @returns El código con los alias reemplazados en strings
 */
async function replaceAliasInStrings(code: string): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }

    const pathAlias = JSON.parse(env.PATH_ALIAS);
    const pathDist = env.PATH_DIST;
    let resultCode = code; // Regex para encontrar strings que contengan posibles alias
    // Busca strings entre comillas simples, dobles o backticks que contengan alias
    const stringRegex = /(['"`])([^'"`]+)(['"`])/g;

    // Crear un array para procesar todas las coincidencias
    const matches = Array.from(resultCode.matchAll(stringRegex));
    for (const match of matches) {
        const [fullMatch, openQuote, stringContent, closeQuote] = match;

        // Verificar que las comillas de apertura y cierre coincidan
        if (openQuote !== closeQuote || !stringContent) continue; // Verificar si el string contiene algún alias
        let transformed = false;
        let newStringContent = stringContent;

        // Ordenar alias por longitud (más largos primero) para priorizar alias más específicos
        const sortedAliases = Object.entries(pathAlias).sort((a, b) => {
            const aliasA = a[0].replace('/*', '');
            const aliasB = b[0].replace('/*', '');
            return aliasB.length - aliasA.length;
        });

        for (const [alias, target] of sortedAliases) {
            const aliasPattern = alias.replace('/*', '');

            // Verificar coincidencia exacta del alias seguido de '/' o al final del string
            const aliasRegex = new RegExp(
                `^${aliasPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=/|$)`,
            );
            if (aliasRegex.test(stringContent)) {
                // IMPORTANTE: Verificar si es un módulo excluido antes de transformar
                if (isExternalModule(stringContent, pathAlias)) {
                    // Para strings que parecen ser módulos externos, verificar si están excluidos
                    if (EXCLUDED_MODULES.has(stringContent)) {
                        // Es un módulo excluido, no transformar
                        continue;
                    }
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
                        newPath = path.join(
                            '/',
                            normalizedPathDist,
                            relativePath,
                        );
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
                newStringContent = newPath;
                transformed = true;
                break;
            }
        } // Si se transformó, reemplazar en el código
        if (transformed) {
            const newFullMatch = `${openQuote}${newStringContent}${closeQuote}`;
            // Usar una expresión regular más específica para evitar reemplazos accidentales
            const escapedOriginal = fullMatch.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
            );
            const specificRegex = new RegExp(escapedOriginal, 'g');

            resultCode = resultCode.replace(specificRegex, newFullMatch);
        }
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

export async function estandarizaCode(
    code: string,
    file: string,
): Promise<{ code: string; error: string | null }> {
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
        code = await replaceAliasImportStatic(file, code);
        code = await replaceAliasImportDynamic(
            code,
            ast?.module.dynamicImports,
            file,
        );
        code = await replaceAliasInStrings(code);
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
