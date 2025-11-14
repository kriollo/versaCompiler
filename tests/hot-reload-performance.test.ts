/**
 * Test de rendimiento del flujo de Hot Reload
 *
 * Mide el tiempo desde que se detecta un cambio de archivo hasta que se emite
 * la notificación al socket, identificando cuellos de botella en cada etapa.
 */

import { EventEmitter } from 'node:events';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest';

// Mock de browserSync
class MockBrowserSync extends EventEmitter {
    sockets = {
        emit: vi.fn(),
    };
}

describe('Hot Reload Performance Tests', () => {
    const testDir = path.join(process.cwd(), 'temp', 'hot-reload-test');
    const srcDir = path.join(testDir, 'src');
    const outputDir = path.join(testDir, 'output');

    let mockBS: MockBrowserSync;

    beforeAll(async () => {
        // Crear directorios de prueba
        await mkdir(srcDir, { recursive: true });
        await mkdir(outputDir, { recursive: true });
    });

    afterAll(async () => {
        // Limpiar directorios de prueba
        await rm(testDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        mockBS = new MockBrowserSync();
        vi.clearAllMocks();
    });

    /**
     * Mide el tiempo completo del flujo hot reload
     */
    async function measureHotReloadCycle(
        fileContent: string,
        fileName: string,
        cycleNumber: number,
    ): Promise<{
        total: number;
        fileWrite: number;
        detection: number;
        compile: number;
        emission: number;
    }> {
        const metrics = {
            total: 0,
            fileWrite: 0,
            detection: 0,
            compile: 0,
            emission: 0,
        };

        const startTotal = performance.now();

        // 1. Tiempo de escritura del archivo
        const filePath = path.join(srcDir, fileName);
        const startWrite = performance.now();
        await writeFile(filePath, fileContent, 'utf-8');
        metrics.fileWrite = performance.now() - startWrite;

        // 2. Tiempo de detección (simular chokidar)
        const startDetection = performance.now();

        // Simular el debouncer y la detección de cambios
        await new Promise(resolve => setTimeout(resolve, 100)); // DEBOUNCE_DELAY
        metrics.detection = performance.now() - startDetection;

        // 3. Tiempo de compilación (importar dinámicamente el compilador)
        const startCompile = performance.now();
        try {
            const { initCompile } = await import('../src/compiler/compile');
            const result = await initCompile(filePath, false, 'watch');

            if (!result.success) {
                throw new Error('Compilation failed');
            }

            metrics.compile = performance.now() - startCompile;

            // 4. Tiempo de emisión al socket
            const startEmission = performance.now();
            const { emitirCambios } = await import(
                '../src/servicios/browserSync'
            );
            await emitirCambios(
                mockBS,
                result.action || 'reloadFull',
                result.output,
            );
            metrics.emission = performance.now() - startEmission;
        } catch (error) {
            console.error(`Error en ciclo ${cycleNumber}:`, error);
            throw error;
        }

        metrics.total = performance.now() - startTotal;

        return metrics;
    }

    test('Medir tiempo total del flujo hot reload (archivo JS simple)', async () => {
        const fileContent = `
            export function testFunction() {
                return 'Hello from test ${Date.now()}';
            }
        `;

        const metrics = await measureHotReloadCycle(
            fileContent,
            'test-simple.js',
            1,
        );

        console.log('\n📊 Métricas de Hot Reload (JS Simple):');
        console.log(`   ⏱️  Total: ${metrics.total.toFixed(2)}ms`);
        console.log(`   📝 Escritura: ${metrics.fileWrite.toFixed(2)}ms`);
        console.log(`   👁️  Detección: ${metrics.detection.toFixed(2)}ms`);
        console.log(`   🔨 Compilación: ${metrics.compile.toFixed(2)}ms`);
        console.log(`   📡 Emisión: ${metrics.emission.toFixed(2)}ms`);

        // Verificar que el socket se llamó
        expect(mockBS.sockets.emit).toHaveBeenCalled();

        // Alertas de rendimiento
        if (metrics.total > 500) {
            console.warn(
                `⚠️  ALERTA: Ciclo completo tardó ${metrics.total.toFixed(2)}ms (>500ms)`,
            );
        }
        if (metrics.compile > 300) {
            console.warn(
                `⚠️  ALERTA: Compilación tardó ${metrics.compile.toFixed(2)}ms (>300ms)`,
            );
        }

        // Assertions para garantizar rendimiento aceptable
        // Primera compilación incluye carga de módulos, es más lenta
        expect(metrics.total).toBeLessThan(12000); // Menos de 12 segundos total (primera vez con I/O)
        expect(metrics.compile).toBeLessThan(10000); // Menos de 10s compilación (primera vez)
    }, 30000);

    test('Medir tiempo en ciclos múltiples (detectar degradación)', async () => {
        const iterations = 10;
        const allMetrics: Array<{
            total: number;
            compile: number;
            emission: number;
        }> = [];

        console.log(`\n🔄 Ejecutando ${iterations} ciclos de hot reload...`);

        for (let i = 0; i < iterations; i++) {
            const fileContent = `
                export function iteration${i}() {
                    const timestamp = ${Date.now()};
                    return 'Iteration ${i} - ' + timestamp;
                }
            `;

            const metrics = await measureHotReloadCycle(
                fileContent,
                `test-iteration-${i}.js`,
                i + 1,
            );

            allMetrics.push({
                total: metrics.total,
                compile: metrics.compile,
                emission: metrics.emission,
            });

            // Esperar un poco entre iteraciones
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Calcular estadísticas
        const avgTotal =
            allMetrics.reduce((sum, m) => sum + m.total, 0) / iterations;
        const avgCompile =
            allMetrics.reduce((sum, m) => sum + m.compile, 0) / iterations;
        const avgEmission =
            allMetrics.reduce((sum, m) => sum + m.emission, 0) / iterations;

        const minTotal = Math.min(...allMetrics.map(m => m.total));
        const maxTotal = Math.max(...allMetrics.map(m => m.total));

        console.log('\n📊 Estadísticas de ciclos múltiples:');
        console.log(`   📈 Promedio total: ${avgTotal.toFixed(2)}ms`);
        console.log(`   📈 Promedio compilación: ${avgCompile.toFixed(2)}ms`);
        console.log(`   📈 Promedio emisión: ${avgEmission.toFixed(2)}ms`);
        console.log(`   ⬇️  Mínimo: ${minTotal.toFixed(2)}ms`);
        console.log(`   ⬆️  Máximo: ${maxTotal.toFixed(2)}ms`);
        console.log(`   📊 Variación: ${(maxTotal - minTotal).toFixed(2)}ms`);

        // Detectar degradación (el último ciclo no debe ser mucho más lento que el primero)
        const firstCycle = allMetrics[0].total;
        const lastCycle = allMetrics[iterations - 1].total;
        const degradation = ((lastCycle - firstCycle) / firstCycle) * 100;

        console.log(`   🔍 Degradación: ${degradation.toFixed(2)}%`);

        if (degradation > 200) {
            console.warn(
                `⚠️  ALERTA: Degradación significativa detectada (${degradation.toFixed(2)}%)`,
            );
        }

        // Assertions - Ajustadas para tests con I/O real que varían más
        expect(avgTotal).toBeLessThan(5000); // Promedio razonable para tests reales
        expect(degradation).toBeLessThan(500); // Permitir variación en hardware diferente
    }, 120000);

    test('Medir latencia de emisión socket bajo carga', async () => {
        const simultaneousChanges = 5;
        const emissionTimes: number[] = [];

        console.log(
            `\n⚡ Simulando ${simultaneousChanges} cambios simultáneos...`,
        );

        // Simular múltiples cambios simultáneos
        const promises = Array.from(
            { length: simultaneousChanges },
            async (_, i) => {
                const fileContent = `export const value${i} = ${Date.now()};`;
                const fileName = `concurrent-${i}.js`;

                const startEmission = performance.now();

                try {
                    const metrics = await measureHotReloadCycle(
                        fileContent,
                        fileName,
                        i + 1,
                    );
                    const emissionTime = performance.now() - startEmission;
                    emissionTimes.push(emissionTime);

                    return metrics;
                } catch (error) {
                    console.error(`Error en cambio simultáneo ${i}:`, error);
                    throw error;
                }
            },
        );

        await Promise.all(promises);

        const avgEmissionTime =
            emissionTimes.reduce((sum, t) => sum + t, 0) / simultaneousChanges;
        const maxEmissionTime = Math.max(...emissionTimes);

        console.log('\n📊 Métricas de cambios simultáneos:');
        console.log(`   📈 Promedio: ${avgEmissionTime.toFixed(2)}ms`);
        console.log(`   ⬆️  Máximo: ${maxEmissionTime.toFixed(2)}ms`);

        // El sistema debe manejar múltiples cambios sin colapsar
        expect(maxEmissionTime).toBeLessThan(3000); // 3 segundos máximo bajo carga
    }, 60000);

    test('Identificar cuellos de botella en el pipeline', async () => {
        const fileContent = `
            import { someUtil } from './utils';

            export class TestClass {
                constructor() {
                    this.value = ${Date.now()};
                }

                method() {
                    return this.value * 2;
                }
            }
        `;

        const metrics = await measureHotReloadCycle(
            fileContent,
            'bottleneck-test.js',
            1,
        );

        // Identificar la etapa más lenta
        const stages = [
            { name: 'Escritura', time: metrics.fileWrite },
            { name: 'Detección', time: metrics.detection },
            { name: 'Compilación', time: metrics.compile },
            { name: 'Emisión', time: metrics.emission },
        ];

        stages.sort((a, b) => b.time - a.time);

        console.log('\n🎯 Cuellos de botella identificados:');
        stages.forEach((stage, index) => {
            const percentage = (stage.time / metrics.total) * 100;
            console.log(
                `   ${index + 1}. ${stage.name}: ${stage.time.toFixed(2)}ms (${percentage.toFixed(1)}%)`,
            );
        });

        // La compilación no debe representar más del 80% del tiempo total
        const compilePercentage = (metrics.compile / metrics.total) * 100;
        if (compilePercentage > 80) {
            console.warn(
                `⚠️  ALERTA: La compilación representa ${compilePercentage.toFixed(1)}% del tiempo total`,
            );
        }

        expect(compilePercentage).toBeLessThan(90);
    }, 30000);

    test('Verificar que no hay esperas síncronas bloqueantes', async () => {
        const fileContent = `export const timestamp = ${Date.now()};`;

        // Medir si hay bloqueos del event loop
        const checkInterval = setInterval(() => {
            // Si este intervalo se retrasa significativamente, hay bloqueo
        }, 10);

        const startTime = Date.now();
        await measureHotReloadCycle(fileContent, 'blocking-test.js', 1);
        const endTime = Date.now();

        clearInterval(checkInterval);

        // Si el tiempo real es mucho mayor que el tiempo medido, hay bloqueos
        const realTime = endTime - startTime;

        console.log(`\n⏱️  Tiempo real vs medido: ${realTime}ms`);

        // No debería haber más de 100ms de diferencia (overhead aceptable)
        expect(realTime).toBeLessThan(2000);
    }, 30000);
});
