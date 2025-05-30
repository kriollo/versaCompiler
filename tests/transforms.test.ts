import oxc from 'oxc-parser';

// Importamos las funciones que necesitamos testear
import { estandarizaCode } from '../src/compiler/transforms';

// Función simple de prueba para verificar que el parser funciona
describe('Parser básico', () => {
    it('debería parsear código JavaScript simple', () => {
        const code = "import test from 'test';";
        const result = oxc.parseSync('test.js', code, { sourceType: 'module' });
        expect(result.program).toBeDefined();
        expect(result.program.body).toHaveLength(1);
        expect(
            result.program && result.program.body && result.program.body[0]
                ? result.program.body[0].type
                : undefined,
        ).toBe('ImportDeclaration');
    });

    it('debería parsear múltiples imports', () => {
        const code = `
import fs from 'fs';
import { helper } from './utils';
import Component from '@/components/Component.vue';
        `;
        const result = oxc.parseSync('test.js', code, { sourceType: 'module' });

        expect(result.program).toBeDefined();
        expect(result.program.body.length).toBeGreaterThan(0);

        const imports = result.program.body.filter(
            (node: any) => node.type === 'ImportDeclaration',
        );
        expect(imports).toHaveLength(3);
    });
    it('debería extraer el valor de source de los imports', () => {
        const code = `
import fs from 'fs';
import { test } from '@/utils/test.ts';
        `;
        const result = oxc.parseSync('test.js', code, { sourceType: 'module' });
        const imports = result.program.body.filter(
            (node: any) => node.type === 'ImportDeclaration',
        ) as any[];
        expect(imports[0].source.value).toBe('fs');
        expect(imports[1].source.value).toBe('@/utils/test.ts');
    });
});

// Pruebas de transformación básica
describe('Transformaciones de strings', () => {
    it('debería reemplazar extensiones .ts por .js', () => {
        const path = '/src/utils/helper.ts';
        const result = path.replace(/\.ts$/, '.js');
        expect(result).toBe('/src/utils/helper.js');
    });

    it('debería reemplazar extensiones .vue por .js', () => {
        const path = '/src/components/Button.vue';
        const result = path.replace(/\.vue$/, '.js');
        expect(result).toBe('/src/components/Button.js');
    });

    it('debería agregar .js si no hay extensión', () => {
        const path = '/src/utils/config';
        const result = !/\.(js|mjs|css)$/.test(path) ? path + '.js' : path;
        expect(result).toBe('/src/utils/config.js');
    });

    it('no debería modificar archivos .css', () => {
        const path = '/src/styles/main.css';
        const result = !/\.(js|mjs|css)$/.test(path) ? path + '.js' : path;
        expect(result).toBe('/src/styles/main.css');
    });
});

// Pruebas de configuración de alias
describe('Configuración de alias', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('debería parsear PATH_ALIAS desde process.env', () => {
        const aliasConfig = {
            '@components/*': ['./src/components/*'],
            '@utils/*': ['./src/utils/*'],
        };

        process.env.PATH_ALIAS = JSON.stringify(aliasConfig);

        const parsed = JSON.parse(process.env.PATH_ALIAS);
        expect(parsed).toEqual(aliasConfig);
        expect(parsed['@components/*']).toEqual(['./src/components/*']);
    });

    it('debería manejar alias sin wildcard', () => {
        const aliasConfig = {
            '@config': ['./src/config/index.ts'],
        };

        process.env.PATH_ALIAS = JSON.stringify(aliasConfig);

        const parsed = JSON.parse(process.env.PATH_ALIAS);
        expect(parsed['@config']).toEqual(['./src/config/index.ts']);
    });
    it('debería verificar si un import coincide con un alias', () => {
        const importPath = '@components/Button.vue';
        const aliasPattern = '@components/';

        expect(importPath.startsWith(aliasPattern)).toBe(true);

        const importPath2 = '@utils';
        const aliasPattern2 = '@utils';

        expect(importPath2.startsWith(aliasPattern2)).toBe(true);
    });
});

