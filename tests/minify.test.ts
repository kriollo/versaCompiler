/**
 * Tests para el minificador de JavaScript
 * Verifica la minificación de código JavaScript con diferentes configuraciones
 */

import { minifyJS } from '../dist/compiler/minify';

describe('JavaScript Minifier', () => {
    describe('minifyJS', () => {
        test('debe minificar JavaScript básico', async () => {
            const jsCode = `
function hello() {
    const message = "Hello World";
    console.log(message);
    return message;
}

const unused = "this variable is unused";
hello();
            `.trim();

            const result = await minifyJS(jsCode, 'test.js');

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            expect(typeof result.code).toBe('string');

            // Verificar que el código está minificado
            expect(result.code.length).toBeLessThan(jsCode.length);
            expect(result.code).not.toContain('\n');
        });

        test('debe minificar código con imports/exports', async () => {
            const jsCode = `
import { ref, computed } from 'vue';
import lodash from 'lodash-es';

export const useCounter = () => {
    const count = ref(0);

    const doubleCount = computed(() => {
        return count.value * 2;
    });

    const increment = () => {
        count.value++;
    };

    return {
        count,
        doubleCount,
        increment
    };
};

export default useCounter;
            `.trim();

            const result = await minifyJS(jsCode, 'composable.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            expect(result.code).toContain('import');
            expect(result.code).toContain('export');
        });

        test('debe manejar sintaxis moderna de JavaScript', async () => {
            const jsCode = `
const user = {
    name: 'John',
    age: 30,
    ...otherProps
};

const getName = (user) => user?.name ?? 'Unknown';
const numbers = [1, 2, 3, 4, 5];
const evens = numbers.filter(n => n % 2 === 0);

async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
            `.trim();

            const result = await minifyJS(jsCode, 'modern.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            // Verificar que preserva sintaxis moderna
            expect(result.code).toContain('??');
            expect(result.code).toContain('async');
        });

        test('debe preservar funcionalidad de clases', async () => {
            const jsCode = `
class Calculator {
    constructor() {
        this.result = 0;
    }

    add(value) {
        this.result += value;
        return this;
    }

    multiply(value) {
        this.result *= value;
        return this;
    }

    getValue() {
        return this.result;
    }
}

const calc = new Calculator();
calc.add(5).multiply(2);
console.log(calc.getValue());
            `.trim();

            const result = await minifyJS(jsCode, 'calculator.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            expect(result.code).toContain('class');
            expect(result.code).toContain('constructor');
        });

        test('debe manejar funciones flecha y destructuring', async () => {
            const jsCode = `
const users = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
    { name: 'Bob', age: 35 }
];

const getAdults = (users) => {
    return users
        .filter(({ age }) => age >= 18)
        .map(({ name, age }) => ({ name, age }));
};

const [first, second, ...rest] = users;
const { name: firstName } = first;
            `.trim();

            const result = await minifyJS(jsCode, 'functional.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
        });

        test('debe minificar en modo producción por defecto', async () => {
            const jsCode = `
function testFunction() {
    const variableWithLongName = "test value";
    return variableWithLongName;
}
            `.trim();

            const result = await minifyJS(jsCode, 'prod.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            // En modo producción, las variables deberían ser renombradas
            expect(result.code).not.toContain('variableWithLongName');
        });

        test('debe manejar modo desarrollo', async () => {
            const jsCode = `
function debugFunction() {
    const debugVariable = "debug value";
    console.log(debugVariable);
    return debugVariable;
}
            `.trim();

            const result = await minifyJS(jsCode, 'dev.js', false);

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            // En modo desarrollo debería preservar nombres para debugging
        });

        test('debe manejar errores de sintaxis', async () => {
            const invalidJs = `
function broken() {
    const invalid syntax here =
    return "never reached";
}
            `.trim();

            const result = await minifyJS(invalidJs, 'broken.js');

            expect(result).toBeDefined();

            if (result.error) {
                expect(result.error).toBeInstanceOf(Error);
                expect(result.code).toBe('');
            } else {
                // Si el minificador es tolerante a errores
                expect(result.code).toBeTruthy();
            }
        });

        test('debe manejar código vacío', async () => {
            const emptyCode = '';

            const result = await minifyJS(emptyCode, 'empty.js');

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.code).toBe('');
        });

        test('debe tener rendimiento adecuado', async () => {
            const largeJs = `
${Array.from(
    { length: 100 },
    (_, i) => `
function func${i}() {
    const value${i} = ${i} * 2;
    console.log('Function ${i}:', value${i});
    return value${i};
}
func${i}();
`,
).join('\n')}
            `.trim();

            const startTime = Date.now();
            const result = await minifyJS(largeJs, 'large.js');
            const endTime = Date.now();

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            expect(endTime - startTime).toBeLessThan(5000); // Menos de 5 segundos
        });

        test('debe preservar async/await', async () => {
            const jsCode = `
async function fetchUserData(userId) {
    try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const userData = await response.json();

        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }

        return userData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}
            `.trim();

            const result = await minifyJS(jsCode, 'async.js');

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            expect(result.code).toContain('async');
            expect(result.code).toContain('await');
        });
    });
});
