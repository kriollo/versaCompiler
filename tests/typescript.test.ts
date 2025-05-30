/**
 * Tests para la función preCompileTS
 * Verifica la compilación de TypeScript con diferentes configuraciones
 */

import { preCompileTS } from '../src/compiler/typescript';

describe('preCompileTS - Compilación TypeScript', () => {
    describe('Compilación básica', () => {
        test('debe compilar código TypeScript simple', async () => {
            const tsCode = `
export const add = (a: number, b: number): number => {
    return a + b;
};

export interface User {
    name: string;
    age: number;
}

export class Calculator {
    private value: number = 0;

    add(num: number): this {
        this.value += num;
        return this;
    }

    getResult(): number {
        return this.value;
    }
}
`;

            const result = await preCompileTS(tsCode, 'test.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(typeof result.data).toBe('string'); // Verificar que el código compilado no tiene tipos TypeScript
            expect(result.data).not.toContain(': number');
            expect(result.data).not.toContain('interface User');
            expect(result.data).toContain('export const add');
            expect(result.data).toContain('export class Calculator');
        });

        test('debe compilar código con imports y exports', async () => {
            const tsCode = `
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const processFile = async (filePath: string): Promise<string> => {
    const fullPath = path.resolve(filePath);
    const content = await readFile(fullPath, 'utf-8');
    return content.trim();
};

export type FileProcessor = (path: string) => Promise<string>;
`;

            const result = await preCompileTS(tsCode, 'fileProcessor.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain(
                "import { readFile } from 'node:fs/promises'",
            );
            expect(result.data).toContain("import path from 'node:path'");
            expect(result.data).toContain('export const processFile');
            expect(result.data).not.toContain(': Promise<string>');
            expect(result.data).not.toContain('export type FileProcessor');
        });

        test('debe manejar sintaxis moderna de TypeScript', async () => {
            const tsCode = `
export const config = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
} as const;

export type Config = typeof config;

export const fetchData = async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(\`\${config.apiUrl}/\${endpoint}\`);
    return response.json() as T;
};

export const useOptionalChaining = (obj?: { nested?: { value: string } }) => {
    return obj?.nested?.value ?? 'default';
};
`;

            const result = await preCompileTS(tsCode, 'modern.ts');
            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            // El "as const" puede ser eliminado por TypeScript en el transpilado
            // expect(result.data).toContain('as const');
            expect(result.data).toContain('async ');
            expect(result.data).toContain('obj?.nested?.value');
            expect(result.data).toContain('??');
            expect(result.data).not.toContain('<T>');
            expect(result.data).not.toContain(': Promise<T>');
        });
    });

    describe('Manejo de errores', () => {
        test('debe manejar errores de sintaxis TypeScript', async () => {
            const invalidTsCode = `
export const broken = (a: number, b: number): number => {
    return a + ; // Error de sintaxis
};

export interface InvalidInterface {
    name: string
    age: number // Falta coma
    email string; // Falta dos puntos
}
`;

            const result = await preCompileTS(invalidTsCode, 'invalid.ts');
            expect(result.error).not.toBeNull();
            expect(result.data).toBeNull();
            // El mensaje de error contiene información de ubicación del error
            expect(result.error?.message).toContain('Expression expected');
        });

        test('debe manejar código vacío', async () => {
            const result = await preCompileTS('', 'empty.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBe('');
        });

        test('debe manejar código solo con comentarios', async () => {
            const tsCode = `
// Este es un comentario
/*
 * Comentario multilínea
 */
`;

            const result = await preCompileTS(tsCode, 'comments.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
        });
    });

    describe('Características específicas de TypeScript', () => {
        test('debe eliminar tipos pero preservar la lógica', async () => {
            const tsCode = `
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

export class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        const url = \`\${this.baseUrl}/\${endpoint}\`;
        const response = await fetch(url);
        return response.json();
    }
}

export type UserData = {
    id: number;
    name: string;
    email: string;
};
`;

            const result = await preCompileTS(tsCode, 'apiClient.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();

            // Debe eliminar tipos y interfaces
            expect(result.data).not.toContain('interface ApiResponse');
            expect(result.data).not.toContain('<T>');
            expect(result.data).not.toContain(': Promise<ApiResponse<T>>');
            expect(result.data).not.toContain('export type UserData');

            // Debe preservar la lógica
            expect(result.data).toContain('export class ApiClient');
            expect(result.data).toContain('constructor(baseUrl)');
            expect(result.data).toContain('async get(endpoint)');
            expect(result.data).toContain('this.baseUrl = baseUrl');
        });

        test('debe manejar decorators si están habilitados', async () => {
            const tsCode = `
function LogMethod(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(\`Calling \${propertyName} with\`, args);
        return method.apply(this, args);
    };
}

export class Service {
    @LogMethod
    public processData(data: string): string {
        return data.toUpperCase();
    }
}
`;

            const result = await preCompileTS(tsCode, 'decorators.ts');

            // Los decorators están habilitados en el tsconfig.json
            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('export class Service');
        });
    });

    describe('Compatibilidad con configuración del proyecto', () => {
        test('debe usar las opciones del tsconfig.json del proyecto', async () => {
            const tsCode = `
export const moduleExample = () => {
    console.log('Testing module compilation');
};

export default moduleExample;
`;

            const result = await preCompileTS(tsCode, 'module.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();

            // Verificar que mantiene compatibilidad con ESNext
            expect(result.data).toContain('export const');
            expect(result.data).toContain('export default');
        });

        test('debe manejar paths alias del tsconfig.json', async () => {
            const tsCode = `
import { helper } from '@/utils/helper';
import { config } from 'P@/config/app';

export const useAliases = () => {
    return { helper, config };
};
`;

            const result = await preCompileTS(tsCode, 'aliases.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();

            // Los alias deberían mantenerse como están (sin resolver)
            // porque transpileModule no resuelve módulos
            expect(result.data).toContain("from '@/utils/helper'");
            expect(result.data).toContain("from 'P@/config/app'");
        });
    });

    describe('Rendimiento y robustez', () => {
        test('debe ejecutarse en tiempo razonable', async () => {
            const tsCode = `
export const largeFunction = () => {
    const data = [];
    for (let i = 0; i < 1000; i++) {
        data.push({
            id: i,
            name: \`Item \${i}\`,
            value: Math.random()
        });
    }
    return data;
};
`;

            const start = Date.now();
            const result = await preCompileTS(tsCode, 'performance.ts');
            const duration = Date.now() - start;

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(duration).toBeLessThan(5000); // Menos de 5 segundos
        });

        test('debe manejar múltiples compilaciones consecutivas', async () => {
            const tsCode1 = `export const func1 = (x: number) => x * 2;`;
            const tsCode2 = `export const func2 = (x: string) => x.toUpperCase();`;
            const tsCode3 = `export const func3 = (x: boolean) => !x;`;

            const results = await Promise.all([
                preCompileTS(tsCode1, 'file1.ts'),
                preCompileTS(tsCode2, 'file2.ts'),
                preCompileTS(tsCode3, 'file3.ts'),
            ]);

            results.forEach((result, index) => {
                expect(result.error).toBeNull();
                expect(result.data).toBeTruthy();
                expect(result.data).toContain(`func${index + 1}`);
            });
        });
    });
});
