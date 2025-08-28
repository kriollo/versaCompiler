import pluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import oxlint from 'eslint-plugin-oxlint';
import pluginVue from 'eslint-plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';
import parserVue from 'vue-eslint-parser';

export default [
    // Extiende las configuraciones recomendadas de Oxlint
    ...oxlint.configs['flat/recommended'], // Ignorar archivos compilados y de distribución
    {
        ignores: [
            'public/**/*',
            'node_modules/**/*',
            'dist/**/*',
            'temp/**/*',
            '*.d.ts',
            'eslint.config.*.js',
            'performance-results/**/*',
            'versacompiler-*.tgz',
            'examples/js/examples/test-errors.js', // Archivo de ejemplo de errores
        ],
    },

    // Configuración para archivos Vue
    {
        files: ['src/**/*.vue'],
        languageOptions: {
            parser: parserVue,
            parserOptions: {
                parser: parserTs,
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json',
                extraFileExtensions: ['.vue'],
            },
        },
        plugins: {
            vue: pluginVue,
            '@typescript-eslint': pluginTs,
            import: pluginImport,
        },
        rules: {
            // Reglas esenciales para Vue 3 - Solo las críticas para un compilador
            'vue/jsx-uses-vars': 'error',
            'vue/no-unused-vars': 'error',
            'vue/multi-word-component-names': 'off', // No necesario para un compilador
            'vue/require-v-for-key': 'error',
            'vue/no-use-v-if-with-v-for': 'error',
            'vue/no-template-key': 'error',
            'vue/valid-template-root': 'error',
            'vue/valid-v-for': 'error',
            'vue/valid-v-if': 'error',
            'vue/valid-v-model': 'error',
            // TypeScript - Reglas críticas para correctness
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off', // Necesario en compiladores
            '@typescript-eslint/no-non-null-assertion': 'off', // Útil cuando sabemos el tipo
            '@typescript-eslint/prefer-as-const': 'error',
            '@typescript-eslint/no-inferrable-types': 'off', // Útil en compiladores para claridad

            // Imports - Crítico para un compilador
            'import/no-unresolved': 'off', // Desactivado por configuración compleja de rutas
            'import/no-duplicates': 'error',
            'import/no-cycle': 'error',
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
        },
    },

    // Configuración para archivos TypeScript
    {
        files: ['src/**/*.ts', 'src/**/*.tsx', '**/*.ts'],
        languageOptions: {
            parser: parserTs,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json',
                // Ensure tsconfigRootDir is absolute for @typescript-eslint/parser
                // Resolve relative to this config file using import.meta.url
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
            },
        },
        plugins: {
            '@typescript-eslint': pluginTs,
            import: pluginImport,
        },
        rules: {
            // Reglas TypeScript críticas para un compilador
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off', // Necesario en compiladores
            '@typescript-eslint/no-non-null-assertion': 'off', // Útil cuando sabemos el tipo
            '@typescript-eslint/prefer-as-const': 'error',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    'ts-expect-error': 'allow-with-description',
                    'ts-ignore': 'allow-with-description',
                    'ts-nocheck': false,
                },
            ],
            '@typescript-eslint/no-unsafe-assignment': 'off', // Puede ser necesario en compiladores
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',

            // Reglas de importación críticas
            'import/no-unresolved': 'off',
            'import/no-duplicates': 'error',
            'import/no-cycle': 'error',
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],

            // Reglas básicas de JavaScript/TypeScript
            'no-console': 'off', // Necesario para logging en compilador
            'no-debugger': 'error',
            'no-unused-expressions': 'error',
            'no-unreachable': 'error',
            'no-undef': 'off', // TypeScript se encarga de esto
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    // Configuración para archivos JavaScript
    {
        files: [
            'src/**/*.js',
            'src/**/*.jsx',
            'tests/**/*.js',
            'examples/**/*.js',
            '**/*.cjs',
            '**/*.mjs',
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
        plugins: {
            import: pluginImport,
        },
        rules: {
            // Reglas básicas de JavaScript
            'no-console': 'off', // Necesario para logging
            'no-debugger': 'error',
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'no-unused-expressions': 'error',
            'no-unreachable': 'error',
            'prefer-const': 'error',
            'no-var': 'error',

            // Importaciones
            'import/no-unresolved': 'off',
            'import/no-duplicates': 'error',
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
        },
    },
];
