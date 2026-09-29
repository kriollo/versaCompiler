import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileFile } from '../src/compiler/compile';
import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';

describe('Production Mode Import Integration Tests', () => {
    const testOutputDir = join(process.cwd(), 'temp', 'production-test-output');

    beforeEach(async () => {
        // El optimizer cachea la resolución de 'vue' sin distinguir isPROD
        resetModuleResolutionOptimizer();
        // vi.stubEnv muta process.env: compile.ts guarda la referencia de
        // `env` al importarse, así que reasignar process.env no le llega.
        vi.stubEnv('PATH_SOURCE', join(process.cwd(), 'temp'));
        vi.stubEnv('PATH_DIST', testOutputDir);
        vi.stubEnv('PATH_ALIAS', '{}'); // readConfig siempre lo define
        vi.stubEnv('VERBOSE', 'false');

        // Crear directorio de output si no existe
        if (!existsSync(testOutputDir)) {
            await mkdir(testOutputDir, { recursive: true });
        }
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const compileAndRead = async (name: string, content: string) => {
        const filePath = join(process.cwd(), 'temp', name);
        await writeFile(filePath, content, 'utf-8');
        const result = await compileFile(filePath);
        expect(result.success).toBe(true);
        expect(result.output).toBeTruthy();
        return readFile(result.output as string, 'utf-8');
    };

    it('should use .prod.js version in production mode for Vue import', async () => {
        vi.stubEnv('isPROD', 'true');

        const compiled = await compileAndRead(
            'test-vue-prod.js',
            `import { createApp } from 'vue';\nconsole.log('Test');`,
        );

        expect(compiled).toMatch(/vue[\w.-]*\.prod\.js/);
    });

    it('should use development .js version in development mode for Vue import', async () => {
        vi.stubEnv('isPROD', 'false');

        const compiled = await compileAndRead(
            'test-vue-dev.js',
            `import { createApp } from 'vue';\nconsole.log('Test');`,
        );

        expect(compiled).toContain('/node_modules/vue/');
        expect(compiled).not.toContain('.prod.js');
    });

    it('should preserve production mode setting across multiple compilations', async () => {
        vi.stubEnv('isPROD', 'true');

        for (const [name, content] of [
            ['test-vue-1.js', `import { createApp } from 'vue';`],
            ['test-vue-2.js', `import { ref } from 'vue';`],
            ['test-vue-3.js', `import { computed } from 'vue';`],
        ] as const) {
            expect(await compileAndRead(name, content)).toMatch(
                /vue[\w.-]*\.prod\.js/,
            );
        }
    });
});
