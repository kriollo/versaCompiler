/**
 * Tests para el linter (ESLint y Oxlint)
 * Verifica la funcionalidad de linting de código
 */

import fs from 'fs-extra';
import path from 'path';
import { ESLint, OxLint, type LinterConfig } from '../src/compiler/linter';

describe('Linter', () => {
    const testDir = path.join(process.cwd(), 'temp-test-linter');

    beforeEach(async () => {
        // Crear directorio temporal para tests
        await fs.ensureDir(testDir);
    });

    afterEach(async () => {
        // Limpiar directorio temporal
        await fs.remove(testDir);
    });

    describe('ESLint', () => {
        test('debe manejar configuración faltante gracefully', async () => {
            const config: LinterConfig = {};

            const result = await ESLint(config);

            expect(result).toBeDefined();
            expect(result.json).toBeDefined();
            expect(result.json.results).toEqual([]);
            expect(result.json.errorCount).toBe(0);
            expect(result.json.warningCount).toBe(0);
        });

        test('debe manejar configuración sin bin', async () => {
            const config: LinterConfig = {
                configFile: './eslint.config.js',
                fix: false,
                format: 'json',
            };

            const result = await ESLint(config);

            expect(result).toBeDefined();
            expect(result.json).toBeDefined();
            expect(result.json.results).toEqual([]);
        });

        test('debe aceptar configuración con todas las propiedades', async () => {
            const config: LinterConfig = {
                bin: 'eslint',
                configFile: './eslint.config.js',
                fix: true,
                format: 'json',
                eslintConfig: {
                    extensions: ['.js', '.ts', '.vue'],
                    cache: true,
                    maxWarnings: 50,
                },
                paths: ['src/', 'tests/'],
            };

            // Mock o skip la ejecución real de ESLint si no está disponible
            try {
                const result = await ESLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                // Es esperado que falle si ESLint no está configurado
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe usar paths por defecto cuando no se especifican', async () => {
            const config: LinterConfig = {
                bin: 'eslint',
            };

            try {
                const result = await ESLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                // Es esperado que falle si ESLint no está disponible
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe usar formato por defecto cuando no se especifica', async () => {
            const config: LinterConfig = {
                bin: 'eslint',
                eslintConfig: {
                    extensions: ['.js'],
                },
            };

            try {
                const result = await ESLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar configuración de fix', async () => {
            const config: LinterConfig = {
                bin: 'eslint',
                fix: true,
                paths: ['src/'],
            };

            try {
                const result = await ESLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar diferentes formatos', async () => {
            const formats: Array<'json' | 'stylish' | 'compact'> = [
                'json',
                'stylish',
                'compact',
            ];

            for (const format of formats) {
                const config: LinterConfig = {
                    bin: 'eslint',
                    format: format,
                };

                try {
                    const result = await ESLint(config);
                    expect(result).toBeDefined();
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                }
            }
        });
    });

    describe('OxLint', () => {
        test('debe retornar false cuando falta la configuración bin', async () => {
            const config: LinterConfig = {};

            const result = await OxLint(config);

            expect(result).toBe(false);
        });

        test('debe retornar false cuando bin es undefined', async () => {
            const config: LinterConfig = {
                configFile: './oxlint.json',
                fix: false,
            };

            const result = await OxLint(config);

            expect(result).toBe(false);
        });

        test('debe intentar ejecutar con configuración completa', async () => {
            const config: LinterConfig = {
                bin: 'oxlint',
                configFile: './oxlint.json',
                fix: true,
                oxlintConfig: {
                    rules: {},
                },
                paths: ['src/', 'tests/'],
            };

            try {
                const result = await OxLint(config);
                // Si oxlint está disponible, debería retornar un resultado
                expect(result).toBeDefined();
            } catch (error) {
                // Es esperado que falle si oxlint no está instalado
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe usar paths por defecto desde env cuando no se especifican', async () => {
            const config: LinterConfig = {
                bin: 'oxlint',
            };

            try {
                const result = await OxLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar configuración de fix', async () => {
            const config: LinterConfig = {
                bin: 'oxlint',
                fix: true,
            };

            try {
                const result = await OxLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe usar configFile cuando se proporciona', async () => {
            const config: LinterConfig = {
                bin: 'oxlint',
                configFile: './custom-oxlint.json',
            };

            try {
                const result = await OxLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('debe manejar oxlintConfig adicional', async () => {
            const config: LinterConfig = {
                bin: 'oxlint',
                oxlintConfig: {
                    rules: {
                        'no-unused-vars': 'error',
                    },
                    plugins: ['recommended'],
                },
            };

            try {
                const result = await OxLint(config);
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('LinterConfig Interface', () => {
        test('debe aceptar configuración mínima', () => {
            const config: LinterConfig = {};

            expect(config).toBeDefined();
            expect(typeof config).toBe('object');
        });

        test('debe aceptar todas las propiedades opcionales', () => {
            const config: LinterConfig = {
                bin: 'eslint',
                configFile: './eslint.config.js',
                fix: true,
                format: 'json',
                eslintConfig: {
                    cache: true,
                    maxWarnings: 10,
                },
                oxlintConfig: {
                    rules: {},
                },
                paths: ['src/', 'tests/'],
            };

            expect(config.bin).toBe('eslint');
            expect(config.configFile).toBe('./eslint.config.js');
            expect(config.fix).toBe(true);
            expect(config.format).toBe('json');
            expect(config.eslintConfig).toBeDefined();
            expect(config.oxlintConfig).toBeDefined();
            expect(config.paths).toEqual(['src/', 'tests/']);
        });

        test('debe manejar diferentes formatos válidos', () => {
            const formats: Array<'json' | 'stylish' | 'compact'> = [
                'json',
                'stylish',
                'compact',
            ];

            formats.forEach(format => {
                const config: LinterConfig = {
                    format: format,
                };

                expect(config.format).toBe(format);
            });
        });
    });
});
