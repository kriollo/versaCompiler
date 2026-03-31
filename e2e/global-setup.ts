/**
 * global-setup.ts
 * Se ejecuta UNA VEZ antes de todos los tests Playwright.
 * Compila los archivos Vue/TS necesarios y los ubica en los paths
 * que esperan los imports del bundle compilado.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const COMPILER = 'node_modules/.bin/tsx src/main.ts';

interface FileSpec {
    src: string; // fuente relativo a ROOT
    expectedOut: string; // donde el compilador deja la salida
    neededAt?: string; // si hay que copiarlo a otra ruta
}

const FILES: FileSpec[] = [
    // Componente principal de prueba
    {
        src: 'examples/js/module/importTestApp.vue',
        expectedOut: 'public/importTestApp.js',
    },
    // Dependencia relativa de importTestApp
    {
        src: 'examples/js/module/operacionesMatematicas.vue',
        expectedOut: 'public/operacionesMatematicas.js',
    },
    // Dependencia vía alias @/* de operacionesMatematicas
    {
        src: 'examples/js/components/lineHr.vue',
        expectedOut: 'public/lineHr.js',
        // operacionesMatematicas.js espera: /public/testProject/js/components/lineHr.js
        neededAt: 'public/testProject/js/components/lineHr.js',
    },
    // Dependencia vía alias e@/* de operacionesMatematicas
    {
        src: 'examples/js/sampleFile.ts',
        expectedOut: 'public/sampleFile.js',
        // operacionesMatematicas.js espera: /public/js/sampleFile.js
        neededAt: 'public/js/sampleFile.js',
    },
    // Componente SwitchToggle vía alias e@/* de importTestApp
    {
        src: 'examples/js/components/switchToggle.vue',
        expectedOut: 'public/switchToggle.js',
        // importTestApp.js espera: /public/js/components/switchToggle.js
        neededAt: 'public/js/components/switchToggle.js',
    },
];

function compile(src: string): void {
    console.log(`  ⚙️  ${src}`);
    execSync(`${COMPILER} --file ${src}`, {
        cwd: ROOT,
        stdio: 'pipe',
    });
}

export default async function globalSetup(): Promise<void> {
    console.log('\n🎭 [Playwright] Compilando archivos de prueba...\n');

    for (const file of FILES) {
        compile(file.src);

        const outPath = join(ROOT, file.expectedOut);
        if (!existsSync(outPath)) {
            throw new Error(
                `Compilación fallida: esperado en ${file.expectedOut}`,
            );
        }

        if (file.neededAt) {
            const dest = join(ROOT, file.neededAt);
            mkdirSync(join(dest, '..'), { recursive: true });
            cpSync(outPath, dest);
        }
    }

    console.log('\n✅ Archivos listos.\n');
}
