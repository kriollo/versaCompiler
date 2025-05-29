import oxc from 'oxc-parser';

// Función simple de prueba para verificar que el parser funciona
describe('Parser básico', () => {
    it('debería parsear código JavaScript simple', () => {
        const code = "import test from 'test';";
        const result = oxc.parseSync('test.js', code, { sourceType: 'module' });

        expect(result.program).toBeDefined();
        expect(result.program.body).toHaveLength(1);
        expect(result.program.body[0].type).toBe('ImportDeclaration');
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
        const aliasConfig = {
            '@components/*': ['./src/components/*'],
            '@utils': ['./src/utils/index.ts'],
        };

        const importPath = '@components/Button.vue';
        const aliasPattern = '@components/';

        expect(importPath.startsWith(aliasPattern)).toBe(true);

        const importPath2 = '@utils';
        const aliasPattern2 = '@utils';

        expect(importPath2.startsWith(aliasPattern2)).toBe(true);
    });
});
