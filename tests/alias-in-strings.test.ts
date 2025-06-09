// Test específico para verificar la transformación de alias en strings
import { env } from 'node:process';
import { estandarizaCode } from '../src/compiler/transforms';

describe('Verificación de alias en strings', () => {
    const originalEnv = {
        PATH_ALIAS: env.PATH_ALIAS,
        PATH_DIST: env.PATH_DIST,
    };

    beforeAll(() => {
        // Configurar variables de entorno para el test
        env.PATH_ALIAS = JSON.stringify({
            'P@/*': '/public/*',
            '@/*': '/src/*',
        });
        env.PATH_DIST = 'dist';
    });

    afterAll(() => {
        // Restaurar variables de entorno
        env.PATH_ALIAS = originalEnv.PATH_ALIAS;
        env.PATH_DIST = originalEnv.PATH_DIST;
    });

    test('debe transformar alias en strings de propiedades', async () => {
        const inputCode = `
const loadSwallCss = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'P@/vendor/sweetalert2/sweetalert2.dark.min.css';
    document.head.appendChild(link);
};`;

        const result = await estandarizaCode(inputCode, 'test.js');

        console.log('Código transformado:', result.code);
        expect(result.error).toBeNull();
        expect(result.code).toContain(
            '/public/vendor/sweetalert2/sweetalert2.dark.min.css',
        );
        expect(result.code).not.toContain('P@/vendor');
    });

    test('debe transformar alias con @ en strings', async () => {
        const inputCode = `
const imagePath = '@/assets/images/logo.png';
const stylePath = '@/styles/main.css';
`;

        const result = await estandarizaCode(inputCode, 'test.js');

        console.log('Código con @ transformado:', result.code);
        expect(result.error).toBeNull();
        expect(result.code).toContain('/src/assets/images/logo.png');
        expect(result.code).toContain('/src/styles/main.css');
        expect(result.code).not.toContain('@/assets');
        expect(result.code).not.toContain('@/styles');
    });

    test('debe manejar diferentes tipos de comillas', async () => {
        const inputCode = `
const singleQuote = 'P@/vendor/style.css';
const doubleQuote = "P@/vendor/script.js";
const backtick = \`P@/vendor/template.html\`;
`;

        const result = await estandarizaCode(inputCode, 'test.js');

        console.log('Diferentes comillas transformadas:', result.code);
        expect(result.error).toBeNull();
        expect(result.code).toContain('/public/vendor/style.css');
        expect(result.code).toContain('/public/vendor/script.js');
        expect(result.code).toContain('/public/vendor/template.html');
        expect(result.code).not.toContain('P@/vendor');
    });

    test('debe preservar strings sin alias', async () => {
        const inputCode = `
const normalString = 'normal/path/file.css';
const absoluteString = '/absolute/path/file.js';
const relativeString = './relative/path/file.png';
`;

        const result = await estandarizaCode(inputCode, 'test.js');
        expect(result.error).toBeNull();
        expect(result.code).toContain('normal/path/file.css');
        expect(result.code).toContain('/absolute/path/file.js');
        expect(result.code).toContain('./relative/path/file.png');
    });

    test('Debug: P@ alias duplicación', async () => {
        // Configuración exacta como en versacompile.config.ts
        env.PATH_ALIAS = JSON.stringify({
            '@/*': ['examples/*'],
            'P@/*': ['public/*'],
            'e@/*': ['examples/*'],
        });
        env.PATH_DIST = 'public';
        env.VERBOSE = 'true';

        const code = `const loadSwallCss = () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'P@/vendor/sweetalert2/sweetalert2.dark.min.css';
    document.head.appendChild(link);
};`;

        console.log('\n🔍 DEBUG - Configuración:');
        console.log('PATH_ALIAS:', env.PATH_ALIAS);
        console.log('PATH_DIST:', env.PATH_DIST);
        console.log('\n📝 DEBUG - Código original:');
        console.log(code);

        const result = await estandarizaCode(code, 'test-debug.js');

        console.log('\n✅ DEBUG - Código transformado:');
        console.log(result.code);

        // Verificar que no hay duplicación
        expect(result.code).not.toContain('/public/public/');
        expect(result.code).toContain('/public/vendor/');
    });
});
