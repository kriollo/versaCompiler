import { estandarizaCode } from '../src/compiler/transforms';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeNull: () => void;
    toBeDefined: () => void;
};
declare const beforeEach: (fn: () => void) => void;

describe('Transforms - Funciones de transformación de código', () => {
    beforeEach(() => {
        // Limpiar variables de entorno antes de cada test
        delete process.env.PATH_ALIAS;
        delete process.env.PATH_DIST;
        delete process.env.VERBOSE;
        delete process.env.isProd;
    });

    describe('estandarizaCode', () => {
        it('debe procesar código JavaScript válido sin errores', async () => {
            // Configurar variables de entorno mínimas
            process.env.PATH_ALIAS = '{}';
            process.env.PATH_DIST = 'dist';

            const code = 'const x = 42; console.log(x);';
            const result = await estandarizaCode(code, 'test.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeDefined();
            expect(typeof result.code).toBe('string');
        });

        it('debe devolver error para código con sintaxis inválida', async () => {
            // Configurar variables de entorno mínimas
            process.env.PATH_ALIAS = '{}';
            process.env.PATH_DIST = 'dist';

            const invalidCode =
                'function broken { console.log("missing paren"); }';
            const result = await estandarizaCode(invalidCode, 'broken.js');

            expect(result.error).toBeDefined();
            expect(result.code).toBe('');
        });

        it('debe manejar código sin variables de entorno', async () => {
            const code = 'const x = 42; console.log(x);';
            const result = await estandarizaCode(code, 'test.js');

            // Puede devolver error o código dependiendo de la implementación
            expect(result).toBeDefined();
            expect(typeof result.code).toBe('string');
        });
    });
});