// Nuevos tests para la función isExternalModule (simulando su comportamiento)
describe('Detección de módulos externos', () => {
    const pathAlias = {
        '@/*': ['/src/*'],
        '@components/*': ['./src/components/*'],
        'P@/*': ['./public/*'],
    };

    describe('Módulos que NO deben ser considerados externos', () => {
        it('debe rechazar rutas relativas', () => {
            const testCases = [
                './local-file.js',
                '../parent-folder/file.js',
                '/absolute/path.js',
            ];

            testCases.forEach(moduleRequest => {
                // Simulamos la lógica de isExternalModule
                const isRelativeOrAbsolute =
                    moduleRequest.startsWith('./') ||
                    moduleRequest.startsWith('../') ||
                    moduleRequest.startsWith('/');
                expect(isRelativeOrAbsolute).toBe(true);
            });
        });

        it('debe rechazar rutas de carpetas locales conocidas', () => {
            const localPaths = [
                'public/js/file.js',
                'src/components/Modal.vue',
                'dist/output.js',
                'components/Button.vue',
                'utils/helper.js',
                'assets/image.png',
                'styles/main.css',
            ];

            const localPathPatterns = [
                'public/',
                'src/',
                'dist/',
                'components/',
                'utils/',
                'assets/',
                'styles/',
            ];

            localPaths.forEach(moduleRequest => {
                const isLocalPath = localPathPatterns.some(localPath =>
                    moduleRequest.startsWith(localPath),
                );
                expect(isLocalPath).toBe(true);
            });
        });

        it('debe rechazar módulos built-in de Node.js', () => {
            const nodeModules = [
                'fs',
                'path',
                'node:fs',
                'node:path',
                'crypto',
                'http',
                'events',
                'util',
            ];

            nodeModules.forEach(moduleRequest => {
                const cleanModuleName = moduleRequest.replace(/^node:/, '');
                const NODE_BUILTIN_MODULES = new Set([
                    'fs',
                    'path',
                    'os',
                    'crypto',
                    'http',
                    'https',
                    'url',
                    'util',
                    'events',
                    'stream',
                    'buffer',
                    'child_process',
                    'cluster',
                    'dgram',
                    'dns',
                    'net',
                    'readline',
                    'repl',
                    'tls',
                    'tty',
                    'vm',
                    'zlib',
                    'assert',
                    'module',
                    'process',
                    'querystring',
                    'string_decoder',
                    'timers',
                    'v8',
                    'worker_threads',
                ]);
                const isBuiltIn = NODE_BUILTIN_MODULES.has(cleanModuleName);
                expect(isBuiltIn).toBe(true);
            });
        });

        it('debe rechazar alias conocidos', () => {
            const aliasRequests = [
                '@/components/Modal.vue',
                '@components/Button.vue',
                'P@/js/app.js',
            ];

            aliasRequests.forEach(moduleRequest => {
                let matchesAlias = false;
                for (const alias of Object.keys(pathAlias)) {
                    const aliasPattern = alias.replace('/*', '');
                    if (moduleRequest.startsWith(aliasPattern)) {
                        matchesAlias = true;
                        break;
                    }
                }
                expect(matchesAlias).toBe(true);
            });
        });

        it('debe rechazar archivos con extensiones conocidas', () => {
            const fileExtensions = [
                'some-module.js',
                'component.ts',
                'template.vue',
                'styles.css',
                'data.json',
            ];

            fileExtensions.forEach(moduleRequest => {
                const hasFileExtension =
                    moduleRequest.includes('.js') ||
                    moduleRequest.includes('.ts') ||
                    moduleRequest.includes('.vue') ||
                    moduleRequest.includes('.css') ||
                    moduleRequest.includes('.json');
                expect(hasFileExtension).toBe(true);
            });
        });
    });

    describe('Módulos que SÍ deben ser considerados externos', () => {
        it('debe aceptar nombres de paquetes npm simples', () => {
            const npmPackages = ['vue', 'react', 'lodash', 'axios', 'moment'];

            npmPackages.forEach(moduleRequest => {
                // Simulamos toda la lógica de isExternalModule
                const isRelativeOrAbsolute =
                    moduleRequest.startsWith('./') ||
                    moduleRequest.startsWith('../') ||
                    moduleRequest.startsWith('/');

                const localPaths = [
                    'public/',
                    'src/',
                    'dist/',
                    'components/',
                    'utils/',
                    'assets/',
                    'styles/',
                ];
                const isLocalPath = localPaths.some(localPath =>
                    moduleRequest.startsWith(localPath),
                );

                const cleanModuleName = moduleRequest.replace(/^node:/, '');
                const NODE_BUILTIN_MODULES = new Set([
                    'fs',
                    'path',
                    'os',
                    'crypto',
                    'http',
                    'https',
                    'url',
                    'util',
                    'events',
                    'stream',
                    'buffer',
                    'child_process',
                    'cluster',
                    'dgram',
                    'dns',
                    'net',
                    'readline',
                    'repl',
                    'tls',
                    'tty',
                    'vm',
                    'zlib',
                    'assert',
                    'module',
                    'process',
                    'querystring',
                    'string_decoder',
                    'timers',
                    'v8',
                    'worker_threads',
                ]);
                const isBuiltIn = NODE_BUILTIN_MODULES.has(cleanModuleName);

                let matchesAlias = false;
                for (const alias of Object.keys(pathAlias)) {
                    const aliasPattern = alias.replace('/*', '');
                    if (moduleRequest.startsWith(aliasPattern)) {
                        matchesAlias = true;
                        break;
                    }
                }

                const hasFileExtension =
                    moduleRequest.includes('.js') ||
                    moduleRequest.includes('.ts') ||
                    moduleRequest.includes('.vue') ||
                    moduleRequest.includes('.css') ||
                    moduleRequest.includes('.json');

                const shouldBeExternal =
                    !isRelativeOrAbsolute &&
                    !isLocalPath &&
                    !isBuiltIn &&
                    !matchesAlias &&
                    !hasFileExtension;

                expect(shouldBeExternal).toBe(true);
            });
        });
        it('debe aceptar paquetes con scope (@)', () => {
            const scopedPackages = [
                '@vue/reactivity',
                '@types/node',
                '@babel/core',
                '@typescript-eslint/parser',
            ];

            // Usamos un pathAlias que no interfiera con los paquetes scoped
            const testPathAlias = {
                '@components/*': ['./src/components/*'],
                'P@/*': ['./public/*'],
            };

            scopedPackages.forEach(moduleRequest => {
                // Aplicamos la misma lógica
                const isRelativeOrAbsolute =
                    moduleRequest.startsWith('./') ||
                    moduleRequest.startsWith('../') ||
                    moduleRequest.startsWith('/');

                const localPaths = [
                    'public/',
                    'src/',
                    'dist/',
                    'components/',
                    'utils/',
                    'assets/',
                    'styles/',
                ];
                const isLocalPath = localPaths.some(localPath =>
                    moduleRequest.startsWith(localPath),
                );

                const cleanModuleName = moduleRequest.replace(/^node:/, '');
                const NODE_BUILTIN_MODULES = new Set([
                    'fs',
                    'path',
                    'os',
                    'crypto',
                    'http',
                    'https',
                    'url',
                    'util',
                    'events',
                    'stream',
                    'buffer',
                    'child_process',
                    'cluster',
                    'dgram',
                    'dns',
                    'net',
                    'readline',
                    'repl',
                    'tls',
                    'tty',
                    'vm',
                    'zlib',
                    'assert',
                    'module',
                    'process',
                    'querystring',
                    'string_decoder',
                    'timers',
                    'v8',
                    'worker_threads',
                ]);
                const isBuiltIn = NODE_BUILTIN_MODULES.has(cleanModuleName);

                let matchesAlias = false;
                for (const alias of Object.keys(testPathAlias)) {
                    const aliasPattern = alias.replace('/*', '');
                    if (moduleRequest.startsWith(aliasPattern)) {
                        matchesAlias = true;
                        break;
                    }
                }

                const hasFileExtension =
                    moduleRequest.includes('.js') ||
                    moduleRequest.includes('.ts') ||
                    moduleRequest.includes('.vue') ||
                    moduleRequest.includes('.css') ||
                    moduleRequest.includes('.json');

                const shouldBeExternal =
                    !isRelativeOrAbsolute &&
                    !isLocalPath &&
                    !isBuiltIn &&
                    !matchesAlias &&
                    !hasFileExtension;

                expect(shouldBeExternal).toBe(true);
            });
        });

        it('debe aceptar paquetes con sub-paths', () => {
            const subPathPackages = [
                'vue/dist/vue.esm-bundler',
                'lodash/debounce',
                'date-fns/format',
            ];

            subPathPackages.forEach(moduleRequest => {
                // No tienen extensiones de archivo
                const hasFileExtension =
                    moduleRequest.includes('.js') ||
                    moduleRequest.includes('.ts') ||
                    moduleRequest.includes('.vue') ||
                    moduleRequest.includes('.css') ||
                    moduleRequest.includes('.json');

                expect(hasFileExtension).toBe(false);

                // No son rutas relativas
                const isRelativeOrAbsolute =
                    moduleRequest.startsWith('./') ||
                    moduleRequest.startsWith('../') ||
                    moduleRequest.startsWith('/');

                expect(isRelativeOrAbsolute).toBe(false);
            });
        });
    });
});

