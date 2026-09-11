import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { estandarizaCode } from '../src/compiler/transforms';

import { resetModuleResolutionOptimizer } from '../src/compiler/module-resolution-optimizer';

// Estos tests ejercitan la resolución de alias/imports vía estandarizaCode(),
// que es la función que realmente corre en el pipeline de compilación
// (llama internamente a replaceAliasImportsAst para imports estáticos y a
// replaceAliasInStrings para imports dinámicos). Las funciones
// replaceAliasImportStatic/replaceAliasImportDynamic que este archivo testeaba
// antes no tenían ningún caller en src/ — quedaban sin ejercitar en producción.
describe('estandarizaCode - resolución de alias en imports estáticos', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;

        resetModuleResolutionOptimizer();

        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '@/components/*': ['/src/components/*'],
            'P@/*': ['/public/*'],
        });
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;
    });

    it('debe transformar alias simples correctamente', async () => {
        const code = `import Button from '@/components/Button.vue';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.error).toBeNull();
        expect(result.code).toBe(
            `import Button from '/dist/components/Button.js';`,
        );
    });

    it('debe transformar rutas relativas agregando extensión .js', async () => {
        const code = `import utils from './utils';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`import utils from './utils.js';`);
    });

    it('debe transformar extensiones .ts y .vue a .js', async () => {
        const code = `import Component from './Component.vue';
import helper from './helper.ts';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`import Component from './Component.js';
import helper from './helper.js';`);
    });

    it('debe manejar imports con destructuring', async () => {
        const code = `import { useState, useEffect } from '@/utils/helpers';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(
            `import { useState, useEffect } from '/dist/utils/helpers.js';`,
        );
    });

    it('debe manejar imports con alias (as)', async () => {
        const code = `import * as Core from '@/lib/core';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`import * as Core from '/dist/lib/core.js';`);
    });

    it('debe transformar módulos externos a rutas de node_modules', async () => {
        const code = `import Vue from 'vue';`;
        const result = await estandarizaCode(code, 'test.js');
        // Vue debería transformarse a su ruta ESM en node_modules
        expect(result.code).toContain('/node_modules/vue/');
    });

    it('debe manejar múltiples imports en el mismo archivo', async () => {
        const code = `import Header from '@/components/Header.vue';
import { api } from '@/utils/api';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code)
            .toBe(`import Header from '/dist/components/Header.js';
import { api } from '/dist/utils/api.js';`);
    });

    it('debe manejar imports con diferentes tipos de comillas', async () => {
        const code = `import config from "@/config";
import utils from '@/utils';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`import config from "/dist/config.js";
import utils from '/dist/utils.js';`);
    });

    it('debe manejar rutas absolutas sin transformarlas', async () => {
        const code = `import config from '/absolute/path/config.js';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(code);
    });

    it('debe manejar rutas que empiezan con rutas locales conocidas sin transformarlas', async () => {
        const code = `import styles from 'src/styles/main.css';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(code);
    });
});

describe('estandarizaCode - resolución de alias en imports dinámicos', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;

        resetModuleResolutionOptimizer();

        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            '@/components/*': ['/src/components/*'],
            'P@/*': ['/public/*'],
        });
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;
    });

    it('debe transformar imports dinámicos con strings simples', async () => {
        const code = `const modal = import('@/components/Modal.vue');`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(
            `const modal = import('/dist/components/Modal.js');`,
        );
    });

    it('debe transformar imports dinámicos con rutas relativas', async () => {
        const code = `const utils = import('./utils');`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`const utils = import('./utils.js');`);
    });

    it('debe transformar extensiones .ts y .vue a .js en imports dinámicos', async () => {
        const code = `const component = import('./Component.vue');
const helper = import('../helper.ts');`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`const component = import('./Component.js');
const helper = import('../helper.js');`);
    });

    it('debe manejar múltiples imports dinámicos', async () => {
        const code = `const helpers = import('@/utils/helpers');
const api = import('@/api/client');`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code)
            .toBe(`const helpers = import('/dist/utils/helpers.js');
const api = import('/dist/api/client.js');`);
    });

    it('debe transformar imports dinámicos con módulos externos', async () => {
        const code = `const vue = import('vue');`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toContain('/node_modules/vue/');
    });

    it('debe manejar imports dinámicos con diferentes tipos de comillas', async () => {
        const code = `const config1 = import("@/config");
const config2 = import('@/config');`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`const config1 = import("/dist/config.js");
const config2 = import('/dist/config.js');`);
    });

    it('debe manejar imports dinámicos anidados en expresiones', async () => {
        const code = `const loadComponent = async () => {
    return import('@/components/Button.vue');
};`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(`const loadComponent = async () => {
    return import('/dist/components/Button.js');
};`);
    });

    // ⚠️ Gap conocido: a diferencia de los imports estáticos (resueltos vía AST
    // en replaceAliasImportsAst, que sí soporta template literals con
    // interpolación a través de resolveAliasTemplateLiteral), los imports
    // dinámicos con template literal pasan por replaceAliasInStrings, que
    // resuelve el prefijo de alias pero NO reescribe la extensión (.vue/.ts →
    // .js) cuando el string contiene `${...}`. Este test documenta el
    // comportamiento actual (no lo valida como el ideal).
    it('[gap conocido] resuelve el alias pero no la extensión en imports dinámicos con template literal interpolado', async () => {
        const code = 'const page = import(`@/pages/${pageName}.vue`);';
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(
            'const page = import(`/dist/pages/${pageName}.vue`);',
        );
    });
});

describe('estandarizaCode - replaceAliasInStrings solo toca literales reales (AST)', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;

        resetModuleResolutionOptimizer();

        process.env.PATH_ALIAS = JSON.stringify({
            '@/*': ['/src/*'],
            'P@/*': ['/public/*'],
        });
        process.env.PATH_DIST = 'dist';
        process.env.VERBOSE = 'false';
    });

    afterEach(() => {
        resetModuleResolutionOptimizer();
        process.env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        process.env.PATH_DIST = originalEnv.PATH_DIST;
        process.env.VERBOSE = originalEnv.VERBOSE;
    });

    it('resuelve un alias usado como asset href fuera de un import', async () => {
        const code = `link.href = 'P@/vendor/sweetalert2/sweetalert2.dark.min.css';`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(
            `link.href = '/dist/vendor/sweetalert2/sweetalert2.dark.min.css';`,
        );
    });

    it('NO corrompe un comentario que contiene texto con el mismo prefijo de alias', async () => {
        const code = `// ver "@/foo/bar" para más detalles\nconst x = 1;`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(code);
    });

    it('NO toca un regex literal cuyo patrón empieza con el prefijo de alias', async () => {
        const code = String.raw`const re = /@\/foo/;`;
        const result = await estandarizaCode(code, 'test.js');
        expect(result.code).toBe(code);
    });

    it('NO corrompe un string de datos de usuario que por coincidencia empieza con el alias', async () => {
        const code = `const mention = '@/notarealpath-but-looks-like-one';`;
        const result = await estandarizaCode(code, 'test.js');
        // "@/notarealpath..." SÍ matchea el patrón de alias (empieza con "@/"),
        // así que efectivamente se resuelve como ruta — este test documenta
        // que el límite real de seguridad es "¿es un literal de string real
        // según el AST?" (sí lo es, se transforma), no "¿es semánticamente
        // una ruta?" (eso no es decidible). El fix evita el caso peor:
        // tocar contenido que NI SIQUIERA es un string real (comentarios,
        // regex), cubierto por los dos tests anteriores.
        expect(result.code).toBe(
            `const mention = '/dist/notarealpath-but-looks-like-one';`,
        );
    });
});
