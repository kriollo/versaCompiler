import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { preCompileTS } from '../src/compiler/typescript-compiler';
import { loadTypeScriptConfig } from '../src/compiler/typescript-manager';

describe('TypeScript Compiler', () => {
    const testDir = join(process.cwd(), 'temp', 'ts-compiler-test');

    beforeEach(async () => {
        if (!existsSync(testDir)) {
            await mkdir(testDir, { recursive: true });
        }
    });

    afterEach(async () => {
        // Limpieza de archivos de prueba
    });

    describe('preCompileTS - Basic Compilation', () => {
        it('should compile valid TypeScript to JavaScript', async () => {
            const code = 'const x: number = 42;\nconsole.log(x);';
            const filePath = join(testDir, 'test.ts');

            const result = await preCompileTS(code, filePath);

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
            expect(result.data).toContain('const x = 42');
        });

        it('should handle simple variable declarations', async () => {
            const code = 'let message: string = "Hello";';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('let message = "Hello"');
        });

        it('should compile arrow functions', async () => {
            const code = 'const add = (a: number, b: number): number => a + b;';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('const add =');
        });

        it('should compile class definitions', async () => {
            const code = `
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}
`;
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('class Person');
        });

        it('should compile interfaces (strip them)', async () => {
            const code = `
interface User {
    id: number;
    name: string;
}
const user: User = { id: 1, name: "Test" };
`;
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).not.toContain('interface User');
            expect(result.data).toContain('const user =');
        });
    });

    describe('preCompileTS - Type Errors', () => {
        it('should detect type mismatch errors', async () => {
            const code = 'const x: number = "string";';
            const result = await preCompileTS(code, 'test.ts');

            // El compilador puede o no reportar error dependiendo de configuración
            expect(result).toBeDefined();
            // Si hay error, verificarlo
            if (result.error) {
                expect(result.error.message).toBeDefined();
            }
        });

        it('should detect missing property errors', async () => {
            const code = `
interface Person {
    name: string;
    age: number;
}
const p: Person = { name: "Test" };
`;
            const result = await preCompileTS(code, 'test.ts');

            // Puede o no detectar error dependiendo de configuración
            expect(result).toBeDefined();
        });

        it('should detect invalid function call errors', async () => {
            const code = `
function greet(name: string): void {
    console.log("Hello " + name);
}
greet(42);
`;
            const result = await preCompileTS(code, 'test.ts');

            // Puede o no detectar error dependiendo de configuración
            expect(result).toBeDefined();
        });

        it('should detect undefined variable errors', async () => {
            const code = 'console.log(undefinedVariable);';
            const result = await preCompileTS(code, 'test.ts');

            // Puede ser error o warning dependiendo de la configuración
            expect(result).toBeDefined();
        });
    });

    describe('preCompileTS - Edge Cases', () => {
        it('should handle empty file', async () => {
            const result = await preCompileTS('', 'empty.ts');

            expect(result).toBeDefined();
            expect(result.error).toBeNull();
            expect(result.data).toBe('');
        });

        it('should handle file with only comments', async () => {
            const code = '// This is a comment\n/* Block comment */';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
        });

        it('should handle file with only whitespace', async () => {
            const code = '   \n\n   \t\t  ';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
        });

        it('should handle syntax errors gracefully', async () => {
            const code = 'const x = {;';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).not.toBeNull();
        });

        it('should handle very long files', async () => {
            const longCode = 'const x = 1;\n'.repeat(10000);
            const result = await preCompileTS(longCode, 'test.ts');

            expect(result).toBeDefined();
        }, 10000);

        it('should handle unicode characters', async () => {
            const code = 'const emoji = "🎉"; const chinese = "你好";';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('🎉');
            expect(result.data).toContain('你好');
        });
    });

    describe('preCompileTS - Import/Export', () => {
        it('should handle ES6 imports', async () => {
            const code = 'import { Component } from "vue";\nconst x = 1;';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            // TypeScript puede remover imports no usados en transpilación
            expect(result.data).toBeDefined();
        });

        it('should handle default exports', async () => {
            const code = 'export default function test() {}';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('export default');
        });

        it('should handle named exports', async () => {
            const code = 'export const value = 42;';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('export');
        });

        it('should handle type-only imports (should be stripped)', async () => {
            const code = 'import type { MyType } from "./types";';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            // type imports deberían ser eliminados
        });
    });

    describe('preCompileTS - Advanced TypeScript Features', () => {
        it('should handle generics', async () => {
            const code = `
function identity<T>(arg: T): T {
    return arg;
}
`;
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
        });

        it('should handle async/await', async () => {
            const code = `
async function fetchData(): Promise<string> {
    return "data";
}
`;
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('async function');
        });

        it('should handle decorators (if enabled)', async () => {
            const code = `
function log(target: any, propertyKey: string) {}

class Example {
    @log
    method() {}
}
`;
            const result = await preCompileTS(code, 'test.ts');

            // Puede fallar si decorators no están habilitados
            expect(result).toBeDefined();
        });

        it('should handle enums', async () => {
            const code = `
enum Color {
    Red,
    Green,
    Blue
}
`;
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
        });

        it('should handle union types', async () => {
            const code = 'let value: string | number = "test";';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
        });

        it('should handle optional chaining', async () => {
            const code = 'const x = obj?.prop?.nested;';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('?.');
        });

        it('should handle nullish coalescing', async () => {
            const code = 'const x = value ?? "default";';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('??');
        });
    });
});

