/**
 * Advanced tests for the TypeScript compiler functionality
 * Tests complex TypeScript features and edge cases
 */

import fs from 'fs-extra';
import path from 'path';
import { preCompileTS } from '../src/compiler/typescript-manager';

// Mock the TypeScript module
jest.mock('typescript', () => {
    const original = jest.requireActual('typescript');
    return {
        ...original,
        findConfigFile: jest.fn().mockImplementation(() => {
            return path.resolve(process.cwd(), 'tsconfig.json');
        }),
        readConfigFile: jest.fn().mockImplementation(() => {
            return {
                config: {
                    compilerOptions: {
                        target: 'ESNext',
                        module: 'ESNext',
                        moduleResolution: 'bundler',
                        esModuleInterop: true,
                        experimentalDecorators: true,
                        emitDecoratorMetadata: true,
                        strictNullChecks: true,
                        sourceMap: true,
                    },
                },
                error: null,
            };
        }),
        parseJsonConfigFileContent: jest
            .fn()
            .mockImplementation((json: any) => {
                return {
                    options: json.compilerOptions,
                    fileNames: [],
                    errors: [],
                };
            }),
        transpileModule: jest.fn().mockImplementation((input: string) => {
            // Default mock implementation just strips type annotations
            const withoutTypes = input
                .replace(/: [^=;,){}]+/g, '')
                .replace(/<[^>]+>/g, '')
                .replace(/interface\s+[^{]+\{[^}]*\}/g, '')
                .replace(/type\s+[^=]+=.*?;/g, '');

            return {
                outputText: withoutTypes,
                diagnostics: [],
            };
        }),
        DiagnosticCategory: {
            Error: 1,
            Warning: 2,
            Suggestion: 3,
            Message: 4,
        },
        flattenDiagnosticMessageText: jest
            .fn()
            .mockImplementation((messageText: any) => {
                return typeof messageText === 'string'
                    ? messageText
                    : messageText.messageText;
            }),
        formatDiagnosticsWithColorAndContext: jest
            .fn()
            .mockImplementation((diagnostics: any[]) => {
                return diagnostics.map(d => d.messageText).join('\n');
            }),
        sys: {
            fileExists: jest.fn().mockReturnValue(true),
            readFile: jest.fn().mockReturnValue('{}'),
            newLine: '\n',
        },
        createLanguageServiceHost: jest.fn(),
        createLanguageService: jest.fn().mockReturnValue({
            getSyntacticDiagnostics: jest.fn().mockReturnValue([]),
            getSemanticDiagnostics: jest.fn().mockReturnValue([]),
        }),
        createProgram: jest.fn(),
        createCompilerHost: jest.fn(),
    };
});

