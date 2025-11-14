import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    replaceAliasImportDynamic,
    replaceAliasImportStatic,
} from '../src/compiler/transforms';

import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';

describe('replaceAliasImportStatic', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Primero: Restaurar variables de entorno al estado original
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;

        // Segundo: Resetear singleton para forzar recreación
        resetModuleResolutionOptimizer();

        // Tercero: Configurar variables de entorno para tests
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '@/components/*': ['/src/components/*'],
            'P@/*': ['/public/*'],
        });
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        // Resetear el singleton antes de restaurar env vars
        resetModuleResolutionOptimizer();
        // Restaurar variables de entorno
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;
    });

    it('debe retornar el código sin cambios si no hay PATH_ALIAS o PATH_DIST', async () => {
        process.env.PATH_ALIAS = '';
        process.env.PATH_DIST = '';

        const code = `import { ref } from 'vue';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(code);
    });

    it('debe transformar alias simples correctamente', async () => {
        const code = `import Button from '@/components/Button.vue';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(`import Button from '/dist/components/Button.js';`);
    });

    it('debe transformar rutas relativas agregando extensión .js', async () => {
        const code = `import utils from './utils';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(`import utils from './utils.js';`);
    });

    it('debe transformar extensiones .ts y .vue a .js', async () => {
        const code = `import Component from './Component.vue';
import helper from './helper.ts';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(`import Component from './Component.js';
import helper from './helper.js';`);
    });

    it('debe manejar imports con destructuring', async () => {
        const code = `import { useState, useEffect } from '@/utils/helpers';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(
            `import { useState, useEffect } from '/dist/utils/helpers.js';`,
        );
    });

    it('debe manejar imports con alias (as)', async () => {
        const code = `import * as Core from '@/lib/core';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(`import * as Core from '/dist/lib/core.js';`);
    });

    it('debe transformar módulos externos a rutas de node_modules', async () => {
        const code = `import Vue from 'vue';`;
        const result = await replaceAliasImportStatic('test.js', code);
        // Vue debería transformarse a su ruta ESM en node_modules
        expect(result).toContain('/node_modules/vue/');
    });

    it('debe manejar múltiples imports en el mismo archivo', async () => {
        const code = `import Header from '@/components/Header.vue';
import { api } from '@/utils/api';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(`import Header from '/dist/components/Header.js';
import { api } from '/dist/utils/api.js';`);
    });

    it('debe manejar imports con diferentes tipos de comillas', async () => {
        const code = `import config from "@/config";
import utils from '@/utils';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(`import config from "/dist/config.js";
import utils from '/dist/utils.js';`);
    });

    it('debe manejar rutas absolutas sin transformarlas', async () => {
        const code = `import config from '/absolute/path/config.js';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(code);
    });

    it('debe manejar rutas que empiezan con rutas locales conocidas sin transformarlas', async () => {
        const code = `import styles from 'src/styles/main.css';`;
        const result = await replaceAliasImportStatic('test.js', code);
        expect(result).toBe(code);
    });
});

describe('replaceAliasImportDynamic', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Primero: Restaurar variables de entorno al estado original
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;

        // Segundo: Resetear singleton para forzar recreación
        resetModuleResolutionOptimizer();

        // Tercero: Configurar variables de entorno para tests
        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '@/components/*': ['/src/components/*'],
            'P@/*': ['/public/*'],
        });
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        // Resetear el singleton antes de restaurar env vars
        resetModuleResolutionOptimizer();
        // Restaurar variables de entorno
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;
    });

    it('debe retornar el código sin cambios si no hay PATH_ALIAS o PATH_DIST', async () => {
        process.env.PATH_ALIAS = '';
        process.env.PATH_DIST = '';

        const code = `const module = import('./utils.js');`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(code);
    });

    it('debe transformar imports dinámicos con strings simples', async () => {
        const code = `const modal = import('@/components/Modal.vue');`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(
            `const modal = import('/dist/components/Modal.js');`,
        );
    });

    it('debe transformar imports dinámicos con rutas relativas', async () => {
        const code = `const utils = import('./utils');`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(`const utils = import('./utils.js');`);
    });

    it('debe transformar extensiones .ts y .vue a .js en imports dinámicos', async () => {
        const code = `const component = import('./Component.vue');
const helper = import('../helper.ts');`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(`const component = import('./Component.js');
const helper = import('../helper.js');`);
    });

    it('debe manejar template literals en imports dinámicos', async () => {
        const code = `const page = import(\`@/pages/\${pageName}.vue\`);`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(
            `const page = import(\`/dist/pages/\${pageName}.js\`);`,
        );
    });

    it('debe manejar template literals con rutas relativas', async () => {
        const code = `const module = import(\`./modules/\${name}.ts\`);`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(
            `const module = import(\`./modules/\${name}.js\`);`,
        );
    });

    it('debe manejar múltiples imports dinámicos', async () => {
        const code = `const helpers = import('@/utils/helpers');
const api = import('@/api/client');`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(`const helpers = import('/dist/utils/helpers.js');
const api = import('/dist/api/client.js');`);
    });

    it('debe transformar imports dinámicos con módulos externos', async () => {
        const code = `const vue = import('vue');`;
        const result = await replaceAliasImportDynamic(code, []);
        // Vue debería transformarse a su ruta ESM en node_modules
        expect(result).toContain('/node_modules/vue/');
    });

    it('debe manejar imports dinámicos con diferentes tipos de comillas', async () => {
        const code = `const config1 = import("@/config");
const config2 = import('@/config');`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(`const config1 = import("/dist/config.js");
const config2 = import('/dist/config.js');`);
    });

    it('debe manejar template literals complejos con múltiples variables', async () => {
        const code = `const module = import(\`./\${folder}/\${file}.ts\`);`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(
            `const module = import(\`./\${folder}/\${file}.js\`);`,
        );
    });

    it('debe manejar imports dinámicos anidados en expresiones', async () => {
        const code = `const loadComponent = async () => {
            return import('@/components/Button.vue');
        };`;
        const result = await replaceAliasImportDynamic(code, []);
        expect(result).toBe(`const loadComponent = async () => {
            return import('/dist/components/Button.js');
        };`);
    });
});
