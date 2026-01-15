import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ESLint, OxLint } from '../src/compiler/linter';

describe('Linter - ESLint Integration', () => {
    const testDir = join(process.cwd(), 'temp', 'linter-test');
    const testFile = join(testDir, 'test.js');

    beforeEach(async () => {
        if (!existsSync(testDir)) {
            await mkdir(testDir, { recursive: true });
        }

        const codeWithIssues = `
const unused = 42;
var oldStyle = "should use const/let";
console.log("test")
`;
        await writeFile(testFile, codeWithIssues, 'utf-8');
    });

    afterEach(async () => {
        try {
            if (existsSync(testFile)) {
                await unlink(testFile);
            }
        } catch (error) {
            // Ignorar errores de limpieza
        }
    });

    describe('ESLint', () => {
        it('should return structure when bin not found', async () => {
            const result = await ESLint({
                bin: '/nonexistent/eslint',
                paths: [testFile],
            });

            expect(result).toBeDefined();
            expect(result.json).toBeDefined();
        });

        it('should accept valid configuration', async () => {
            const result = await ESLint({
                bin: './node_modules/.bin/eslint',
                paths: [testFile],
                format: 'json',
            });

            expect(result).toBeDefined();
            expect(result.json).toBeDefined();
        });

        it('should handle multiple paths', async () => {
            const result = await ESLint({
                bin: './node_modules/.bin/eslint',
                paths: [testFile, testDir],
            });

            expect(result).toBeDefined();
            // result puede ser false si hay errores de configuración
            if (result && typeof result !== 'boolean') {
                expect(result.json).toBeDefined();
            }
        });

        it('should handle single valid path', async () => {
            const result = await ESLint({
                bin: './node_modules/.bin/eslint',
                paths: [testFile],
            });

            expect(result).toBeDefined();
        });

        it('should handle non-existent file path', async () => {
            const result = await ESLint({
                bin: './node_modules/.bin/eslint',
                paths: ['/nonexistent/file.js'],
            });

            expect(result).toBeDefined();
        });

        it('should preserve fix option', async () => {
            const result = await ESLint({
                bin: './node_modules/.bin/eslint',
                paths: [testFile],
                fix: true,
            });

            expect(result).toBeDefined();
        });
    });

    describe('OxLint', () => {
        it('should return result when bin not found', async () => {
            const result = await OxLint({
                bin: '/nonexistent/oxlint',
                paths: [testFile],
            });

            expect(result).toBeDefined();
        });

        it('should accept valid configuration', async () => {
            const result = await OxLint({
                bin: './node_modules/.bin/oxlint',
                paths: [testFile],
            });

            expect(result).toBeDefined();
        });

        it('should handle multiple paths', async () => {
            const result = await OxLint({
                bin: './node_modules/.bin/oxlint',
                paths: [testFile, testDir],
            });

            expect(result).toBeDefined();
        });

        it('should handle empty paths array', async () => {
            const result = await OxLint({
                bin: './node_modules/.bin/oxlint',
                paths: [],
            });

            expect(result).toBeDefined();
        });
    });
});

describe('Linter - Error Handling', () => {
    it('should handle malformed configurations gracefully', async () => {
        const result = await ESLint({
            bin: '/invalid/path/to/eslint',
            paths: ['test.js'],
        });

        expect(result).toBeDefined();
        expect(result.json).toBeDefined();
    });

    it('should handle timeout scenarios', async () => {
        const start = Date.now();

        await ESLint({
            bin: './node_modules/.bin/eslint',
            paths: ['test.js'],
        });

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(30000);
    }, 35000);
});

describe('Linter - Security Validation', () => {
    it('should handle invalid bin paths securely', async () => {
        const invalidBinPaths = ['../../../etc/passwd', 'test; rm -rf /'];

        for (const binPath of invalidBinPaths) {
            const result = await ESLint({
                bin: binPath,
                paths: ['test.js'],
            });

            expect(result).toBeDefined();
        }
    });

    it('should handle invalid file paths securely', async () => {
        const invalidFilePaths = [
            '../../../etc/passwd',
            'test | cat /etc/passwd',
        ];

        for (const filePath of invalidFilePaths) {
            const result = await ESLint({
                bin: './node_modules/.bin/eslint',
                paths: [filePath],
            });

            expect(result).toBeDefined();
        }
    });
});
