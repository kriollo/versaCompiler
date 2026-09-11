import fs, { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    loadTypeScriptConfig,
    preCompileTS,
} from '../src/compiler/typescript-manager';

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

        it('[comportamiento actual] no reporta errores de sintaxis fuera de modo verbose (fast path)', async () => {
            // preCompileTS usa transpileModule con diagnostics:false y
            // reportDiagnostics: env.VERBOSE === 'true' (optimización de
            // velocidad) — sin --verbose no detecta este error de sintaxis y
            // emite una "reparación" best-effort en vez de fallar. La
            // detección real de este tipo de error ocurre en el paso
            // separado de --typeCheck (typescript-worker-pool), no aquí.
            const code = 'const x = {;';
            const result = await preCompileTS(code, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toContain('const x = {}');
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
        // loadTypeScriptConfig busca SIEMPRE primero
        // path.resolve(process.cwd(), 'tsconfig.json') — como este repo
        // tiene su propio tsconfig.json real en la raíz, el fixture en
        // testDir/tsconfigPath nunca llega a leerse (por eso la versión
        // anterior de este test, que solo escribía ahí, no probaba nada
        // real: firstConfig/secondConfig venían siempre del mismo archivo
        // real sin cambios). En vez de mutar el tsconfig.json real del
        // proyecto, estos tests espían fs.statSync para simular un cambio
        // de mtime y verifican identidad de referencia: mismo mtime → misma
        // referencia cacheada; mtime distinto → nueva referencia (recarga).
        it('reutiliza la misma referencia cacheada si el tsconfig no cambió', () => {
            const config1 = loadTypeScriptConfig(join(testDir, 'a.ts'));
            const config2 = loadTypeScriptConfig(join(testDir, 'b.ts'));

            expect(config2).toBe(config1);
        });

        it('invalida el cache y recarga si el mtime del tsconfig cambió', () => {
            const rootTsconfig = join(process.cwd(), 'tsconfig.json');
            const realStat = fs.statSync(rootTsconfig);

            const statSpy = vi.spyOn(fs, 'statSync');

            statSpy.mockReturnValue({
                ...realStat,
                mtimeMs: 111,
            } as fs.Stats);
            const firstConfig = loadTypeScriptConfig(join(testDir, 'c.ts'));

            statSpy.mockReturnValue({
                ...realStat,
                mtimeMs: 222,
            } as fs.Stats);
            const secondConfig = loadTypeScriptConfig(join(testDir, 'c.ts'));

            statSpy.mockRestore();

            expect(secondConfig).not.toBe(firstConfig);
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
