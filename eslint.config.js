import pluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import oxlint from 'eslint-plugin-oxlint';
import pluginPromise from 'eslint-plugin-promise';
import pluginUnicorn from 'eslint-plugin-unicorn';
import pluginVue from 'eslint-plugin-vue';
import parserVue from 'vue-eslint-parser';

export default [
    // Extiende las configuraciones recomendadas de Oxlint
    ...oxlint.configs['flat/recommended'],

    // Ignorar archivos compilados y de distribución
    {
        ignores: [
            'public/**/*',
            'node_modules/**/*',
            'vite/dist/**/*',
            '*.d.ts',
            'eslint.config.*.js',
        ],
    },

    // Configuración para archivos Vue
    {
        files: ['src/**/*.vue'],
        languageOptions: {
            parser: parserVue,
            parserOptions: {
                parser: parserTs,
                ecmaVersion: 2020,
                sourceType: 'module',
                project: './tsconfig.json',
                extraFileExtensions: ['.vue'],
            },
        },
        plugins: {
            vue: pluginVue,
            '@typescript-eslint': pluginTs,
            import: pluginImport,
            promise: pluginPromise,
            unicorn: pluginUnicorn,
        },
        rules: {
            // Reglas específicas para Vue 3
            'vue/jsx-uses-vars': 'error',
            'vue/no-unused-vars': 'warn',
            'vue/multi-word-component-names': 'off',
            'vue/require-default-prop': 'warn',
            'vue/component-definition-name-casing': ['error', 'PascalCase'],
            'vue/attribute-hyphenation': [
                'warn',
                'always',
                {
                    ignore: ['showModal', 'idModal'],
                },
            ],
            'vue/v-on-event-hyphenation': 'error',
            'vue/block-order': [
                'error',
                {
                    order: ['script', 'template', 'style'],
                },
            ],
            'vue/no-v-html': 'warn',
            'vue/require-v-for-key': 'error',
            'vue/no-use-v-if-with-v-for': 'error',
            'vue/html-indent': ['error', 4],
            'vue/max-attributes-per-line': [
                'error',
                {
                    singleline: 3,
                    multiline: 1,
                },
            ], // Reglas de TypeScript
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'off', // Reglas de importación
            'import/no-unresolved': 'off', // Mantenemos off por rutas complejas
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin', // Node.js built-ins
                        'external', // npm packages
                        'internal', // Internal modules (@ paths)
                        'parent', // ../
                        'sibling', // ./
                        'index', // ./index
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            'import/extensions': 'off',

            // Reglas de promesas
            'promise/always-return': 'warn',
            'promise/no-return-wrap': 'warn', // Reglas de unicorn
            'unicorn/prefer-node-protocol': 'warn',
            'unicorn/no-array-reduce': 'off',
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                    extensions: ['.ts', '.vue', '.js'],
                },
                alias: {
                    map: [
                        ['@', './src'],
                        ['P@', './public'],
                    ],
                    extensions: ['.ts', '.vue', '.js'],
                },
            },
            'import/extensions': ['.js', '.ts', '.vue'],
        },
    }, // Configuración para archivos TypeScript
    {
        files: ['src/**/*.ts', 'src/**/*.tsx', 'vite/**/*.ts'],
        languageOptions: {
            parser: parserTs,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: './tsconfig.json',
                tsconfigRootDir: '.',
            },
        },
        plugins: {
            '@typescript-eslint': pluginTs,
            import: pluginImport,
            promise: pluginPromise,
            unicorn: pluginUnicorn,
        },
        rules: {
            // Reglas de TypeScript
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/explicit-module-boundary-types': 'off', // Reglas de importación
            'import/no-unresolved': 'off', // Mantenemos off por configuración compleja
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin', // Node.js built-ins
                        'external', // npm packages
                        'internal', // Internal modules (@ paths)
                        'parent', // ../
                        'sibling', // ./
                        'index', // ./index
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],

            // Reglas de promesas
            'promise/always-return': 'warn',
            'promise/no-return-wrap': 'warn',

            // Reglas de unicorn
            'unicorn/prefer-node-protocol': 'warn',
            'unicorn/no-array-reduce': 'off',
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
    }, // Configuración para archivos JavaScript
    {
        files: ['src/**/*.js', 'src/**/*.jsx', 'tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
        },
        plugins: {
            import: pluginImport,
            promise: pluginPromise,
            unicorn: pluginUnicorn,
        },
        rules: {
            // Reglas de importación
            'import/no-unresolved': 'off', // Mantenemos off para archivos de ejemplo
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin', // Node.js built-ins
                        'external', // npm packages
                        'internal', // Internal modules (@ paths)
                        'parent', // ../
                        'sibling', // ./
                        'index', // ./index
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],

            // Reglas de promesas
            'promise/always-return': 'warn',
            'promise/no-return-wrap': 'warn',

            // Reglas de unicorn
            'unicorn/prefer-node-protocol': 'warn',
            'unicorn/no-array-reduce': 'off',
        },
    },
];
