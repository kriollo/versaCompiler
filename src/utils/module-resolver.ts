// Opción con librería 'resolve' (npm install resolve)
import fs, { readdir, readFile, readFileSync, readlink, stat } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { env } from 'node:process';

import pkg from 'enhanced-resolve';
import resolve from 'resolve';

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
    'typescript/lib/typescript',
    // Agregar más módulos problemáticos aquí según sea necesario
]);

function resolveESMWithLibrary(moduleName: string): string | null {
    try {
        // Resolver el módulo
        const resolved = resolve.sync(moduleName, {
            basedir: process.cwd(),
            packageFilter: (pkg: any) => {
                // Priorizar campos ESM
                if (pkg.module) pkg.main = pkg.module;
                else if (pkg.exports?.['.']?.import)
                    pkg.main = pkg.exports['.'].import;
                else if (pkg.exports?.import) pkg.main = pkg.exports.import;
                return pkg;
            },
        });
        return resolved;
    } catch (error) {
        if (env.VERBOSE === 'true')
            logger.error(
                `Error resolviendo ${moduleName}:`,
                error instanceof Error ? error.message : String(error),
            );
        return null;
    }
}

// Opción con 'enhanced-resolve' (webpack's resolver)
// npm install enhanced-resolve

const { ResolverFactory } = pkg;

const resolver = ResolverFactory.createResolver({
    fileSystem: {
        readFile,
        readlink,
        stat,
        readdir,
    },
    conditionNames: ['import', 'module', 'default'], // Priorizar ESM
    extensions: ['.mjs', '.js', '.json'],
    mainFields: ['module', 'main'], // Priorizar campo 'module'
    aliasFields: ['browser'],
});

function resolveESMEnhanced(moduleName: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        resolver.resolve({}, process.cwd(), moduleName, {}, (err, result) => {
            if (err) reject(err);
            else resolve(result as string);
        });
    });
}

