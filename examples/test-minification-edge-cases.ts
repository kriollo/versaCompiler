/**
 * TEST DE MINIFICACIÓN Y ELIMINACIÓN DE COMENTARIOS
 * Este archivo contiene casos borde para asegurar que el compilador no rompa código válido.
 */

// 1. Strings con caracteres que parecen comentarios
const str1 = "Esto no es un comentario // ni esto";
const str2 = 'Tampoco esto /* ni esto */';
const str3 = `Template literal con // y /* */ internos`;

// 2. URLs (caso muy común)
const apiUrl = "https://api.example.com/v1/data";
const localUrl = "//localhost:3000/test";

// 3. Regex con slashes
const regex1 = /\/\//g;
const regex2 = /\/\*.*\*\//g;
const regex3 = /http:\/\//;

// 4. Comentarios que SÍ deben ser eliminados
// Comentario de línea completo
const x = 10; // Comentario al final de la línea

/*
  Comentario multilínea
  que debe desaparecer
*/
const y = 20;

/**
 * Comentario JSDoc
 * @param {string} p
 */
function test(p: string) {
    console.log(p); // "//" en log
    return p.startsWith('//') || p.includes('/*');
}

// 5. Casos combinados complejos
const complex = {
    path: "C://users/test",
    pattern: "//[a-z]+//",
    func: () => "/* fake comment */"
};

console.log(str1, str2, str3, apiUrl, localUrl, regex1, regex2, regex3, x, y, test("test"), complex);
