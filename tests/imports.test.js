/**
 * Tests completos para el sistema de transformación de imports
 * Cubre todos los casos: estáticos, dinámicos, literals, template literals, etc.
 */

import { estandarizaCode } from '../dist/compiler/transforms.ts';

// Configurar variables de entorno para las pruebas
const setupEnv = () => {
    process.env.PATH_ALIAS = JSON.stringify({ "@/*": "/src/*" });
    process.env.PATH_DIST = "public";
};

const cleanupEnv = () => {
    delete process.env.PATH_ALIAS;
    delete process.env.PATH_DIST;
};

describe('Sistema de transformación de imports', () => {
    beforeEach(() => {
        setupEnv();
    });

    afterEach(() => {
        cleanupEnv();
    });

    describe('Imports estáticos (replaceAliasImportStatic)', () => {
        test('debe transformar import básico con alias @/', async () => {
            const inputCode = `import { Component } from '@/components/modal.vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { Component } from '/public/components/modal.js';`);
        });

        test('debe transformar múltiples imports con diferentes alias', async () => {
            const inputCode = `
import { Component } from '@/components/modal.vue';
import { utils } from '@/utils/helper.ts';
import { config } from '@/config/app.js';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/components/modal.js');
            expect(result.code).toContain('/public/utils/helper.js');
            expect(result.code).toContain('/public/config/app.js');
        });

        test('debe transformar extensiones .ts a .js', async () => {
            const inputCode = `import { helper } from '@/utils/helper.ts';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { helper } from '/public/utils/helper.js';`);
        });

        test('debe transformar extensiones .vue a .js', async () => {
            const inputCode = `import Modal from '@/components/modal.vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import Modal from '/public/components/modal.js';`);
        });

        test('debe añadir .js a imports sin extensión', async () => {
            const inputCode = `import { helper } from '@/utils/helper';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { helper } from '/public/utils/helper.js';`);
        });

        test('debe mantener imports que ya tienen extensión .js', async () => {
            const inputCode = `import { helper } from '@/utils/helper.js';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { helper } from '/public/utils/helper.js';`);
        });

        test('no debe transformar imports relativos', async () => {
            const inputCode = `import { helper } from './utils/helper.ts';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { helper } from './utils/helper.ts';`);
        });

        test('no debe transformar imports externos (node_modules)', async () => {
            const inputCode = `import { ref } from 'vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            // No debe cambiar porque vue es una librería externa
            expect(result.code).toBe(`import { ref } from 'vue';`);
        });

        test('debe manejar diferentes tipos de imports estáticos', async () => {
            const inputCode = `
import defaultExport from '@/components/default.vue';
import { namedExport } from '@/utils/named.ts';
import { multiple, exports } from '@/utils/multiple.ts';
import * as namespace from '@/utils/namespace.ts';
import '@/styles/global.css';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/components/default.js');
            expect(result.code).toContain('/public/utils/named.js');
            expect(result.code).toContain('/public/utils/multiple.js');
            expect(result.code).toContain('/public/utils/namespace.js');
            expect(result.code).toContain('/public/styles/global.css');
        });
    });

    describe('Imports dinámicos simples (literals)', () => {
        test('debe transformar import dinámico básico', async () => {
            const inputCode = `const component = await import('@/components/modal.vue');`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`const component = await import('/public/components/modal.js');`);
        });

        test('debe transformar import dinámico sin await', async () => {
            const inputCode = `const component = import('@/components/modal.vue');`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`const component = import('/public/components/modal.js');`);
        });

        test('debe transformar múltiples imports dinámicos', async () => {
            const inputCode = `
const modal = await import('@/components/modal.vue');
const utils = import('@/utils/helper.ts');
const config = import('@/config/app.js');
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/components/modal.js');
            expect(result.code).toContain('/public/utils/helper.js');
            expect(result.code).toContain('/public/config/app.js');
        });
    });

    describe('Imports dinámicos con template literals', () => {
        test('debe transformar template literal con variable al inicio', async () => {
            const inputCode = `await import(\`@/\${module}.js\`);`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`await import(\`/public/\${module}.js\`);`);
        });

        test('debe transformar template literal complejo con cache busting', async () => {
            const inputCode = `await import(\`@/\${module}.js?v=\${Date.now()}\`);`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`await import(\`/public/\${module}.js?v=\${Date.now()}\`);`);
        });

        test('debe transformar template literal con subdirectorio', async () => {
            const inputCode = `await import(\`@/components/\${name}.vue\`);`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`await import(\`/public/components/\${name}.vue\`);`);
        });

        test('debe transformar múltiples template literals', async () => {
            const inputCode = `
const modal = await import(\`@/components/\${componentName}.vue\`);
const utils = import(\`@/utils/\${utilName}.ts\`);
const config = import(\`@/config/\${env}.js?v=\${version}\`);
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain(`/public/components/\${componentName}.vue`);
            expect(result.code).toContain(`/public/utils/\${utilName}.ts`);
            expect(result.code).toContain(`/public/config/\${env}.js?v=\${version}`);
        });

        test('no debe transformar template literals que no empiecen con alias', async () => {
            const inputCode = `await import(\`./components/\${name}.vue\`);`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`await import(\`./components/\${name}.vue\`);`);
        });

        test('debe manejar template literals con expresiones complejas', async () => {
            const inputCode = `
await import(\`@/modules/\${type}/\${name}.vue?v=\${Date.now()}&cache=\${Math.random()}\`);
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain(`/public/modules/\${type}/\${name}.vue?v=\${Date.now()}&cache=\${Math.random()}`);
        });
    });

    describe('Casos mixtos y complejos', () => {
        test('debe manejar código con imports estáticos y dinámicos mezclados', async () => {
            const inputCode = `
import { ref } from 'vue';
import { helper } from '@/utils/helper.ts';

async function loadComponent(name) {
    const component = await import(\`@/components/\${name}.vue\`);
    const utils = import('@/utils/runtime.js');
    return { component, utils };
}
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain(`from '/public/utils/helper.js'`);
            expect(result.code).toContain(`/public/components/\${name}.vue`);
            expect(result.code).toContain(`'/public/utils/runtime.js'`);
            expect(result.code).toContain(`from 'vue'`); // Sin transformar
        });

        test('debe preservar comentarios y espacios', async () => {
            const inputCode = `
// Import principal
import { Component } from '@/components/modal.vue';

/*
 * Import dinámico con comentario
 */
const dynamic = await import('@/utils/helper.ts');
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('// Import principal');
            expect(result.code).toContain('* Import dinámico con comentario');
            expect(result.code).toContain('/public/components/modal.js');
            expect(result.code).toContain('/public/utils/helper.js');
        });

        test('debe manejar strings con caracteres especiales', async () => {
            const inputCode = `
import { component } from '@/components/special-name_v2.vue';
const dynamic = await import(\`@/utils/helper-\${version}_final.ts\`);
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/components/special-name_v2.js');
            expect(result.code).toContain(`/public/utils/helper-\${version}_final.ts`);
        });
    });

    describe('Configuración de variables de entorno', () => {
        test('no debe transformar cuando PATH_ALIAS no está definido', async () => {
            delete process.env.PATH_ALIAS;

            const inputCode = `import { Component } from '@/components/modal.vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { Component } from '@/components/modal.vue';`);
        });

        test('debe usar PATH_DIST correctamente', async () => {
            process.env.PATH_DIST = "build";

            const inputCode = `import { Component } from '@/components/modal.vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`import { Component } from '/build/components/modal.js';`);
        });

        test('debe manejar PATH_ALIAS con múltiples alias', async () => {
            process.env.PATH_ALIAS = JSON.stringify({
                "@/*": "/src/*",
                "~/*": "/assets/*"
            });

            const inputCode = `
import { Component } from '@/components/modal.vue';
import { image } from '~/images/logo.png';
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/components/modal.js');
            expect(result.code).toContain('/public/images/logo.png');
        });
    });

    describe('Manejo de errores', () => {
        test('debe manejar código con errores de sintaxis', async () => {
            const inputCode = `import { Component from '@/components/modal.vue'; // Sintaxis incorrecta`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).not.toBeNull();
            expect(result.code).toBe('');
        });

        test('debe manejar PATH_ALIAS malformado', async () => {
            process.env.PATH_ALIAS = 'invalid json';

            const inputCode = `import { Component } from '@/components/modal.vue';`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).not.toBeNull();
        });
    });

    describe('Casos del mundo real', () => {
        test('debe manejar el caso del vue-loader.js', async () => {
            const inputCode = `await import(\`@/\${module}.js?v=\${Date.now()}\`);`;
            const result = await estandarizaCode(inputCode, 'vue-loader.js');

            expect(result.error).toBeNull();
            expect(result.code).toBe(`await import(\`/public/\${module}.js?v=\${Date.now()}\`);`);
        });

        test('debe manejar imports condicionales', async () => {
            const inputCode = `
if (isDev) {
    const devUtils = await import('@/utils/dev.ts');
} else {
    const prodUtils = await import('@/utils/prod.ts');
}
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain('/public/utils/dev.js');
            expect(result.code).toContain('/public/utils/prod.js');
        });

        test('debe manejar imports en funciones async', async () => {
            const inputCode = `
async function loadModule(name) {
    try {
        const module = await import(\`@/modules/\${name}.vue\`);
        return module.default;
    } catch (error) {
        const fallback = await import('@/components/fallback.vue');
        return fallback.default;
    }
}
`;
            const result = await estandarizaCode(inputCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.code).toContain(`/public/modules/\${name}.vue`);
            expect(result.code).toContain('/public/components/fallback.js');
        });
    });
});
