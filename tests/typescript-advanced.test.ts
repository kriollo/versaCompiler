/**
 * Advanced tests for the TypeScript compiler functionality
 * Tests complex TypeScript features and edge cases
 */

import fs from 'fs-extra';
import path from 'path';
import { preCompileTS } from '../src/compiler/typescript';

// Mock the TypeScript module
jest.mock('typescript', () => {
    const original = jest.requireActual('typescript');
    return {
        ...original,
        // Mock specific functions as needed for tests
        findConfigFile: jest.fn().mockImplementation((dir: string, fileExists: (path: string) => boolean, configName: string) => {
            return path.resolve(process.cwd(), 'tsconfig.json');
        }),
        readConfigFile: jest.fn().mockImplementation((path: string, readFile: (path: string) => string) => {
            return {
                config: {
                    compilerOptions: {
                        target: "ESNext",
                        module: "ESNext",
                        moduleResolution: "node",
                        esModuleInterop: true,
                        experimentalDecorators: true,
                        emitDecoratorMetadata: true,
                        strictNullChecks: true,
                        sourceMap: true
                    }
                },
                error: null
            };
        }),
        parseJsonConfigFileContent: jest.fn().mockImplementation((json: any, sys: any, basePath: string) => {
            return {
                options: json.compilerOptions,
                fileNames: [],
                errors: []
            };
        }),
        transpileModule: jest.fn().mockImplementation((input: string, options: any) => {
            // Default mock implementation just strips type annotations
            // Will be overridden in specific tests
            const withoutTypes = input
                .replace(/: [^=;,)]+/g, '') // Remove type annotations
                .replace(/<[^>]+>/g, ''); // Remove generic type parameters

            return {
                outputText: withoutTypes,
                diagnostics: []
            };
        }),
        DiagnosticCategory: {
            Error: 1,
            Warning: 2,
            Suggestion: 3,
            Message: 4
        },
        flattenDiagnosticMessageText: jest.fn().mockImplementation((messageText: string | { messageText: string }) => {
            return typeof messageText === 'string' ? messageText : messageText.messageText;
        }),
        formatDiagnosticsWithColorAndContext: jest.fn().mockImplementation((diagnostics: Array<{ messageText: string }>) => {
            return diagnostics.map((d) => d.messageText).join('\n');
        }),
        sys: {
            fileExists: jest.fn().mockReturnValue(true),
            readFile: jest.fn().mockReturnValue('{}'),
            newLine: '\n'
        }
    };
});

