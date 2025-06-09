// Opción con librería 'resolve' (npm install resolve)
import fs, { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { env } from 'node:process';

// import pkg from 'enhanced-resolve';
// import resolve from 'resolve';

import { logger } from '../servicios/logger';

// Lista de módulos que deben ser excluidos de la resolución automática de rutas
// Estos módulos se mantienen con su importación original sin transformar
const EXCLUDED_MODULES = new Set([
    'vue/compiler-sfc',
    'vue/dist/vue.runtime.esm-bundler',
    '@vue/compiler-sfc',
    '@vue/compiler-dom',
    '@vue/runtime-core',
    '@vue/runtime-dom', // Módulos de oxc-parser que tienen dependencias específicas de WASM
    'oxc-parser',
    'oxc-parser/wasm',
    'oxc-minify',
    'oxc-minify/browser',
    '@oxc-parser/binding-wasm32-wasi',
    '@oxc-minify/binding-wasm32-wasi',
    // Módulos de TypeScript que pueden tener resoluciones complejas
    'typescript',
    // Agregar más módulos problemáticos aquí según sea necesario
    'yargs',
    'yargs/helpers',
    'yargs-parser',
    'chalk',
    'browser-sync',
    'chokidar',
    'get-port',
    'execa',
    'find-root',
    'fs-extra',
]);

// function resolveESMWithLibrary(moduleName: string): string | null {
//     try {
//         // Resolver el módulo
//         const resolved = resolve.sync(moduleName, {
//             basedir: process.cwd(),
//             packageFilter: (pkg: any) => {
//                 // Priorizar campos ESM
//                 if (pkg.module) pkg.main = pkg.module;
//                 else if (pkg.exports?.['.']?.import)
//                     pkg.main = pkg.exports['.'].import;
//                 else if (pkg.exports?.import) pkg.main = pkg.exports.import;
//                 return pkg;
//             },
//         });
//         return resolved;
//     } catch (error) {
//         if (env.VERBOSE === 'true')
//             logger.error(
//                 `Error resolviendo ${moduleName}:`,
//                 error instanceof Error ? error.message : String(error),
//             );
//         return null;
//     }
// }

// Opción con 'enhanced-resolve' (webpack's resolver)
// npm install enhanced-resolve

// const { ResolverFactory } = pkg;

// const resolver = ResolverFactory.createResolver({
//     fileSystem: {
//         readFile,
//         readlink,
//         stat,
//         readdir,
//     },
//     conditionNames: ['import', 'module', 'default'], // Priorizar ESM
//     extensions: ['.mjs', '.js', '.json'],
//     mainFields: ['module', 'main'], // Priorizar campo 'module'
//     aliasFields: ['browser'],
// });

// function resolveESMEnhanced(moduleName: string): Promise<string | null> {
//     return new Promise((resolve, reject) => {
//         resolver.resolve({}, process.cwd(), moduleName, {}, (err, result) => {
//             if (err) reject(err);
//             else resolve(result as string);
//         });
//     });
// }

// Función para buscar la mejor versión ESM/browser optimizada de un archivo
function findOptimalESMVersion(
    moduleDir: string,
    entryPoint: string,
): string | null {
    const dir = dirname(entryPoint);
    const baseName = entryPoint.split('/').pop() || '';
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');

    // Directorio donde buscar
    const searchDir = join(moduleDir, dir);

    if (!fs.existsSync(searchDir)) {
        return entryPoint;
    }

    try {
        const files = fs.readdirSync(searchDir); // Patrones de prioridad para buscar versiones optimizadas
        // Prioriza versiones completas de desarrollo para mejor debugging
        const priorityPatterns = [
            // Máxima prioridad: ESM-Browser completo (sin runtime, desarrollo)
            `${nameWithoutExt}.esm-browser.js`,
            // ESM puro sin minificar (desarrollo)
            `${nameWithoutExt}.esm.all.js`,
            `${nameWithoutExt}.esm.js`,
            `${nameWithoutExt}.module.js`,
            // Browser puro sin minificar (desarrollo)
            `${nameWithoutExt}.browser.js`,
            `${nameWithoutExt}.web.js`,
            // UMD sin minificar (desarrollo)
            `${nameWithoutExt}.umd.js`,
            `${nameWithoutExt}.global.js`,
            // Fallback a versiones minificadas sin runtime
            `${nameWithoutExt}.esm-browser.min.js`,
            `${nameWithoutExt}.esm-browser.prod.js`,
            `${nameWithoutExt}.esm.all.min.js`,
            `${nameWithoutExt}.esm.min.js`,
            `${nameWithoutExt}.module.min.js`,
            `${nameWithoutExt}.browser.min.js`,
            `${nameWithoutExt}.browser.prod.js`,
            `${nameWithoutExt}.web.min.js`,
            `${nameWithoutExt}.umd.min.js`,
            `${nameWithoutExt}.global.min.js`,
            `${nameWithoutExt}.min.js`,
            // Último recurso: versiones runtime (solo si no hay alternativas)
            `${nameWithoutExt}.runtime.esm-browser.js`,
            `${nameWithoutExt}.runtime.esm-browser.min.js`,
            `${nameWithoutExt}.runtime.esm-browser.prod.js`,
        ];

        // Buscar archivos que coincidan exactamente con los patrones
        for (const pattern of priorityPatterns) {
            if (files.includes(pattern)) {
                const optimizedPath = join(dir, pattern).replace(/\\/g, '/');
                if (env.VERBOSE === 'true') {
                    logger.info(
                        `Versión optimizada encontrada: ${optimizedPath}`,
                    );
                }
                return optimizedPath;
            }
        } // Buscar archivos que contengan patrones ESM/browser dinámicamente
        const esmBrowserFiles = files.filter(file => {
            const lowerFile = file.toLowerCase();
            return (
                (lowerFile.includes('.esm-browser.') || // Prioridad alta: combinación esm-browser
                    lowerFile.includes('.esm.') ||
                    lowerFile.includes('.module.') ||
                    lowerFile.includes('.browser.') ||
                    lowerFile.includes('.web.') ||
                    lowerFile.includes('.runtime.esm-browser.')) && // Runtime como última opción
                (file.endsWith('.js') || file.endsWith('.mjs'))
            );
        });

        if (esmBrowserFiles.length > 0) {
            // Primera prioridad: archivos que combinan ESM y Browser (sin runtime)
            const esmBrowserCombined = esmBrowserFiles.filter(
                file =>
                    file.toLowerCase().includes('.esm-browser.') &&
                    !file.toLowerCase().includes('.runtime.'),
            );

            if (esmBrowserCombined.length > 0) {
                // Dentro de esm-browser, priorizar desarrollo > .prod > .min
                const devFiles = esmBrowserCombined.filter(
                    file =>
                        !file.toLowerCase().includes('.prod.') &&
                        !file.toLowerCase().includes('.min.'),
                );
                if (devFiles.length > 0 && devFiles[0]) {
                    const optimizedPath = join(dir, devFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión ESM-Browser dev encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }

                const prodFiles = esmBrowserCombined.filter(file =>
                    file.toLowerCase().includes('.prod.'),
                );
                if (prodFiles.length > 0 && prodFiles[0]) {
                    const optimizedPath = join(dir, prodFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión ESM-Browser producción encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }

                const minFiles = esmBrowserCombined.filter(file =>
                    file.toLowerCase().includes('.min.'),
                );
                if (minFiles.length > 0 && minFiles[0]) {
                    const optimizedPath = join(dir, minFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión ESM-Browser minificada encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }

                if (esmBrowserCombined[0]) {
                    const optimizedPath = join(
                        dir,
                        esmBrowserCombined[0],
                    ).replace(/\\/g, '/');
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión ESM-Browser encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }
            }

            // Segunda prioridad: cualquier versión ESM disponible (sin minificar)
            const esmFiles = esmBrowserFiles.filter(
                file =>
                    (file.toLowerCase().includes('.esm.') ||
                        file.toLowerCase().includes('.module.')) &&
                    !file.toLowerCase().includes('.min.') &&
                    !file.toLowerCase().includes('.prod.') &&
                    !file.toLowerCase().includes('.runtime.'),
            );

            if (esmFiles.length > 0 && esmFiles[0]) {
                const optimizedPath = join(dir, esmFiles[0]).replace(
                    /\\/g,
                    '/',
                );
                if (env.VERBOSE === 'true') {
                    logger.info(`Versión ESM dev encontrada: ${optimizedPath}`);
                }
                return optimizedPath;
            }

            // Tercera prioridad: archivos minificados de cualquier tipo ESM/browser (sin runtime)
            const minifiedFiles = esmBrowserFiles.filter(
                file =>
                    (file.toLowerCase().includes('.min.') ||
                        file.toLowerCase().includes('.prod.')) &&
                    !file.toLowerCase().includes('.runtime.'),
            );
            if (minifiedFiles.length > 0) {
                // Priorizar ESM sobre browser sobre UMD
                const esmFiles = minifiedFiles.filter(
                    file =>
                        file.toLowerCase().includes('.esm.') ||
                        file.toLowerCase().includes('.module.'),
                );

                if (esmFiles.length > 0 && esmFiles[0]) {
                    const optimizedPath = join(dir, esmFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión ESM minificada encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }

                if (minifiedFiles[0]) {
                    const optimizedPath = join(dir, minifiedFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión minificada encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }
            }

            // Cuarta prioridad: versiones runtime como último recurso
            const runtimeFiles = esmBrowserFiles.filter(file =>
                file.toLowerCase().includes('.runtime.esm-browser.'),
            );

            if (runtimeFiles.length > 0) {
                // Priorizar desarrollo sobre producción en runtime también
                const devRuntimeFiles = runtimeFiles.filter(
                    file =>
                        !file.toLowerCase().includes('.prod.') &&
                        !file.toLowerCase().includes('.min.'),
                );

                if (devRuntimeFiles.length > 0 && devRuntimeFiles[0]) {
                    const optimizedPath = join(dir, devRuntimeFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión Runtime ESM-Browser dev encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }

                if (runtimeFiles[0]) {
                    const optimizedPath = join(dir, runtimeFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    if (env.VERBOSE === 'true') {
                        logger.info(
                            `Versión Runtime ESM-Browser encontrada: ${optimizedPath}`,
                        );
                    }
                    return optimizedPath;
                }
            }

            // Fallback: cualquier versión browser
            if (esmBrowserFiles[0]) {
                const optimizedPath = join(dir, esmBrowserFiles[0]).replace(
                    /\\/g,
                    '/',
                );
                if (env.VERBOSE === 'true') {
                    logger.info(`Versión browser encontrada: ${optimizedPath}`);
                }
                return optimizedPath;
            }
        }
    } catch (error) {
        if (env.VERBOSE === 'true') {
            logger.warn(
                `No se pudo leer directorio ${searchDir}:`,
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    return entryPoint; // Fallback al entry point original
}

// Función mejorada para detectar automáticamente entry points browser-compatible
function simpleESMResolver(moduleName: string): string | null {
    try {
        const nodeModulesPath = join(process.cwd(), 'node_modules', moduleName);
        let packagePath: string;
        let packageJson: any;

        try {
            packagePath = join(nodeModulesPath, 'package.json');
            if (!fs.existsSync(packagePath)) {
                throw new Error(
                    `No se encontró package.json para ${moduleName}`,
                );
            }
        } catch {
            return null;
        }

        packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        const moduleDir = dirname(packagePath);
        const isESM = packageJson.type === 'module'; // Determinar el entry point ESM/Browser optimizado
        let entryPoint: string | null = null;

        // 1. Prioridad máxima: campo module para ESM
        if (packageJson.module) {
            entryPoint = packageJson.module;
        }

        // 2. Revisar exports field con prioridad ESM
        else if (packageJson.exports) {
            if (typeof packageJson.exports === 'string') {
                entryPoint = packageJson.exports;
            } else if (packageJson.exports['.']) {
                const dotExport = packageJson.exports['.'];
                if (typeof dotExport === 'string') {
                    entryPoint = dotExport;
                } else if (typeof dotExport === 'object') {
                    // Priorizar import > browser > default para compatibilidad ESM
                    // Buscar específicamente patrones esm-browser primero
                    const exportKeys = Object.keys(dotExport);
                    const esmBrowserKey = exportKeys.find(
                        key =>
                            key.includes('browser') &&
                            (key.includes('esm') || key.includes('module')),
                    );

                    if (
                        esmBrowserKey &&
                        typeof dotExport[esmBrowserKey] === 'string'
                    ) {
                        entryPoint = dotExport[esmBrowserKey];
                    } else {
                        // Priorizar import > browser > default
                        entryPoint =
                            (typeof dotExport.import === 'string'
                                ? dotExport.import
                                : null) ||
                            dotExport.browser ||
                            (typeof dotExport.default === 'string'
                                ? dotExport.default
                                : null);
                    }
                }
            }
        }

        // 3. Revisar browser field específico
        else if (packageJson.browser) {
            if (typeof packageJson.browser === 'string') {
                entryPoint = packageJson.browser;
            } else if (typeof packageJson.browser === 'object') {
                // Si browser es un objeto de mapeo, buscar la entrada principal
                entryPoint =
                    packageJson.browser['.'] ||
                    packageJson.browser[packageJson.main];
            }
        }

        // 4. Fallback a main field
        else if (packageJson.main) {
            entryPoint = packageJson.main;
        }

        // 5. Fallback por defecto según el tipo de módulo
        if (!entryPoint) {
            entryPoint = isESM ? 'index.js' : 'index.cjs';
        }

        // Asegurarse de que el entry point es una cadena
        if (typeof entryPoint !== 'string') {
            if (env.VERBOSE === 'true')
                logger.warn(
                    `Entry point no es string para ${moduleName}:`,
                    entryPoint,
                );
            entryPoint = isESM ? 'index.js' : 'index.cjs';
        } // Resolver la ruta final
        let finalPath = join(moduleDir, entryPoint);

        // Buscar una versión ESM/browser optimizada
        const optimizedEntry = findOptimalESMVersion(moduleDir, entryPoint);
        if (optimizedEntry && optimizedEntry !== entryPoint) {
            finalPath = join(moduleDir, optimizedEntry);
        }

        // Si es ESM, verificar si hay imports privados que necesiten ser resueltos
        if (isESM && packageJson.imports) {
            const importMap = new Map();
            for (const [key, value] of Object.entries(packageJson.imports)) {
                if (typeof value === 'string') {
                    importMap.set(key, join(moduleDir, value));
                } else if (typeof value === 'object' && value !== null) {
                    // Priorizar la versión browser
                    const valueObj = value as {
                        browser?: string;
                        default?: string;
                        node?: string;
                    };
                    const browserPath =
                        valueObj.browser || valueObj.default || valueObj.node;
                    if (browserPath) {
                        importMap.set(key, join(moduleDir, browserPath));
                    }
                }
            }

            // Si el archivo existe, leer su contenido y verificar imports privados
            if (fs.existsSync(finalPath)) {
                const content = readFileSync(finalPath, 'utf-8');
                const privateImports = Array.from(
                    content.matchAll(/from\s+['"]([#@][^'"]+)['"]/g),
                );

                if (privateImports.length > 0) {
                    if (env.VERBOSE === 'true')
                        logger.info(
                            `Módulo ${moduleName} usa imports privados:`,
                            privateImports.map(m => m[1]),
                        );
                    // Si usa imports privados, asegurarnos de que estén disponibles
                    for (const [, importPath] of privateImports) {
                        if (!importMap.has(importPath)) {
                            if (env.VERBOSE === 'true')
                                logger.warn(
                                    `Import privado no resuelto: ${importPath} en ${moduleName}`,
                                );
                        }
                    }
                }
            }
        }

        // Verificar que el archivo existe
        if (!fs.existsSync(finalPath)) {
            if (env.VERBOSE === 'true')
                logger.warn(
                    `⚠️ Archivo no existe: ${finalPath}, buscando alternativas...`,
                );

            // Intentar alternativas comunes
            const alternatives = [
                entryPoint,
                entryPoint.replace('.js', '.mjs'),
                entryPoint.replace('.mjs', '.js'),
                entryPoint.replace('.js', '.cjs'),
                'index.mjs',
                'index.js',
                'index.cjs',
            ];

            for (const alt of alternatives) {
                const altPath = join(moduleDir, alt);
                if (fs.existsSync(altPath)) {
                    finalPath = altPath;
                    break;
                }
            }
        }

        return finalPath;
    } catch (error) {
        if (env.VERBOSE === 'true')
            logger.error(
                `Error resolviendo ${moduleName}: ${error instanceof Error ? error.message : String(error)}`,
            );
        return null;
    }
}

// Función utilitaria para obtener rutas absolutas desde la raíz del proyecto
function getNodeModulesRelativePath(
    fullPath: string | null,
    _fromFile?: string,
): string | null {
    if (!fullPath) return null;

    const idx = fullPath.indexOf('node_modules');
    if (idx !== -1) {
        // Extraer solo la parte desde node_modules en adelante
        let relativePath = fullPath.substring(idx).replace(/\\/g, '/');

        // Devolver ruta absoluta desde la raíz del proyecto (sin ../)
        // Esto permite que los archivos compilados accedan directamente a node_modules
        return '/' + relativePath;
    }

    // Para rutas que no están en node_modules, convertir a ruta absoluta desde la raíz
    let rel = relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (!rel) rel = '.';

    // Convertir a ruta absoluta desde la raíz
    if (!rel.startsWith('/')) {
        rel = '/' + rel;
    }

    return rel;
}

export function getModulePath(
    moduleName: string,
    fromFile?: string,
): string | null {
    // Verificar si el módulo está en la lista de excluidos
    if (EXCLUDED_MODULES.has(moduleName)) {
        if (env.VERBOSE === 'true')
            logger.info(
                `Módulo ${moduleName} está en la lista de excluidos, manteniendo importación original`,
            );
        return null; // Retornar null para mantener la importación original
    }

    return getNodeModulesRelativePath(simpleESMResolver(moduleName), fromFile);
}

// Nueva función para resolver subpaths de módulos (ej: 'yargs/helpers')
export function getModuleSubPath(
    moduleName: string,
    fromFile?: string,
): string | null {
    // Verificar si el módulo está en la lista de excluidos
    if (EXCLUDED_MODULES.has(moduleName)) {
        if (env.VERBOSE === 'true')
            logger.info(
                `Módulo ${moduleName} está en la lista de excluidos, manteniendo importación original`,
            );
        return null; // Retornar null para mantener la importación original
    } // Si contiene '/', es un subpath
    if (moduleName.includes('/')) {
        const [packageName, ...subPathParts] = moduleName.split('/');
        const subPath = subPathParts.join('/');

        // Verificar que packageName no esté vacío
        if (!packageName) {
            return null;
        }

        try {
            const nodeModulesPath = join(
                process.cwd(),
                'node_modules',
                packageName,
            );
            const packagePath = join(nodeModulesPath, 'package.json');

            if (!fs.existsSync(packagePath)) {
                return null;
            }

            const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
            const moduleDir = dirname(packagePath);

            // Revisar exports field para subpaths
            if (
                packageJson.exports &&
                typeof packageJson.exports === 'object'
            ) {
                const exportKey = `./${subPath}`;
                let exportPath = packageJson.exports[exportKey];

                if (exportPath) {
                    if (typeof exportPath === 'string') {
                        return getNodeModulesRelativePath(
                            join(moduleDir, exportPath),
                            fromFile,
                        );
                    } else if (typeof exportPath === 'object') {
                        // Priorizar import > default para ESM
                        const importPath =
                            exportPath.import || exportPath.default;
                        if (typeof importPath === 'string') {
                            return getNodeModulesRelativePath(
                                join(moduleDir, importPath),
                                fromFile,
                            );
                        }
                    }
                }
            }

            // Fallback: intentar resolver directamente el subpath
            const directPath = join(moduleDir, subPath);
            if (fs.existsSync(directPath)) {
                return getNodeModulesRelativePath(directPath, fromFile);
            }

            // Intentar con extensiones comunes
            const extensions = ['.mjs', '.js', '.cjs'];
            for (const ext of extensions) {
                const pathWithExt = directPath + ext;
                if (fs.existsSync(pathWithExt)) {
                    return getNodeModulesRelativePath(pathWithExt, fromFile);
                }
            }
        } catch (error) {
            if (env.VERBOSE === 'true')
                logger.error(
                    `Error resolviendo subpath ${moduleName}:`,
                    error instanceof Error ? error.message : String(error),
                );
        }
    }

    // Si no es un subpath, usar el resolver normal
    return getModulePath(moduleName, fromFile);
}