// Función dinámica para detectar versiones browser-compatible
function findBrowserCompatibleVersion(
    moduleDir: string,
    originalEntry: string,
): string | null {
    const dir = dirname(originalEntry);
    const baseName = originalEntry.split('/').pop() || '';
    const extension = baseName.includes('.')
        ? `.${baseName.split('.').pop()}`
        : '.js';
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');

    // Patrones que indican versiones NO compatibles con browser
    const bundlerPatterns = ['bundler', 'runtime', 'node', 'cjs', 'commonjs'];

    // Patrones que indican versiones SÍ compatibles con browser
    const browserPatterns = [
        'browser',
        'esm-browser',
        'es-browser',
        'web',
        'global',
        'umd',
    ];

    // Si el archivo original ya es browser-compatible, devolverlo
    const hasBrowserPattern = browserPatterns.some(pattern =>
        originalEntry.toLowerCase().includes(pattern),
    );

    if (hasBrowserPattern) {
        return originalEntry;
    }

    // Si contiene patrones de bundler, buscar alternativas
    const hasBundlerPattern = bundlerPatterns.some(pattern =>
        originalEntry.toLowerCase().includes(pattern),
    );

    if (hasBundlerPattern) {
        // Buscar en el directorio del módulo
        const searchDir = join(moduleDir, dir);

        if (fs.existsSync(searchDir)) {
            try {
                const files = fs.readdirSync(searchDir);

                // Buscar archivos que contengan patrones browser
                const browserFiles = files.filter(file => {
                    const lowerFile = file.toLowerCase();
                    return (
                        browserPatterns.some(pattern =>
                            lowerFile.includes(pattern),
                        ) &&
                        (file.endsWith('.js') || file.endsWith('.mjs'))
                    );
                });

                if (browserFiles.length > 0) {
                    // Priorizar por orden de preferencia
                    const priorityOrder = [
                        'esm-browser',
                        'browser',
                        'web',
                        'global',
                        'umd',
                    ];

                    for (const priority of priorityOrder) {
                        const found = browserFiles.find(file =>
                            file.toLowerCase().includes(priority),
                        );
                        if (found) {
                            const browserPath = join(dir, found).replace(
                                /\\/g,
                                '/',
                            );

                            return browserPath;
                        }
                    } // Si no hay coincidencia exacta, usar el primero encontrado
                    if (browserFiles[0]) {
                        const browserPath = join(dir, browserFiles[0]).replace(
                            /\\/g,
                            '/',
                        );
                        return browserPath;
                    }
                }
            } catch (error) {
                if (env.VERBOSE === 'true')
                    logger.warn(
                        `No se pudo leer directorio ${searchDir}:`,
                        error instanceof Error ? error.message : String(error),
                    );
            }
        }
    }

    return originalEntry; // Si no se encuentra alternativa, usar original
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
        const isESM = packageJson.type === 'module';

        // Determinar el entry point ESM
        let entryPoint: string | null = null;

        // 1. Revisar exports field
        if (packageJson.exports) {
            if (typeof packageJson.exports === 'string') {
                entryPoint = packageJson.exports;
            } else if (packageJson.exports['.']) {
                const dotExport = packageJson.exports['.'];
                if (typeof dotExport === 'string') {
                    entryPoint = dotExport;
                } else if (typeof dotExport === 'object') {
                    // Priorizar browser > import > default para compatibilidad web
                    entryPoint =
                        dotExport.browser ||
                        (typeof dotExport.import === 'string'
                            ? dotExport.import
                            : null) ||
                        (typeof dotExport.default === 'string'
                            ? dotExport.default
                            : null);
                }
            }
        }

        // 2. Revisar browser field específico
        if (!entryPoint && packageJson.browser) {
            if (typeof packageJson.browser === 'string') {
                entryPoint = packageJson.browser;
            } else if (typeof packageJson.browser === 'object') {
                // Si browser es un objeto de mapeo, buscar la entrada principal
                entryPoint =
                    packageJson.browser['.'] ||
                    packageJson.browser[packageJson.main];
            }
        }

        // 3. Fallback a module field para ESM
        if (!entryPoint && packageJson.module) {
            entryPoint = packageJson.module;
        }

        // 4. Fallback a main field
        if (!entryPoint && packageJson.main) {
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
        }

        // Resolver la ruta final
        let finalPath = join(moduleDir, entryPoint);

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

// Función utilitaria para obtener solo la parte relativa de node_modules
function getNodeModulesRelativePath(
    fullPath: string | null,
    fromFile?: string,
): string | null {
    if (!fullPath) return null;
    const idx = fullPath.indexOf('node_modules');
    if (idx !== -1) {
        let relativePath = fullPath.substring(idx).replace(/\\/g, '/');
        // Si se proporciona fromFile, calcular la ruta relativa correcta
        if (fromFile) {
            const fromDir = dirname(fromFile);
            const distDir = env.PATH_DIST || 'dist';

            // Calcular niveles de profundidad desde el archivo de destino en dist
            // Transformar la ruta del archivo fuente al archivo de destino
            const relativeToSrc = relative('./src', fromDir).replace(
                /\\/g,
                '/',
            );
            const targetPath = join(distDir, relativeToSrc).replace(/\\/g, '/');

            // Contar los directorios en el path de destino
            const pathParts = targetPath
                .split('/')
                .filter(part => part && part !== '.');
            const levels = pathParts.length - 1; // -1 porque el último es el archivo
            const upLevels = '../'.repeat(levels + 1); // +1 para salir del directorio de compilación

            relativePath = upLevels + relativePath;
        } else {
            // Fallback: usar ../ para archivos compilados en dist
            relativePath = '../' + relativePath;
        }
        return relativePath;
    }
    // Siempre retorna la ruta relativa al cwd, y si es igual, devuelve '.'
    let rel = relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (!rel) rel = '.';
    // Para rutas relativas, usar ../ para ir desde dist a la raíz
    if (!rel.startsWith('./') && !rel.startsWith('../')) {
        rel = '../' + rel;
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
