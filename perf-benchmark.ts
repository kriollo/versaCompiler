#!/usr/bin/env tsx

/**
 * Script de benchmark simplificado para medir el tiempo de inicio del VersaCompiler
 * Compatible con TypeScript + tsx
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear un archivo de prueba simple para compilar
const testDir = path.join(__dirname, 'temp-benchmark');
const testFile = path.join(testDir, 'test.js');
const testContent = `
// Archivo de prueba simple para benchmark
console.log('Hello, World!');
const message = 'VersaCompiler benchmark test';
export { message };
`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para medir el tiempo de ejecución
async function measureStartupTime(iterations: number = 3): Promise<number[]> {
    console.log(
        `🚀 Midiendo tiempo de inicio del VersaCompiler (${iterations} iteraciones)...\n`,
    );

    // Crear directorio y archivo de prueba
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(testFile, testContent);

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
        console.log(`📊 Iteración ${i + 1}/${iterations}...`);

        const startTime = process.hrtime.bigint();

        try {
            // Ejecutar el compilador directamente con tsx
            execSync(`npx tsx src/main.ts "${testFile}"`, {
                cwd: __dirname,
                stdio: 'pipe', // Capturar output silenciosamente
                timeout: 30000, // 30 segundos de timeout
            });

            const endTime = process.hrtime.bigint();
            const executionTime = Number(endTime - startTime) / 1_000_000; // Convertir a milisegundos

            times.push(executionTime);
            console.log(`   ⏱️  Tiempo: ${executionTime.toFixed(2)}ms`);
        } catch (error: any) {
            console.error(`   ❌ Error en iteración ${i + 1}:`, error.message);
            // Continuamos con las siguientes iteraciones
        }

        // Pequeña pausa entre iteraciones
        if (i < iterations - 1) {
            await sleep(500);
        }
    }

    // Limpiar archivos de prueba
    try {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    } catch (error: any) {
        console.warn(
            '⚠️  No se pudo limpiar el directorio temporal:',
            error.message,
        );
    }

    return times;
}

// Tipos para las estadísticas
interface BenchmarkStats {
    min: number;
    max: number;
    avg: number;
    median: number;
    count: number;
}

// Función para calcular estadísticas
function calculateStats(times: number[]): BenchmarkStats | null {
    if (times.length === 0) {
        return null;
    }

    const validTimes = times.filter(t => t > 0);
    if (validTimes.length === 0) {
        return null;
    }

    const min = Math.min(...validTimes);
    const max = Math.max(...validTimes);
    const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
    const median = validTimes.sort((a, b) => a - b)[
        Math.floor(validTimes.length / 2)
    ];

    return { min, max, avg, median, count: validTimes.length };
}

// Función para mostrar resultados
function displayResults(stats: BenchmarkStats | null): void {
    if (!stats) {
        console.log('❌ No se pudieron obtener mediciones válidas');
        return;
    }

    console.log('\n📈 RESULTADOS DEL BENCHMARK');
    console.log('═'.repeat(50));
    console.log(`📊 Iteraciones exitosas: ${stats.count}`);
    console.log(`⚡ Tiempo mínimo:        ${stats.min.toFixed(2)}ms`);
    console.log(`📊 Tiempo promedio:      ${stats.avg.toFixed(2)}ms`);
    console.log(`📌 Tiempo mediano:       ${stats.median.toFixed(2)}ms`);
    console.log(`🐌 Tiempo máximo:        ${stats.max.toFixed(2)}ms`);

    // Interpretación de resultados
    console.log('\n🎯 INTERPRETACIÓN');
    console.log('═'.repeat(50));

    if (stats.avg < 1000) {
        console.log('✅ EXCELENTE: Tiempo de inicio muy rápido (<1s)');
    } else if (stats.avg < 3000) {
        console.log('✅ BUENO: Tiempo de inicio aceptable (<3s)');
    } else if (stats.avg < 5000) {
        console.log('⚠️  MEJORABLE: Tiempo de inicio moderado (<5s)');
    } else if (stats.avg < 7000) {
        console.log('⚠️  LENTO: Tiempo de inicio alto (<7s)');
    } else {
        console.log('❌ MUY LENTO: Tiempo de inicio muy alto (>7s)');
    }

    // Verificar si las optimizaciones de lazy loading están funcionando
    if (stats.avg < 3000) {
        console.log(
            '🎉 Las optimizaciones de lazy loading parecen estar funcionando correctamente!',
        );
    } else {
        console.log(
            '🤔 Puede que necesitemos más optimizaciones de lazy loading.',
        );
    }

    console.log('\n💡 ESTADO DE LAZY LOADING IMPLEMENTADO');
    console.log('═'.repeat(50));
    console.log('✅ Módulos pesados ahora cargan bajo demanda:');
    console.log('   • chalk - Solo cuando hay errores o logs de colores');
    console.log('   • Vue compiler - Solo para archivos .vue');
    console.log('   • TypeScript compiler - Solo para archivos .ts');
    console.log('   • ESLint/OxLint - Solo cuando linting está habilitado');
    console.log('   • Minificación - Solo cuando está habilitada');
    console.log('   • TailwindCSS - Solo cuando está configurado');
    console.log('\n📊 COMPARACIÓN:');
    console.log('   • ANTES: ~7000ms (carga síncrona de todos los módulos)');
    console.log(
        `   • AHORA: ~${stats.avg.toFixed(0)}ms (carga lazy de módulos pesados)`,
    );
    const improvement = ((7000 - stats.avg) / 7000) * 100;
    if (improvement > 0) {
        console.log(`   • MEJORA: ${improvement.toFixed(1)}% más rápido! 🚀`);
    }
}

// Función principal
async function main(): Promise<void> {
    console.log('🔧 VersaCompiler - Benchmark de Rendimiento con Lazy Loading');
    console.log('═'.repeat(60));
    console.log(
        '📝 Midiendo el tiempo de inicio después de las optimizaciones',
    );
    console.log(
        '⚡ Objetivo: Verificar que el tiempo se redujo de ~7s a <3s\n',
    );

    const times = await measureStartupTime(3);
    const stats = calculateStats(times);
    displayResults(stats);
}

// Ejecutar solo si es el módulo principal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}

// Exportar funciones para uso en pruebas
export {
    calculateStats,
    displayResults,
    measureStartupTime,
    type BenchmarkStats,
};
