import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { compileFile } from '../src/compiler/compile';
import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';
import { clearParserCache } from '../src/compiler/parser';

// Mockear dependencias pesadas como el file system
vi.mock('node:fs/promises');

describe('Stress Test Extreme - Concurrency, Memory and Error Handling', () => {
    const mockedReadFile = readFile as Mock;
    const mockedWriteFile = writeFile as Mock;
    const _mockedMkdir = mkdir as Mock;
    const mockedAccess = access as Mock;
    const mockedStat = stat as Mock;

    beforeEach(() => {
        // Limpiar todos los caches antes de cada test
        clearParserCache();
        resetModuleResolutionOptimizer();
        vi.clearAllMocks();

        // Configurar mocks
        mockedAccess.mockResolvedValue(undefined);
        mockedStat.mockResolvedValue({
            isFile: () => true,
            isDirectory: () => false,
            mtimeMs: Date.now(),
        });

        // Configuración de alias para los tests
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
        });
        process.env.PATH_DIST = 'dist';
    });

    afterEach(() => {
        delete process.env.PATH_ALIAS;
        delete process.env.PATH_DIST;
    });

    const generateLargeFileContent = (
        sizeInKB: number,
        withError: boolean = false,
    ) => {
        const content = '/* '.repeat((sizeInKB * 1024) / 3) + '*/';
        if (withError) {
            return content + '\nconst x =; // Syntax error';
        }
        return content + '\nexport const value = 42;';
    };

    it('should handle massive concurrent compilations without crashing', async () => {
        const FILE_COUNT = 200;
        const filesToCompile = [];

        for (let i = 0; i < FILE_COUNT; i++) {
            const filePath = `/src/file-${i}.ts`;
            const fileContent = generateLargeFileContent(50); // 50KB file
            filesToCompile.push({ path: filePath, content: fileContent });
            mockedReadFile.mockResolvedValue(fileContent);
        }

        const compilationPromises = filesToCompile.map(file =>
            compileFile(file.path),
        );

        const results = await Promise.allSettled(compilationPromises);

        const successfulCompilations = results.filter(
            r => r.status === 'fulfilled' && r.value.success,
        );
        const failedCompilations = results.filter(
            r =>
                r.status === 'rejected' ||
                (r.status === 'fulfilled' && !r.value.success),
        );

        expect(successfulCompilations.length).toBe(FILE_COUNT);
        expect(failedCompilations.length).toBe(0);
        expect(mockedWriteFile).toHaveBeenCalledTimes(FILE_COUNT);
    }, 20000); // Timeout de 20 segundos

    it('should correctly report errors for a batch of files with some invalid ones', async () => {
        const FILE_COUNT = 100;
        const ERROR_COUNT = 10;
        const filesToCompile = [];

        // La implementación del mock debe hacerse UNA VEZ, antes de que se ejecuten las compilaciones.
        mockedReadFile.mockImplementation(async (path: string) => {
            if (path.includes('file-batch')) {
                const index = parseInt(path.split('-').pop()!.split('.')[0]);
                const withError = index < ERROR_COUNT;
                return generateLargeFileContent(10, withError);
            }
            // Fallback para cualquier otra llamada a readFile que pueda ocurrir
            return generateLargeFileContent(10, false);
        });

        for (let i = 0; i < FILE_COUNT; i++) {
            const filePath = `/src/file-batch-${i}.ts`;
            // El contenido real no importa aquí porque el mock lo interceptará
            filesToCompile.push({ path: filePath, content: '' });
        }

        const results = await Promise.all(
            filesToCompile.map(file => compileFile(file.path)),
        );

        const successfulCompilations = results.filter(r => r.success);
        const failedCompilations = results.filter(r => !r.success);

        expect(successfulCompilations.length).toBe(FILE_COUNT - ERROR_COUNT);
        expect(failedCompilations.length).toBe(ERROR_COUNT);

        expect(mockedWriteFile).toHaveBeenCalledTimes(FILE_COUNT - ERROR_COUNT);

        failedCompilations.forEach(result => {
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            // El error es un string, no un objeto con .message
            expect(typeof result.error).toBe('string');
            expect(result.error).toContain('Unexpected token');
        });
    });
});
