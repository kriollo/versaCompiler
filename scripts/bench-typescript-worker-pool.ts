/**
 * Benchmark mínimo: mide el tiempo de type-check de N archivos que
 * comparten una misma dependencia grande, vía TypeScriptWorkerPool.
 *
 * Sirve para comparar antes/después de cambios al cache de versiones de
 * dependencias en typescript-worker-thread.cjs (reutilización incremental
 * del SourceFile parseado entre tareas del mismo worker).
 *
 * Uso: pnpm bench
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { TypeScriptWorkerPool } from '../src/compiler/typescript-worker-pool';

const FILE_COUNT = 8;
const ITERATIONS = 20;

function buildFixtures(dir: string) {
    const sharedPath = path.join(dir, 'shared-types.ts');
    const sharedInterfaces = Array.from(
        { length: 20 },
        (_, i) =>
            `export interface Shape${i} { id: number; label: string; value${i}: number; }`,
    ).join('\n');
    writeFileSync(sharedPath, sharedInterfaces);

    const files: { fileName: string; content: string }[] = [];
    for (let i = 0; i < FILE_COUNT; i++) {
        const fileName = path.join(dir, `consumer-${i}.ts`);
        const content = `
            import type { Shape${i} } from './shared-types';
            export function build${i}(s: Shape${i}): string {
                return \`\${s.id}:\${s.label}:\${s.value${i}}\`;
            }
        `;
        files.push({ fileName, content });
    }
    return files;
}

async function main() {
    const dir = mkdtempSync(path.join(tmpdir(), 'versa-ts-bench-'));
    const files = buildFixtures(dir);
    const pool = TypeScriptWorkerPool.getInstance();

    const compilerOptions = {
        target: 99,
        module: 99,
        strict: true,
        skipLibCheck: true,
    };

    // Warm-up: crea el/los worker(s) y su LanguageService persistente antes
    // de medir, para no contar el cold-start en la métrica.
    await Promise.all(
        files.map(f => pool.typeCheck(f.fileName, f.content, compilerOptions)),
    );

    const durationsMs: number[] = [];
    for (let iter = 0; iter < ITERATIONS; iter++) {
        const start = performance.now();
        await Promise.all(
            files.map(f =>
                pool.typeCheck(f.fileName, f.content, compilerOptions),
            ),
        );
        durationsMs.push(performance.now() - start);
    }

    durationsMs.sort((a, b) => a - b);
    const median = durationsMs[Math.floor(durationsMs.length / 2)]!;
    const p95 = durationsMs[Math.floor(durationsMs.length * 0.95)]!;
    const avg = durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length;

    console.log(
        `\nTypeScriptWorkerPool.typeCheck — ${FILE_COUNT} archivos con 1 dependencia compartida, ${ITERATIONS} iteraciones`,
    );
    console.log(`  media   : ${avg.toFixed(2)} ms`);
    console.log(`  mediana : ${median.toFixed(2)} ms`);
    console.log(`  p95     : ${p95.toFixed(2)} ms`);

    await pool.terminate();
    rmSync(dir, { recursive: true, force: true });
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
