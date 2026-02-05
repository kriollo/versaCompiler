import { beforeEach, describe, expect, it } from 'vitest';

import { integrityValidator } from '../src/compiler/integrity-validator';

describe('IntegrityValidator', () => {
    beforeEach(() => {
        // Limpiar cache y stats antes de cada test
        integrityValidator.clearCache();
        integrityValidator.resetStats();
    });

    describe('checkSize', () => {
        it('rechaza código vacío', () => {
            const result = integrityValidator.validate(
                'const x = 1;',
                '',
                'test:empty',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.size).toBe(false);
            expect(result.errors).toContain(
                'Código procesado está vacío o demasiado pequeño',
            );
        });

        it('rechaza código demasiado pequeño (<10 caracteres)', () => {
            const result = integrityValidator.validate(
                'const x = 1;',
                'x=1',
                'test:small',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.size).toBe(false);
        });

        it('acepta código válido de tamaño suficiente', () => {
            const code = 'const x = 1; export default x;';
            const result = integrityValidator.validate(
                code,
                code,
                'test:valid',
                { throwOnError: false },
            );

            expect(result.checks.size).toBe(true);
        });
    });

    describe('checkStructure', () => {
        it('rechaza paréntesis desbalanceados', () => {
            const original = 'const x = (1 + 2) * 3;';
            const corrupted = 'const x = (1 + 2 * 3;'; // Falta )

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:unbalanced',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.structure).toBe(false);
            expect(result.errors).toContain(
                'Estructura de código inválida (paréntesis/llaves/corchetes desbalanceados)',
            );
        });

        it('rechaza llaves desbalanceadas', () => {
            const original = 'const obj = { a: 1, b: 2 };';
            const corrupted = 'const obj = { a: 1, b: 2 ;'; // Falta }

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:unbalanced-braces',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.structure).toBe(false);
        });

        it('rechaza corchetes desbalanceados', () => {
            const original = 'const arr = [1, 2, 3];';
            const corrupted = 'const arr = [1, 2, 3;'; // Falta ]

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:unbalanced-brackets',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.structure).toBe(false);
        });

        it('acepta código con estructura válida', () => {
            const code = 'const obj = { arr: [1, 2, (3 + 4)] };';
            const result = integrityValidator.validate(
                code,
                code,
                'test:valid-structure',
                { throwOnError: false },
            );

            expect(result.checks.structure).toBe(true);
        });

        it('maneja strings correctamente (ignora brackets dentro de strings)', () => {
            const code = `const str = "esto tiene ( y } y ]";`;
            const result = integrityValidator.validate(
                code,
                code,
                'test:strings',
                { throwOnError: false },
            );

            expect(result.checks.structure).toBe(true);
        });

        it('maneja template literals correctamente', () => {
            const code = 'const template = `tiene { brackets } y (parens)`;';
            const result = integrityValidator.validate(
                code,
                code,
                'test:template',
                { throwOnError: false },
            );

            expect(result.checks.structure).toBe(true);
        });
    });

    describe('checkExports', () => {
        it('detecta export eliminado (named export)', () => {
            const original =
                'export const API_URL = "https://api.com"; const x = 1;';
            const corrupted = 'const API_URL = "https://api.com"; const x = 1;'; // export removido

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:export-removed',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.exports).toBe(false);
            expect(result.errors).toContain(
                'Exports fueron eliminados o modificados incorrectamente',
            );
        });

        it('detecta export default eliminado', () => {
            const original = 'const App = {}; export default App;';
            const corrupted = 'const App = {}; App;'; // export default removido

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:default-removed',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.exports).toBe(false);
        });

        it('detecta múltiples exports eliminados', () => {
            const original =
                'export const A = 1; export const B = 2; export default {};';
            const corrupted = 'const A = 1; const B = 2; export default {};'; // A y B no exportados

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:multiple-removed',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.exports).toBe(false);
        });

        it('acepta código sin exports (no hay nada que validar)', () => {
            const code = 'const x = 1; const y = 2;';
            const result = integrityValidator.validate(
                code,
                code,
                'test:no-exports',
                { throwOnError: false },
            );

            expect(result.checks.exports).toBe(true);
        });

        it('acepta minificación que mantiene exports', () => {
            const original =
                'export const API_URL = "https://api.com";\nexport default App;';
            const minified =
                'export const API_URL="https://api.com";export default App;';

            const result = integrityValidator.validate(
                original,
                minified,
                'test:exports-kept',
                { throwOnError: false },
            );

            expect(result.checks.exports).toBe(true);
        });

        it('maneja export { ... } correctamente', () => {
            const original = 'const a=1,b=2; export { a, b };';
            const minified = 'const a=1,b=2;export{a,b};';

            const result = integrityValidator.validate(
                original,
                minified,
                'test:export-block',
                { throwOnError: false },
            );

            expect(result.checks.exports).toBe(true);
        });
    });

    describe('checkSyntax', () => {
        it('detecta sintaxis inválida (comentario malformado)', () => {
            const original = 'const x = 1; /* comentario */';
            const corrupted = 'const x = 1; /* comentario'; // Falta cierre */

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:malformed-comment',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.syntax).toBe(false);
            expect(result.errors).toContain(
                'Código procesado contiene errores de sintaxis',
            );
        });

        it('detecta sintaxis inválida (string sin cerrar)', () => {
            const original = 'const str = "hello world";';
            const corrupted = 'const str = "hello world;'; // Falta comilla

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:unclosed-string',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.syntax).toBe(false);
        });

        it('acepta sintaxis válida', () => {
            const code = `
                const x = 1;
                const y = { a: 1, b: 2 };
                export default function() {
                    return x + y.a;
                }
            `;

            const result = integrityValidator.validate(
                code,
                code,
                'test:valid-syntax',
                { throwOnError: false },
            );

            expect(result.checks.syntax).toBe(true);
        });

        it('skipea validación de sintaxis cuando skipSyntaxCheck=true', () => {
            const invalidCode = 'const x = '; // Sintaxis inválida

            const result = integrityValidator.validate(
                invalidCode,
                invalidCode,
                'test:skip-syntax',
                { throwOnError: false, skipSyntaxCheck: true },
            );

            // No debería fallar porque skipSyntaxCheck=true
            // Solo fallará en size check
            expect(result.checks.syntax).toBe(true); // Se asume válido cuando se skipea
        });
    });

    describe('Validación completa', () => {
        it('acepta minificación válida', () => {
            const original = `
                export const API_URL = "https://api.com";
                const data = { name: "test", value: 123 };
                export default function process(input) {
                    return input + data.value;
                }
            `;
            const minified = `export const API_URL="https://api.com";const data={name:"test",value:123};export default function process(input){return input+data.value}`;

            const result = integrityValidator.validate(
                original,
                minified,
                'test:valid-minification',
                { throwOnError: false },
            );

            expect(result.valid).toBe(true);
            expect(result.checks.size).toBe(true);
            expect(result.checks.structure).toBe(true);
            expect(result.checks.exports).toBe(true);
            expect(result.checks.syntax).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('rechaza transformación que genera código corrupto', () => {
            const original = 'export const value = 42;';
            const corrupted = 'export const value ='; // Sintaxis inválida

            const result = integrityValidator.validate(
                original,
                corrupted,
                'test:corrupted',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Performance y Caché', () => {
        it('completa validación en <5ms para archivo típico', () => {
            const code = `
                export const API_URL = "https://api.com";
                export const CONFIG = { timeout: 5000, retries: 3 };
                function helper(x) { return x * 2; }
                export default function main(input) {
                    return helper(input) + CONFIG.retries;
                }
            `;

            const result = integrityValidator.validate(
                code,
                code,
                'test:performance',
                { throwOnError: false },
            );

            expect(result.metrics.duration).toBeLessThan(5);
            expect(result.valid).toBe(true);
        });

        it('usa caché para validaciones repetidas', () => {
            const code = 'export const x = 1; export default {};';

            // Primera validación
            const result1 = integrityValidator.validate(
                code,
                code,
                'test:cache',
                { throwOnError: false },
            );

            // Segunda validación (debería usar caché)
            const result2 = integrityValidator.validate(
                code,
                code,
                'test:cache',
                { throwOnError: false },
            );

            const stats = integrityValidator.getStats();
            expect(stats.totalValidations).toBe(2);
            expect(stats.cacheHits).toBe(1);
            expect(stats.cacheMisses).toBe(1);
        });

        it('caché hace validación mucho más rápida', () => {
            const code =
                'export const data = { a: 1, b: 2, c: 3 }; export default data;';

            // Primera validación (sin caché)
            const result1 = integrityValidator.validate(
                code,
                code,
                'test:cache-speed',
                { throwOnError: false },
            );
            const duration1 = result1.metrics.duration;

            // Segunda validación (con caché)
            const result2 = integrityValidator.validate(
                code,
                code,
                'test:cache-speed',
                { throwOnError: false },
            );
            const duration2 = result2.metrics.duration;

            // Cache hit debería ser significativamente más rápido
            // No podemos garantizar un ratio exacto, pero sí que sea más rápido
            expect(duration2).toBeLessThanOrEqual(duration1);
        });
    });

    describe('Opciones de validación', () => {
        it('throwOnError=true lanza excepción en error', () => {
            const original = 'export const x = 1;';
            const corrupted = ''; // Vacío

            expect(() => {
                integrityValidator.validate(original, corrupted, 'test:throw', {
                    throwOnError: true,
                });
            }).toThrow();
        });

        it('throwOnError=false retorna resultado sin lanzar', () => {
            const original = 'export const x = 1;';
            const corrupted = ''; // Vacío

            expect(() => {
                const result = integrityValidator.validate(
                    original,
                    corrupted,
                    'test:no-throw',
                    { throwOnError: false },
                );
                expect(result.valid).toBe(false);
            }).not.toThrow();
        });
    });

    describe('Métricas', () => {
        it('registra estadísticas correctamente', () => {
            const code = 'export const x = 1;';

            // Validación exitosa
            integrityValidator.validate(code, code, 'test:success', {
                throwOnError: false,
            });

            // Validación fallida
            integrityValidator.validate(code, '', 'test:fail', {
                throwOnError: false,
            });

            const stats = integrityValidator.getStats();
            expect(stats.totalValidations).toBe(2);
            expect(stats.successfulValidations).toBe(1);
            expect(stats.failedValidations).toBe(1);
            expect(stats.averageDuration).toBeGreaterThan(0);
        });

        it('incluye métricas de tamaño en resultado', () => {
            const original =
                'export const API_URL = "https://api.com/v1/endpoint";';
            const minified =
                'export const API_URL="https://api.com/v1/endpoint";';

            const result = integrityValidator.validate(
                original,
                minified,
                'test:metrics',
                { throwOnError: false },
            );

            expect(result.metrics.originalSize).toBe(original.length);
            expect(result.metrics.processedSize).toBe(minified.length);
            expect(result.metrics.processedSize).toBeLessThan(
                result.metrics.originalSize,
            );
            expect(result.metrics.exportCount).toBe(1);
        });
    });

    describe('Casos reales de bugs históricos', () => {
        it('Bug #1: Código vacío después de minificación', () => {
            const original = 'const x = 1; // comentario importante';
            const buggedMinification = ''; // Bug: minificación devuelve vacío

            const result = integrityValidator.validate(
                original,
                buggedMinification,
                'test:bug-empty',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.size).toBe(false);
        });

        it('Bug #2: Export eliminado por error', () => {
            const original =
                'export const API_URL = "..."; export default App;';
            const buggedTransform =
                'const API_URL = "..."; export default App;';

            const result = integrityValidator.validate(
                original,
                buggedTransform,
                'test:bug-export',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.exports).toBe(false);
        });

        it('Bug #3: Comentario malformado (histórico v2.3.3)', () => {
            const original = 'const x = 1; /* comentario */';
            const buggedMinification = 'const x = 1; /* comentario'; // Bug: falta cierre

            const result = integrityValidator.validate(
                original,
                buggedMinification,
                'test:bug-comment',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.syntax).toBe(false);
        });

        it('Bug #4: Transformación de path alias corrupta', () => {
            const original = 'import { x } from "@/utils/helper"';
            const buggedTransform = 'import { x } from "@/utils/helper'; // Bug: comilla faltante

            const result = integrityValidator.validate(
                original,
                buggedTransform,
                'test:bug-alias',
                { throwOnError: false },
            );

            expect(result.valid).toBe(false);
            expect(result.checks.syntax).toBe(false);
        });
    });
});
