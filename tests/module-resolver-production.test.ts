import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getModulePath } from '../src/utils/module-resolver';

// A diferencia de la versión anterior de este archivo (que nunca importaba
// module-resolver.ts y solo filtraba arrays de strings hardcodeados), estos
// tests ejercitan getModulePath() real contra los paquetes reales instalados
// en node_modules (vue, vue-router, pinia son dependencias de este proyecto),
// que es lo que realmente decide qué build (.prod.js/.min.js/dev) se importa
// según env.isPROD.
describe('module-resolver - prioridad de build en producción', () => {
    const originalIsPROD = process.env.isPROD;
    const originalVerbose = process.env.VERBOSE;

    beforeEach(() => {
        // Mutar propiedades en vez de reasignar process.env por completo:
        // module-resolver.ts hace `import { env } from 'node:process'` y
        // guarda esa referencia una sola vez al cargar el módulo — reasignar
        // `process.env = {...}` rompería esa referencia y sus cambios de
        // env nunca llegarían al módulo real.
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        if (originalIsPROD === undefined) delete process.env.isPROD;
        else process.env.isPROD = originalIsPROD;
        if (originalVerbose === undefined) delete process.env.VERBOSE;
        else process.env.VERBOSE = originalVerbose;
    });

    it('en producción resuelve vue a su build .esm-browser.prod.js', () => {
        process.env.isPROD = 'true';
        expect(getModulePath('vue')).toBe(
            '/node_modules/vue/dist/vue.esm-browser.prod.js',
        );
    });

    it('en desarrollo resuelve vue a su build .esm-browser.js (sin .prod)', () => {
        process.env.isPROD = 'false';
        const resolved = getModulePath('vue');
        expect(resolved).toBe('/node_modules/vue/dist/vue.esm-browser.js');
        expect(resolved).not.toContain('.prod.');
    });

    it('en producción resuelve vue-router a su build .prod.js', () => {
        process.env.isPROD = 'true';
        expect(getModulePath('vue-router')).toBe(
            '/node_modules/vue-router/dist/vue-router.esm-browser.prod.js',
        );
    });

    it('en desarrollo resuelve vue-router a su build de desarrollo', () => {
        process.env.isPROD = 'false';
        const resolved = getModulePath('vue-router');
        expect(resolved).toBe(
            '/node_modules/vue-router/dist/vue-router.esm-browser.js',
        );
        expect(resolved).not.toContain('.prod.');
    });

    it('en producción resuelve pinia a su build .prod.js', () => {
        process.env.isPROD = 'true';
        expect(getModulePath('pinia')).toBe(
            '/node_modules/pinia/dist/pinia.esm-browser.prod.js',
        );
    });

    it('cambiar isPROD en caliente cambia la resolución sin reiniciar el proceso', () => {
        process.env.isPROD = 'true';
        const prod = getModulePath('vue');

        process.env.isPROD = 'false';
        const dev = getModulePath('vue');

        expect(prod).not.toBe(dev);
        expect(prod).toContain('.prod.js');
        expect(dev).not.toContain('.prod.');
    });
});
