import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Entorno de pruebas
        environment: 'node',

        // Globales (describe, it, expect disponibles sin import)
        globals: true,

        // Archivos de prueba
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        exclude: ['node_modules', 'dist', 'public', 'temp'],

        // Coverage
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                'dist/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData/**',
            ],
        },

        // Timeout para tests lentos
        testTimeout: 30000,
        hookTimeout: 30000,

        // Reporters
        reporters: ['verbose', 'html'],

        // Directorio de salida para reports
        outputFile: {
            html: './test-results/index.html',
        },

        // Configuración de threads
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true,
            },
        },

        // Modo watch
        watch: false,

        // Setup files (si necesitas ejecutar algo antes de los tests)
        // setupFiles: ['./tests/__setup__/setup.ts'],
    },

    // Resolución de módulos
    resolve: {
        alias: {
            '@': '/src',
            '@compiler': '/src/compiler',
            '@utils': '/src/utils',
            '@servicios': '/src/servicios',
        },
    },
});
