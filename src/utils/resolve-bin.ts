import * as path from 'node:path';
import * as process from 'node:process';

import * as findRootModule from 'find-root';
import fs from 'fs-extra';

const findRoot = (findRootModule as any).default || findRootModule;

// Función helper para resolver módulos sin createRequire
function resolveModule(moduleName: string, paths: string[]): string {
    for (const searchPath of paths) {
        try {
            const nodeModulesPath = path.join(
                searchPath,
                'node_modules',
                moduleName,
            );
            if (fs.existsSync(nodeModulesPath)) {
                return nodeModulesPath;
            }
        } catch {
            // Continuar con el siguiente path
        }
    }
    throw new Error(
        `Cannot resolve module ${moduleName} from paths: ${paths.join(', ')}`,
    );
}

export function resolveBin(
    moduleName: string,
    {
        executable = moduleName,
        paths = [process.cwd()],
    }: { executable?: string; paths?: string[] } = {},
): string {
    let rootDir;
    try {
        const resolved = resolveModule(moduleName, paths);
        rootDir = findRoot(resolved);
    } catch {
        // Intentar resolver package.json directamente
        const basePath = paths[0] || process.cwd();
        const packagePath = path.join(
            basePath,
            'node_modules',
            moduleName,
            'package.json',
        );
        if (fs.existsSync(packagePath)) {
            rootDir = path.dirname(packagePath);
        } else {
            throw new Error(`Cannot resolve module ${moduleName}`);
        }
    }
    const packageJsonPath = path.join(rootDir, 'package.json');

    const packageJson = fs.readJsonSync(packageJsonPath);
    if (!packageJson.bin) {
        throw new Error(
            `no bin found in ${packageJson.name}@${packageJson.version} in path ${packageJsonPath}`,
        );
    }

    const binProp =
        typeof packageJson.bin === 'string'
            ? packageJson.bin
            : packageJson.bin[executable];
    const binPath = path.join(rootDir, binProp);
    return binPath;
}
