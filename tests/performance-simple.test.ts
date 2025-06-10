/**
 * Tests de Performance y Benchmark para VersaCompiler
 * Versión simplificada sin errores de tipos
 */

import fs from 'fs/promises';
import { env } from 'node:process';
import path from 'path';
import { compileFile } from '../src/compiler/compile';
import { preCompileTS } from '../src/compiler/typescript-manager';
import { preCompileVue } from '../src/compiler/vuejs';

// Interfaces para tracking de performance
interface PerformanceResult {
    duration: number;
    success: boolean;
    error?: string;
    outputSize?: number;
    memoryUsage?: NodeJS.MemoryUsage;
}

interface BenchmarkStats {
    name: string;
    avg: number;
    min: number;
    max: number;
    median: number;
    std: number;
    runs: number;
    successRate: number;
    avgOutputSize?: number;
    avgMemoryUsage?: number;
}

// Configuración de pruebas
const ITERATIONS = 3; // Reducido para tests más rápidos
const TEMP_DIR = path.join(process.cwd(), 'tests', 'temp-performance');

describe('VersaCompiler Performance Tests', () => {
    let originalEnv: any;
    let pathSource: string;
    let pathDist: string;

    beforeAll(async () => {
        // Guardar configuración original
        originalEnv = { ...env };

        // Configurar rutas
        pathSource = path.join(TEMP_DIR, 'src');
        pathDist = path.join(TEMP_DIR, 'dist');

        // Configurar ambiente de pruebas
        env.PATH_SOURCE = pathSource;
        env.PATH_DIST = pathDist;
        env.PATH_PROY = TEMP_DIR;
        env.VERBOSE = 'false';
        env.ENABLE_LINTER = 'false';
        env.clean = 'false';

        // Crear directorios temporales
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await fs.mkdir(pathSource, { recursive: true });
        await fs.mkdir(pathDist, { recursive: true });
    });

    afterAll(async () => {
        // Restaurar configuración original
        Object.assign(env, originalEnv);

        // Limpiar archivos temporales
        try {
            await fs.rm(TEMP_DIR, { recursive: true, force: true });
        } catch (error) {
            console.warn('No se pudo limpiar directorio temporal:', error);
        }
    });

    beforeEach(async () => {
        // Limpiar directorios antes de cada test
        try {
            await fs.rm(pathSource, { recursive: true, force: true });
            await fs.rm(pathDist, { recursive: true, force: true });
            await fs.mkdir(pathSource, { recursive: true });
            await fs.mkdir(pathDist, { recursive: true });
        } catch {
            // Ignorar errores de limpieza
        }
    });

    // Archivos de muestra
    const createSampleFiles = {
        simpleJS: () => `
const message = 'Hello World';
const numbers = [1, 2, 3, 4, 5];

function greet(name) {
    return \`Hello, \${name}!\`;
}

export { message, numbers, greet };
        `,

        simpleTS: () => `
interface User {
    name: string;
    age: number;
    email: string;
}

class UserService {
    private baseUrl: string = 'https://api.example.com';

    async getUser(id: number): Promise<User> {
        const response = await fetch(\`\${this.baseUrl}/users/\${id}\`);
        return response.json();
    }

    validateUser(user: User): boolean {
        return user.name.length > 0 && user.age > 0 && user.email.includes('@');
    }
}

export { User, UserService };
        `,

        simpleVue: () => `
<template>
    <div class="component">
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>
        <button @click="handleClick">Click me</button>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Vue Component')
const message = ref('This is a Vue component')

const handleClick = () => {
    message.value = 'Clicked at ' + new Date().toLocaleTimeString()
}
</script>

<style scoped>
.component {
    padding: 20px;
    border: 1px solid #ccc;
}
</style>
        `,
    };

    // Función para medir performance
    const measurePerformance = async (
        testFn: () => Promise<any>,
        iterations: number = ITERATIONS,
    ): Promise<PerformanceResult[]> => {
        const results: PerformanceResult[] = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime.bigint();
            const startMemory = process.memoryUsage();

            try {
                const result = await testFn();
                const endTime = process.hrtime.bigint();
                const endMemory = process.memoryUsage();

                const duration = Number(endTime - startTime) / 1_000_000; // Convert to ms

                let outputSize = 0;
                if (typeof result === 'string') {
                    outputSize = Buffer.byteLength(result, 'utf8');
                }

                results.push({
                    duration,
                    success: true,
                    outputSize,
                    memoryUsage: {
                        rss: endMemory.rss - startMemory.rss,
                        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
                        external: endMemory.external - startMemory.external,
                        arrayBuffers:
                            endMemory.arrayBuffers - startMemory.arrayBuffers,
                    },
                });
            } catch (error) {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1_000_000;

                results.push({
                    duration,
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }

            // Small delay between iterations
            if (i < iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    };

    // Función para calcular estadísticas
    const calculateStats = (
        name: string,
        results: PerformanceResult[],
    ): BenchmarkStats => {
        const successfulResults = results.filter(r => r.success);
        const durations = successfulResults.map(r => r.duration);

        if (durations.length === 0) {
            return {
                name,
                avg: 0,
                min: 0,
                max: 0,
                median: 0,
                std: 0,
                runs: results.length,
                successRate: 0,
            };
        }

        durations.sort((a, b) => a - b);

        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = durations.length > 0 ? Math.min(...durations) : 0;
        const max = durations.length > 0 ? Math.max(...durations) : 0;
        const median =
            durations.length > 0
                ? durations[Math.floor(durations.length / 2)] || 0
                : 0;

        const variance =
            durations.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
            durations.length;
        const std = Math.sqrt(variance);

        const outputSizes = successfulResults
            .map(r => r.outputSize)
            .filter(s => s !== undefined) as number[];
        const avgOutputSize =
            outputSizes.length > 0
                ? outputSizes.reduce((a, b) => a + b, 0) / outputSizes.length
                : undefined;

        const memoryUsages = successfulResults
            .map(r => r.memoryUsage?.heapUsed)
            .filter(m => m !== undefined) as number[];
        const avgMemoryUsage =
            memoryUsages.length > 0
                ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
                : undefined;

        return {
            name,
            avg,
            min,
            max,
            median,
            std,
            runs: results.length,
            successRate: successfulResults.length / results.length,
            avgOutputSize,
            avgMemoryUsage,
        };
    };

    // Tests de performance individuales
    describe('Single File Compilation Performance', () => {
        test('JavaScript simple - baseline performance', async () => {
            const content = createSampleFiles.simpleJS();
            const filePath = path.join(pathSource, 'simple.js');

            await fs.writeFile(filePath, content);

            const results = await measurePerformance(async () => {
                return await compileFile(filePath);
            });

            const stats = calculateStats('JavaScript Simple', results);

            expect(stats.successRate).toBeGreaterThan(0.8); // Al menos 80% de éxito

            console.log('📊 JavaScript Simple Performance:', {
                avgTime: `${stats.avg.toFixed(2)}ms`,
                minTime: `${stats.min.toFixed(2)}ms`,
                maxTime: `${stats.max.toFixed(2)}ms`,
                successRate: `${(stats.successRate * 100).toFixed(1)}%`,
                avgOutputSize: stats.avgOutputSize
                    ? `${(stats.avgOutputSize / 1024).toFixed(2)}KB`
                    : 'N/A',
            });
        }, 60000);

        test('TypeScript simple - sin verificación de tipos', async () => {
            const originalTypeCheck = env.typeCheck;
            env.typeCheck = 'false';

            try {
                const content = createSampleFiles.simpleTS();
                const filePath = path.join(pathSource, 'simple.ts');

                await fs.writeFile(filePath, content);

                const results = await measurePerformance(async () => {
                    return await compileFile(filePath);
                });

                const stats = calculateStats(
                    'TypeScript Simple (No Type Check)',
                    results,
                );

                expect(stats.successRate).toBeGreaterThan(0.8);

                console.log(
                    '📊 TypeScript Simple (No Type Check) Performance:',
                    {
                        avgTime: `${stats.avg.toFixed(2)}ms`,
                        minTime: `${stats.min.toFixed(2)}ms`,
                        maxTime: `${stats.max.toFixed(2)}ms`,
                        successRate: `${(stats.successRate * 100).toFixed(1)}%`,
                    },
                );
            } finally {
                env.typeCheck = originalTypeCheck;
            }
        }, 60000);

        test('Vue simple - componente básico', async () => {
            const content = createSampleFiles.simpleVue();
            const filePath = path.join(pathSource, 'Simple.vue');

            await fs.writeFile(filePath, content);

            const results = await measurePerformance(async () => {
                return await compileFile(filePath);
            });

            const stats = calculateStats('Vue Simple', results);

            expect(stats.successRate).toBeGreaterThan(0.8);

            console.log('📊 Vue Simple Performance:', {
                avgTime: `${stats.avg.toFixed(2)}ms`,
                minTime: `${stats.min.toFixed(2)}ms`,
                maxTime: `${stats.max.toFixed(2)}ms`,
                successRate: `${(stats.successRate * 100).toFixed(1)}%`,
            });
        }, 60000);
    });

    describe('Direct Function Performance Tests', () => {
        test('preCompileVue - performance directo', async () => {
            const content = createSampleFiles.simpleVue();

            const results = await measurePerformance(async () => {
                return await preCompileVue(content, 'Direct.vue', false);
            });

            const stats = calculateStats('preCompileVue Direct', results);

            expect(stats.successRate).toBeGreaterThan(0.8);

            console.log('📊 preCompileVue Direct Performance:', {
                avgTime: `${stats.avg.toFixed(2)}ms`,
                minTime: `${stats.min.toFixed(2)}ms`,
                maxTime: `${stats.max.toFixed(2)}ms`,
                successRate: `${(stats.successRate * 100).toFixed(1)}%`,
            });
        });

        test('preCompileTS - performance directo', async () => {
            const content = createSampleFiles.simpleTS();

            const results = await measurePerformance(async () => {
                return await preCompileTS(content, 'Direct.ts');
            });

            const stats = calculateStats('preCompileTS Direct', results);

            expect(stats.successRate).toBeGreaterThan(0.8);

            console.log('📊 preCompileTS Direct Performance:', {
                avgTime: `${stats.avg.toFixed(2)}ms`,
                minTime: `${stats.min.toFixed(2)}ms`,
                maxTime: `${stats.max.toFixed(2)}ms`,
                successRate: `${(stats.successRate * 100).toFixed(1)}%`,
            });
        });
    });

    afterAll(() => {
        console.log('\n🎯 RESUMEN DE PERFORMANCE TESTS');
        console.log('═'.repeat(50));
        console.log('✅ Tests de performance completados');
        console.log('📊 Métricas recolectadas para análisis');
        console.log(
            '\n💡 Usa el benchmark independiente para análisis más detallado:',
        );
        console.log('  pnpm benchmark');
    });
});