describe('Advanced TypeScript Compiler', () => {
    const testDir = path.join(process.cwd(), 'temp-test-ts-advanced');

    beforeEach(async () => {
        // Create temporary directory for tests
        await fs.ensureDir(testDir);
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.remove(testDir);
        jest.clearAllMocks();
    });

    describe('Decorators', () => {
        test('should handle class decorators', async () => {
            const tsCode = `
function Logger(logString: string) {
    console.log('LOGGER FACTORY');
    return function(constructor: Function) {
        console.log(logString);
        console.log(constructor);
    };
}

@Logger('LOGGING - PERSON')
class Person {
    name = 'Max';

    constructor() {
        console.log('Creating person object...');
    }
}

const pers = new Person();
console.log(pers);
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Simplified output without decorators
                return {
                    outputText: `
function Logger(logString) {
    console.log('LOGGER FACTORY');
    return function(constructor) {
        console.log(logString);
        console.log(constructor);
    };
}

class Person {
    constructor() {
        this.name = 'Max';
        console.log('Creating person object...');
    }
}
Person = __decorate([
    Logger('LOGGING - PERSON')
], Person);

const pers = new Person();
console.log(pers);
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'decorators.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('__decorate');
            expect(result.data).toContain("Logger('LOGGING - PERSON')");
        });

        test('should handle property and method decorators', async () => {
            const tsCode = `
function Log(target: any, propertyName: string | Symbol) {
    console.log('Property decorator!');
    console.log(target, propertyName);
}

function LogMethod(target: any, name: string | Symbol, descriptor: PropertyDescriptor) {
    console.log('Method decorator!');
    console.log(target);
    console.log(name);
    console.log(descriptor);
}

function LogParameter(target: any, name: string | Symbol, position: number) {
    console.log('Parameter decorator!');
    console.log(target);
    console.log(name);
    console.log(position);
}

class Product {
    @Log
    title: string;
    private _price: number;

    constructor(t: string, p: number) {
        this.title = t;
        this._price = p;
    }

    @LogMethod
    getPriceWithTax(@LogParameter tax: number) {
        return this._price * (1 + tax);
    }
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Simplified output with decorators
                return {
                    outputText: `
function Log(target, propertyName) {
    console.log('Property decorator!');
    console.log(target, propertyName);
}

function LogMethod(target, name, descriptor) {
    console.log('Method decorator!');
    console.log(target);
    console.log(name);
    console.log(descriptor);
}

function LogParameter(target, name, position) {
    console.log('Parameter decorator!');
    console.log(target);
    console.log(name);
    console.log(position);
}

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
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'property-decorators.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('__decorate');
            expect(result.data).toContain('__param');
            expect(result.data).not.toContain(': string');
            expect(result.data).not.toContain(': number');
        });

        test('should handle decorator factories with metadata', async () => {
            const tsCode = `
import "reflect-metadata";

function Autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        enumerable: false,
        get() {
            return originalMethod.bind(this);
        }
    };
    return adjDescriptor;
}

function Required(target: any, propName: string) {
    Reflect.defineMetadata('required', true, target, propName);
}

function validate(obj: any): boolean {
    const requiredProps = Reflect.getMetadata('required', obj.constructor.prototype);
    if (!requiredProps) {
        return true;
    }
    return requiredProps.every((prop: string) => !!obj[prop]);
}

class FormValidator {
    @Required
    name: string;
    
    constructor(n: string) {
        this.name = n;
    }
    
    @Autobind
    validate() {
        return validate(this);
    }
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Simplified output with decorators and metadata
                return {
                    outputText: `
import "reflect-metadata";

function Autobind(_, _2, descriptor) {
    const originalMethod = descriptor.value;
    const adjDescriptor = {
        configurable: true,
        enumerable: false,
        get() {
            return originalMethod.bind(this);
        }
    };
    return adjDescriptor;
}

function Required(target, propName) {
    Reflect.defineMetadata('required', true, target, propName);
}

function validate(obj) {
    const requiredProps = Reflect.getMetadata('required', obj.constructor.prototype);
    if (!requiredProps) {
        return true;
    }
    return requiredProps.every((prop) => !!obj[prop]);
}

class FormValidator {
    constructor(n) {
        this.name = n;
    }
    
    validate() {
        return validate(this);
    }
}

__decorate([
    Required
], FormValidator.prototype, "name", void 0);

__decorate([
    Autobind
], FormValidator.prototype, "validate", null);
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'metadata-decorators.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('import "reflect-metadata"');
            expect(result.data).toContain('Reflect.defineMetadata');
            expect(result.data).toContain('Reflect.getMetadata');
            expect(result.data).not.toContain(': PropertyDescriptor');
            expect(result.data).not.toContain(': string');
        });
    });

    describe('Generic Types', () => {
        test('should handle complex generic types', async () => {
            const tsCode = `
interface Box<T> {
    value: T;
    map<U>(fn: (value: T) => U): Box<U>;
}

class GenericBox<T> implements Box<T> {
    constructor(public value: T) {}
    
    map<U>(fn: (value: T) => U): Box<U> {
        return new GenericBox(fn(this.value));
    }
}

// Function with multiple generic parameters
function createPair<T, U>(first: T, second: U): [T, U] {
    return [first, second];
}

// Generic constraints
interface Lengthwise {
    length: number;
}

function logLength<T extends Lengthwise>(item: T): T {
    console.log(item.length);
    return item;
}

// Generic with default type
interface GenericWithDefault<T = string> {
    value: T;
}

// Usage
const box = new GenericBox<number>(123);
const mappedBox = box.map(value => value.toString());
const pair = createPair<string, number>("hello", 42);
const lengthItem = logLength("test string");
const defaultGeneric: GenericWithDefault = { value: "default string" };
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with type information removed
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

// Function with multiple generic parameters
function createPair(first, second) {
    return [first, second];
}

function logLength(item) {
    console.log(item.length);
    return item;
}

// Usage
const box = new GenericBox(123);
const mappedBox = box.map(value => value.toString());
const pair = createPair("hello", 42);
const lengthItem = logLength("test string");
const defaultGeneric = { value: "default string" };
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'complex-generics.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).not.toContain('<T>');
            expect(result.data).not.toContain('<U>');
            expect(result.data).not.toContain(': Box<U>');
            expect(result.data).not.toContain('implements Box<T>');
            expect(result.data).toContain('class GenericBox');
            expect(result.data).toContain('function createPair');
            expect(result.data).toContain('const box = new GenericBox(123)');
        });

        test('should handle mapped and conditional types', async () => {
            const tsCode = `
// Conditional types
type TypeName<T> = 
    T extends string ? "string" :
    T extends number ? "number" :
    T extends boolean ? "boolean" :
    T extends undefined ? "undefined" :
    T extends Function ? "function" :
    "object";

// Mapped types
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

type Partial<T> = {
    [P in keyof T]?: T[P];
};

type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

type Record<K extends keyof any, T> = {
    [P in K]: T;
};

// Using mapped and conditional types
interface Person {
    name: string;
    age: number;
    address: string;
}

type ReadonlyPerson = Readonly<Person>;
type PartialPerson = Partial<Person>;
type NameAndAge = Pick<Person, "name" | "age">;
type StringRecord = Record<"a" | "b" | "c", string>;

// Conditional type with inference
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

function createUser(name: string, age: number) {
    return { name, age, createdAt: new Date() };
}

type User = ReturnType<typeof createUser>;

// Using conditional types
const typeName: TypeName<string> = "string";
const user: User = { name: "John", age: 30, createdAt: new Date() };
const readonlyUser: ReadonlyPerson = { name: "John", age: 30, address: "123 Main St" };
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with type information removed
                return {
                    outputText: `
function createUser(name, age) {
    return { name, age, createdAt: new Date() };
}

// Using conditional types
const typeName = "string";
const user = { name: "John", age: 30, createdAt: new Date() };
const readonlyUser = { name: "John", age: 30, address: "123 Main St" };
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'mapped-conditional-types.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).not.toContain('type TypeName');
            expect(result.data).not.toContain('type Readonly');
            expect(result.data).not.toContain('type Partial');
            expect(result.data).not.toContain('interface Person');
            expect(result.data).toContain('function createUser');
            expect(result.data).toContain('const user = { name: "John", age: 30, createdAt: new Date() }');
        });

        test('should handle utility types and type operators', async () => {
            const tsCode = `
// Using built-in utility types
interface Todo {
    title: string;
    description: string;
    completed: boolean;
    createdAt: Date;
}

type TodoPreview = Omit<Todo, "description" | "createdAt">;
type TodoInfo = Pick<Todo, "title" | "description">;
type ReadonlyTodo = Readonly<Todo>;

// Type operators
type Keys = keyof Todo;
type TodoOrNull = Todo | null;
type StringOrNumber = string & { length: number };

// Advanced utility types
type Nullable<T> = T | null;
type NonNullable<T> = T extends null | undefined ? never : T;
type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

// Using utility types
const todo: Todo = {
    title: "Clean room",
    description: "Clean the bedroom",
    completed: false,
    createdAt: new Date()
};

const todoPreview: TodoPreview = {
    title: "Clean room",
    completed: false
};

// Type assertions
const titleKey = "title" as keyof Todo;
const todoTitle = todo[titleKey];
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with type information removed
                return {
                    outputText: `
// Using utility types
const todo = {
    title: "Clean room",
    description: "Clean the bedroom",
    completed: false,
    createdAt: new Date()
};

const todoPreview = {
    title: "Clean room",
    completed: false
};

// Type assertions
const titleKey = "title";
const todoTitle = todo[titleKey];
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'utility-types.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).not.toContain('interface Todo');
            expect(result.data).not.toContain('type TodoPreview');
            expect(result.data).not.toContain('Omit<Todo,');
            expect(result.data).toContain('const todo = {');
            expect(result.data).toContain('const todoPreview = {');
            expect(result.data).toContain('const titleKey = "title"');
        });
    });

    describe('Import/Export Types', () => {
        test('should handle type imports and exports', async () => {
            const tsCode = `
// Importing types
import { ReactNode } from 'react';
import type { User, Post } from './types';
import { 
    type Comment,
    createPost
} from './api';

// Exporting types
export interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

export type UserId = string;
export type PostId = number;

// Re-exporting types
export type { User, Post };
export { type Comment };

// Using imported types
function renderContent(content: ReactNode): void {
    console.log(content);
}

function fetchUser(id: UserId): Promise<User> {
    return fetch(\`/api/users/\${id}\`).then(res => res.json());
}

// Exporting function that uses imported types
export function getPostsByUser(user: User): Promise<Post[]> {
    return fetch(\`/api/users/\${user.id}/posts\`).then(res => res.json());
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with type imports removed but value imports kept
                return {
                    outputText: `
// Importing types
import { createPost } from './api';

// Using imported types
function renderContent(content) {
    console.log(content);
}

function fetchUser(id) {
    return fetch(\`/api/users/\${id}\`).then(res => res.json());
}

// Exporting function that uses imported types
export function getPostsByUser(user) {
    return fetch(\`/api/users/\${user.id}/posts\`).then(res => res.json());
}
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'type-imports.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).not.toContain('import type');
            expect(result.data).not.toContain('export type');
            expect(result.data).not.toContain('export interface');
            expect(result.data).not.toContain('<T>');
            expect(result.data).toContain("import { createPost } from './api'");
            expect(result.data).toContain('function renderContent(content)');
            expect(result.data).toContain('export function getPostsByUser(user)');
        });

        test('should handle namespace imports and exports', async () => {
            const tsCode = `
// Namespace imports
import * as React from 'react';
import * as Types from './types';

// Namespace with types
namespace Validation {
    export interface StringValidator {
        isValid(s: string): boolean;
    }

    export class RegExpValidator implements StringValidator {
        constructor(private regex: RegExp) {}

        isValid(s: string): boolean {
            return this.regex.test(s);
        }
    }

    export type ValidatorType = 'regex' | 'custom';
}

// Export namespace
export namespace Utils {
    export function formatDate(date: Date): string {
        return date.toISOString();
    }

    export const APP_VERSION = '1.0.0';

    export interface AppConfig {
        apiUrl: string;
        timeout: number;
    }
}

// Using namespace members
const emailValidator = new Validation.RegExpValidator(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/);
const isValidEmail = emailValidator.isValid('test@example.com');

// Exporting types with namespaces
export interface User {
    id: string;
    name: string;
}

export namespace User {
    export function isAdmin(user: User): boolean {
        return user.id.startsWith('admin-');
    }
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with namespaces transformed
                return {
                    outputText: `
// Namespace imports
import * as React from 'react';
import * as Types from './types';

// Namespace with types
var Validation;
(function (Validation) {
    class RegExpValidator {
        constructor(regex) {
            this.regex = regex;
        }
        isValid(s) {
            return this.regex.test(s);
        }
    }
    Validation.RegExpValidator = RegExpValidator;
})(Validation || (Validation = {}));

// Export namespace
export var Utils;
(function (Utils) {
    function formatDate(date) {
        return date.toISOString();
    }
    Utils.formatDate = formatDate;
    Utils.APP_VERSION = '1.0.0';
})(Utils || (Utils = {}));

// Using namespace members
const emailValidator = new Validation.RegExpValidator(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/);
const isValidEmail = emailValidator.isValid('test@example.com');

// Exporting types with namespaces
export var User;
(function (User) {
    function isAdmin(user) {
        return user.id.startsWith('admin-');
    }
    User.isAdmin = isAdmin;
})(User || (User = {}));
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'namespaces.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("import * as React from 'react'");
            expect(result.data).toContain("import * as Types from './types'");
            expect(result.data).toContain('var Validation');
            expect(result.data).toContain('export var Utils');
            expect(result.data).toContain('Utils.formatDate = formatDate');
            expect(result.data).toContain('Utils.APP_VERSION = ');
            expect(result.data).toContain('export var User');
            expect(result.data).toContain('User.isAdmin = isAdmin');
            expect(result.data).not.toContain('interface StringValidator');
            expect(result.data).not.toContain('implements StringValidator');
        });
    });

    describe('Development vs Production', () => {
        test('should handle environment-specific code', async () => {
            const tsCode = `
// Constants based on environment
const IS_DEV = process.env.NODE_ENV !== 'production';
const API_URL = IS_DEV ? 'http://localhost:3000/api' : 'https://api.example.com';

// Development-only logging
function logDev(...args: any[]): void {
    if (IS_DEV) {
        console.log('[DEV]', ...args);
    }
}

// Class with development features
class ApiClient {
    private baseUrl: string;
    
    constructor() {
        this.baseUrl = API_URL;
        
        if (IS_DEV) {
            console.log('ApiClient initialized with URL:', this.baseUrl);
        }
    }
    
    async fetch<T>(endpoint: string): Promise<T> {
        const startTime = IS_DEV ? Date.now() : undefined;
        
        try {
            const response = await fetch(\`\${this.baseUrl}/\${endpoint}\`);
            const data = await response.json();
            
            if (IS_DEV && startTime) {
                console.log(\`Request to \${endpoint} took \${Date.now() - startTime}ms\`);
            }
            
            return data as T;
        } catch (error) {
            if (IS_DEV) {
                console.error('API Error:', error);
            }
            throw error;
        }
    }
    
    // Development-only method
    debugState(): void {
        if (IS_DEV) {
            console.log('Current API state:', {
                baseUrl: this.baseUrl,
                headers: this.getDefaultHeaders()
            });
        }
    }
    
    private getDefaultHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'X-Debug': IS_DEV ? 'true' : 'false'
        };
    }
}

// Export with conditional features
export {
    ApiClient,
    logDev,
    // Only expose in development
    ...(IS_DEV ? { debug: true } : {})
};
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with conditional features preserved
                return {
                    outputText: `
// Constants based on environment
const IS_DEV = process.env.NODE_ENV !== 'production';
const API_URL = IS_DEV ? 'http://localhost:3000/api' : 'https://api.example.com';

// Development-only logging
function logDev(...args) {
    if (IS_DEV) {
        console.log('[DEV]', ...args);
    }
}

// Class with development features
class ApiClient {
    constructor() {
        this.baseUrl = API_URL;
        
        if (IS_DEV) {
            console.log('ApiClient initialized with URL:', this.baseUrl);
        }
    }
    
    async fetch(endpoint) {
        const startTime = IS_DEV ? Date.now() : undefined;
        
        try {
            const response = await fetch(\`\${this.baseUrl}/\${endpoint}\`);
            const data = await response.json();
            
            if (IS_DEV && startTime) {
                console.log(\`Request to \${endpoint} took \${Date.now() - startTime}ms\`);
            }
            
            return data;
        } catch (error) {
            if (IS_DEV) {
                console.error('API Error:', error);
            }
            throw error;
        }
    }
    
    // Development-only method
    debugState() {
        if (IS_DEV) {
            console.log('Current API state:', {
                baseUrl: this.baseUrl,
                headers: this.getDefaultHeaders()
            });
        }
    }
    
    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Debug': IS_DEV ? 'true' : 'false'
        };
    }
}

// Export with conditional features
export {
    ApiClient,
    logDev,
    // Only expose in development
    ...(IS_DEV ? { debug: true } : {})
};
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'env-specific.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("const IS_DEV = process.env.NODE_ENV !== 'production'");
            expect(result.data).toContain('const API_URL = IS_DEV ?');
            expect(result.data).toContain('function logDev');
            expect(result.data).toContain('class ApiClient');
            expect(result.data).toContain('if (IS_DEV)');
            expect(result.data).toContain('debugState()');
            expect(result.data).toContain('...(IS_DEV ? { debug: true } : {})');
            expect(result.data).not.toContain('private baseUrl');
            expect(result.data).not.toContain('async fetch<T>');
        });

        test('should handle feature flags and debug code', async () => {
            const tsCode = `
// Feature flags
const FEATURES = {
    newUserInterface: process.env.ENABLE_NEW_UI === 'true',
    analytics: process.env.DISABLE_ANALYTICS !== 'true',
    experimentalApi: process.env.NODE_ENV !== 'production' && process.env.EXPERIMENTAL_API === 'true'
};

// Debug class that only does something in development
class DebugMonitor {
    private static instance: DebugMonitor;
    private events: Array<{ name: string, timestamp: number, data?: any }> = [];
    
    private constructor() {
        // Private constructor for singleton
        if (process.env.NODE_ENV === 'production') {
            // Disable most functionality in production
            this.events = null as any;
        }
    }
    
    static getInstance(): DebugMonitor {
        if (!DebugMonitor.instance) {
            DebugMonitor.instance = new DebugMonitor();
        }
        return DebugMonitor.instance;
    }
    
    logEvent(name: string, data?: any): void {
        if (process.env.NODE_ENV !== 'production' && this.events) {
            this.events.push({
                name,
                timestamp: Date.now(),
                data
            });
            
            if (process.env.DEBUG === 'true') {
                console.log(\`[DEBUG] \${name}\`, data);
            }
        }
    }
    
    getEvents(): Array<{ name: string, timestamp: number, data?: any }> {
        if (process.env.NODE_ENV !== 'production' && this.events) {
            return [...this.events];
        }
        return [];
    }
    
    clearEvents(): void {
        if (process.env.NODE_ENV !== 'production' && this.events) {
            this.events = [];
        }
    }
}

// Conditional code based on feature flags
function initializeApp(): void {
    if (FEATURES.newUserInterface) {
        document.body.classList.add('new-ui');
    }
    
    if (FEATURES.analytics) {
        initAnalytics();
    }
    
    if (FEATURES.experimentalApi) {
        DebugMonitor.getInstance().logEvent('Using experimental API');
    }
}

function initAnalytics(): void {
    // Analytics initialization code
    console.log('Analytics initialized');
}
            `;

            // Mock the TypeScript transpiler for this specific test
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with feature flags preserved
                return {
                    outputText: `
// Feature flags
const FEATURES = {
    newUserInterface: process.env.ENABLE_NEW_UI === 'true',
    analytics: process.env.DISABLE_ANALYTICS !== 'true',
    experimentalApi: process.env.NODE_ENV !== 'production' && process.env.EXPERIMENTAL_API === 'true'
};

// Debug class that only does something in development
class DebugMonitor {
    constructor() {
        this.events = [];
        // Private constructor for singleton
        if (process.env.NODE_ENV === 'production') {
            // Disable most functionality in production
            this.events = null;
        }
    }
    
    static getInstance() {
        if (!DebugMonitor.instance) {
            DebugMonitor.instance = new DebugMonitor();
        }
        return DebugMonitor.instance;
    }
    
    logEvent(name, data) {
        if (process.env.NODE_ENV !== 'production' && this.events) {
            this.events.push({
                name,
                timestamp: Date.now(),
                data
            });
            
            if (process.env.DEBUG === 'true') {
                console.log(\`[DEBUG] \${name}\`, data);
            }
        }
    }
    
    getEvents() {
        if (process.env.NODE_ENV !== 'production' && this.events) {
            return [...this.events];
        }
        return [];
    }
    
    clearEvents() {
        if (process.env.NODE_ENV !== 'production' && this.events) {
            this.events = [];
        }
    }
}

// Conditional code based on feature flags
function initializeApp() {
    if (FEATURES.newUserInterface) {
        document.body.classList.add('new-ui');
    }
    
    if (FEATURES.analytics) {
        initAnalytics();
    }
    
    if (FEATURES.experimentalApi) {
        DebugMonitor.getInstance().logEvent('Using experimental API');
    }
}

function initAnalytics() {
    // Analytics initialization code
    console.log('Analytics initialized');
}
                    `,
                    diagnostics: []
                };
            });

            const result = await preCompileTS(tsCode, 'feature-flags.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('const FEATURES = {');
            expect(result.data).toContain("process.env.ENABLE_NEW_UI === 'true'");
            expect(result.data).toContain('class DebugMonitor');
            expect(result.data).toContain('static getInstance()');
            expect(result.data).toContain('process.env.NODE_ENV !== \'production\'');
            expect(result.data).toContain('process.env.DEBUG === \'true\'');
            expect(result.data).toContain('function initializeApp()');
            expect(result.data).toContain('if (FEATURES.newUserInterface)');
            expect(result.data).not.toContain('private static instance');
            expect(result.data).not.toContain('private events');
        });
    });

    describe('Source Maps', () => {
        test('should handle source map generation', async () => {
            const tsCode = `
class User {
    private name: string;
    private email: string;
    
    constructor(name: string, email: string) {
        this.name = name;
        this.email = email;
    }
    
    getName(): string {
        return this.name;
    }
    
    getEmail(): string {
        return this.email;
    }
    
    getInfo(): { name: string, email: string } {
        return {
            name: this.name,
            email: this.email
        };
    }
}

const user = new User('John Doe', 'john@example.com');
console.log(user.getInfo());
            `;

            // Mock the TypeScript transpiler to include sourcemap
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with source map
                return {
                    outputText: `
class User {
    constructor(name, email) {
        this.name = name;
        this.email = email;
    }
    
    getName() {
        return this.name;
    }
    
    getEmail() {
        return this.email;
    }
    
    getInfo() {
        return {
            name: this.name,
            email: this.email
        };
    }
}

const user = new User('John Doe', 'john@example.com');
console.log(user.getInfo());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInVzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7SUFHSSxZQUFZLElBQVksRUFBRSxLQUFhO1FBQ25DLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxPQUFPO1FBQ0gsT0FBTztZQUNILElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztTQUNwQixDQUFDO0lBQ04sQ0FBQztDQUNKO0FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQUM7QUFDdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyJ9
                    `,
                    diagnostics: [],
                    sourceMapText: '{"version":3,"file":"user.js","sourceRoot":"","sources":["user.ts"],"names":[],"mappings":"AAAA;IAGI,YAAY,IAAY,EAAE,KAAa;QACnC,IAAI,CAAC,IAAI,GAAG,IAAI,CAAC;QACjB,IAAI,CAAC,KAAK,GAAG,KAAK,CAAC;IACvB,CAAC;IAED,OAAO;QACH,OAAO,IAAI,CAAC,IAAI,CAAC;IACrB,CAAC;IAED,QAAQ;QACJ,OAAO,IAAI,CAAC,KAAK,CAAC;IACtB,CAAC;IAED,OAAO;QACH,OAAO;YACH,IAAI,EAAE,IAAI,CAAC,IAAI;YACf,KAAK,EAAE,IAAI,CAAC,KAAK;SACpB,CAAC;IACN,CAAC;CACJ;AAED,MAAM,IAAI,GAAG,IAAI,IAAI,CAAC,UAAU,EAAE,kBAAkB,CAAC,CAAC;AACtD,OAAO,CAAC,GAAG,CAAC,IAAI,CAAC,OAAO,EAAE,CAAC,CAAC"}'
                };
            });

            const result = await preCompileTS(tsCode, 'user.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('class User');
            expect(result.data).toContain('constructor(name, email)');
            expect(result.data).toContain('//# sourceMappingURL=data:application/json;base64,');
            expect(result.data).not.toContain('private name: string');
            expect(result.data).not.toContain('private email: string');
        });

        test('should handle inline source maps', async () => {
            const tsCode = `
// A complex class with multiple methods for testing source maps
class DataProcessor<T> {
    private data: T[];
    private processingQueue: Array<(items: T[]) => T[]>;
    
    constructor(initialData: T[] = []) {
        this.data = [...initialData];
        this.processingQueue = [];
    }
    
    addItems(...items: T[]): this {
        this.data.push(...items);
        return this;
    }
    
    addTransformation(transformation: (items: T[]) => T[]): this {
        this.processingQueue.push(transformation);
        return this;
    }
    
    filter(predicate: (item: T) => boolean): this {
        return this.addTransformation(items => items.filter(predicate));
    }
    
    map<U>(mapper: (item: T) => U): DataProcessor<U> {
        const result = new DataProcessor<U>();
        result.addTransformation(items => 
            this.process().map(mapper)
        );
        return result;
    }
    
    process(): T[] {
        return this.processingQueue.reduce(
            (data, transformation) => transformation(data),
            [...this.data]
        );
    }
}

// Usage code to include in source map
const numbers = new DataProcessor<number>([1, 2, 3, 4, 5])
    .filter(n => n % 2 === 0)
    .addItems(6, 8, 10)
    .addTransformation(nums => nums.map(n => n * 2))
    .process();

console.log(numbers);
            `;

            // Mock the TypeScript transpiler to include inline source map
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                // Output with inline source map
                return {
                    outputText: `
class DataProcessor {
    constructor(initialData = []) {
        this.data = [...initialData];
        this.processingQueue = [];
    }
    
    addItems(...items) {
        this.data.push(...items);
        return this;
    }
    
    addTransformation(transformation) {
        this.processingQueue.push(transformation);
        return this;
    }
    
    filter(predicate) {
        return this.addTransformation(items => items.filter(predicate));
    }
    
    map(mapper) {
        const result = new DataProcessor();
        result.addTransformation(items => 
            this.process().map(mapper)
        );
        return result;
    }
    
    process() {
        return this.processingQueue.reduce(
            (data, transformation) => transformation(data),
            [...this.data]
        );
    }
}

// Usage code to include in source map
const numbers = new DataProcessor([1, 2, 3, 4, 5])
    .filter(n => n % 2 === 0)
    .addItems(6, 8, 10)
    .addTransformation(nums => nums.map(n => n * 2))
    .process();

console.log(numbers);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVByb2Nlc3Nvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGFQcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7SUFJSSxZQUFZLGNBQW1CLEVBQUUsR0FBRyxRQUFRO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCxRQUFRLENBQUMsR0FBRyxLQUFVO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELGlCQUFpQixDQUFDLGNBQW1DO1FBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxNQUFNLENBQUMsU0FBOEI7UUFDakMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELEdBQUcsQ0FBSSxNQUF3QjtRQUMzQixNQUFNLE1BQU0sR0FBRyxJQUFJLGFBQWEsRUFBSyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUNqQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUN6QixDQUFDO1FBQ0YsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUM5QixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFDOUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDakIsQ0FBQztJQUNOLENBQUM7Q0FDSjtBQUdELE1BQU0sT0FBTyxHQUFHLElBQUksYUFBYSxDQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3JELE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3hCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztLQUNsQixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDL0MsT0FBTyxFQUFFLENBQUM7QUFFZixPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDIn0=
                    `,
                    diagnostics: [],
                    sourceMapText: '{"version":3,"file":"dataProcessor.js","sourceRoot":"","sources":["dataProcessor.ts"],"names":[],"mappings":"AACA;IAII,YAAY,cAAmB,EAAE,GAAG,QAAQ;QACxC,IAAI,CAAC,IAAI,GAAG,CAAC,GAAG,cAAc,CAAC,CAAC;QAChC,IAAI,CAAC,eAAe,GAAG,EAAE,CAAC;IAC9B,CAAC;IAED,QAAQ,CAAC,GAAG,KAAU;QAClB,IAAI,CAAC,IAAI,CAAC,IAAI,CAAC,GAAG,KAAK,CAAC,CAAC;QACzB,OAAO,IAAI,CAAC;IAChB,CAAC;IAED,iBAAiB,CAAC,cAAmC;QACjD,IAAI,CAAC,eAAe,CAAC,IAAI,CAAC,cAAc,CAAC,CAAC;QAC1C,OAAO,IAAI,CAAC;IAChB,CAAC;IAED,MAAM,CAAC,SAA8B;QACjC,OAAO,IAAI,CAAC,iBAAiB,CAAC,KAAK,CAAC,EAAE,CAAC,KAAK,CAAC,MAAM,CAAC,SAAS,CAAC,CAAC,CAAC;IACpE,CAAC;IAED,GAAG,CAAI,MAAwB;QAC3B,MAAM,MAAM,GAAG,IAAI,aAAa,EAAK,CAAC;QACtC,MAAM,CAAC,iBAAiB,CAAC,KAAK,CAAC,EAAE,CACjC,IAAI,CAAC,OAAO,EAAE,CAAC,GAAG,CAAC,MAAM,CAAC,CACzB,CAAC;QACF,OAAO,MAAM,CAAC;IAClB,CAAC;IAED,OAAO;QACH,OAAO,IAAI,CAAC,eAAe,CAAC,MAAM,CAC9B,CAAC,IAAI,EAAE,cAAc,EAAE,EAAE,CAAC,cAAc,CAAC,IAAI,CAAC,EAC9C,CAAC,GAAG,IAAI,CAAC,IAAI,CAAC,CACjB,CAAC;IACN,CAAC;CACJ;AAGD,MAAM,OAAO,GAAG,IAAI,aAAa,CAAS,CAAC,CAAC,EAAE,CAAC,EAAE,CAAC,EAAE,CAAC,EAAE,CAAC,CAAC,CAAC;KACrD,MAAM,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC;KACxB,QAAQ,CAAC,CAAC,EAAE,CAAC,EAAE,EAAE,CAAC;KAClB,iBAAiB,CAAC,IAAI,CAAC,EAAE,CAAC,IAAI,CAAC,GAAG,CAAC,CAAC,CAAC,EAAE,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC;KAC/C,OAAO,EAAE,CAAC;AAEf,OAAO,CAAC,GAAG,CAAC,OAAO,CAAC,CAAC"}'
                };
            });

            const result = await preCompileTS(tsCode, 'dataProcessor.ts');

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('class DataProcessor');
            expect(result.data).toContain('addItems(...items)');
            expect(result.data).toContain('filter(predicate)');
            expect(result.data).toContain('//# sourceMappingURL=data:application/json;base64,');
            expect(result.data).not.toContain('private data: T[]');
            expect(result.data).not.toContain('<T>');
            expect(result.data).not.toContain('<U>');
        });
    });

    describe('Error Handling', () => {
        test('should handle type errors', async () => {
            const tsCode = `
// Code with type error
interface User {
    id: number;
    name: string;
    email: string;
}

function getUserName(user: User): string {
    return user.name;
}

// Error: Object literal does not match interface
const invalidUser = {
    id: "123", // Error: string is not assignable to number
    name: "John Doe",
    // Missing required email property
};

// This will cause a type error
const userName = getUserName(invalidUser);
            `;

            // Mock the TypeScript transpiler to return diagnostics
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                return {
                    outputText: `
function getUserName(user) {
    return user.name;
}

// Error: Object literal does not match interface
const invalidUser = {
    id: "123", // Error: string is not assignable to number
    name: "John Doe",
    // Missing required email property
};

// This will cause a type error
const userName = getUserName(invalidUser);
                    `,
                    diagnostics: [{
                        category: 1, // Error
                        code: 2322,
                        file: {
                            fileName: 'type-error.ts'
                        },
                        start: 217,
                        length: 5,
                        messageText: "Type 'string' is not assignable to type 'number'.",
                    }, {
                        category: 1, // Error
                        code: 2741,
                        file: {
                            fileName: 'type-error.ts'
                        },
                        start: 195,
                        length: 12,
                        messageText: "Property 'email' is missing in type '{ id: string; name: string; }' but required in type 'User'.",
                    }]
                };
            });

            const result = await preCompileTS(tsCode, 'type-error.ts');

            expect(result.error).not.toBeNull();
            expect(result.error?.message).toContain("Type 'string' is not assignable to type 'number'");
            expect(result.data).toBeNull();
        });

        test('should handle syntax errors', async () => {
            const tsCode = `
// Code with syntax error
function processData(data: string[]) {
    // Missing closing parenthesis
    for (let i = 0; i < data.length; i++ {
        console.log(data[i]);
    }
    
    // Unexpected token
    let value = 10 +* 5;
    
    return data.map(item => item.toUpperCase();
}
            `;

            // Mock the TypeScript transpiler to return syntax error
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                return {
                    outputText: '',
                    diagnostics: [{
                        category: 1, // Error
                        code: 1005,
                        file: {
                            fileName: 'syntax-error.ts'
                        },
                        start: 130,
                        length: 1,
                        messageText: "')' expected.",
                    }, {
                        category: 1, // Error
                        code: 1185,
                        file: {
                            fileName: 'syntax-error.ts'
                        },
                        start: 190,
                        length: 1,
                        messageText: "Unexpected token. '*' not expected.",
                    }, {
                        category: 1, // Error
                        code: 1005,
                        file: {
                            fileName: 'syntax-error.ts'
                        },
                        start: 256,
                        length: 1,
                        messageText: "')' expected.",
                    }]
                };
            });

            const result = await preCompileTS(tsCode, 'syntax-error.ts');

            expect(result.error).not.toBeNull();
            expect(result.error?.message).toContain("')' expected");
            expect(result.data).toBeNull();
        });

        test('should handle missing module errors', async () => {
            const tsCode = `
// Code with missing imports
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { NonExistentModule } from 'non-existent-module';
import { User } from './types';

function UserProfile({ userId }: { userId: string }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function fetchUser() {
            try {
                setLoading(true);
                const response = await axios.get(\`/api/users/\${userId}\`);
                setUser(response.data);
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchUser();
    }, [userId]);
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!user) {
        return <div>User not found</div>;
    }
    
    return (
        <div>
            <h1>{user.name}</h1>
            <p>Joined: {format(new Date(user.joinedAt), 'PPP')}</p>
            <NonExistentModule data={user} />
        </div>
    );
}
            `;

            // Mock the TypeScript transpiler to return module error but allow compilation
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                return {
                    outputText: `
// Code with missing imports
import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { NonExistentModule } from 'non-existent-module';
import { User } from './types';

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function fetchUser() {
            try {
                setLoading(true);
                const response = await axios.get(\`/api/users/\${userId}\`);
                setUser(response.data);
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchUser();
    }, [userId]);
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!user) {
        return <div>User not found</div>;
    }
    
    return (
        <div>
            <h1>{user.name}</h1>
            <p>Joined: {format(new Date(user.joinedAt), 'PPP')}</p>
            <NonExistentModule data={user} />
        </div>
    );
}
                    `,
                    diagnostics: [{
                        category: 1, // Error
                        code: 2307,
                        file: {
                            fileName: 'missing-module.ts'
                        },
                        start: 126,
                        length: 19,
                        messageText: "Cannot find module 'non-existent-module' or its corresponding type declarations.",
                    }, {
                        category: 1, // Error
                        code: 2307,
                        file: {
                            fileName: 'missing-module.ts'
                        },
                        start: 174,
                        length: 6,
                        messageText: "Cannot find module './types' or its corresponding type declarations.",
                    }]
                };
            });

            const result = await preCompileTS(tsCode, 'missing-module.ts');

            // We expect no error since we filter out module not found errors
            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("import { useState, useEffect } from 'react'");
            expect(result.data).toContain("import { NonExistentModule } from 'non-existent-module'");
            expect(result.data).toContain('function UserProfile');
        });

        test('should handle empty or invalid source code', async () => {
            // Test empty string
            const emptyResult = await preCompileTS('', 'empty.ts');
            expect(emptyResult.error).toBeNull();
            expect(emptyResult.data).toBe('');

            // Test whitespace only
            const whitespaceResult = await preCompileTS('   \n   \t   ', 'whitespace.ts');
            expect(whitespaceResult.error).toBeNull();
            expect(whitespaceResult.data).toBe('');

            // Test invalid TypeScript that can't be parsed
            const ts = require('typescript');
            ts.transpileModule.mockImplementationOnce(() => {
                throw new Error('Fatal TypeScript error: could not parse source');
            });

            const invalidResult = await preCompileTS('const x = @#$%^&', 'invalid.ts');
            expect(invalidResult.error).not.toBeNull();
            expect(invalidResult.error?.message).toContain('Fatal TypeScript error');
            expect(invalidResult.data).toBeNull();
        });
    });
});

