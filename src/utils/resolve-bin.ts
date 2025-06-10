import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as process from 'node:process';

import findRoot from 'find-root';
import fs from 'fs-extra';

// Para compatibilidad con ES modules
const require = createRequire(import.meta.url);

export function resolveBin(
    moduleName: string,
    {
        executable = moduleName,
        paths = [process.cwd()],
    }: { executable?: string; paths?: string[] } = {},
): string {
    let rootDir;
    try {
        const resolved = require.resolve(moduleName, { paths });
        rootDir = findRoot(resolved);
    } catch {
        const modJson = require.resolve(`${moduleName}/package.json`, {
            paths,
        });
        rootDir = path.dirname(modJson);
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
