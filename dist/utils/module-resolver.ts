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

// Función simple que no usa createRequire
function simpleESMResolver(moduleName: string): string | null {
    try {
        // Para el entorno de testing, simulamos la resolución
        // En lugar de usar require.resolve, construimos la ruta esperada
        const nodeModulesPath = join(process.cwd(), 'node_modules', moduleName);
        let packagePath: string;
        let packageJson: any;
        try {
            // Método 1: Buscar package.json directamente en node_modules
            packagePath = join(nodeModulesPath, 'package.json');
            if (!fs.existsSync(packagePath)) {
                throw new Error(
                    `No se encontró package.json para ${moduleName}`,
                );
            }
        } catch {
            // Si no se encuentra, retornar null
            return null;
        }

        packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        const moduleDir = dirname(packagePath);

        // Determinar el entry point ESM
        let entryPoint: string | null = null;

        // 1. Revisar exports field (manejo mejorado)
        if (packageJson.exports) {
            if (typeof packageJson.exports === 'string') {
                entryPoint = packageJson.exports;
            } else if (packageJson.exports['.']) {
                const dotExport = packageJson.exports['.'];
                if (typeof dotExport === 'string') {
                    entryPoint = dotExport;
                } else if (typeof dotExport === 'object') {
                    // Manejar exports con condiciones: { import: "...", require: "...", default: "..." }
                    entryPoint =
                        dotExport.import ||
                        dotExport.module ||
                        dotExport.default ||
                        dotExport.main;
                    // Si aún es un objeto, intentar extraer el string
                    if (typeof entryPoint === 'object' && entryPoint !== null) {
                        const entryObj = entryPoint as any;
                        entryPoint =
                            entryObj.import || entryObj.default || null;
                    }
                }
            } else if (packageJson.exports.import) {
                entryPoint = packageJson.exports.import;
            } else if (packageJson.exports.default) {
                entryPoint = packageJson.exports.default;
            }
        }

        // 2. Fallback a module field
        if (!entryPoint && packageJson.module) {
            entryPoint = packageJson.module;
        }

        // 3. Fallback a main field
        if (!entryPoint && packageJson.main) {
            entryPoint = packageJson.main;
        }

        // 4. Fallback por defecto
        if (!entryPoint) {
            entryPoint = 'index.js';
        }

        // Asegurar que entryPoint es un string
        if (typeof entryPoint !== 'string') {
            console.warn(
                `Entry point no es string para ${moduleName}:`,
                entryPoint,
            );
            entryPoint = 'index.js';
        }

        return join(moduleDir, entryPoint);
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
        return fullPath.substring(idx).replace(/\\/g, '/');
    } // Siempre retorna la ruta relativa al cwd, y si es igual, devuelve '.'
    let rel = relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (!rel) rel = '.';
    return rel;
}

export function getModulePath(moduleName: string): string | null {
    return getNodeModulesRelativePath(simpleESMResolver(moduleName));
}
