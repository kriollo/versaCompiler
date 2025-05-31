/**
 * Integration tests for the compiler
 * Focuses on real-world scenarios, performance, and integration between Vue and TypeScript
 */

import fs from 'fs-extra';
import path from 'path';
import { compileFile } from '../src/compiler/compile';
import * as tsCompiler from '../src/compiler/typescript';
import * as vueCompiler from '../src/compiler/vuejs';

// Mock environment variables for testing
beforeEach(() => {
    process.env.PATH_SOURCE = path.resolve(
        process.cwd(),
        'temp-test-integration/src',
    );
    process.env.PATH_DIST = path.resolve(
        process.cwd(),
        'temp-test-integration/dist',
    );
    process.env.PATH_ALIAS = JSON.stringify({
        '@/*': ['/src/*'],
        '@components/*': ['/src/components/*'],
        '@utils/*': ['/src/utils/*'],
        '@assets/*': ['/src/assets/*'],
    });
    process.env.VERBOSE = 'false';
    process.env.isAll = 'false';
    process.env.isPROD = 'false';
    process.env.ENABLE_LINTER = 'false';
});

describe('Integration Tests', () => {
    const testDir = path.resolve(process.cwd(), 'temp-test-integration');
    const srcDir = path.join(testDir, 'src');
    const componentsDir = path.join(srcDir, 'components');
    const utilsDir = path.join(srcDir, 'utils');
    const assetsDir = path.join(srcDir, 'assets');
    const distDir = path.join(testDir, 'dist');

    beforeEach(async () => {
        // Create directory structure for tests
        await fs.ensureDir(testDir);
        await fs.ensureDir(srcDir);
        await fs.ensureDir(componentsDir);
        await fs.ensureDir(utilsDir);
        await fs.ensureDir(assetsDir);
        await fs.ensureDir(distDir);
    });

    afterEach(async () => {
        // Clean up test directory
        await fs.remove(testDir);
    });

    describe('Vue and TypeScript Integration', () => {
        test('should compile a Vue component with TypeScript', async () => {
            // Create a TypeScript utility file first
            const utilityTsPath = path.join(utilsDir, 'formatter.ts');
            const utilityTsContent = `
export interface DateFormatOptions {
    format: 'short' | 'medium' | 'long';
    locale?: string;
}

export function formatDate(date: Date, options: DateFormatOptions = { format: 'medium' }): string {
    const locale = options.locale || 'en-US';

    switch (options.format) {
        case 'short':
            return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
        case 'long':
            return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });
        case 'medium':
        default:
            return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
    }
}
`;
            await fs.writeFile(utilityTsPath, utilityTsContent);

            // Create a Vue component that uses TypeScript and imports the utility
            const componentVuePath = path.join(
                componentsDir,
                'DateDisplay.vue',
            );
            const componentVueContent = `
<template>
    <div class="date-display">
        <h3>{{ title }}</h3>
        <p class="date">{{ formattedDate }}</p>
        <button @click="changeFormat">Change Format</button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { formatDate, type DateFormatOptions } from '@utils/formatter';

export default defineComponent({
    name: 'DateDisplay',
    props: {
        date: {
            type: Date,
            required: true
        },
        title: {
            type: String,
            default: 'Current Date'
        }
    },
    setup(props) {
        const format = ref<DateFormatOptions['format']>('medium');

        const formattedDate = computed(() => {
            return formatDate(props.date, { format: format.value });
        });

        const changeFormat = () => {
            const formats: DateFormatOptions['format'][] = ['short', 'medium', 'long'];
            const currentIndex = formats.indexOf(format.value);
            const nextIndex = (currentIndex + 1) % formats.length;
            format.value = formats[nextIndex];
        };

        return {
            formattedDate,
            changeFormat
        };
    }
});
</script>

<style scoped>
.date-display {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 1rem;
}

.date {
    font-weight: bold;
    font-size: 1.2rem;
}

button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background-color: #45a049;
}
</style>
`;
            await fs.writeFile(componentVuePath, componentVueContent); // Set up spies BEFORE running compilation
            const preCompileVueSpy = jest.spyOn(vueCompiler, 'preCompileVue');
            const preCompileTSSpy = jest.spyOn(tsCompiler, 'preCompileTS');

            // First compile the utility
            const utilityCompileResult = await compileFile(utilityTsPath);
            expect(utilityCompileResult.success).toBe(true);
            expect(utilityCompileResult.output).toBeTruthy();

            // Then compile the component
            const componentCompileResult = await compileFile(componentVuePath);
            expect(componentCompileResult.success).toBe(true);
            expect(componentCompileResult.output).toBeTruthy();

            // Check both files were compiled
            expect(preCompileVueSpy).toHaveBeenCalled();
            expect(preCompileTSSpy).toHaveBeenCalled();

            // Clean up spies
            preCompileVueSpy.mockRestore();
            preCompileTSSpy.mockRestore();
        });

        test('should handle components with complex TypeScript features', async () => {
            // Create a complex TypeScript file with advanced features
            const complexTsPath = path.join(utilsDir, 'complex-types.ts');
            const complexTsContent = `
// Advanced TypeScript features: generic types, mapped types, conditional types

// Generic type with constraints
export type Identifiable<T extends { id: string | number }> = T & {
    createdAt: Date;
    updatedAt: Date;
};

// Mapped type
export type ReadOnly<T> = {
    readonly [K in keyof T]: T[K];
};

// Conditional type
export type IdType<T> = T extends { id: infer U } ? U : never;

// Type utility for extracting types from components
export type ExtractPropTypes<T> = {
    [K in keyof T]: T[K] extends { type: infer Type }
        ? Type extends { new (...args: any[]): infer V }
            ? V
            : never
        : never;
};

// Type with method signatures
export interface DataService<T> {
    getById(id: string | number): Promise<T>;
    getAll(): Promise<T[]>;
    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
    update(id: string | number, data: Partial<T>): Promise<T>;
    delete(id: string | number): Promise<boolean>;
}

// Concrete implementation
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
}

// Factory function using generics
export function createService<T extends { id: string | number }>(
    baseUrl: string
): DataService<Identifiable<T>> {
    return {
        async getById(id) {
            // Implementation would use fetch in real code
            return {} as Identifiable<T>;
        },
        async getAll() {
            return [] as Identifiable<T>[];
        },
        async create(data) {
            return {
                ...data as any,
                id: 'generated-id',
                createdAt: new Date(),
                updatedAt: new Date()
            } as Identifiable<T>;
        },
        async update(id, data) {
            return {
                ...data as any,
                id,
                updatedAt: new Date()
            } as Identifiable<T>;
        },
        async delete(id) {
            return true;
        }
    };
}

// Usage example
export const userService = createService<User>('/api/users');
`;
            await fs.writeFile(complexTsPath, complexTsContent);

            // Create a Vue component that uses the complex types
            const complexComponentPath = path.join(
                componentsDir,
                'UserEditor.vue',
            );
            const complexComponentContent = `
<template>
    <div class="user-editor">
        <h2>{{ isNew ? 'Create User' : 'Edit User' }}</h2>
        <form @submit.prevent="saveUser">
            <div class="form-group">
                <label for="name">Name:</label>
                <input id="name" v-model="userData.name" required />
            </div>
            <div class="form-group">
                <label for="email">Email:</label>
                <input id="email" type="email" v-model="userData.email" required />
            </div>
            <div class="form-group">
                <label for="role">Role:</label>
                <select id="role" v-model="userData.role">
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="guest">Guest</option>
                </select>
            </div>
            <div class="actions">
                <button type="submit">{{ isNew ? 'Create' : 'Update' }}</button>
                <button type="button" @click="cancel">Cancel</button>
            </div>
        </form>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { userService, type User, type Identifiable } from '@utils/complex-types';

export default defineComponent({
    name: 'UserEditor',
    props: {
        userId: {
            type: String,
            default: ''
        }
    },
    emits: ['saved', 'cancelled'],
    setup(props, { emit }) {
        const isNew = computed(() => !props.userId);
        const userData = ref<Partial<User>>({
            name: '',
            email: '',
            role: 'user'
        });

        onMounted(async () => {
            if (!isNew.value && props.userId) {
                try {
                    const user = await userService.getById(props.userId);
                    userData.value = {
                        name: user.name,
                        email: user.email,
                        role: user.role
                    };
                } catch (error) {
                    console.error('Failed to load user:', error);
                }
            }
        });

        const saveUser = async () => {
            try {
                let savedUser: Identifiable<User>;

                if (isNew.value) {
                    savedUser = await userService.create(userData.value as Omit<User, 'id'>);
                } else {
                    savedUser = await userService.update(props.userId, userData.value);
                }

                emit('saved', savedUser);
            } catch (error) {
                console.error('Failed to save user:', error);
            }
        };

        const cancel = () => {
            emit('cancelled');
        };

        return {
            isNew,
            userData,
            saveUser,
            cancel
        };
    }
});
</script>

<style scoped>
.user-editor {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
}

.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

input, select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button[type="submit"] {
    background-color: #4CAF50;
    color: white;
}

button[type="button"] {
    background-color: #f44336;
    color: white;
}
</style>
`;
            await fs.writeFile(complexComponentPath, complexComponentContent); // Create spy for this test
            const preCompileTSSpy = jest.spyOn(tsCompiler, 'preCompileTS');

            // Compile the files
            const tsCompileResult = await compileFile(complexTsPath);
            const vueCompileResult = await compileFile(complexComponentPath);

            expect(tsCompileResult.success).toBe(true);
            expect(vueCompileResult.success).toBe(true); // Verify TypeScript compilation was called with complex types
            expect(preCompileTSSpy).toHaveBeenCalled();

            // Check that preCompileTS was called with content containing 'type Identifiable'
            const calls = preCompileTSSpy.mock.calls;
            const hasIdentifiableType = calls.some(
                call =>
                    call[0] &&
                    typeof call[0] === 'string' &&
                    call[0].includes('type Identifiable'),
            );
            expect(hasIdentifiableType).toBe(true);

            // Clean up spy
            preCompileTSSpy.mockRestore();
        });
    });

    describe('Performance Tests', () => {
        test('should handle large files efficiently', async () => {
            // Create a large TypeScript file
            const largeTsPath = path.join(utilsDir, 'large-file.ts');

            // Generate a large file with many functions and types
            let largeFileContent = `
// Large TypeScript file with many functions and types
export namespace LargeModule {
`;

            // Add 100 interface definitions
            for (let i = 1; i <= 100; i++) {
                largeFileContent += `
    export interface Model${i} {
        id: string;
        name: string;
        value: number;
        created: Date;
        properties: {
            key1: string;
            key2: number;
            key3: boolean;
        };
        metadata: Record<string, any>;
    }
`;
            }

            // Add 100 function implementations
            for (let i = 1; i <= 100; i++) {
                largeFileContent += `
    export function processData${i}<T extends Model${i}>(data: T): T {
        console.log(\`Processing data for model ${i}\`);
        return {
            ...data,
            processed: true,
            processingDate: new Date()
        } as T;
    }
`;
            }

            largeFileContent += `
}

// Usage examples
const testData: LargeModule.Model1 = {
    id: '123',
    name: 'Test',
    value: 42,
    created: new Date(),
    properties: {
        key1: 'value1',
        key2: 123,
        key3: true
    },
    metadata: {
        tag: 'important',
        priority: 'high'
    }
};

const result = LargeModule.processData1(testData);
console.log(result);
`;
            await fs.writeFile(largeTsPath, largeFileContent); // Create a performance spy on the preCompileTS function
            const preCompileTSSpy = jest.spyOn(tsCompiler, 'preCompileTS');
            const startTime = Date.now();

            // Compile the large file
            const result = await compileFile(largeTsPath);

            const endTime = Date.now();
            const compilationTime = endTime - startTime;

            expect(result.success).toBe(true);

            // Verify TypeScript compilation was called
            expect(preCompileTSSpy).toHaveBeenCalled();

            // Log the compilation time for reference
            console.log(`Large file compilation time: ${compilationTime}ms`);

            // Compilation time should be reasonable (this threshold may need adjustment)
            expect(compilationTime).toBeLessThan(10000); // Less than 10 seconds

            // Clean up spy
            preCompileTSSpy.mockRestore();
        });

        test('should compile large Vue components efficiently', async () => {
            // Create a large Vue component with many template elements
            const largeComponentPath = path.join(
                componentsDir,
                'LargeTable.vue',
            );

            // Generate template with many rows and columns
            let tableTemplate = `
<template>
    <div class="large-table-container">
        <h2>{{ title }}</h2>
        <table class="large-table">
            <thead>
                <tr>
`;

            // Add 20 columns
            for (let col = 1; col <= 20; col++) {
                tableTemplate += `                    <th>Column ${col}</th>\n`;
            }

            tableTemplate += `
                </tr>
            </thead>
            <tbody>
`;

            // Add 100 rows with 20 columns each
            for (let row = 1; row <= 100; row++) {
                tableTemplate += `                <tr>\n`;
                for (let col = 1; col <= 20; col++) {
                    tableTemplate += `                    <td @click="cellClicked(${row}, ${col})">Row ${row}, Col ${col}</td>\n`;
                }
                tableTemplate += `                </tr>\n`;
            }

            tableTemplate += `
            </tbody>
        </table>
    </div>
</template>
`;

            // Add TypeScript component logic
            const componentScript = `
<script lang="ts">
import { defineComponent, ref } from 'vue';

interface CellEvent {
    row: number;
    column: number;
    timestamp: number;
}

export default defineComponent({
    name: 'LargeTable',
    props: {
        title: {
            type: String,
            default: 'Large Data Table'
        }
    },
    setup() {
        const events = ref<CellEvent[]>([]);

        const cellClicked = (row: number, column: number) => {
            const event: CellEvent = {
                row,
                column,
                timestamp: Date.now()
            };
            events.value.push(event);
            console.log(\`Cell clicked: Row \${row}, Column \${column}\`);
        };

        return {
            events,
            cellClicked
        };
    }
});
</script>
`;

            // Add styles
            const componentStyle = `
<style scoped>
.large-table-container {
    max-width: 100%;
    overflow-x: auto;
}

.large-table {
    border-collapse: collapse;
    width: 100%;
}

.large-table th, .large-table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

.large-table tr:nth-child(even) {
    background-color: #f2f2f2;
}

.large-table th {
    padding-top: 12px;
    padding-bottom: 12px;
    background-color: #4CAF50;
    color: white;
}

.large-table td:hover {
    background-color: #ddd;
    cursor: pointer;
}
</style>
`;
            const largeComponentContent =
                tableTemplate + componentScript + componentStyle;
            await fs.writeFile(largeComponentPath, largeComponentContent); // Create performance spies
            const preCompileVueSpy = jest.spyOn(vueCompiler, 'preCompileVue');
            const preCompileTSSpy = jest.spyOn(tsCompiler, 'preCompileTS');

            const startTime = Date.now();

            // Compile the large component
            const result = await compileFile(largeComponentPath);

            const endTime = Date.now();
            const compilationTime = endTime - startTime;

            expect(result.success).toBe(true);

            // Verify Vue and TypeScript compilation were called
            expect(preCompileVueSpy).toHaveBeenCalled();
            expect(preCompileTSSpy).toHaveBeenCalled();

            // Log the compilation time for reference
            console.log(
                `Large Vue component compilation time: ${compilationTime}ms`,
            );

            // Compilation time should be reasonable
            expect(compilationTime).toBeLessThan(10000); // Less than 10 seconds

            // Clean up spies
            preCompileVueSpy.mockRestore();
            preCompileTSSpy.mockRestore();
        });
    });

    describe('Concurrent Compilation', () => {
        test('should compile multiple files concurrently', async () => {
            // Create several files to compile
            const fileContents = {
                'component1.vue': `
<template>
    <div>Component 1</div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
    name: 'Component1'
});
</script>
`,
                'component2.vue': `
<template>
    <div>Component 2</div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
    name: 'Component2'
});
</script>
`,
                'component3.vue': `
<template>
    <div>Component 3</div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
    name: 'Component3'
});
</script>
`,
                'utility1.ts': `
export function utility1() {
    return 'utility1';
}
`,
                'utility2.ts': `
export function utility2() {
    return 'utility2';
}
`,
                'utility3.ts': `
export function utility3() {
    return 'utility3';
}
`,
            };

            // Create all the files
            const filePaths: string[] = [];
            for (const [filename, content] of Object.entries(fileContents)) {
                const filePath = path.join(
                    filename.endsWith('.vue') ? componentsDir : utilsDir,
                    filename,
                );
                await fs.writeFile(filePath, content);
                filePaths.push(filePath);
            }
            // Reset all mocks
            jest.clearAllMocks(); // Set up spies BEFORE compilation
            const preCompileVueSpy = jest.spyOn(vueCompiler, 'preCompileVue');
            const preCompileTSSpy = jest.spyOn(tsCompiler, 'preCompileTS');

            // Compile all files concurrently
            const startTime = Date.now();
            const compilePromises = filePaths.map(filePath =>
                compileFile(filePath),
            );
            const results = await Promise.all(compilePromises);
            const endTime = Date.now();

            // All compilations should succeed
            results.forEach(result => {
                expect(result.success).toBe(true);
            });

            // Log the time it took to compile all files
            const totalTime = endTime - startTime;
            console.log(
                `Compiled ${filePaths.length} files concurrently in ${totalTime}ms`,
            );

            // Verify the correct number of compilation calls
            // 3 Vue components + 3 TS files = at least 6 calls to precompileTS
            // (3 directly and 3 from Vue components with TypeScript)
            expect(preCompileTSSpy).toHaveBeenCalledTimes(6);
            expect(preCompileVueSpy).toHaveBeenCalledTimes(3);

            // Verify each file was compiled
            results.forEach((result, index) => {
                if (filePaths[index]) {
                    const parsedPath = path.parse(filePaths[index]);
                    expect(result.output).toContain(parsedPath.name);
                }
            });

            // Clean up spies
            preCompileVueSpy.mockRestore();
            preCompileTSSpy.mockRestore();
        });
    });

    describe('Real-world Scenarios', () => {
        test('should handle a complex application structure', async () => {
            // Create a realistic application structure with multiple components,
            // utilities, and nested imports

            // 1. Create utility files
            const apiClientPath = path.join(utilsDir, 'api-client.ts');
            const apiClientContent = `
export interface ApiResponse<T> {
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
        // Mock implementation
        return {
            data: {} as T,
            status: 200,
            message: 'Success'
        };
    }

    async post<T, R>(endpoint: string, data: T): Promise<ApiResponse<R>> {
        // Mock implementation
        return {
            data: {} as R,
            status: 201,
            message: 'Created'
        };
    }
}

export const api = new ApiClient('https://api.example.com');
`;
            await fs.writeFile(apiClientPath, apiClientContent);

            const storeUtilPath = path.join(utilsDir, 'store.ts');
            const storeUtilContent = `
import { ref, reactive, readonly } from 'vue';
import { api, type ApiResponse } from './api-client';

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface AppState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Create a simple reactive store
const state = reactive<AppState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
});

// Action to log in
export async function login(email: string, password: string): Promise<boolean> {
    state.isLoading = true;
    state.error = null;

    try {
        const response = await api.post<{ email: string, password: string }, User>(
            '/login',
            { email, password }
        );

        if (response.status === 200) {
            state.user = response.data;
            state.isAuthenticated = true;
            return true;
        } else {
            state.error = response.message;
            return false;
        }
    } catch (error) {
        state.error = error instanceof Error ? error.message : 'Unknown error';
        return false;
    } finally {
        state.isLoading = false;
    }
}

// Action to log out
export function logout(): void {
    state.user = null;
    state.isAuthenticated = false;
}

// Getter for the current state
export function useStore() {
    return {
        state: readonly(state),
        login,
        logout
    };
}
`;
            await fs.writeFile(storeUtilPath, storeUtilContent);

            // 2. Create components
            const loginFormPath = path.join(componentsDir, 'LoginForm.vue');
            const loginFormContent = `
<template>
    <form @submit.prevent="submitLogin" class="login-form">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="form-group">
            <label for="email">Email:</label>
            <input
                id="email"
                v-model="email"
                type="email"
                required
                :disabled="isLoading"
            />
        </div>

        <div class="form-group">
            <label for="password">Password:</label>
            <input
                id="password"
                v-model="password"
                type="password"
                required
                :disabled="isLoading"
            />
        </div>

        <button type="submit" :disabled="isLoading">
            {{ isLoading ? 'Logging in...' : 'Log in' }}
        </button>
    </form>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useStore } from '@utils/store';

export default defineComponent({
    name: 'LoginForm',
    emits: ['login-success', 'login-failure'],
    setup(props, { emit }) {
        const { state, login } = useStore();

        const email = ref('');
        const password = ref('');

        const isLoading = computed(() => state.isLoading);
        const error = computed(() => state.error);

        const submitLogin = async () => {
            const success = await login(email.value, password.value);
            if (success) {
                emit('login-success', state.user);
                // Clear form
                email.value = '';
                password.value = '';
            } else {
                emit('login-failure', error.value);
            }
        };

        return {
            email,
            password,
            isLoading,
            error,
            submitLogin
        };
    }
});
</script>

<style scoped>
.login-form {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
}

.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
}

input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

button {
    width: 100%;
    padding: 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.error-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
}
</style>
`;
            await fs.writeFile(loginFormPath, loginFormContent);

            const userProfilePath = path.join(componentsDir, 'UserProfile.vue');
            const userProfileContent = `
<template>
    <div class="user-profile" v-if="user">
        <div class="profile-header">
            <h2>{{ user.name }}</h2>
            <button @click="handleLogout">Log out</button>
        </div>

        <div class="profile-info">
            <p><strong>Email:</strong> {{ user.email }}</p>
            <p><strong>User ID:</strong> {{ user.id }}</p>
        </div>
    </div>
    <div v-else class="not-logged-in">
        <p>Please log in to view your profile</p>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useStore } from '@utils/store';
import type { User } from '@utils/store';

export default defineComponent({
    name: 'UserProfile',
    emits: ['logout'],
    setup(props, { emit }) {
        const { state, logout } = useStore();

        const user = computed(() => state.user);

        const handleLogout = () => {
            logout();
            emit('logout');
        };

        return {
            user,
            handleLogout
        };
    }
});
</script>

<style scoped>
.user-profile {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
}

.profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.profile-header h2 {
    margin: 0;
}

.profile-info p {
    margin: 10px 0;
}

button {
    padding: 8px 16px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.not-logged-in {
    text-align: center;
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 8px;
}
</style>
`;
            await fs.writeFile(userProfilePath, userProfileContent);

            // 3. Create a main App component that uses the other components
            const appComponentPath = path.join(componentsDir, 'App.vue');
            const appComponentContent = `
<template>
    <div class="app">
        <header class="app-header">
            <h1>Vue TypeScript App</h1>
        </header>

        <main class="app-content">
            <LoginForm
                v-if="!isAuthenticated"
                @login-success="onLoginSuccess"
                @login-failure="onLoginFailure"
            />

            <UserProfile
                v-else
                @logout="onLogout"
            />
        </main>

        <footer class="app-footer">
            <p>&copy; 2025 Vue TypeScript Demo</p>
        </footer>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { useStore, type User } from '@utils/store';
import LoginForm from './LoginForm.vue';
import UserProfile from './UserProfile.vue';

export default defineComponent({
    name: 'App',
    components: {
        LoginForm,
        UserProfile
    },
    setup() {
        const { state } = useStore();
        const loginMessage = ref('');

        const isAuthenticated = computed(() => state.isAuthenticated);

        const onLoginSuccess = (user: User) => {
            loginMessage.value = \`Welcome, \${user.name}!\`;
            console.log('Login successful', user);
        };

        const onLoginFailure = (error: string) => {
            loginMessage.value = \`Login failed: \${error}\`;
            console.error('Login failed', error);
        };

        const onLogout = () => {
            loginMessage.value = 'You have been logged out.';
            console.log('User logged out');
        };

        return {
            isAuthenticated,
            loginMessage,
            onLoginSuccess,
            onLoginFailure,
            onLogout
        };
    }
});
</script>

<style>
.app {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.app-header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.app-content {
    min-height: 500px;
}

.app-footer {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 1px solid #eee;
    text-align: center;
    color: #666;
}
</style>
`;
            await fs.writeFile(appComponentPath, appComponentContent);

            // 4. Create a main entry file
            const mainTsPath = path.join(srcDir, 'main.ts');
            const mainTsContent = `
import { createApp } from 'vue';
import App from '@components/App.vue';

// Mount the app
const app = createApp(App);
app.mount('#app');
`;
            await fs.writeFile(mainTsPath, mainTsContent);
            // Mock the TypeScript and Vue compilers to avoid actual compilation in tests
            jest.clearAllMocks(); // Set up spies BEFORE compilation
            const preCompileTSSpy = jest.spyOn(tsCompiler, 'preCompileTS');
            const preCompileVueSpy = jest.spyOn(vueCompiler, 'preCompileVue');

            // Compile all files
            const apiResult = await compileFile(apiClientPath);
            const storeResult = await compileFile(storeUtilPath);
            const loginFormResult = await compileFile(loginFormPath);
            const userProfileResult = await compileFile(userProfilePath);
            const appComponentResult = await compileFile(appComponentPath);
            const mainResult = await compileFile(mainTsPath);

            // All compilations should succeed
            expect(apiResult.success).toBe(true);
            expect(storeResult.success).toBe(true);
            expect(loginFormResult.success).toBe(true);
            expect(userProfileResult.success).toBe(true);
            expect(appComponentResult.success).toBe(true);
            expect(mainResult.success).toBe(true);
            // Verify the correct number of compilation calls
            // We should have 3 TypeScript files compiled directly (api-client.ts, store.ts, main.ts)
            // and 3 Vue files that need TypeScript compilation (LoginForm.vue, UserProfile.vue, App.vue)
            expect(preCompileTSSpy).toHaveBeenCalledTimes(6);
            expect(preCompileVueSpy).toHaveBeenCalledTimes(3);

            // Clean up spies
            preCompileTSSpy.mockRestore();
            preCompileVueSpy.mockRestore();
        });
    });
});
