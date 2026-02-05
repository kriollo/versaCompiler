import { describe, it, expect } from 'vitest';
import { minifyJS } from '../src/compiler/minify';

describe('Minification Integrity - Edge Cases', () => {
    it('debe preservar cadenas que contienen "//" (comentarios falsos)', async () => {
        const code = `
            const url = "https://api.example.com";
            const pseudoComment = "Esto no es un comentario //";
            const check = (str) => str.startsWith("//");
            if (check(pseudoComment)) {
                console.log("Detectado");
            }
        `;

        const result = await minifyJS(code, 'test-integrity.js', true);

        expect(result.error).toBeNull();
        // Verificar que las cadenas críticas se preservan (oxc-minify puede normalizar comillas)
        expect(result.code).toContain('https://api.example.com');
        expect(result.code).toContain('Esto no es un comentario //');
        // Verificar que startsWith está presente (puede estar con comillas simples, dobles o backticks)
        expect(result.code).toMatch(/startsWith\(["`']\/\/["`']\)/);
    });

    it('debe preservar expresiones regulares con slashes', async () => {
        const code = `
            const regex = /\\/\\//g;
            const urlRegex = /http:\\/\\//;
            console.log(regex.test("//"), urlRegex.test("http://"));
        `;

        const result = await minifyJS(code, 'test-regex.js', true);

        expect(result.error).toBeNull();
        // oxc-minify puede optimizar el regex, pero debe ser funcionalmente equivalente
        // Normalmente preserva los literales de regex si son simples
        expect(result.code).toContain('/\\/\\//g');
        expect(result.code).toContain('/http:\\/\\//');
    });

    it('debe eliminar comentarios reales pero mantener el código', async () => {
        const code = `
            // Comentario de línea
            const x = 10; /* Comentario de bloque */
            function test() {
                /** JSDoc */
                return x;
            }
        `;

        const result = await minifyJS(code, 'test-comments.js', true);

        expect(result.error).toBeNull();
        // Los comentarios deben ser eliminados
        expect(result.code).not.toContain('Comentario de línea');
        expect(result.code).not.toContain('Comentario de bloque');
        expect(result.code).not.toContain('JSDoc');
        // El código funcional debe estar presente (aunque las variables se renombren)
        expect(result.code).toContain('=10');
        expect(result.code).toContain('function');
        expect(result.code).toContain('return');
    });

    it('debe manejar adecuadamente URLs en parámetros', async () => {
        const code = `
            function load(url = "//localhost:3000") {
                return fetch(url);
            }
        `;

        const result = await minifyJS(code, 'test-urls.js', true);

        expect(result.error).toBeNull();
        expect(result.code).toContain('//localhost:3000');
    });
});
