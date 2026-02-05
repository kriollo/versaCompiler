// Opción con librería 'resolve' (npm install resolve)
import fs, { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { cwd, env } from 'node:process';

// import pkg from 'enhanced-resolve';
// import resolve from 'resolve';

import { logger } from '../servicios/logger';

import { EXCLUDED_MODULES } from './excluded-modules';

// ✨ OPTIMIZACIÓN CRÍTICA: Cache de package.json
interface PackageJsonCacheEntry {
    content: any;
    mtime: number;
}

class PackageJsonCache {
    private static instance: PackageJsonCache;
    private cache = new Map<string, PackageJsonCacheEntry>();
    private readonly MAX_CACHE_SIZE = 200;

    static getInstance(): PackageJsonCache {
        if (!PackageJsonCache.instance) {
            PackageJsonCache.instance = new PackageJsonCache();
        }
        return PackageJsonCache.instance;
    }

    get(packagePath: string): any | null {
        try {
            if (!fs.existsSync(packagePath)) {
                return null;
            }

            const stats = fs.statSync(packagePath);
            const cached = this.cache.get(packagePath);

            if (cached && cached.mtime === stats.mtimeMs) {
                return cached.content;
            }

            const content = JSON.parse(readFileSync(packagePath, 'utf-8'));

            if (this.cache.size >= this.MAX_CACHE_SIZE) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            this.cache.set(packagePath, {
                content,
                mtime: stats.mtimeMs,
            });

            return content;
        } catch {
            return null;
        }
    }

    clear(): void {
        this.cache.clear();
    }
}

const packageJsonCache = PackageJsonCache.getInstance();

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
        const files = fs.readdirSync(searchDir);

        // ✨ Patrones de prioridad dinámicos según modo producción
        const priorityPatterns =
            env.isPROD === 'true'
                ? [
                      // 🏭 MODO PRODUCCIÓN: Priorizar versiones optimizadas
                      // Máxima prioridad: ESM-Browser producción
                      `${nameWithoutExt}.esm-browser.prod.js`,
                      `${nameWithoutExt}.esm-browser.min.js`,
                      // ESM producción
                      `${nameWithoutExt}.esm.prod.js`,
                      `${nameWithoutExt}.esm.min.js`,
                      `${nameWithoutExt}.module.prod.js`,
                      `${nameWithoutExt}.module.min.js`,
                      // Browser producción
                      `${nameWithoutExt}.browser.prod.js`,
                      `${nameWithoutExt}.browser.min.js`,
                      `${nameWithoutExt}.web.prod.js`,
                      `${nameWithoutExt}.web.min.js`,
                      // Global/UMD producción
                      `${nameWithoutExt}.global.prod.js`,
                      `${nameWithoutExt}.global.min.js`,
                      `${nameWithoutExt}.umd.prod.js`,
                      `${nameWithoutExt}.umd.min.js`,
                      `${nameWithoutExt}.min.js`,
                      // Fallback a versiones de desarrollo si no hay producción
                      `${nameWithoutExt}.esm-browser.js`,
                      `${nameWithoutExt}.esm.js`,
                      `${nameWithoutExt}.module.js`,
                      `${nameWithoutExt}.browser.js`,
                      `${nameWithoutExt}.web.js`,
                      `${nameWithoutExt}.umd.js`,
                      `${nameWithoutExt}.global.js`,
                      // Último recurso: versiones runtime
                      `${nameWithoutExt}.runtime.esm-browser.prod.js`,
                      `${nameWithoutExt}.runtime.esm-browser.min.js`,
                      `${nameWithoutExt}.runtime.esm-browser.js`,
                  ]
                : [
                      // 🔧 MODO DESARROLLO: Priorizar versiones sin minificar
                      // Máxima prioridad: ESM-Browser desarrollo
                      `${nameWithoutExt}.esm-browser.js`,
                      // ESM puro sin minificar
                      `${nameWithoutExt}.esm.all.js`,
                      `${nameWithoutExt}.esm.js`,
                      `${nameWithoutExt}.module.js`,
                      // Browser puro sin minificar
                      `${nameWithoutExt}.browser.js`,
                      `${nameWithoutExt}.web.js`,
                      // UMD sin minificar
                      `${nameWithoutExt}.umd.js`,
                      `${nameWithoutExt}.global.js`,
                      // Fallback a versiones minificadas
                      `${nameWithoutExt}.esm-browser.prod.js`,
                      `${nameWithoutExt}.esm-browser.min.js`,
                      `${nameWithoutExt}.esm.prod.js`,
                      `${nameWithoutExt}.esm.min.js`,
                      `${nameWithoutExt}.module.min.js`,
                      `${nameWithoutExt}.browser.prod.js`,
                      `${nameWithoutExt}.browser.min.js`,
                      `${nameWithoutExt}.web.min.js`,
                      `${nameWithoutExt}.umd.min.js`,
                      `${nameWithoutExt}.global.min.js`,
                      `${nameWithoutExt}.min.js`,
                      // Último recurso: versiones runtime
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
                        `📦 Versión optimizada encontrada (${env.isPROD === 'true' ? 'PROD' : 'DEV'}): ${optimizedPath}`,
                    );
                }
                return optimizedPath;
            }
        }

        // ✨ OPTIMIZACIÓN CRÍTICA: Clasificar archivos en un solo loop
        const fileGroups = {
            esmBrowserProd: [] as string[],
            esmBrowserMin: [] as string[],
            esmBrowserDev: [] as string[],
            esmProd: [] as string[],
            esmMin: [] as string[],
            esmDev: [] as string[],
            browserMin: [] as string[],
            runtimeDev: [] as string[],
            runtime: [] as string[],
            other: [] as string[],
        };

        for (const file of files) {
            if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
            
            const lowerFile = file.toLowerCase();
            const hasEsmBrowser = lowerFile.includes('.esm-browser.');
            const hasEsm = lowerFile.includes('.esm.') || lowerFile.includes('.module.');
            const hasBrowser = lowerFile.includes('.browser.') || lowerFile.includes('.web.');
            const hasRuntime = lowerFile.includes('.runtime.');
            const isProd = lowerFile.includes('.prod.');
            const isMin = lowerFile.includes('.min.');

            if (hasEsmBrowser && !hasRuntime) {
                if (isProd) fileGroups.esmBrowserProd.push(file);
                else if (isMin) fileGroups.esmBrowserMin.push(file);
                else fileGroups.esmBrowserDev.push(file);
            } else if (hasEsm && !hasRuntime) {
                if (isProd) fileGroups.esmProd.push(file);
                else if (isMin) fileGroups.esmMin.push(file);
                else fileGroups.esmDev.push(file);
            } else if (hasBrowser && isMin) {
                fileGroups.browserMin.push(file);
            } else if (hasRuntime && hasEsmBrowser) {
                if (!isProd && !isMin) fileGroups.runtimeDev.push(file);
                else fileGroups.runtime.push(file);
            } else if (hasEsm || hasBrowser) {
                fileGroups.other.push(file);
            }
        }

        // Seleccionar archivo según prioridad y modo
        const isProd = env.isPROD === 'true';
        
        // Prioridad 1: ESM-Browser
        if (isProd) {
            if (fileGroups.esmBrowserProd[0]) {
                const optimizedPath = join(dir, fileGroups.esmBrowserProd[0]).replace(/\\/g, '/');
                if (env.VERBOSE === 'true') logger.info(`🏭 Versión ESM-Browser producción encontrada: ${optimizedPath}`);
                return optimizedPath;
            }
            if (fileGroups.esmBrowserMin[0]) {
                const optimizedPath = join(dir, fileGroups.esmBrowserMin[0]).replace(/\\/g, '/');
                if (env.VERBOSE === 'true') logger.info(`🗜️ Versión ESM-Browser minificada encontrada: ${optimizedPath}`);
                return optimizedPath;
            }
        }
        
        if (fileGroups.esmBrowserDev[0]) {
            const optimizedPath = join(dir, fileGroups.esmBrowserDev[0]).replace(/\\/g, '/');
            if (env.VERBOSE === 'true') logger.info(`🔧 Versión ESM-Browser desarrollo encontrada: ${optimizedPath}`);
            return optimizedPath;
        }

        // Prioridad 2: ESM puro
        if (isProd) {
            if (fileGroups.esmProd[0]) {
                const optimizedPath = join(dir, fileGroups.esmProd[0]).replace(/\\/g, '/');
                if (env.VERBOSE === 'true') logger.info(`Versión ESM producción encontrada: ${optimizedPath}`);
                return optimizedPath;
            }
            if (fileGroups.esmMin[0]) {
                const optimizedPath = join(dir, fileGroups.esmMin[0]).replace(/\\/g, '/');
                if (env.VERBOSE === 'true') logger.info(`Versión ESM minificada encontrada: ${optimizedPath}`);
                return optimizedPath;
            }
        }
        
        if (fileGroups.esmDev[0]) {
            const optimizedPath = join(dir, fileGroups.esmDev[0]).replace(/\\/g, '/');
            if (env.VERBOSE === 'true') logger.info(`Versión ESM encontrada: ${optimizedPath}`);
            return optimizedPath;
        }

        // Prioridad 3: Browser minificado
        if (fileGroups.browserMin[0]) {
            const optimizedPath = join(dir, fileGroups.browserMin[0]).replace(/\\/g, '/');
            if (env.VERBOSE === 'true') logger.info(`Versión browser minificada encontrada: ${optimizedPath}`);
            return optimizedPath;
        }

        // Prioridad 4: Runtime
        if (fileGroups.runtimeDev[0]) {
            const optimizedPath = join(dir, fileGroups.runtimeDev[0]).replace(/\\/g, '/');
            if (env.VERBOSE === 'true') logger.info(`Versión Runtime ESM-Browser dev encontrada: ${optimizedPath}`);
            return optimizedPath;
        }
        if (fileGroups.runtime[0]) {
            const optimizedPath = join(dir, fileGroups.runtime[0]).replace(/\\/g, '/');
            if (env.VERBOSE === 'true') logger.info(`Versión Runtime ESM-Browser encontrada: ${optimizedPath}`);
            return optimizedPath;
        }

        // Fallback: otros archivos browser/esm
        if (fileGroups.other[0]) {
            const optimizedPath = join(dir, fileGroups.other[0]).replace(/\\/g, '/');
            if (env.VERBOSE === 'true') logger.info(`Versión browser encontrada: ${optimizedPath}`);
            return optimizedPath;
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
        const nodeModulesPath = join(cwd(), 'node_modules', moduleName);
        let packagePath: string;

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

        const packageJson = packageJsonCache.get(packagePath);
        if (!packageJson) return null;

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
                            (privateImports as RegExpMatchArray[]).map(
                                m => m[1],
                            ),
                        );
                    // Si usa imports privados, asegurarnos de que estén disponibles
                    for (const match of privateImports as RegExpMatchArray[]) {
                        const [, importPath] = match;
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
        const relativePath = fullPath.substring(idx).replace(/\\/g, '/');

        // Devolver ruta absoluta desde la raíz del proyecto (sin ../)
        // Esto permite que los archivos compilados accedan directamente a node_modules
        return '/' + relativePath;
    }

    // Para rutas que no están en node_modules, convertir a ruta absoluta desde la raíz
    let rel = relative(cwd(), fullPath).replace(/\\/g, '/');
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
            const nodeModulesPath = join(cwd(), 'node_modules', packageName);
            const packagePath = join(nodeModulesPath, 'package.json');

            if (!fs.existsSync(packagePath)) {
                return null;
            }

            const packageJson = packageJsonCache.get(packagePath);
            if (!packageJson) return null;

            const moduleDir = dirname(packagePath);

            // Revisar exports field para subpaths
            if (
                packageJson.exports &&
                typeof packageJson.exports === 'object'
            ) {
                const exportKey = `./${subPath}`;
                const exportPath = packageJson.exports[exportKey];

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
