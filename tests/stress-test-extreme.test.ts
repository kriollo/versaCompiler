/**
 * STRESS TEST EXTREMO - Tests diseñados para encontrar fallas críticas
 * Incluye: concurrencia extrema, archivos masivos, memory leaks, race conditions
 *
 * CONFIGURACIÓN PARAMETRIZABLE:
 * - STRESS_VUE_FILES: Número de archivos Vue para test de memory leak (default: 10)
 * - STRESS_CONCURRENT_FILES: Archivos concurrentes para race conditions (default: 10)
 * - STRESS_CACHE_FILES: Archivos para test de cache (default: 25)
 * - STRESS_WORKER_FILES: Archivos para test de worker pool (default: 15)
 * - STRESS_CACHE_ITERATIONS: Iteraciones de invalidación de cache (default: 3)
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { compileFile } from '../src/compiler/compile';
import { ModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';
import { TransformOptimizer } from '../src/compiler/transform-optimizer';
import { TypeScriptWorkerPool } from '../src/compiler/typescript-worker-pool';
// import { performanceMonitor } from '../src/compiler/performance-monitor'; // Comentado para evitar error con chalk.magenta

// Configuración parametrizable via variables de entorno
const CONFIG = {
    VUE_FILES: parseInt(process.env.STRESS_VUE_FILES || '10'),
    CONCURRENT_FILES: parseInt(process.env.STRESS_CONCURRENT_FILES || '10'),
    CACHE_FILES: parseInt(process.env.STRESS_CACHE_FILES || '25'),
    WORKER_FILES: parseInt(process.env.STRESS_WORKER_FILES || '15'),
    CACHE_ITERATIONS: parseInt(process.env.STRESS_CACHE_ITERATIONS || '3'),
    MEMORY_LEAK_THRESHOLD_MB: parseInt(
        process.env.STRESS_MEMORY_THRESHOLD || '50',
    ),
    TIME_VARIATION_THRESHOLD: parseFloat(
        process.env.STRESS_TIME_VARIATION || '2.5',
    ),
};

console.log('🔥 STRESS TEST CONFIG:', CONFIG);

// Función utilitaria para pequeñas pausas
const delay = promisify(setTimeout);

const TEST_DIR = path.join(process.cwd(), 'temp-stress-test');
const STRESS_SOURCE = path.join(TEST_DIR, 'src');
const STRESS_DIST = path.join(TEST_DIR, 'dist');

// Configurar environment para tests de estrés
beforeAll(async () => {
    process.env.PATH_SOURCE = STRESS_SOURCE;
    process.env.PATH_DIST = STRESS_DIST;
    process.env.VERBOSE = 'false'; // Reducir logs para performance
    process.env.typeCheck = 'true';
    process.env.isPROD = 'true';

    await fs.ensureDir(STRESS_SOURCE);
    await fs.ensureDir(STRESS_DIST);
});

afterAll(async () => {
    await fs.remove(TEST_DIR);

    // Cleanup de pools y caches
    const workerPool = TypeScriptWorkerPool.getInstance();
    await workerPool.terminate();
    const moduleOptimizer = ModuleResolutionOptimizer.getInstance();
    moduleOptimizer.cleanup();

    const transformOptimizer = TransformOptimizer.getInstance();
    await transformOptimizer.terminate();

    // performanceMonitor.clearAllCaches(); // Comentado para evitar error con chalk.magenta
});

describe.skip('🔥 STRESS TESTS EXTREMOS', () => {
    // SKIP: Tests demasiado intensivos para CI/CD regular
    // TODO: Ejecutar solo en entornos de performance testing
    describe('💣 Memory Leak Detection', () => {
        test('EXTREME: Archivos Vue con detección de memory leak', async () => {
            const initialMemory = process.memoryUsage();
            const memorySnapshots: NodeJS.MemoryUsage[] = [];

            const vueTemplate = `
<template>
  <div class="complex-component">
    <h1>{{ title }}</h1>
    <div v-for="(item, index) in items" :key="index" class="item">
      <span>{{ item.name }}</span>
      <button @click="handleClick(index)">Click {{ index }}</button>
    </div>
    <CustomComponent :data="complexData" @update="handleUpdate" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import CustomComponent from './CustomComponent.vue';

interface Item {
  name: string;
  value: number;
  active: boolean;
}

interface ComplexData {
  metadata: Record<string, any>;
  items: Item[];
  status: 'loading' | 'success' | 'error';
}

const title = ref<string>('Dynamic Title');
const items = ref<Item[]>([]);
const complexData = ref<ComplexData>({
  metadata: {},
  items: [],
  status: 'loading'
});

const computedValue = computed(() => {
  return items.value.filter(item => item.active).length;
});

const handleClick = (index: number) => {
  console.log('Clicked:', index);
};

const handleUpdate = (data: any) => {
  complexData.value = { ...complexData.value, ...data };
};

onMounted(() => {
  // Simulate complex initialization
  for (let i = 0; i < 100; i++) {
    items.value.push({
      name: \`Item \${i}\`,
      value: Math.random() * 1000,
      active: i % 2 === 0
    });
  }
});
</script>

<style scoped>
.complex-component {
  padding: 20px;
  background: linear-gradient(45deg, #f0f0f0, #ffffff);
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin: 5px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.item:hover {
  background-color: #f5f5f5;
  transform: translateX(5px);
}

button {
  padding: 5px 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}
</style>
            `;
            const promises: Promise<any>[] = [];

            for (let i = 0; i < CONFIG.VUE_FILES; i++) {
                const fileName = path.join(STRESS_SOURCE, `component-${i}.vue`);
                await fs.writeFile(fileName, vueTemplate);

                promises.push(
                    compileFile(fileName).then(() => {
                        // Capturar memoria cada 5 archivos
                        if (i % 5 === 0) {
                            memorySnapshots.push(process.memoryUsage());
                        }
                    }),
                );

                // Ejecutar en batches de 5 para evitar saturación
                if (promises.length >= 5) {
                    await Promise.all(promises);
                    promises.length = 0; // Clear array

                    // Force garbage collection si está disponible
                    if (global.gc) {
                        global.gc();
                    }
                }
            }

            // Procesar archivos restantes
            if (promises.length > 0) {
                await Promise.all(promises);
            }

            const finalMemory = process.memoryUsage();

            // Análisis de memory leak
            const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryGrowthMB = memoryGrowth / (1024 * 1024);

            console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
            console.log(
                `Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            );
            console.log(
                `Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            ); // Detectar memory leak sospechoso (threshold configurable)
            expect(memoryGrowthMB).toBeLessThan(
                CONFIG.MEMORY_LEAK_THRESHOLD_MB,
            );

            // Verificar que la memoria no creció linealmente
            if (memorySnapshots.length >= 3) {
                const growthRates = [];
                for (let i = 1; i < memorySnapshots.length; i++) {
                    const current = memorySnapshots[i];
                    const previous = memorySnapshots[i - 1];
                    if (current && previous) {
                        const growth = current.heapUsed - previous.heapUsed;
                        growthRates.push(growth);
                    }
                }

                // El crecimiento debería estabilizarse (últimos crecimientos menores)
                const avgEarlyGrowth =
                    growthRates.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
                const avgLateGrowth =
                    growthRates.slice(-2).reduce((a, b) => a + b, 0) / 2;

                expect(avgLateGrowth).toBeLessThanOrEqual(avgEarlyGrowth * 1.5);
            }
        }, 60000); // 1 minuto timeout

        test('EXTREME: Race conditions en compilación concurrente', async () => {
            const concurrentFiles = CONFIG.CONCURRENT_FILES;
            const maxConcurrency = Math.min(os.cpus().length * 2, 8); // Limitar concurrencia

            // Crear archivos TypeScript complejos
            const complexTS = `
import { reactive, ref, computed, watch, nextTick } from 'vue';
import type { Ref, ComputedRef } from 'vue';

interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  preferences: UserPreferences;
}

interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

interface Permission {
  id: number;
  resource: string;
  actions: string[];
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

class UserManager {
  private users: Ref<User[]> = ref([]);
  private loading: Ref<boolean> = ref(false);
  private error: Ref<string | null> = ref(null);

  constructor() {
    this.initializeUsers();
  }

  private async initializeUsers(): Promise<void> {
    this.loading.value = true;
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

      this.users.value = this.generateMockUsers(50);
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.loading.value = false;
    }
  }

  private generateMockUsers(count: number): User[] {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      users.push({
        id: i + 1,
        name: \`User \${i + 1}\`,
        email: \`user\${i + 1}@example.com\`,
        roles: this.generateMockRoles(),
        preferences: {
          theme: ['light', 'dark', 'auto'][Math.floor(Math.random() * 3)] as any,
          language: ['en', 'es', 'fr'][Math.floor(Math.random() * 3)],
          notifications: {
            email: Math.random() > 0.5,
            push: Math.random() > 0.5,
            sms: Math.random() > 0.5,
            frequency: ['immediate', 'hourly', 'daily'][Math.floor(Math.random() * 3)] as any
          }
        }
      });
    }

    return users;
  }

  private generateMockRoles(): Role[] {
    return [
      {
        id: 1,
        name: 'Admin',
        permissions: [
          { id: 1, resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
          { id: 2, resource: 'roles', actions: ['create', 'read', 'update', 'delete'] }
        ]
      }
    ];
  }

  public getUserById(id: number): ComputedRef<User | undefined> {
    return computed(() => this.users.value.find(user => user.id === id));
  }

  public async updateUser(id: number, updates: Partial<User>): Promise<void> {
    const userIndex = this.users.value.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      this.users.value[userIndex] = { ...this.users.value[userIndex], ...updates };
      await nextTick();
    }
  }
}

export { UserManager, type User, type Role, type Permission };
            `;

            const fileCreationPromises = [];

            // Crear archivos concurrentemente
            for (let i = 0; i < concurrentFiles; i++) {
                const fileName = path.join(STRESS_SOURCE, `race-test-${i}.ts`);
                fileCreationPromises.push(fs.writeFile(fileName, complexTS));
            }

            await Promise.all(fileCreationPromises);

            // Compilar todos los archivos concurrentemente
            const compilationPromises = [];
            const results = new Map<string, any>();
            const errors: string[] = [];

            for (let i = 0; i < concurrentFiles; i++) {
                const fileName = path.join(STRESS_SOURCE, `race-test-${i}.ts`);

                const promise = compileFile(fileName)
                    .then(result => {
                        results.set(fileName, result);
                        return result;
                    })
                    .catch(error => {
                        errors.push(`${fileName}: ${error.message}`);
                        return { success: false, error };
                    });

                compilationPromises.push(promise);

                // Controlar concurrencia
                if (compilationPromises.length >= maxConcurrency) {
                    await Promise.allSettled(
                        compilationPromises.splice(0, maxConcurrency),
                    );
                }
            }

            // Esperar compilaciones restantes
            if (compilationPromises.length > 0) {
                await Promise.allSettled(compilationPromises);
            }

            // Verificar consistencia de resultados
            const successfulCompilations = Array.from(results.values()).filter(
                result => result.success,
            );

            console.log(
                `Successful compilations: ${successfulCompilations.length}/${concurrentFiles}`,
            );
            console.log(`Errors: ${errors.length}`);

            if (errors.length > 0) {
                console.log('Compilation errors:', errors.slice(0, 5)); // Show first 5 errors
            }

            // Verificar que al menos el 90% se compiló exitosamente
            expect(successfulCompilations.length).toBeGreaterThanOrEqual(
                concurrentFiles * 0.9,
            ); // Verificar que no hay race conditions en outputs
            const outputFiles = await fs.readdir(STRESS_DIST);
            const expectedOutputs = concurrentFiles;

            expect(outputFiles.length).toBeGreaterThanOrEqual(
                expectedOutputs * 0.9,
            );
        }, 90000); // 1.5 minutos timeout
    });

    describe('🌪️ Cache Stress Tests', () => {
        test('EXTREME: Cache invalidation bajo presión', async () => {
            const fileCount = CONFIG.CACHE_FILES;
            const iterationCount = CONFIG.CACHE_ITERATIONS;

            // Crear archivos base
            const baseFiles: string[] = [];
            for (let i = 0; i < fileCount; i++) {
                const fileName = path.join(
                    STRESS_SOURCE,
                    `cache-stress-${i}.vue`,
                );
                const content = `
<template>
  <div>Cache stress test ${i}</div>
</template>
<script setup lang="ts">
const value = ${i};
const computed = value * 2;
</script>
                `;
                await fs.writeFile(fileName, content);
                baseFiles.push(fileName);
            }

            // Primera compilación (poblar cache)
            console.log('Poblando cache inicial...');
            const initialStart = Date.now();
            await Promise.all(baseFiles.map(file => compileFile(file)));
            const initialTime = Date.now() - initialStart;

            console.log(`Primera compilación: ${initialTime}ms`);

            // Múltiples iteraciones con modificaciones
            const iterationTimes: number[] = [];

            for (let iteration = 0; iteration < iterationCount; iteration++) {
                console.log(`Iteración ${iteration + 1}/${iterationCount}`);

                // Modificar subset de archivos para invalidar cache
                const filesToModify = baseFiles.slice(
                    0,
                    Math.floor(fileCount / 4),
                );

                for (const file of filesToModify) {
                    const newContent = `
<template>
  <div>Modified cache stress test - iteration ${iteration}</div>
</template>
<script setup lang="ts">
const value = ${Math.random()};
const computed = value * ${iteration + 2};
const timestamp = ${Date.now()};
</script>
                    `;
                    await fs.writeFile(file, newContent);
                }

                // Recompilar todos los archivos
                const iterationStart = Date.now();
                await Promise.all(baseFiles.map(file => compileFile(file)));
                const iterationTime = Date.now() - iterationStart;

                iterationTimes.push(iterationTime);
                console.log(`Iteración ${iteration + 1}: ${iterationTime}ms`);
            }

            // Análisis de performance
            const avgIterationTime =
                iterationTimes.reduce((a, b) => a + b, 0) /
                iterationTimes.length;
            const cacheEffectiveness = initialTime / avgIterationTime;

            console.log(`Tiempo inicial: ${initialTime}ms`);
            console.log(
                `Tiempo promedio iteraciones: ${avgIterationTime.toFixed(2)}ms`,
            );
            console.log(
                `Efectividad de cache: ${cacheEffectiveness.toFixed(2)}x`,
            );

            // El cache debería hacer las iteraciones más rápidas que la compilación inicial
            expect(avgIterationTime).toBeLessThan(initialTime * 1.5); // Verificar que los tiempos no crecen exponencialmente
            const maxTime = Math.max(...iterationTimes);
            const minTime = Math.min(...iterationTimes);
            const timeVariation = maxTime / minTime;

            expect(timeVariation).toBeLessThan(CONFIG.TIME_VARIATION_THRESHOLD);
        }, 120000); // 2 minutos timeout

        test('EXTREME: Cache corruption detection', async () => {
            const fileName = path.join(
                STRESS_SOURCE,
                'cache-corruption-test.vue',
            );
            const originalContent = `
<template>
  <div>Original content</div>
</template>
<script setup lang="ts">
const original = true;
</script>
            `;

            const modifiedContent = `
<template>
  <div>Modified content</div>
</template>
<script setup lang="ts">
const modified = true;
</script>
            `;

            await fs.writeFile(fileName, originalContent);

            // Compilación inicial
            const result1 = await compileFile(fileName);
            expect(result1.success).toBe(true);

            // Leer archivo compilado inicial
            const outputPath1 = result1.output;
            const compiledContent1 = await fs.readFile(outputPath1, 'utf8'); // Modificar archivo fuente
            await fs.writeFile(fileName, modifiedContent);

            // Pequeña pausa para asegurar timestamp diferente
            await delay();

            // Segunda compilación
            const result2 = await compileFile(fileName);
            expect(result2.success).toBe(true);

            // Leer archivo compilado modificado
            const outputPath2 = result2.output;
            const compiledContent2 = await fs.readFile(outputPath2, 'utf8');

            // Los contenidos compilados DEBEN ser diferentes
            expect(compiledContent1).not.toBe(compiledContent2);

            // Verificar que el segundo contiene la modificación
            expect(compiledContent2).toContain('modified');
            expect(compiledContent2).not.toContain('original'); // Test adicional: revertir cambios y verificar
            await fs.writeFile(fileName, originalContent);
            await delay();

            const result3 = await compileFile(fileName);
            const compiledContent3 = await fs.readFile(result3.output, 'utf8');

            // Debería volver al contenido original
            expect(compiledContent3).toContain('original');
            expect(compiledContent3).not.toContain('modified');
        }, 60000);
    });

    describe('🔄 Worker Pool Stress Tests', () => {
        test('EXTREME: Worker pool exhaustion and recovery', async () => {
            const workerPool = TypeScriptWorkerPool.getInstance();

            // Obtener stats iniciales
            const initialStats = workerPool.getStats();
            console.log('Initial worker stats:', initialStats); // Crear muchos archivos TypeScript problemáticos
            const problemFiles: string[] = [];
            const fileCount = CONFIG.WORKER_FILES;

            for (let i = 0; i < fileCount; i++) {
                const fileName = path.join(
                    STRESS_SOURCE,
                    `worker-stress-${i}.ts`,
                );

                // Crear archivos con diferentes niveles de complejidad
                const complexity = i % 4;
                let content = '';

                switch (complexity) {
                    case 0: // Archivo simple
                        content = `export const simple${i} = 'simple';`;
                        break;
                    case 1: // Archivo con tipos complejos
                        content = `
type Complex${i}<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends object ? Complex${i}<T[K]> : T[K];
};
export const complex${i}: Complex${i}<any> = {};
                        `;
                        break;
                    case 2: // Archivo con muchos imports
                        content = `
import type { Component } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';
import type { Store } from 'vuex';
export interface BigInterface${i} {
  component: Component;
  route: RouteLocationNormalized;
  store: Store<any>;
}
                        `;
                        break;
                    case 3: // Archivo intencionalmente problemático
                        content = `
// Este archivo tiene errores intencionales
interface Bad${i} {
  prop: NonExistentType;
}
export const bad${i}: Bad${i} = { prop: undefined as any };
                        `;
                        break;
                }

                await fs.writeFile(fileName, content);
                problemFiles.push(fileName);
            }

            // Compilar todos concurrentemente para saturar workers
            const compilationPromises = problemFiles.map(file =>
                compileFile(file).catch(error => ({ success: false, error })),
            );

            const results = await Promise.allSettled(compilationPromises);

            // Analizar resultados
            const successful = results.filter(
                r => r.status === 'fulfilled' && r.value.success,
            ).length;
            const failed = results.length - successful;

            console.log(`Successful: ${successful}, Failed: ${failed}`);

            // Obtener stats finales
            const finalStats = workerPool.getStats();
            console.log('Final worker stats:', finalStats);

            // Verificaciones
            expect(successful).toBeGreaterThan(0); // Al menos algunos deberían compilar
            expect(finalStats.poolSize).toBeGreaterThan(0); // Pool debería seguir funcional

            // Test de recuperación: compilar archivos simples después del estrés
            const recoveryFile = path.join(STRESS_SOURCE, 'recovery-test.ts');
            await fs.writeFile(
                recoveryFile,
                'export const recovery = "success";',
            );
            const recoveryResult = await compileFile(recoveryFile);
            expect(recoveryResult.success).toBe(true);
        }, 90000); // 1.5 minutos timeout
    });
});
