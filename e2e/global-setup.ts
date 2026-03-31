/**
 * global-setup.ts
 * Se ejecuta UNA VEZ antes de todos los tests Playwright.
 * Compila los archivos Vue/TS necesarios y los ubica en los paths
 * que esperan los imports del bundle compilado.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const COMPILER = 'node_modules/.bin/tsx src/main.ts';

interface FileSpec {
    src: string; // fuente relativo a ROOT
    expectedOut: string; // donde el compilador deja la salida
    neededAt?: string; // si hay que copiarlo a otra ruta
}

const FILES: FileSpec[] = [
    // ── App 1: importTestApp ─────────────────────────────────────────────────
    // Con outDir='./dist', el compilador pone los archivos en dist/.
    // Copiamos a public/ donde los espera el HTML de e2e.
    {
        src: 'examples/js/module/importTestApp.vue',
        expectedOut: 'dist/importTestApp.js',
        neededAt: 'public/importTestApp.js', // index.html carga desde /public/
    },
    {
        src: 'examples/js/module/operacionesMatematicas.vue',
        expectedOut: 'dist/operacionesMatematicas.js',
        neededAt: 'public/operacionesMatematicas.js', // importTestApp.js usa './operacionesMatematicas.js'
    },
    {
        src: 'examples/js/components/lineHr.vue',
        expectedOut: 'dist/lineHr.js',
        // operacionesMatematicas.js usa @/* alias → compila a /dist/public/js/components/lineHr.js
        neededAt: 'dist/public/js/components/lineHr.js',
    },
    {
        src: 'examples/js/sampleFile.ts',
        expectedOut: 'dist/sampleFile.js',
        // operacionesMatematicas.js usa e@/* alias → compila a /dist/js/sampleFile.js
        neededAt: 'dist/js/sampleFile.js',
    },
    {
        src: 'examples/js/components/switchToggle.vue',
        expectedOut: 'dist/switchToggle.js',
        // importTestApp.js usa e@/* alias → compila a /dist/js/components/switchToggle.js
        neededAt: 'dist/js/components/switchToggle.js',
    },

    // ── App 2: Contact Manager ───────────────────────────────────────────────
    // Archivos raíz — van a dist/ directamente, no necesitan copia
    { src: 'examples/js/module/contactManager/types.ts',        expectedOut: 'dist/types.js' },
    { src: 'examples/js/module/contactManager/useValidation.ts', expectedOut: 'dist/useValidation.js' },
    { src: 'examples/js/module/contactManager/useContacts.ts',  expectedOut: 'dist/useContacts.js' },
    { src: 'examples/js/module/contactManager/contactStore.ts', expectedOut: 'dist/contactStore.js' },

    // Componentes hoja — se compilan flat a dist/, se copian a dist/components/
    {
        src: 'examples/js/module/contactManager/components/FormField.vue',
        expectedOut: 'dist/FormField.js',
        neededAt: 'dist/components/FormField.js',
    },
    {
        src: 'examples/js/module/contactManager/components/ErrorBoundary.vue',
        expectedOut: 'dist/ErrorBoundary.js',
        neededAt: 'dist/components/ErrorBoundary.js',
    },
    {
        src: 'examples/js/module/contactManager/components/AccordionItem.vue',
        expectedOut: 'dist/AccordionItem.js',
        neededAt: 'dist/components/AccordionItem.js',
    },
    {
        src: 'examples/js/module/contactManager/components/TabPanel.vue',
        expectedOut: 'dist/TabPanel.js',
        neededAt: 'dist/components/TabPanel.js',
    },
    {
        src: 'examples/js/module/contactManager/components/ContactModal.vue',
        expectedOut: 'dist/ContactModal.js',
        neededAt: 'dist/components/ContactModal.js',
    },
    {
        src: 'examples/js/module/contactManager/components/ContactCard.vue',
        expectedOut: 'dist/ContactCard.js',
        neededAt: 'dist/components/ContactCard.js',
    },
    {
        src: 'examples/js/module/contactManager/components/ContactForm.vue',
        expectedOut: 'dist/ContactForm.js',
        neededAt: 'dist/components/ContactForm.js',
    },
    {
        src: 'examples/js/module/contactManager/components/ContactList.vue',
        expectedOut: 'dist/ContactList.js',
        neededAt: 'dist/components/ContactList.js',
    },
    {
        src: 'examples/js/module/contactManager/components/AsyncStats.vue',
        expectedOut: 'dist/AsyncStats.js',
        neededAt: 'dist/components/AsyncStats.js',
    },
    // Root component — compilado al final (depende de todos los anteriores)
    {
        src: 'examples/js/module/contactManager/ContactManagerApp.vue',
        expectedOut: 'dist/ContactManagerApp.js',
    },
];

function needsCompile(src: string, out: string): boolean {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    if (!existsSync(outPath)) return true;
    return statSync(srcPath).mtimeMs > statSync(outPath).mtimeMs;
}

function compile(src: string): void {
    console.log(`  ⚙️  ${src}`);
    execSync(`${COMPILER} --file ${src}`, {
        cwd: ROOT,
        stdio: 'pipe',
    });
}

export default async function globalSetup(): Promise<void> {
    console.log('\n🎭 [Playwright] Verificando archivos de prueba...\n');

    let compiled = 0;
    let skipped = 0;

    for (const file of FILES) {
        const outPath = join(ROOT, file.expectedOut);

        if (needsCompile(file.src, file.expectedOut)) {
            compile(file.src);
            compiled++;

            if (!existsSync(outPath)) {
                throw new Error(
                    `Compilación fallida: esperado en ${file.expectedOut}`,
                );
            }
        } else {
            console.log(`  ⏭️  ${file.src} (sin cambios)`);
            skipped++;
        }

        if (file.neededAt) {
            const dest = join(ROOT, file.neededAt);
            mkdirSync(join(dest, '..'), { recursive: true });
            cpSync(outPath, dest);
        }
    }

    console.log(`\n✅ Archivos listos. (${compiled} compilados, ${skipped} sin cambios)\n`);
}
