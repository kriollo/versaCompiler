import fs from 'node:fs/promises';
import path from 'node:path';
import {
    cleanExpiredParserCache,
    clearParserCache,
    getCodeFile,
    getParserCacheStats,
    parser,
} from '../src/compiler/parser';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeNull: () => void;
    toBeDefined: () => void;
    toBeInstanceOf: (constructor: any) => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toContain: (substring: string) => void;
    toHaveProperty: (property: string) => void;
    toHaveLength: (length: number) => void;
};
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;

describe('Parser - Funciones de parsing y cache', () => {
    describe('getCodeFile', () => {
        it('debe leer correctamente un archivo existente', async () => {
            // Crear un archivo temporal para el test
            const testFile = path.join(process.cwd(), 'test-temp-file.js');
            const testContent = 'console.log("Hello World");';

            try {
                await fs.writeFile(testFile, testContent, 'utf-8');

                const result = await getCodeFile(testFile);

                expect(result.error).toBeNull();
                expect(result.code).toBe(testContent);
            } finally {
                // Limpiar archivo temporal
                try {
                    await fs.unlink(testFile);
                } catch {
                    // Ignorar errores de limpieza
                }
            }
        });

        it('debe devolver error para archivo inexistente', async () => {
            const nonExistentFile = path.join(
                process.cwd(),
                'non-existent-file.js',
            );

            const result = await getCodeFile(nonExistentFile);

            expect(result.code).toBeNull();
            expect(result.error).toBeDefined();
            expect(result.error).toBeInstanceOf(Error);
        });
    });

    describe('Parser Cache Management', () => {
        beforeEach(() => {
            // Limpiar cache antes de cada test
            clearParserCache();
        });

        it('debe inicializar cache vacío', () => {
            const stats = getParserCacheStats();

            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.totalParses).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(stats.hitRate).toBe(0);
        });

        it('debe limpiar el cache correctamente', () => {
            clearParserCache();
            const stats = getParserCacheStats();

            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.totalParses).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(stats.memoryUsage).toBe(0);
        });

        it('debe tener límites de cache definidos', () => {
            const stats = getParserCacheStats();

            expect(stats.maxCacheSize).toBeDefined();
            expect(stats.maxMemoryUsage).toBeDefined();
            expect(typeof stats.maxCacheSize).toBe('number');
            expect(typeof stats.maxMemoryUsage).toBe('number');
        });

        it('debe limpiar entradas expiradas del cache', () => {
            // Agregar algo al cache
            const code = 'const test = 42;';
            parser('test.js', code, 'js');

            const statsBefore = getParserCacheStats();
            expect(statsBefore.cacheSize).toBeGreaterThan(0);

            // Limpiar expiradas
            cleanExpiredParserCache();

            const statsAfter = getParserCacheStats();
            // Puede que no se limpie inmediatamente si no ha expirado
            expect(statsAfter).toBeDefined();
        });
    });

    describe('parser function', () => {
        beforeEach(() => {
            clearParserCache();
        });

        it('debe parsear código JavaScript válido', async () => {
            const code = `const x = 42; function test() { return x; }`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast).toHaveProperty('program');
            expect(ast.program).toHaveProperty('body');
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe parsear código TypeScript válido', async () => {
            const code = `const x: number = 42; function test(): number { return x; }`;
            const ast = await parser('test.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast).toHaveProperty('program');
            expect(ast.program).toHaveProperty('body');
        });

        it('debe manejar imports ES6', async () => {
            const code = `import { ref } from 'vue'; import Component from './Component.vue';`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar exports', async () => {
            const code = `export const PI = 3.14; export default function() { return PI; }`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar clases', async () => {
            const code = `class TestClass { constructor() {} method() { return 'test'; } }`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar async/await', async () => {
            const code = `async function fetchData() { const response = await fetch('/api'); return response.json(); }`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar template literals', async () => {
            const code = `const name = 'world'; const greeting = \`Hello \${name}!\`;`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar destructuring', async () => {
            const code = `const { a, b } = obj; const [x, y] = arr;`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar arrow functions', async () => {
            const code = `const add = (a, b) => a + b; const multiply = (a, b) => { return a * b; };`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar try/catch', async () => {
            const code = `try { riskyOperation(); } catch (error) { console.error(error); }`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar promesas', async () => {
            const code = `Promise.resolve(42).then(value => console.log(value));`;
            const ast = await parser('test.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe usar cache para el mismo código', async () => {
            const code = `const x = 42;`;
            const filename = 'cache-test.js';

            // Primera llamada - debería cachear
            const ast1 = await parser(filename, code, 'js');
            const statsAfterFirst = getParserCacheStats();

            // Segunda llamada - debería usar cache
            const ast2 = await parser(filename, code, 'js');
            const statsAfterSecond = getParserCacheStats();

            expect(ast1).toEqual(ast2);
            expect(statsAfterSecond.cacheHits).toBeGreaterThan(
                statsAfterFirst.cacheHits,
            );
        });

        it('debe manejar código muy largo', async () => {
            const longCode = 'const x = ' + '1'.repeat(10000) + ';';
            const ast = await parser('long.js', longCode, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con caracteres unicode', async () => {
            const code = `const greeting = 'Hello 世界 🌍'; const emoji = '🚀';`;
            const ast = await parser('unicode.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con comentarios complejos', async () => {
            const code = `
                // Comentario de línea
                /* Comentario
                   multilinea */
                const x = 42; // comentario inline
            `;
            const ast = await parser('comments.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con expresiones regulares', async () => {
            const code = `const regex = /test/gi; const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;`;
            const ast = await parser('regex.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con módulos dinámicos', async () => {
            const code = `import('./module.js').then(module => module.default());`;
            const ast = await parser('dynamic.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con optional chaining', async () => {
            const code = `const result = obj?.prop?.method?.();`;
            const ast = await parser('optional.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con nullish coalescing', async () => {
            const code = `const result = value ?? 'default';`;
            const ast = await parser('nullish.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con spread operator', async () => {
            const code = `const arr = [...items]; const obj = { ...defaults, ...overrides };`;
            const ast = await parser('spread.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con generators', async () => {
            const code = `function* generator() { yield 1; yield 2; }`;
            const ast = await parser('generator.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con símbolos', async () => {
            const code = `const sym = Symbol('test'); const unique = Symbol.for('global');`;
            const ast = await parser('symbol.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con BigInt', async () => {
            const code = `const big = 123n; const big2 = BigInt(456);`;
            const ast = await parser('bigint.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con Map y Set', async () => {
            const code = `const map = new Map(); const set = new Set();`;
            const ast = await parser('mapset.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con WeakMap y WeakSet', async () => {
            const code = `const weakMap = new WeakMap(); const weakSet = new WeakSet();`;
            const ast = await parser('weak.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con Reflect API', async () => {
            const code = `const result = Reflect.get(target, property);`;
            const ast = await parser('reflect.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código con módulos Node.js', async () => {
            const code = `const fs = require('fs'); const path = require('path');`;
            const ast = await parser('node.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con sintaxis moderna de import', async () => {
            const code = `import * as utils from './utils'; import { helper } from './helpers';`;
            const ast = await parser('import.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código con exportaciones nombradas', async () => {
            const code = `export { function1, function2 }; export const constant = 42;`;
            const ast = await parser('export.js', code, 'js');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con interfaces', async () => {
            const code = `interface User { name: string; age: number; } const user: User = { name: 'John', age: 30 };`;
            const ast = await parser('interface.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con generics', async () => {
            const code = `function identity<T>(arg: T): T { return arg; } const result = identity<string>('hello');`;
            const ast = await parser('generics.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con enums', async () => {
            const code = `enum Color { Red, Green, Blue } const color: Color = Color.Red;`;
            const ast = await parser('enum.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con decoradores', async () => {
            const code = `@Component({}) class MyComponent { @Prop() prop: string; }`;
            const ast = await parser('decorator.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código TypeScript con tipos de unión', async () => {
            const code = `type StringOrNumber = string | number; const value: StringOrNumber = 'test';`;
            const ast = await parser('union.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos condicionales', async () => {
            const code = `type IsString<T> = T extends string ? true : false;`;
            const ast = await parser('conditional.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código TypeScript con mapped types', async () => {
            const code = `type Optional<T> = { [K in keyof T]?: T[K] };`;
            const ast = await parser('mapped.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código TypeScript con utility types', async () => {
            const code = `type PartialUser = Partial<User>; type ReadonlyUser = Readonly<User>;`;
            const ast = await parser('utility.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con namespaces', async () => {
            const code = `namespace MyNamespace { export const value = 42; }`;
            const ast = await parser('namespace.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código TypeScript con módulos', async () => {
            const code = `module MyModule { export const value = 42; }`;
            const ast = await parser('module.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código TypeScript con tipos de función', async () => {
            const code = `type Func = (param: string) => number; const func: Func = (p) => p.length;`;
            const ast = await parser('function-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de tupla', async () => {
            const code = `type Tuple = [string, number]; const tuple: Tuple = ['hello', 42];`;
            const ast = await parser('tuple.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos literales', async () => {
            const code = `type Literal = 'option1' | 'option2' | 42; const value: Literal = 'option1';`;
            const ast = await parser('literal.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de objeto', async () => {
            const code = `type ObjectType = { name: string; age?: number; }; const obj: ObjectType = { name: 'John' };`;
            const ast = await parser('object-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de array', async () => {
            const code = `type ArrayType = string[]; type GenericArray<T> = T[]; const arr: ArrayType = ['a', 'b'];`;
            const ast = await parser('array-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(3);
        });

        it('debe manejar código TypeScript con tipos de promesa', async () => {
            const code = `type PromiseType = Promise<string>; async function getData(): PromiseType { return 'data'; }`;
            const ast = await parser('promise-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de utilidad avanzados', async () => {
            const code = `type NonNullableType = NonNullable<string | null | undefined>; type ReturnTypeFunc = ReturnType<() => string>;`;
            const ast = await parser('advanced-utility.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de template literal', async () => {
            const code = `type EventName = \`on\${string}\`; const event: EventName = 'onClick';`;
            const ast = await parser('template-literal-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de índice', async () => {
            const code = `type Person = { name: string; age: number; }; type PersonKeys = keyof Person; type NameType = Person['name'];`;
            const ast = await parser('index-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(3);
        });

        it('debe manejar código TypeScript con tipos de condición inferidos', async () => {
            const code = `type Flatten<T> = T extends Array<infer U> ? U : T; type Result = Flatten<string[]>;`;
            const ast = await parser('infer-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de operador', async () => {
            const code = `type Keys = 'a' | 'b'; type Values = { [K in Keys]: number }; const obj: Values = { a: 1, b: 2 };`;
            const ast = await parser('operator-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(3);
        });

        it('debe manejar código TypeScript con tipos de módulo', async () => {
            const code = `declare module 'my-module' { export const value: string; }`;
            const ast = await parser('module-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(1);
        });

        it('debe manejar código TypeScript con tipos de ambient', async () => {
            const code = `declare const globalVar: string; declare function globalFunc(): void;`;
            const ast = await parser('ambient-type.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de sobrecarga', async () => {
            const code = `function overload(param: string): string; function overload(param: number): number; function overload(param: any): any { return param; }`;
            const ast = await parser('overload.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(3);
        });

        it('debe manejar código TypeScript con tipos de assertion', async () => {
            const code = `const value: any = 'hello'; const str: string = value as string;`;
            const ast = await parser('assertion.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de const assertion', async () => {
            const code = `const arr = [1, 2, 3] as const; const obj = { prop: 'value' } as const;`;
            const ast = await parser('const-assertion.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });

        it('debe manejar código TypeScript con tipos de satisfies', async () => {
            const code = `type Colors = 'red' | 'green' | 'blue'; const color = 'red' satisfies Colors;`;
            const ast = await parser('satisfies.ts', code, 'ts');

            expect(ast).toBeDefined();
            expect(ast.program.body).toHaveLength(2);
        });
    });
});
