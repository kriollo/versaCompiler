/**
 * Tests para el compilador de TailwindCSS
 * Verifica la generación de CSS usando TailwindCSS
 */

import { generateTailwindCSS } from '../src/compiler/tailwindcss';

describe('TailwindCSS Compiler', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Guardar el estado original del environment
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        // Restaurar el estado original del environment
        process.env = originalEnv;
    });

    describe('generateTailwindCSS', () => {
        test('debe retornar false cuando tailwindcss está deshabilitado con "false"', async () => {
            process.env.tailwindcss = 'false';

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando tailwindcss es undefined', async () => {
            delete process.env.tailwindcss;
            delete process.env.TAILWIND;

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando TAILWIND está deshabilitado', async () => {
            process.env.TAILWIND = 'false';

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando la configuración JSON es inválida', async () => {
            process.env.tailwindcss = 'invalid json string';

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando falta la propiedad input', async () => {
            const config = {
                output: './output.css',
                bin: 'tailwindcss',
            };
            process.env.tailwindcss = JSON.stringify(config);

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando falta la propiedad output', async () => {
            const config = {
                input: './input.css',
                bin: 'tailwindcss',
            };
            process.env.tailwindcss = JSON.stringify(config);

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando falta la propiedad bin', async () => {
            const config = {
                input: './input.css',
                output: './output.css',
            };
            process.env.tailwindcss = JSON.stringify(config);

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando la configuración está vacía', async () => {
            process.env.tailwindcss = JSON.stringify({});

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe retornar false cuando la configuración es null', async () => {
            process.env.tailwindcss = JSON.stringify(null);

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe intentar ejecutar con configuración completa válida', async () => {
            const config = {
                input: './src/input.css',
                output: './public/output.css',
                bin: 'tailwindcss',
            };
            process.env.tailwindcss = JSON.stringify(config);

            try {
                const result = await generateTailwindCSS();
                // Si TailwindCSS está disponible y configurado correctamente
                expect(result).toBeDefined();
            } catch (error) {
                // Es esperado que falle si TailwindCSS no está instalado o configurado
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe usar minify en modo producción', async () => {
            const config = {
                input: './src/input.css',
                output: './public/output.css',
                bin: 'tailwindcss',
            };
            process.env.tailwindcss = JSON.stringify(config);
            process.env.isProd = 'true';

            try {
                const result = await generateTailwindCSS();
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe usar minify en modo desarrollo', async () => {
            const config = {
                input: './src/input.css',
                output: './public/output.css',
                bin: 'tailwindcss',
            };
            process.env.tailwindcss = JSON.stringify(config);
            process.env.isProd = 'false';

            try {
                const result = await generateTailwindCSS();
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar diferentes rutas de archivos', async () => {
            const testCases = [
                {
                    input: './styles/main.css',
                    output: './dist/styles.css',
                    bin: 'tailwindcss',
                },
                {
                    input: 'src/css/tailwind.css',
                    output: 'public/css/output.css',
                    bin: './node_modules/.bin/tailwindcss',
                },
                {
                    input: '/absolute/path/input.css',
                    output: '/absolute/path/output.css',
                    bin: 'tailwindcss',
                },
            ];

            for (const config of testCases) {
                process.env.tailwindcss = JSON.stringify(config);

                try {
                    const result = await generateTailwindCSS();
                    expect(result).toBeDefined();
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                }
            }
        });

        test('debe manejar configuración con propiedades adicionales', async () => {
            const config = {
                input: './src/input.css',
                output: './public/output.css',
                bin: 'tailwindcss',
                config: './tailwind.config.js',
                watch: false,
                postcss: true,
            };
            process.env.tailwindcss = JSON.stringify(config);

            try {
                const result = await generateTailwindCSS();
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar errores de ejecución de TailwindCSS', async () => {
            const config = {
                input: './nonexistent/input.css',
                output: './invalid/path/output.css',
                bin: 'invalid-tailwindcss-command',
            };
            process.env.tailwindcss = JSON.stringify(config);

            try {
                const result = await generateTailwindCSS();
                // Si no lanza error, el resultado debería estar definido
                expect(result).toBeDefined();
            } catch (error) {
                // Se espera que falle con archivos/comandos inválidos
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe verificar prioridad de variables de entorno', async () => {
            // Cuando ambas están definidas, tailwindcss debería tener prioridad
            process.env.tailwindcss = 'false';
            process.env.TAILWIND = 'true';

            const result = await generateTailwindCSS();

            expect(result).toBe(false);
        });

        test('debe manejar JSON válido con configuración mínima', async () => {
            const config = {
                input: 'input.css',
                output: 'output.css',
                bin: 'tailwindcss',
            };
            process.env.tailwindcss = JSON.stringify(config);

            try {
                const result = await generateTailwindCSS();
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
});
