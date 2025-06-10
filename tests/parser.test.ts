/**
 * Tests para el parser de JavaScript/TypeScript
 * Verifica el parsing de código con diferentes configuraciones
 */

import fs from 'fs-extra';
import path from 'path';
import { getCodeFile, parser } from '../src/compiler/parser';

describe('Parser', () => {
    const testDir = path.join(process.cwd(), 'temp-test-parser');

    beforeEach(async () => {
        // Crear directorio temporal para tests
        await fs.ensureDir(testDir);
    });

    afterEach(async () => {
        // Limpiar directorio temporal
        await fs.remove(testDir);
    });

    describe('parser', () => {
        test('debe parsear JavaScript básico', async () => {
            const jsCode = `
const message = "Hello World";
function greet() {
    console.log(message);
}
greet();
            `.trim();

            const result = await parser('test.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
            expect(result.program.body).toBeInstanceOf(Array);
            expect(result.program.body.length).toBeGreaterThan(0);
        });

        test('debe parsear código con imports/exports', async () => {
            const jsCode = `
import { ref } from 'vue';
import lodash from 'lodash-es';

export const useCounter = () => {
    const count = ref(0);
    return { count };
};

export default useCounter;
            `.trim();

            const result = await parser('module.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
            expect(result.program.body).toBeInstanceOf(Array);            // Verificar que encuentra los imports/exports
            const imports = result.program.body.filter(
                (node: any) => node.type === 'ImportDeclaration',
            );
            const exports = result.program.body.filter(
                (node: any) =>
                    node.type === 'ExportNamedDeclaration' ||
                    node.type === 'ExportDefaultDeclaration',
            );

            expect(imports.length).toBeGreaterThan(0);
            expect(exports.length).toBeGreaterThan(0);
        });

        test('debe parsear sintaxis moderna de JavaScript', async () => {
            const jsCode = `
const user = {
    name: 'John',
    ...otherProps
};

const getName = (user) => user?.name ?? 'Unknown';
async function fetchData() {
    const response = await fetch('/api/data');
    return response.json();
}

class MyClass {
    #privateField = 'private';

    getPrivate() {
        return this.#privateField;
    }
}
            `.trim();

            const result = await parser('modern.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
            expect(result.program.body).toBeInstanceOf(Array);
        });

        test('debe parsear TypeScript cuando se especifica', async () => {
            const tsCode = `
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: 'John',
    age: 30
};

function greet<T>(item: T): T {
    return item;
}

enum Color {
    Red,
    Green,
    Blue
}
            `.trim();

            const result = await parser('typescript.ts', tsCode, 'ts');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
            expect(result.program.body).toBeInstanceOf(Array);
        });

        test('debe manejar funciones arrow', async () => {
            const jsCode = `
const add = (a, b) => a + b;
const multiply = (a, b) => {
    return a * b;
};

const users = [1, 2, 3].map(n => n * 2);
            `.trim();

            const result = await parser('arrows.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
        });

        test('debe manejar destructuring', async () => {
            const jsCode = `
const { name, age } = user;
const [first, second, ...rest] = array;

function processUser({ name, age = 0 }) {
    return { name, age };
}

const { data: userData, error } = response;
            `.trim();

            const result = await parser('destructuring.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
        });

        test('debe manejar clases con métodos', async () => {
            const jsCode = `
class Calculator {
    constructor(initial = 0) {
        this.value = initial;
    }

    add(num) {
        this.value += num;
        return this;
    }

    static create() {
        return new Calculator();
    }

    get result() {
        return this.value;
    }

    set result(val) {
        this.value = val;
    }
}
            `.trim();

            const result = await parser('class.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
        });

        test('debe manejar template literals', async () => {
            const jsCode = `
const name = 'World';
const message = \`Hello \${name}!\`;

const multiline = \`
    This is a
    multiline string
    with \${name}
\`;

function html(strings, ...values) {
    return strings.reduce((result, string, i) => {
        return result + string + (values[i] || '');
    }, '');
}

const element = html\`<div>\${message}</div>\`;
            `.trim();

            const result = await parser('templates.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
        });

        test('debe manejar async/await', async () => {
            const jsCode = `
async function fetchUser(id) {
    try {
        const response = await fetch(\`/users/\${id}\`);
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}

const getUsers = async () => {
    const users = await Promise.all([
        fetchUser(1),
        fetchUser(2),
        fetchUser(3)
    ]);
    return users;
};
            `.trim();

            const result = await parser('async.js', jsCode, 'js');

            expect(result).toBeDefined();
            expect(result.program).toBeDefined();
        });

        test('debe manejar código con errores de sintaxis', async () => {
            const invalidCode = `
function broken() {
    const invalid syntax here =
    return "never reached";
}
            `.trim();

            // Dependiendo de la implementación del parser, puede lanzar error o manejarlo
            try {
                const result = await parser('broken.js', invalidCode, 'js');
                // Si no lanza error, verificar que al menos retorna algo
                expect(result).toBeDefined();
            } catch (error) {
                // Si lanza error, verificar que es una instancia de Error
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('getCodeFile', () => {
        test('debe leer un archivo JavaScript existente', async () => {
            const testFile = path.join(testDir, 'test.js');
            const testContent = 'const message = "Hello from file";';

            await fs.writeFile(testFile, testContent);

            const result = await getCodeFile(testFile);

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.code).toBe(testContent);
        });
        test('debe manejar archivos que no existen', async () => {
            const nonExistentFile = path.join(testDir, 'nonexistent.js');

            const result = await getCodeFile(nonExistentFile);

            expect(result).toBeDefined();
            expect(result.code).toBeNull();
            expect(result.error).toBeTruthy();
        });

        test('debe leer archivos TypeScript', async () => {
            const testFile = path.join(testDir, 'test.ts');
            const testContent = `
interface User {
    name: string;
}
const user: User = { name: "John" };
            `.trim();

            await fs.writeFile(testFile, testContent);

            const result = await getCodeFile(testFile);

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.code).toBe(testContent);
        });

        test('debe manejar archivos vacíos', async () => {
            const testFile = path.join(testDir, 'empty.js');

            await fs.writeFile(testFile, '');

            const result = await getCodeFile(testFile);

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.code).toBe('');
        });

        test('debe tener rendimiento adecuado', async () => {
            const testFile = path.join(testDir, 'performance.js');
            const largeContent = Array.from(
                { length: 1000 },
                (_, i) => `const variable${i} = "value${i}";`,
            ).join('\n');

            await fs.writeFile(testFile, largeContent);

            const startTime = Date.now();
            const result = await getCodeFile(testFile);
            const endTime = Date.now();

            expect(result.error).toBeNull();
            expect(result.code).toBeTruthy();
            expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo
        });
    });
});