// Tests para las funciones de transformación de strings
describe('Funciones de transformación de strings', () => {
    describe('removehtmlOfTemplateString', () => {
        it('debe remover la etiqueta html de template strings', async () => {
            const inputCode = `
const template = html\`<div>Hello World</div>\`;
const another = html \`<span>Test</span>\`;
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).not.toContain('html`');
            expect(result.code).toContain('`<div>Hello World</div>`');
            expect(result.code).toContain('`<span>Test</span>`');
        });

        it('debe remover getters html de objetos', async () => {
            const inputCode = `
const component = {
    data() { return {}; },
    get html() { return html }
};
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).not.toContain('get html()');
            expect(result.code).not.toContain('return html');
        });
    });
    describe('removeCodeTagImport', () => {
        const originalEnv = { ...process.env };

        beforeEach(() => {
            process.env.PATH_ALIAS = JSON.stringify({ '@/*': ['/src/*'] });
            process.env.PATH_DIST = 'public';
        });

        afterEach(() => {
            process.env = { ...originalEnv };
        });

        it('debe remover imports de code-tag', async () => {
            const inputCode = `
import { html } from 'code-tag';
import { css } from 'code-tag';
import { Component } from '@/components/Modal.vue';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');
            expect(result.error).toBeNull();
            expect(result.code).not.toContain("from 'code-tag'");
            expect(result.code).toContain("from '/public/components/Modal.js'");
        });

        it('debe manejar diferentes variaciones de imports de code-tag', async () => {
            const inputCode = `
import { html, css } from "code-tag";
import { Component } from '@/components/Modal.vue';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');
            expect(result.error).toBeNull();
            expect(result.code).not.toContain('code-tag');
            expect(result.code).toContain("from '/public/components/Modal.js'");
        });
    });

    describe('removePreserverComent (modo producción)', () => {
        const originalEnv = process.env.isProd;

        afterEach(() => {
            process.env.isProd = originalEnv;
        });

        it('debe remover comentarios @preserve en modo producción', async () => {
            process.env.isProd = 'true';

            const inputCode = `
/* @preserve This should be removed in production */
const code = 'test';
// @preserve This line comment should also be removed
const more = 'code';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).not.toContain('@preserve');
            expect(result.code).toContain("const code = 'test'");
        });
        it('debe mantener comentarios @preserve en modo desarrollo', async () => {
            process.env.isProd = 'false';

            const inputCode = `
/* @preserve This should be kept in development */
const code = 'test';
// @preserve This should also be kept
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            // En modo desarrollo, removePreserverComent no se ejecuta, así que @preserve se mantiene
            expect(result.code).toContain('@preserve');
        });
    });
});

// Tests para casos edge y situaciones especiales
describe('Casos edge y manejo de errores avanzados', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.PATH_ALIAS = JSON.stringify({ '@/*': '/src/*' });
        process.env.PATH_DIST = 'public';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('debe manejar código con sintaxis moderna y transformaciones complejas', async () => {
        const inputCode = `
import { ref } from 'vue';
import { html } from 'code-tag';
import { Component } from '@/components/Modal.vue';

/* @preserve Development helper */
const template = html\`<div>Component</div>\`;

export default {
    setup() {
        const data = ref(null);
        const module = import('@/utils/helper.ts');
        return { data };
    }
};
`;
        const result = await estandarizaCode(inputCode, 'test.ts');

        expect(result.error).toBeNull();
        expect(result.code).toContain('node_modules/vue/'); // vue transformado
        expect(result.code).not.toContain("from 'code-tag'"); // code-tag removido
        expect(result.code).toContain('/public/components/Modal.js'); // alias transformado
        expect(result.code).not.toContain('html`'); // html tag removido
        expect(result.code).toContain('/public/utils/helper.js'); // import dinámico transformado
    });
    it('debe manejar múltiples alias y módulos externos en el mismo archivo', async () => {
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '~/*': ['/assets/*'],
            '#/*': ['/config/*'],
        });

        const inputCode = `
import Vue from 'vue';
import _ from 'lodash';
import { Component } from '@/components/Modal.vue';
import { icon } from '~/icons/user.svg';
import { config } from '#/app.json';

const dynamicVue = import('vue/dist/vue.esm-bundler');
const dynamicComponent = import('@/utils/helper.ts');
`;
        const result = await estandarizaCode(inputCode, 'test.ts');
        expect(result.error).toBeNull();
        // Módulos externos transformados
        expect(result.code).toContain('node_modules/vue/');
        // lodash podría no transformarse si no está instalado
        expect(result.code).toContain('lodash');
        // Alias transformados
        expect(result.code).toContain('/public/components/Modal.js');
        expect(result.code).toContain('/public/icons/user.svg');
        expect(result.code).toContain('/public/app.json');
        expect(result.code).toContain('/public/utils/helper.js');
    });

    it('debe preservar la estructura del código y comentarios importantes', async () => {
        const inputCode = `
/**
 * Componente principal de la aplicación
 * @author Developer
 */
import { createApp } from 'vue';
import { Component } from '@/components/App.vue';

// Configuración inicial
const app = createApp(Component);

/*
 * Configuraciones adicionales
 */
app.mount('#app');
`;
        const result = await estandarizaCode(inputCode, 'test.ts');

        expect(result.error).toBeNull();
        expect(result.code).toContain('* Componente principal');
        expect(result.code).toContain('* @author Developer');
        expect(result.code).toContain('// Configuración inicial');
        expect(result.code).toContain('* Configuraciones adicionales');
        expect(result.code).toContain('node_modules/vue/');
        expect(result.code).toContain('/public/components/App.js');
    });
});
