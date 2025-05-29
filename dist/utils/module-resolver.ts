// Opción con librería 'resolve' (npm install resolve)
import fs, { readdir, readFile, readFileSync, readlink, stat } from 'fs';
import { dirname, join, relative } from 'path';
import resolve from 'resolve';

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
        console.error(`Error resolviendo ${moduleName}:`, error.message);
        return null;
    }
}

// Opción con 'enhanced-resolve' (webpack's resolver)
// npm install enhanced-resolve
import pkg from 'enhanced-resolve';
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
                            console.log(
                                `🔄 Encontrada versión browser: ${originalEntry} → ${browserPath}`,
                            );
                            return browserPath;
                        }
                    }

                    // Si no hay coincidencia exacta, usar el primero encontrado
                    const browserPath = join(dir, browserFiles[0]).replace(
                        /\\/g,
                        '/',
                    );
                    console.log(
                        `🔄 Usando versión browser alternativa: ${originalEntry} → ${browserPath}`,
                    );
                    return browserPath;
                }
            } catch (error) {
                console.warn(
                    `No se pudo leer directorio ${searchDir}:`,
                    error.message,
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

        // Determinar el entry point ESM con detección dinámica de versiones browser
        let entryPoint: string | null = null;

        // 1. Revisar exports field con prioridad para condiciones browser
        if (packageJson.exports) {
            if (typeof packageJson.exports === 'string') {
                entryPoint = packageJson.exports;
            } else if (packageJson.exports['.']) {
                const dotExport = packageJson.exports['.'];
                if (typeof dotExport === 'string') {
                    entryPoint = dotExport;
                } else if (typeof dotExport === 'object') {
                    // PRIORIZAR browser > import > module > default
                    entryPoint =
                        dotExport.browser || // ← Prioridad para browser
                        dotExport.import ||
                        dotExport.module ||
                        dotExport.default ||
                        dotExport.main;

                    if (typeof entryPoint === 'object' && entryPoint !== null) {
                        const entryObj = entryPoint as any;
                        entryPoint =
                            entryObj.browser || // ← Prioridad para browser
                            entryObj.import ||
                            entryObj.default ||
                            null;
                    }
                }
            } else if (packageJson.exports.browser) {
                entryPoint = packageJson.exports.browser;
            } else if (packageJson.exports.import) {
                entryPoint = packageJson.exports.import;
            } else if (packageJson.exports.default) {
                entryPoint = packageJson.exports.default;
            }
        }

        // 2. Fallback a campo 'browser' específico del package.json
        if (!entryPoint && packageJson.browser) {
            if (typeof packageJson.browser === 'string') {
                entryPoint = packageJson.browser;
            } else if (
                typeof packageJson.browser === 'object' &&
                packageJson.browser['.']
            ) {
                entryPoint = packageJson.browser['.'];
            }
        }

        // 3. Fallback a module field
        if (!entryPoint && packageJson.module) {
            entryPoint = packageJson.module;
        }

        // 4. Fallback a main field
        if (!entryPoint && packageJson.main) {
            entryPoint = packageJson.main;
        }

        // 5. Fallback por defecto
        if (!entryPoint) {
            entryPoint = 'index.js';
        }

        if (typeof entryPoint !== 'string') {
            console.warn(
                `Entry point no es string para ${moduleName}:`,
                entryPoint,
            );
            entryPoint = 'index.js';
        }

        // 🔍 DETECCIÓN DINÁMICA: Buscar versión browser-compatible
        const browserCompatibleEntry = findBrowserCompatibleVersion(
            moduleDir,
            entryPoint,
        );
        const finalEntry = browserCompatibleEntry || entryPoint;

        const finalPath = join(moduleDir, finalEntry);

        // Verificar que el archivo existe
        if (!fs.existsSync(finalPath)) {
            console.warn(
                `⚠️  Archivo no existe: ${finalPath}, usando original: ${entryPoint}`,
            );
            return join(moduleDir, entryPoint);
        }

        console.log(`✅ Resuelto ${moduleName} → ${finalEntry}`);
        return finalPath;
    } catch (error) {
        console.error(`Error resolviendo ${moduleName}: ${error.message}`);
        return null;
    }
}

// Función utilitaria para obtener solo la parte relativa de node_modules
function getNodeModulesRelativePath(fullPath: string | null): string | null {
    if (!fullPath) return null;
    const idx = fullPath.indexOf('node_modules');
    if (idx !== -1) {
        let relativePath = fullPath.substring(idx).replace(/\\/g, '/');
        // Agrega / al inicio si no existe
        if (!relativePath.startsWith('/')) {
            relativePath = '/' + relativePath;
        }
        return relativePath;
    }
    // Siempre retorna la ruta relativa al cwd, y si es igual, devuelve '.'
    let rel = relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (!rel) rel = '.';
    // Agrega / al inicio si no existe
    if (!rel.startsWith('/')) rel = '/' + rel;
    return rel;
}

export function getModulePath(moduleName: string): string | null {
    return getNodeModulesRelativePath(simpleESMResolver(moduleName));
}
