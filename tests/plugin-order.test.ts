import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { build } from '../src/index';

// enforce: 'pre' corre antes de los plugins core y ve el TypeScript original;
// sin enforce corre después, sobre el JS ya compilado.
const originalCwd = process.cwd();
let dir: string;

beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'versa-plugins-'));
    mkdirSync(path.join(dir, 'src'));
    writeFileSync(
        path.join(dir, 'versacompile.config.ts'),
        `export default {
    compilerOptions: { sourceRoot: './src', outDir: './dist', pathsAlias: {} },
    linter: [],
    plugins: [
        {
            name: 'post',
            onTransform: ({ contents }) => ({
                contents: contents + '\\n// post vio TS: ' + contents.includes(': number'),
            }),
        },
        {
            name: 'pre',
            enforce: 'pre',
            onTransform: ({ contents }) => ({
                contents: contents.replace('__PRE__', String(contents.includes(': number'))),
            }),
        },
    ],
};
`,
    );
    writeFileSync(
        path.join(dir, 'tsconfig.json'),
        '{ "compilerOptions": { "strict": true, "module": "esnext", "target": "esnext" } }\n',
    );
    writeFileSync(
        path.join(dir, 'src', 'a.ts'),
        "export const n: number = 1;\nexport const preVioTS = '__PRE__';\n",
    );
    process.chdir(dir);
});

afterAll(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
});

it('un plugin pre ve el fuente TS y uno normal el JS compilado', async () => {
    expect(await build()).toBe(true);
    const out = readFileSync(path.join(dir, 'dist', 'a.js'), 'utf8');
    expect(out).toContain("preVioTS = 'true'");
    expect(out).toContain('// post vio TS: false');
});
