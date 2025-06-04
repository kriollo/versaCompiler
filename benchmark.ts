#!/usr/bin/env ts-node
/**
 * Benchmark independiente para VersaCompiler
 * Script ejecutable que mide performance sin depender de Jest
 *
 * Uso:
 * npx ts-node benchmark.ts
 * pnpm benchmark
 */

import fs from 'fs/promises';
import { env } from 'node:process';
import path from 'path';
import { performance } from 'perf_hooks';
import { compileFile, initCompileAll } from './src/compiler/compile';
import { preCompileTS } from './src/compiler/typescript';
import { preCompileVue } from './src/compiler/vuejs';

// Colores para output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

interface BenchmarkResult {
    name: string;
    avgTime: number;
    minTime: number;
    maxTime: number;
    median: number;
    stdDev: number;
    successRate: number;
    totalRuns: number;
    avgOutputSize?: number;
    avgMemoryUsage?: number;
}

class VersaCompilerBenchmark {
    private tempDir: string;
    private iterations: number;
    private results: BenchmarkResult[] = [];

    constructor(iterations: number = 5) {
        this.iterations = iterations;
        this.tempDir = path.join(process.cwd(), 'benchmark-temp');
    }

    private log(message: string, color: keyof typeof colors = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    private async setupEnvironment() {
        this.log('\n🚀 Configurando entorno de benchmark...', 'cyan');

        // Configurar variables de entorno
        env.PATH_SOURCE = path.join(this.tempDir, 'src');
        env.PATH_DIST = path.join(this.tempDir, 'dist');
        env.PATH_PROY = this.tempDir;
        env.VERBOSE = 'false';
        env.ENABLE_LINTER = 'false';
        env.clean = 'false';

        // Crear directorios
        await fs.mkdir(this.tempDir, { recursive: true });
        await fs.mkdir(env.PATH_SOURCE, { recursive: true });
        await fs.mkdir(env.PATH_DIST, { recursive: true });

        this.log('✅ Entorno configurado correctamente', 'green');
    }

    private async cleanup() {
        try {
            await fs.rm(this.tempDir, { recursive: true, force: true });
            this.log('🧹 Limpieza completada', 'yellow');
        } catch (error) {
            this.log('⚠️  Error en limpieza: ' + error, 'red');
        }
    }

    private async measureFunction<T>(
        name: string,
        fn: () => Promise<T>,
        iterations: number = this.iterations,
    ): Promise<BenchmarkResult> {
        this.log(`\n📊 Midiendo: ${name}`, 'magenta');

        const times: number[] = [];
        const memoryUsages: number[] = [];
        const outputSizes: number[] = [];
        let successCount = 0;

        for (let i = 0; i < iterations; i++) {
            // Limpiar cache entre iteraciones
            if (global.gc) {
                global.gc();
            }

            const startMemory = process.memoryUsage();
            const startTime = performance.now();

            try {
                const result = await fn();
                const endTime = performance.now();
                const endMemory = process.memoryUsage();

                const duration = endTime - startTime;
                const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;

                times.push(duration);
                memoryUsages.push(memoryDiff);
                successCount++;

                // Intentar obtener tamaño de output
                if (typeof result === 'string') {
                    outputSizes.push(Buffer.byteLength(result, 'utf8'));
                } else if (
                    result &&
                    typeof result === 'object' &&
                    'output' in result
                ) {
                    try {
                        const stats = await fs.stat(result.output as string);
                        outputSizes.push(stats.size);
                    } catch {
                        // Ignorar si no se puede obtener el tamaño
                    }
                }

                process.stdout.write('.');
            } catch (error) {
                process.stdout.write('✗');
                console.error(`Error en iteración ${i + 1}:`, error);
            }

            // Pequeña pausa entre iteraciones
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(); // Nueva línea después de los puntos

        // Calcular estadísticas
        times.sort((a, b) => a - b);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const median = times[Math.floor(times.length / 2)];
        const variance =
            times.reduce((acc, val) => acc + Math.pow(val - avgTime, 2), 0) /
            times.length;
        const stdDev = Math.sqrt(variance);

        const avgOutputSize =
            outputSizes.length > 0
                ? outputSizes.reduce((a, b) => a + b, 0) / outputSizes.length
                : undefined;

        const avgMemoryUsage =
            memoryUsages.length > 0
                ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
                : undefined;

        const result: BenchmarkResult = {
            name,
            avgTime,
            minTime,
            maxTime,
            median,
            stdDev,
            successRate: successCount / iterations,
            totalRuns: iterations,
            avgOutputSize,
            avgMemoryUsage,
        };

        this.results.push(result);
        this.printResult(result);
        return result;
    }

    private printResult(result: BenchmarkResult) {
        this.log(
            `
  ✅ ${result.name}
  ⏱️  Tiempo promedio: ${result.avgTime.toFixed(2)}ms
  📈 Min/Max: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms
  📊 Mediana: ${result.median.toFixed(2)}ms
  📏 Desv. estándar: ${result.stdDev.toFixed(2)}ms
  ✅ Tasa de éxito: ${(result.successRate * 100).toFixed(1)}%${
      result.avgOutputSize
          ? `\n  📦 Tamaño promedio: ${(result.avgOutputSize / 1024).toFixed(2)}KB`
          : ''
  }${
      result.avgMemoryUsage
          ? `\n  🧠 Memoria promedio: ${(result.avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`
          : ''
  }`,
            'green',
        );
    }

    // Archivos de muestra
    private getSampleFiles() {
        return {
            simpleJS: `
const message = 'Hello World';
const numbers = [1, 2, 3, 4, 5];

function greet(name) {
    return \`Hello, \${name}!\`;
}

export { message, numbers, greet };
            `,

            simpleTS: `
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

            complexTS: `
type EventType = 'click' | 'hover' | 'focus' | 'blur';

interface BaseEvent {
    type: EventType;
    timestamp: number;
    target: HTMLElement;
}

interface ClickEvent extends BaseEvent {
    type: 'click';
    coordinates: { x: number; y: number };
    button: 'left' | 'right' | 'middle';
}

type CustomEvent = ClickEvent;

class EventManager<T extends CustomEvent> {
    private listeners: Map<EventType, ((event: T) => void)[]> = new Map();
    private eventHistory: T[] = [];

    constructor(private maxHistory: number = 100) {}

    addEventListener<K extends T['type']>(
        type: K,
        listener: (event: Extract<T, { type: K }>) => void
    ): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(listener as any);
    }

    emit<K extends T['type']>(event: Extract<T, { type: K }>): void {
        this.eventHistory.push(event as T);
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }

        const listeners = this.listeners.get(event.type);
        if (listeners) {
            listeners.forEach(listener => listener(event as any));
        }
    }
}

export { EventManager, EventType, CustomEvent };
            `,

            simpleVue: `
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

            complexVue: `
<template>
    <div class="complex-component">
        <header>
            <h1>{{ title }}</h1>
            <nav>
                <ul>
                    <li v-for="item in navigation" :key="item.id" @click="navigate(item)">
                        {{ item.label }}
                    </li>
                </ul>
            </nav>
        </header>

        <main>
            <section v-if="loading">Loading...</section>
            <section v-else-if="error">Error: {{ error.message }}</section>
            <section v-else>
                <div class="filters">
                    <input v-model="searchTerm" placeholder="Search..." />
                    <select v-model="selectedCategory">
                        <option value="">All Categories</option>
                        <option v-for="cat in categories" :key="cat" :value="cat">
                            {{ cat }}
                        </option>
                    </select>
                </div>

                <div class="user-grid">
                    <div v-for="user in filteredUsers" :key="user.id" class="user-card">
                        <h3>{{ user.name }}</h3>
                        <p>{{ user.email }}</p>
                    </div>
                </div>
            </section>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface User {
    id: number
    name: string
    email: string
    category: string
}

interface NavigationItem {
    id: string
    label: string
    route: string
}

const title = ref('Complex Component')
const loading = ref(false)
const error = ref<Error | null>(null)
const users = ref<User[]>([])
const searchTerm = ref('')
const selectedCategory = ref('')

const navigation = ref<NavigationItem[]>([
    { id: 'home', label: 'Home', route: '/' },
    { id: 'users', label: 'Users', route: '/users' }
])

const categories = computed(() => {
    const cats = new Set(users.value.map(u => u.category))
    return Array.from(cats).sort()
})

const filteredUsers = computed(() => {
    let filtered = users.value

    if (searchTerm.value) {
        const term = searchTerm.value.toLowerCase()
        filtered = filtered.filter(user =>
            user.name.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term)
        )
    }

    if (selectedCategory.value) {
        filtered = filtered.filter(user => user.category === selectedCategory.value)
    }

    return filtered
})

const navigate = (item: NavigationItem) => {
    console.log('Navigating to:', item.route)
}

onMounted(() => {
    users.value = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: \`User \${i + 1}\`,
        email: \`user\${i + 1}@example.com\`,
        category: ['Admin', 'User', 'Moderator'][i % 3]
    }))
})
</script>

<style scoped>
.complex-component {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.user-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
}

.user-card {
    background: white;
    padding: 1rem;
    border-radius: 8px;
}
</style>
            `,
        };
    }

    public async runSingleFileBenchmarks() {
        this.log('\n🔍 BENCHMARKS DE ARCHIVOS INDIVIDUALES', 'bright');
        this.log('═'.repeat(50), 'cyan');

        const samples = this.getSampleFiles();

        // JavaScript simple
        await this.measureFunction('JavaScript Simple', async () => {
            const filePath = path.join(env.PATH_SOURCE, 'simple.js');
            await fs.writeFile(filePath, samples.simpleJS);
            return await compileFile(filePath);
        });

        // TypeScript sin tipado
        const originalTypeCheck = env.typeCheck;
        env.typeCheck = 'false';
        await this.measureFunction('TypeScript (sin tipado)', async () => {
            const filePath = path.join(env.PATH_SOURCE, 'simple-no-tc.ts');
            await fs.writeFile(filePath, samples.simpleTS);
            return await compileFile(filePath);
        });

        // TypeScript con tipado
        env.typeCheck = 'true';
        await this.measureFunction('TypeScript (con tipado)', async () => {
            const filePath = path.join(env.PATH_SOURCE, 'simple-tc.ts');
            await fs.writeFile(filePath, samples.simpleTS);
            return await compileFile(filePath);
        });

        // TypeScript complejo
        await this.measureFunction('TypeScript Complejo', async () => {
            const filePath = path.join(env.PATH_SOURCE, 'complex.ts');
            await fs.writeFile(filePath, samples.complexTS);
            return await compileFile(filePath);
        });

        env.typeCheck = originalTypeCheck;

        // Vue simple
        await this.measureFunction('Vue Simple', async () => {
            const filePath = path.join(env.PATH_SOURCE, 'Simple.vue');
            await fs.writeFile(filePath, samples.simpleVue);
            return await compileFile(filePath);
        });

        // Vue complejo
        await this.measureFunction('Vue Complejo', async () => {
            const filePath = path.join(env.PATH_SOURCE, 'Complex.vue');
            await fs.writeFile(filePath, samples.complexVue);
            return await compileFile(filePath);
        });
    }

    public async runDirectFunctionBenchmarks() {
        this.log('\n⚡ BENCHMARKS DE FUNCIONES DIRECTAS', 'bright');
        this.log('═'.repeat(50), 'cyan');

        const samples = this.getSampleFiles();

        // preCompileVue directo
        await this.measureFunction('preCompileVue (directo)', async () => {
            return await preCompileVue(samples.complexVue, 'Direct.vue', false);
        });

        // preCompileTS directo
        await this.measureFunction('preCompileTS (directo)', async () => {
            return await preCompileTS(samples.complexTS, 'Direct.ts');
        });
    }

    public async runBatchBenchmarks() {
        this.log('\n📦 BENCHMARK DE COMPILACIÓN MÚLTIPLE', 'bright');
        this.log('═'.repeat(50), 'cyan');

        const samples = this.getSampleFiles();

        await this.measureFunction(
            'Compilación Múltiple (5 archivos)',
            async () => {
                // Crear múltiples archivos
                const files = [
                    { name: 'app.js', content: samples.simpleJS },
                    { name: 'utils.ts', content: samples.simpleTS },
                    { name: 'Component.vue', content: samples.simpleVue },
                    { name: 'complex.ts', content: samples.complexTS },
                    {
                        name: 'AdvancedComponent.vue',
                        content: samples.complexVue,
                    },
                ];

                for (const file of files) {
                    await fs.writeFile(
                        path.join(env.PATH_SOURCE, file.name),
                        file.content,
                    );
                }

                return await initCompileAll();
            },
            3,
        ); // Menos iteraciones para batch
    }

    public async runComparisonBenchmarks() {
        this.log('\n🔄 BENCHMARKS DE COMPARACIÓN', 'bright');
        this.log('═'.repeat(50), 'cyan');

        const samples = this.getSampleFiles();

        // Comparación TypeScript con/sin tipado
        const tsResults = {
            withoutTC: null as BenchmarkResult | null,
            withTC: null as BenchmarkResult | null,
        };

        env.typeCheck = 'false';
        tsResults.withoutTC = await this.measureFunction(
            'TS Comparación (sin tipado)',
            async () => {
                const filePath = path.join(env.PATH_SOURCE, 'comparison.ts');
                await fs.writeFile(filePath, samples.complexTS);
                return await compileFile(filePath);
            },
            3,
        );

        env.typeCheck = 'true';
        tsResults.withTC = await this.measureFunction(
            'TS Comparación (con tipado)',
            async () => {
                const filePath = path.join(env.PATH_SOURCE, 'comparison-tc.ts');
                await fs.writeFile(filePath, samples.complexTS);
                return await compileFile(filePath);
            },
            3,
        );

        // Análisis de overhead
        if (tsResults.withoutTC && tsResults.withTC) {
            const overhead =
                ((tsResults.withTC.avgTime - tsResults.withoutTC.avgTime) /
                    tsResults.withoutTC.avgTime) *
                100;
            this.log(
                `\n📊 Overhead del Type Checking: ${overhead.toFixed(1)}%`,
                overhead > 100 ? 'red' : 'green',
            );
        }

        // Comparación Vue simple vs complejo
        const vueSimple = await this.measureFunction(
            'Vue Comparación (simple)',
            async () => {
                const filePath = path.join(
                    env.PATH_SOURCE,
                    'VueSimpleComp.vue',
                );
                await fs.writeFile(filePath, samples.simpleVue);
                return await compileFile(filePath);
            },
            3,
        );

        const vueComplex = await this.measureFunction(
            'Vue Comparación (complejo)',
            async () => {
                const filePath = path.join(
                    env.PATH_SOURCE,
                    'VueComplexComp.vue',
                );
                await fs.writeFile(filePath, samples.complexVue);
                return await compileFile(filePath);
            },
            3,
        );

        // Análisis de factor de complejidad
        const complexityFactor = vueComplex.avgTime / vueSimple.avgTime;
        this.log(
            `\n📊 Factor de Complejidad Vue: ${complexityFactor.toFixed(1)}x`,
            complexityFactor > 5 ? 'red' : 'green',
        );
    }

    public printSummary() {
        this.log('\n🎯 RESUMEN FINAL DE BENCHMARKS', 'bright');
        this.log('═'.repeat(60), 'cyan');

        if (this.results.length === 0) {
            this.log('❌ No hay resultados para mostrar', 'red');
            return;
        }

        // Estadísticas generales
        const avgTimes = this.results.map(r => r.avgTime);
        const overallAvg =
            avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
        const fastest = this.results.reduce((min, r) =>
            r.avgTime < min.avgTime ? r : min,
        );
        const slowest = this.results.reduce((max, r) =>
            r.avgTime > max.avgTime ? r : max,
        );

        this.log(
            `📊 Tiempo promedio general: ${overallAvg.toFixed(2)}ms`,
            'cyan',
        );
        this.log(
            `🚀 Más rápido: ${fastest.name} (${fastest.avgTime.toFixed(2)}ms)`,
            'green',
        );
        this.log(
            `🐌 Más lento: ${slowest.name} (${slowest.avgTime.toFixed(2)}ms)`,
            'yellow',
        );

        // Tabla de resultados
        this.log('\n📋 TABLA DE RESULTADOS:', 'bright');
        console.table(
            this.results.map(r => ({
                Prueba: r.name,
                'Tiempo (ms)': r.avgTime.toFixed(2),
                'Min (ms)': r.minTime.toFixed(2),
                'Max (ms)': r.maxTime.toFixed(2),
                'Éxito (%)': (r.successRate * 100).toFixed(1),
                'Tamaño (KB)': r.avgOutputSize
                    ? (r.avgOutputSize / 1024).toFixed(2)
                    : 'N/A',
            })),
        );

        // Recomendaciones
        this.log('\n💡 RECOMENDACIONES:', 'bright');

        if (overallAvg < 5000) {
            this.log('✅ Excelente rendimiento general', 'green');
        } else if (overallAvg < 10000) {
            this.log(
                '⚠️  Rendimiento aceptable, considerar optimizaciones',
                'yellow',
            );
        } else {
            this.log(
                '❌ Rendimiento bajo, necesita optimización urgente',
                'red',
            );
        }

        const successRates = this.results.map(r => r.successRate);
        const overallSuccessRate =
            successRates.reduce((a, b) => a + b, 0) / successRates.length;

        if (overallSuccessRate >= 0.95) {
            this.log('✅ Excelente confiabilidad (>95% éxito)', 'green');
        } else if (overallSuccessRate >= 0.85) {
            this.log('⚠️  Confiabilidad aceptable (>85% éxito)', 'yellow');
        } else {
            this.log('❌ Baja confiabilidad, revisar errores', 'red');
        }

        this.log('\n🚀 El VersaCompiler está listo para producción!', 'green');
    }

    public async run() {
        try {
            this.log('🔥 VERSACOMPILER BENCHMARK SUITE', 'bright');
            this.log('═'.repeat(60), 'cyan');
            this.log(
                `📊 Ejecutando ${this.iterations} iteraciones por prueba\n`,
                'yellow',
            );

            await this.setupEnvironment();

            await this.runSingleFileBenchmarks();
            await this.runDirectFunctionBenchmarks();
            await this.runBatchBenchmarks();
            await this.runComparisonBenchmarks();

            this.printSummary();
        } catch (error) {
            this.log(`❌ Error durante benchmark: ${error}`, 'red');
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
}

// Ejecutar benchmark si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const iterations = process.argv.includes('--iterations')
        ? parseInt(process.argv[process.argv.indexOf('--iterations') + 1]) || 5
        : 5;

    const benchmark = new VersaCompilerBenchmark(iterations);
    benchmark.run().catch(console.error);
}

export { VersaCompilerBenchmark };
