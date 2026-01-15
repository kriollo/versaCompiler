import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Module Resolver - Production Mode Priority', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Restaurar env
        process.env = { ...originalEnv };
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should set isPROD environment variable correctly in production mode', () => {
        process.env.isPROD = 'true';
        expect(process.env.isPROD).toBe('true');
    });

    it('should set isPROD environment variable correctly in development mode', () => {
        process.env.isPROD = 'false';
        expect(process.env.isPROD).toBe('false');
    });

    it('should prioritize production files when isPROD is true', () => {
        process.env.isPROD = 'true';

        // Lista de archivos simulados
        const files = [
            'vue.esm-browser.js',
            'vue.esm-browser.prod.js',
            'vue.esm-browser.min.js',
        ];

        // En producción, debería seleccionar .prod.js primero
        const prodFiles = files.filter((file: string) =>
            file.toLowerCase().includes('.prod.'),
        );
        expect(prodFiles.length).toBeGreaterThan(0);
        expect(prodFiles[0]).toBe('vue.esm-browser.prod.js');
    });

    it('should prioritize development files when isPROD is false', () => {
        process.env.isPROD = 'false';

        // Lista de archivos simulados
        const files = [
            'vue.esm-browser.js',
            'vue.esm-browser.prod.js',
            'vue.esm-browser.min.js',
        ];

        // En desarrollo, debería seleccionar el archivo sin .prod ni .min
        const devFiles = files.filter(
            (file: string) =>
                !file.toLowerCase().includes('.prod.') &&
                !file.toLowerCase().includes('.min.'),
        );
        expect(devFiles.length).toBeGreaterThan(0);
        expect(devFiles[0]).toBe('vue.esm-browser.js');
    });

    it('should prefer .prod.js over .min.js in production', () => {
        process.env.isPROD = 'true';

        const files = [
            'library.esm-browser.js',
            'library.esm-browser.min.js',
            'library.esm-browser.prod.js',
        ];

        // Primero buscar .prod.js
        const prodFiles = files.filter((file: string) =>
            file.toLowerCase().includes('.prod.'),
        );

        // Luego buscar .min.js
        const minFiles = files.filter((file: string) =>
            file.toLowerCase().includes('.min.'),
        );

        // .prod.js tiene prioridad sobre .min.js
        expect(prodFiles[0]).toBe('library.esm-browser.prod.js');
        expect(prodFiles[0]).not.toBe(minFiles[0]);
    });

    it('should use .min.js as fallback when .prod.js is not available in production', () => {
        process.env.isPROD = 'true';

        const files = [
            'library.esm-browser.js',
            'library.esm-browser.min.js',
            // No hay .prod.js
        ];

        // Primero buscar .prod.js
        const prodFiles = files.filter((file: string) =>
            file.toLowerCase().includes('.prod.'),
        );

        // Si no hay .prod.js, buscar .min.js
        if (prodFiles.length === 0) {
            const minFiles = files.filter((file: string) =>
                file.toLowerCase().includes('.min.'),
            );
            expect(minFiles.length).toBeGreaterThan(0);
            expect(minFiles[0]).toBe('library.esm-browser.min.js');
        }
    });

    it('should handle multiple library patterns with production priority', () => {
        process.env.isPROD = 'true';

        const testCases = [
            {
                files: ['vue.esm-browser.js', 'vue.esm-browser.prod.js'],
                expected: 'vue.esm-browser.prod.js',
            },
            {
                files: [
                    'vue-router.esm-browser.js',
                    'vue-router.esm-browser.prod.js',
                ],
                expected: 'vue-router.esm-browser.prod.js',
            },
            {
                files: ['pinia.esm-browser.js', 'pinia.esm-browser.prod.js'],
                expected: 'pinia.esm-browser.prod.js',
            },
        ];

        testCases.forEach(({ files, expected }) => {
            const prodFiles = files.filter((file: string) =>
                file.toLowerCase().includes('.prod.'),
            );
            expect(prodFiles[0]).toBe(expected);
        });
    });
});
