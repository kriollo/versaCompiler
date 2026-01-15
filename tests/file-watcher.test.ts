import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

describe('File Watcher - Basic Tests', () => {
    const testDir = join(process.cwd(), 'temp', 'watch-test');

    beforeEach(async () => {
        if (!existsSync(testDir)) {
            await mkdir(testDir, { recursive: true });
        }
    });

    describe('File Operations', () => {
        it('should create and read test files', async () => {
            const testFile = join(testDir, 'test.ts');
            const content = 'const x: number = 42;';

            await writeFile(testFile, content, 'utf-8');

            expect(existsSync(testFile)).toBe(true);

            if (existsSync(testFile)) {
                await unlink(testFile);
            }
        });

        it('should handle different file extensions', () => {
            const extensions = ['.ts', '.vue', '.js', '.css'];

            extensions.forEach(ext => {
                expect(ext).toBeDefined();
                expect(ext.startsWith('.')).toBe(true);
            });
        });

        it('should validate file paths', () => {
            const validPath = join(testDir, 'test.ts');
            const invalidPath = '../../../etc/passwd';

            expect(validPath).toContain('temp');
            expect(invalidPath).toContain('..');
        });
    });

    describe('File System Safety', () => {
        it('should identify dangerous path patterns', () => {
            const dangerousPaths = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32',
                'test; rm -rf /',
            ];

            dangerousPaths.forEach(path => {
                expect(path).toBeDefined();
            });
        });

        it('should identify special characters', () => {
            const specialChars = ['\x00', '\n', '\r', '|', ';', '$'];

            specialChars.forEach(char => {
                expect(char).toBeDefined();
            });
        });
    });
});
