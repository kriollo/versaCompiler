import { existsSync, statSync } from 'node:fs';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { compileFile } from '../src/compiler/compile';
import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';
import { clearParserCache } from '../src/compiler/parser';

// Mockear dependencias pesadas como el file system
vi.mock('node:fs/promises');
vi.mock('node:fs');

describe('Stress Test Extreme - Concurrency, Memory and Error Handling', () => {
    const mockedReadFile = readFile as Mock;
    const mockedWriteFile = writeFile as Mock;
    const mockedMkdir = mkdir as Mock;
    const mockedAccess = access as Mock;
    const mockedStat = stat as Mock;
    const mockedStatSync = statSync as Mock;
    const mockedExistsSync = existsSync as Mock;

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
        mockedStatSync.mockReturnValue({
            isFile: () => true,
            isDirectory: () => false,
            mtimeMs: Date.now(),
            size: 1024, // Tamaño por defecto para archivos
        });
        mockedExistsSync.mockReturnValue(false); // Simular que tsconfig.json no existe
        mockedMkdir.mockResolvedValue(undefined);
        mockedWriteFile.mockResolvedValue(undefined);

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

        // Configurar mock de readFile ANTES de crear las promesas
        mockedReadFile.mockImplementation(async (path: string) => {
            const fileContent = generateLargeFileContent(50); // 50KB file
            return fileContent;
        });

        for (let i = 0; i < FILE_COUNT; i++) {
            const filePath = `/src/file-${i}.js`;
            filesToCompile.push({ path: filePath });
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
            const filePath = `/src/file-batch-${i}.js`;
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

    it('should stress test worker pool with varied file sizes and measure compilation speed', async () => {
        const FILE_COUNT = 300;
        const filesToCompile = [];

        // Crear archivos de diferentes tamaños para estresar el worker pool
        mockedReadFile.mockImplementation(async (path: string) => {
            if (path.includes('worker-stress')) {
                const index = parseInt(path.split('-').pop()!.split('.')[0]);
                // Variar tamaños: pequeños (5KB), medianos (50KB), grandes (150KB)
                let size = 5;
                if (index % 3 === 1) size = 50;
                if (index % 3 === 2) size = 150;
                return generateLargeFileContent(size, false);
            }
            return generateLargeFileContent(10, false);
        });

        for (let i = 0; i < FILE_COUNT; i++) {
            filesToCompile.push({ path: `/src/worker-stress-${i}.js` });
        }

        const startTime = performance.now();
        const results = await Promise.all(
            filesToCompile.map(file => compileFile(file.path)),
        );
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        const successfulCompilations = results.filter(r => r.success);

        // Validar que todas las compilaciones fueron exitosas
        expect(successfulCompilations.length).toBe(FILE_COUNT);

        // Validar velocidad: 300 archivos en menos de 30 segundos (promedio 100ms por archivo)
        expect(totalTime).toBeLessThan(30000);

        // Calcular y validar throughput
        const avgTimePerFile = totalTime / FILE_COUNT;
        expect(avgTimePerFile).toBeLessThan(100); // Menos de 100ms por archivo en promedio

        // Log para análisis (no falla el test, solo información)
        console.log(`\n📊 Worker Pool Performance:`);
        console.log(`   Total files: ${FILE_COUNT}`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`   Avg time per file: ${avgTimePerFile.toFixed(2)}ms`);
        console.log(
            `   Throughput: ${((FILE_COUNT / totalTime) * 1000).toFixed(2)} files/sec`,
        );
    }, 35000);

    it('should validate error message UX for different error types', async () => {
        // Test de UX: validar que los mensajes de error sean informativos y legibles
        const errorScenarios = [
            {
                name: 'Syntax Error',
                content: 'const x =; // Missing value',
                expectedErrorPatterns: ['Unexpected token', 'syntax'],
            },
            {
                name: 'Type Mismatch',
                content: 'const x: number = "string"; // Type error',
                expectedErrorPatterns: [], // Parser no detecta errores de tipo en este contexto
            },
            {
                name: 'Unclosed Brace',
                content:
                    'function test() { const x = 1; // Missing closing brace',
                expectedErrorPatterns: [
                    'Unexpected token',
                    'EOF',
                    'end of file',
                ],
            },
            {
                name: 'Invalid Import',
                content: 'import { from "module"; // Syntax error in import',
                expectedErrorPatterns: ['Unexpected token', 'string'],
            },
        ];

        const results = [];

        for (const scenario of errorScenarios) {
            mockedReadFile.mockResolvedValue(scenario.content);

            const result = await compileFile(
                `/src/test-error-${scenario.name.toLowerCase().replace(/\s/g, '-')}.js`,
            );

            results.push({
                scenario: scenario.name,
                result,
                expectedPatterns: scenario.expectedErrorPatterns,
            });

            // Validar estructura de respuesta de error
            if (!result.success) {
                expect(result.error).toBeDefined();
                expect(typeof result.error).toBe('string');

                if (result.error) {
                    expect(result.error.length).toBeGreaterThan(0);

                    // El mensaje NO debe ser demasiado técnico o críptico
                    expect(result.error.length).toBeLessThan(500); // Mensaje conciso

                    // Validar que contiene al menos uno de los patrones esperados
                    if (scenario.expectedErrorPatterns.length > 0) {
                        const hasExpectedPattern =
                            scenario.expectedErrorPatterns.some(pattern =>
                                result
                                    .error!.toLowerCase()
                                    .includes(pattern.toLowerCase()),
                            );
                        expect(hasExpectedPattern).toBe(true);
                    }
                }
            }
        }

        // Log de análisis de UX (informativo, no falla el test)
        console.log(`\n📝 Error Message UX Analysis:`);
        results.forEach(({ scenario, result, expectedPatterns }) => {
            console.log(`\n  ${scenario}:`);
            console.log(`    Success: ${result.success}`);
            if (!result.success && result.error) {
                console.log(`    Error length: ${result.error.length} chars`);
                console.log(
                    `    Error preview: ${result.error.substring(0, 80)}...`,
                );
                console.log(
                    `    Expected patterns: ${expectedPatterns.join(', ')}`,
                );
            }
        });
    });

    it('should validate error messages are user-friendly and actionable', async () => {
        // Test específico de UX: los errores deben ser accionables
        const testContent = 'const x =; // Syntax error';
        mockedReadFile.mockResolvedValue(testContent);

        const result = await compileFile('/src/ux-test.js');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        if (result.error) {
            const errorMsg = result.error.toLowerCase();

            // El mensaje debe mencionar el tipo de error
            const hasMeaningfulInfo =
                errorMsg.includes('error') ||
                errorMsg.includes('unexpected') ||
                errorMsg.includes('expected') ||
                errorMsg.includes('token');

            expect(hasMeaningfulInfo).toBe(true);

            // El mensaje NO debe contener stack traces técnicos sin contexto
            expect(errorMsg).not.toMatch(/at\s+\w+\s+\(/); // No "at functionName ("
            expect(errorMsg).not.toMatch(/\.js:\d+:\d+/); // No "file.js:123:45"

            // Log para validación manual
            console.log(`\n✅ Error Message UX Validation:`);
            console.log(`   Error: ${result.error}`);
            console.log(`   Length: ${result.error.length} chars`);
            console.log(`   Contains meaningful info: ${hasMeaningfulInfo}`);
        }
    });

    it('should handle mixed workload with varied complexity efficiently', async () => {
        // Test realista: mezcla de archivos pequeños, medianos, grandes, con y sin errores
        const FILE_COUNT = 150;
        const ERROR_RATE = 0.1; // 10% con errores

        mockedReadFile.mockImplementation(async (path: string) => {
            if (path.includes('mixed-workload')) {
                const index = parseInt(path.split('-').pop()!.split('.')[0]);

                // 10% de archivos con errores
                const hasError = index % 10 === 0;

                // Tamaños variados
                let size = 10;
                if (index % 5 === 0) size = 5; // 20% pequeños
                if (index % 5 === 2) size = 75; // 20% grandes
                if (index % 5 === 4) size = 150; // 20% muy grandes

                return generateLargeFileContent(size, hasError);
            }
            return generateLargeFileContent(10, false);
        });

        const filesToCompile = Array.from({ length: FILE_COUNT }, (_, i) => ({
            path: `/src/mixed-workload-${i}.js`,
        }));

        const startTime = performance.now();
        const results = await Promise.all(
            filesToCompile.map(file => compileFile(file.path)),
        );
        const endTime = performance.now();

        const successfulCompilations = results.filter(r => r.success);
        const failedCompilations = results.filter(r => !r.success);

        const expectedErrors = Math.floor(FILE_COUNT * ERROR_RATE);
        const expectedSuccess = FILE_COUNT - expectedErrors;

        // Validar distribución de éxitos/errores
        expect(successfulCompilations.length).toBe(expectedSuccess);
        expect(failedCompilations.length).toBe(expectedErrors);

        // Validar rendimiento con carga mixta
        const totalTime = endTime - startTime;
        expect(totalTime).toBeLessThan(25000); // 150 archivos mixtos en menos de 25s

        console.log(`\n🎯 Mixed Workload Performance:`);
        console.log(`   Total files: ${FILE_COUNT}`);
        console.log(`   Successful: ${successfulCompilations.length}`);
        console.log(`   Failed: ${failedCompilations.length}`);
        console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
        console.log(
            `   Avg time per file: ${(totalTime / FILE_COUNT).toFixed(2)}ms`,
        );
    }, 30000);
});
