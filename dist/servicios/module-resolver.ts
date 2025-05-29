// Opción con librería 'resolve' (npm install resolve)
import { readdir, readFile, readFileSync, readlink, stat } from 'fs';
import { dirname, join } from 'path';
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

// Función simple usando solo Node.js builtin APIs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function simpleESMResolver(moduleName: string): string | null {
    try {
        // Resolver el package.json del módulo
        const packagePath = require.resolve(`${moduleName}/package.json`);
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        const moduleDir = dirname(packagePath);

        // Determinar el entry point ESM
        let entryPoint;

        // 1. Revisar exports field
        if (packageJson.exports) {
            if (typeof packageJson.exports === 'string') {
                entryPoint = packageJson.exports;
            } else if (packageJson.exports['.']) {
                const dotExport = packageJson.exports['.'];
                if (typeof dotExport === 'string') {
                    entryPoint = dotExport;
                } else {
                    entryPoint =
                        dotExport.import ||
                        dotExport.module ||
                        dotExport.default;
                }
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

        return join(moduleDir, entryPoint);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return null;
    }
}

// Función utilitaria para obtener solo la parte relativa de node_modules
function getNodeModulesRelativePath(fullPath: string | null): string | null {
    if (!fullPath) return null;
    const path = require('path');
    const idx = fullPath.indexOf('node_modules');
    if (idx !== -1) {
        return fullPath.substring(idx).replace(/\\/g, '/');
    }
    // Siempre retorna la ruta relativa al cwd, y si es igual, devuelve '.'
    let rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (!rel) rel = '.';
    return rel;
}

export function getModulePath(moduleName: string): string | null {
    return getNodeModulesRelativePath(simpleESMResolver(moduleName));
}