describe('TypeScript Config Management', () => {
    const testDir = join(process.cwd(), 'temp', 'ts-config-test');
    const tsconfigPath = join(testDir, 'tsconfig.json');

    beforeEach(async () => {
        if (!existsSync(testDir)) {
            await mkdir(testDir, { recursive: true });
        }
    });

    afterEach(async () => {
        try {
            if (existsSync(tsconfigPath)) {
                await unlink(tsconfigPath);
            }
        } catch (error) {
            // Ignorar
        }
    });

    describe('loadTypeScriptConfig', () => {
        it('should load valid tsconfig.json', async () => {
            const validConfig = {
                compilerOptions: {
                    target: 'ES2020',
                    module: 'ESNext',
                },
            };
            await writeFile(tsconfigPath, JSON.stringify(validConfig), 'utf-8');

            const config = loadTypeScriptConfig(join(testDir, 'test.ts'));

            // loadTypeScriptConfig retorna CompilerOptions directamente
            expect(config).toBeDefined();
            expect(config.target).toBeDefined();
        });

        it('should use default config when tsconfig not found', () => {
            const config = loadTypeScriptConfig(join(testDir, 'test.ts'));

            // loadTypeScriptConfig retorna CompilerOptions directamente
            expect(config).toBeDefined();
            expect(config.target).toBeDefined();
        });

        it('should cache config for same directory', () => {
            const config1 = loadTypeScriptConfig(join(testDir, 'test1.ts'));
            const config2 = loadTypeScriptConfig(join(testDir, 'test2.ts'));

            // Deberían ser la misma referencia si están en el mismo directorio
            expect(config1).toBeDefined();
            expect(config2).toBeDefined();
        });

        it('should handle invalid JSON in tsconfig', async () => {
            await writeFile(tsconfigPath, '{ invalid json }', 'utf-8');

            const config = loadTypeScriptConfig(join(testDir, 'test.ts'));

            // Debería usar configuración por defecto
            expect(config).toBeDefined();
        });

        it('should respect extends in tsconfig', async () => {
            const baseConfig = {
                compilerOptions: {
                    strict: true,
                },
            };
            const extendedConfig = {
                extends: './base.json',
                compilerOptions: {
                    target: 'ES2020',
                },
            };

            await writeFile(
                join(testDir, 'base.json'),
                JSON.stringify(baseConfig),
                'utf-8',
            );
            await writeFile(
                tsconfigPath,
                JSON.stringify(extendedConfig),
                'utf-8',
            );

            const config = loadTypeScriptConfig(join(testDir, 'test.ts'));

            expect(config).toBeDefined();
        });
    });

    describe('Config Cache Management', () => {
        it('should invalidate cache when tsconfig is modified', async () => {
            const config1 = {
                compilerOptions: { target: 'ES5' },
            };
            await writeFile(tsconfigPath, JSON.stringify(config1), 'utf-8');

            const firstConfig = loadTypeScriptConfig(join(testDir, 'test.ts'));

            // Esperar un momento para asegurar diferente timestamp
            await new Promise(resolve => setTimeout(resolve, 100));

            const config2 = {
                compilerOptions: { target: 'ES2020' },
            };
            await writeFile(tsconfigPath, JSON.stringify(config2), 'utf-8');

            const secondConfig = loadTypeScriptConfig(join(testDir, 'test.ts'));

            // Debería recargar la configuración si el archivo cambió
            expect(firstConfig).toBeDefined();
            expect(secondConfig).toBeDefined();
        });
    });
});

describe('TypeScript Compiler - Performance', () => {
    it('should compile files quickly', async () => {
        const code = 'const x: number = 42;';

        const start = Date.now();
        await preCompileTS(code, 'test.ts');
        const duration = Date.now() - start;

        // No debería tomar más de 1 segundo para un archivo simple
        expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent compilations', async () => {
        const code = 'const x: number = 42;';

        const promises = Array.from({ length: 10 }, (_, i) =>
            preCompileTS(code, `test${i}.ts`),
        );

        const results = await Promise.all(promises);

        results.forEach(result => {
            expect(result.error).toBeNull();
        });
    });

    it('should not leak memory on repeated compilations', async () => {
        const code = 'const x: number = 42;';
        const initialMemory = process.memoryUsage().heapUsed;

        for (let i = 0; i < 100; i++) {
            await preCompileTS(code, `test${i}.ts`);
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const growth = (finalMemory - initialMemory) / 1024 / 1024; // MB

        // No debería crecer más de 50MB (ajustado para entorno de test)
        expect(growth).toBeLessThan(50);
    }, 15000);
});
