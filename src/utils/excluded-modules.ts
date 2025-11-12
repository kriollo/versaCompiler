/**
 * Lista centralizada de módulos excluidos de la resolución automática
 * Estos módulos se mantienen con su importación original sin transformar
 */

export const EXCLUDED_MODULES = new Set([
    // Módulos de Vue.js que requieren resolución específica
    'vue/compiler-sfc',
    'vue/dist/vue.runtime.esm-bundler',
    '@vue/compiler-sfc',
    '@vue/compiler-dom',
    '@vue/runtime-core',
    '@vue/runtime-dom',

    // Módulos de oxc-parser que tienen dependencias específicas de WASM
    'oxc-parser',
    'oxc-parser/wasm',
    'oxc-minify',
    'oxc-minify/browser',
    '@oxc-parser/binding-wasm32-wasi',
    '@oxc-minify/binding-wasm32-wasi',

    // Módulos de TypeScript que pueden tener resoluciones complejas
    'typescript',
    'typescript/lib/typescript',

    // Módulos de herramientas de build y utilidades que deben mantenerse originales
    'yargs',
    'yargs/helpers',
    'yargs-parser',
    'chalk',
    'browser-sync',
    'chokidar',
    'get-port',
    'execa',
    'find-root',
    'fs-extra',
    'minimatch', // ✅ Incluir minimatch aquí
    'minify-html-literals',
]);