describe('Advanced TypeScript Compiler', () => {
    const testDir = path.join(process.cwd(), 'temp-test-ts-advanced');

    beforeEach(async () => {
        // Create temporary directory for tests
        await fs.ensureDir(testDir);
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.remove(testDir);
        jest.clearAllMocks();
    });

    describe('Decorators', () => {
        test('should handle class decorators', async () => {
            const tsCode = `
@Logger('LOGGING - PERSON')
class Person {
    name = 'Max';

    constructor() {
        console.log('Creating person object...');
    }
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = await import('typescript');
            (ts.transpileModule as jest.Mock).mockImplementationOnce(() => {
                return {
                    outputText: `
class Person {
    constructor() {
        this.name = 'Max';
        console.log('Creating person object...');
    }
}
Person = __decorate([
    Logger('LOGGING - PERSON')
], Person);
                    `,
                    diagnostics: [],
                };
            });

            const result = await preCompileTS(tsCode, 'decorators.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('__decorate');
        });

        test('should handle property and method decorators', async () => {
            const tsCode = `
class Product {
    @Log
    title: string;
    private _price: number;

    @LogMethod
    getPriceWithTax(@LogParameter tax: number) {
        return this._price * (1 + tax);
    }
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            (ts.transpileModule as jest.Mock).mockImplementationOnce(() => {
                return {
                    outputText: `
class Product {
    constructor(t, p) {
        this.title = t;
        this._price = p;
    }
    getPriceWithTax(tax) {
        return this._price * (1 + tax);
    }
}
__decorate([
    Log
], Product.prototype, "title", void 0);
__decorate([
    LogMethod,
    __param(0, LogParameter)
], Product.prototype, "getPriceWithTax", null);
                    `,
                    diagnostics: [],
                };
            });

            const result = await preCompileTS(tsCode, 'property-decorators.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('__decorate');
            expect(result.data).toContain('__param');
        });
    });

    describe('Generic Types', () => {
        test('should handle complex generic types', async () => {
            const tsCode = `
class GenericBox<T> {
    constructor(public value: T) {}

    map<U>(fn: (value: T) => U): GenericBox<U> {
        return new GenericBox(fn(this.value));
    }
}

const box = new GenericBox<number>(123);
            `;

            const ts = require('typescript');
            (ts.transpileModule as jest.Mock).mockImplementationOnce(() => {
                return {
                    outputText: `
class GenericBox {
    constructor(value) {
        this.value = value;
    }

    map(fn) {
        return new GenericBox(fn(this.value));
    }
}

const box = new GenericBox(123);
                    `,
                    diagnostics: [],
                };
            });

            const result = await preCompileTS(tsCode, 'complex-generics.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('class GenericBox');
            expect(result.data).toContain('const box = new GenericBox(123)');
        });
    });

    describe('Error Handling', () => {
        test('should handle type errors in individual mode', async () => {
            const tsCode = `
interface User {
    id: number;
    name: string;
}

const invalidUser = {
    id: "123", // Error: string is not assignable to number
    name: "John Doe"
};
            `;

            // Mock TypeScript to return errors
            const ts = require('typescript');
            (ts.transpileModule as jest.Mock).mockImplementationOnce(() => {
                return {
                    outputText: `
const invalidUser = {
    id: "123",
    name: "John Doe"
};
                    `,
                    diagnostics: [
                        {
                            category: 1, // Error
                            code: 2322,
                            file: {
                                fileName: 'type-error.ts',
                                getLineAndCharacterOfPosition: jest
                                    .fn()
                                    .mockReturnValue({ line: 7, character: 8 }),
                            },
                            start: 217,
                            length: 5,
                            messageText:
                                "Type 'string' is not assignable to type 'number'.",
                        },
                    ],
                };
            });
            const result = await preCompileTS(tsCode, 'type-error.ts');

            // Los errores de tipo deberían detener la compilación
            expect(result.error).not.toBeNull();
            expect(result.error?.message).toContain(
                "Type 'string' is not assignable to type 'number'",
            );
        });

        test('should handle missing module errors gracefully', async () => {
            const tsCode = `
import { NonExistentModule } from 'non-existent-module';
import { User } from './types';

const user = new User();
            `;

            const ts = require('typescript');
            (ts.transpileModule as jest.Mock).mockImplementationOnce(() => {
                return {
                    outputText: `
import { NonExistentModule } from 'non-existent-module';
import { User } from './types';

const user = new User();
                    `,
                    diagnostics: [
                        {
                            category: 1, // Error
                            code: 2307, // Cannot find module
                            file: {
                                fileName: 'missing-module.ts',
                                getLineAndCharacterOfPosition: jest
                                    .fn()
                                    .mockReturnValue({ line: 1, character: 0 }),
                            },
                            start: 0,
                            length: 19,
                            messageText:
                                "Cannot find module 'non-existent-module'",
                        },
                    ],
                };
            });

            const result = await preCompileTS(tsCode, 'missing-module.ts');

            // Los errores de módulo no encontrado deberían permitir que la compilación continúe
            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('import { NonExistentModule }');
        });

        test('should handle empty source code', async () => {
            const result = await preCompileTS('', 'empty.ts');
            expect(result.error).toBeNull();
            expect(result.data).toBe('');
        });

        test('should handle whitespace only source code', async () => {
            const result = await preCompileTS('   \n   \t   ', 'whitespace.ts');
            expect(result.error).toBeNull();
            expect(result.data).toBe('   \n   \t   '); // Preserva el whitespace
        });
    });

    describe('Source Maps', () => {
        test('should handle source map generation', async () => {
            const tsCode = `
class User {
    constructor(name: string) {
        this.name = name;
    }
}
            `;

            const ts = require('typescript');
            (ts.transpileModule as jest.Mock).mockImplementationOnce(() => {
                return {
                    outputText: `
class User {
    constructor(name) {
        this.name = name;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==
                    `,
                    diagnostics: [],
                };
            });

            const result = await preCompileTS(tsCode, 'user.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('class User');
            expect(result.data).toContain('//# sourceMappingURL=');
        });
    });
});
