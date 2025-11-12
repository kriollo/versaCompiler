// Los globals (describe, it, expect) están disponibles gracias a vitest.config.ts
import {
    detectAndTagTemplateStrings,
    detectContentType,
    minifyTemplate,
    removeTemporaryTags,
} from '../src/compiler/minifyTemplate';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toBeNull: () => void;
    toContain: (substring: string) => void;
    toBeLessThan: (expected: number) => void;
    toMatch: (pattern: RegExp) => void;
    not: {
        toContain: (substring: string) => void;
    };
};

describe('minifyTemplate - Sistema de detección automática', () => {
    describe('detectContentType', () => {
        it('debe detectar contenido CSS correctamente', () => {
            const cssContent = `
                body { color: red; }
                .class { margin: 10px; }
            `;
            expect(detectContentType(cssContent)).toBe('css');
        });

        it('debe detectar contenido HTML correctamente', () => {
            const htmlContent = `<div class="test"><p>Hello</p></div>`;
            expect(detectContentType(htmlContent)).toBe('html');
        });

        it('debe detectar contenido mixto (CSS + HTML)', () => {
            const mixedContent = `<style>body { color: red; }</style>`;
            expect(detectContentType(mixedContent)).toBe('mixed');
        });

        it('debe devolver unknown para código TypeScript', () => {
            const tsCode = 'function test<T>(value: T): T { return value; }';
            expect(detectContentType(tsCode)).toBe('unknown');
        });

        it('debe devolver unknown para contenido no identificable', () => {
            const plainText = 'Just a simple string';
            expect(detectContentType(plainText)).toBe('unknown');
        });
    });

    describe('detectAndTagTemplateStrings', () => {
        it('debe agregar tag temporal a template string con CSS', () => {
            const code = 'styleTag.innerHTML = `body { color: red; }`';
            const result = detectAndTagTemplateStrings(code);

            expect(result).toContain('__VERSA_TEMP__css`');
            expect(result).toContain('body { color: red; }');
        });

        it('debe agregar tag temporal a template string con HTML', () => {
            const code = 'const html = `<div><p>Hello</p></div>`';
            const result = detectAndTagTemplateStrings(code);

            expect(result).toContain('__VERSA_TEMP__html`');
            expect(result).toContain('<div><p>Hello</p></div>');
        });

        it('NO debe agregar tag si ya tiene html``', () => {
            const code = 'const html = html`<div>Test</div>`';
            const result = detectAndTagTemplateStrings(code);

            expect(result).not.toContain('__VERSA_TEMP__');
            expect(result).toBe(code);
        });

        it('NO debe agregar tag a template strings cortos', () => {
            const code = 'const short = `test`';
            const result = detectAndTagTemplateStrings(code);

            expect(result).not.toContain('__VERSA_TEMP__');
            expect(result).toBe(code);
        });
    });

    describe('removeTemporaryTags', () => {
        it('debe remover tags temporales __VERSA_TEMP__html', () => {
            const code = 'const html = __VERSA_TEMP__html`<div>Test</div>`';
            const result = removeTemporaryTags(code);

            expect(result).toBe('const html = `<div>Test</div>`');
            expect(result).not.toContain('__VERSA_TEMP__');
        });

        it('debe remover tags temporales __VERSA_TEMP__css', () => {
            const code = 'const css = __VERSA_TEMP__css`body { color: red; }`';
            const result = removeTemporaryTags(code);

            expect(result).toBe('const css = `body { color: red; }`');
            expect(result).not.toContain('__VERSA_TEMP__');
        });
    });

    describe('minifyTemplate - Integración completa', () => {
        it('debe minificar template string CSS sin tag (caso vuejs.ts línea 405)', () => {
            const code = `
                styleTag.innerHTML = \`
                    body {
                        color: red;
                        margin: 10px;
                    }
                    .class {
                        padding: 20px;
                    }
                \`;
            `;

            const result = minifyTemplate(code, 'test.js');

            expect(result.error).toBeNull();
            expect(result.code).not.toContain('__VERSA_TEMP__');
            expect(result.code.length).toBeLessThan(code.length);
            expect(result.code).toContain('color:red');
            expect(result.code).toContain('margin:10px');
        });

        it('debe manejar template strings con expressions', () => {
            const code = `
                const styles = \`
                    body {
                        color: \${color};
                        margin: \${spacing}px;
                    }
                \`;
            `;

            const result = minifyTemplate(code, 'test.js');

            expect(result.error).toBeNull();
            expect(result.code).not.toContain('__VERSA_TEMP__');
            // Verificar que las expressions no se pierdan
            expect(result.code).toMatch(/\$\{color\}/);
            expect(result.code).toMatch(/\$\{spacing\}/);
        });

        it('debe skip archivos de tipos TypeScript', () => {
            const code = 'declare module "test" { export type Foo<T> = T; }';
            const result = minifyTemplate(code, 'vue-types-setup.ts');

            expect(result.error).toBeNull();
            expect(result.code).toBe(code);
        });

        it('debe skip archivos sin backticks', () => {
            const code = 'const x = 42; function test() { return x; }';
            const result = minifyTemplate(code, 'test.js');

            expect(result.error).toBeNull();
            expect(result.code).toBe(code);
        });
    });
});
