import findRoot from 'find-root';
import fs from 'fs-extra';
import { createRequire } from 'node:module';
import path from 'path';

export function resolveBin(
    moduleName: string,
    {
        executable = moduleName,
        paths = [process.cwd()],
    }: { executable?: string; paths?: string[] } = {},
): string {
    let rootDir;
    try {
        const customRequire = createRequire(__filename);
        const resolved = customRequire.resolve(moduleName, { paths });
        rootDir = findRoot(resolved);
    } catch (e) {
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
