/**
 * Tests for the Vue compiler functionality
 * Tests the transformation of Vue SFC files to JavaScript
 */

import fs from 'fs-extra';
import path from 'path';
import { preCompileVue } from '../src/compiler/vuejs';

// Define TypeScript interfaces for Vue compiler types
interface VueCompileOptions {
    filename: string;
    sourceMap?: boolean;
    sourceRoot?: string;
    [key: string]: any;
}

interface VueTemplateBlock {
    type: 'template';
    content: string;
    loc: { source: string };
}

interface VueScriptBlock {
    type: 'script';
    content: string;
    lang?: string;
    loc: { source: string };
}

interface VueStyleBlock {
    type: 'style';
    content: string;
    scoped?: boolean;
    module?: boolean;
    lang?: string;
    loc: { source: string };
}

interface VueCustomBlock {
    type: string;
    content: string;
    lang?: string;
    loc: { source: string };
}

interface VueSFCDescriptor {
    filename: string;
    source: string;
    template: VueTemplateBlock | null;
    script: VueScriptBlock | null;
    scriptSetup: VueScriptBlock | null;
    styles: VueStyleBlock[];
    customBlocks: VueCustomBlock[];
    cssVars: string[];
    slotted: boolean;
}

interface VueParseResult {
    descriptor: VueSFCDescriptor;
    errors: any[];
}

interface VueBindingMetadata {
    [key: string]: string;
}

interface VueCompileScriptOptions {
    id: string;
    isProd: boolean;
    inlineTemplate: boolean;
    templateOptions?: any;
    [key: string]: any;
}

interface VueScriptCompileResult {
    content: string;
    bindings: VueBindingMetadata;
    deps: string[];
    scriptAst?: any;
    scriptSetupAst?: any;
}

interface VueCompileTemplateOptions {
    source: string;
    filename: string;
    id: string;
    scoped: boolean;
    slotted: boolean;
    isProd?: boolean;
    compilerOptions?: any;
    [key: string]: any;
}

interface VueTemplateCompileResult {
    code: string;
    source: string;
    tips: string[];
    errors: any[];
}

interface VueCompileStyleOptions {
    id: string;
    source: string;
    filename: string;
    scoped?: boolean;
    preprocessLang?: 'less' | 'sass' | 'scss' | 'styl' | 'stylus';
    isProd?: boolean;
    trim?: boolean;
    [key: string]: any;
}

interface VueStyleCompileResult {
    code: string;
    map: any | null;
    errors: any[];
    modules?: Record<string, string>;
    dependencies: string[];
}

// Mock Vue compiler
jest.mock('vue/compiler-sfc', () => {
    return {
        parse: jest
            .fn()
            .mockImplementation(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    // Return a default descriptor structure
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: null,
                            script: null,
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            ),
        compileScript: jest
            .fn()
            .mockImplementation(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    // Default implementation returns empty content
                    return {
                        content: 'export default {};',
                        bindings: {},
                        deps: [],
                        scriptAst: null,
                        scriptSetupAst: null,
                    };
                },
            ),
        compileTemplate: jest
            .fn()
            .mockImplementation(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    // Default implementation returns a basic render function
                    return {
                        code: 'function render() { return h("div"); }',
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            ),
        compileStyle: jest
            .fn()
            .mockImplementation(
                (options: VueCompileStyleOptions): VueStyleCompileResult => {
                    // Default implementation returns the style source as code
                    return {
                        code: options.source,
                        map: null,
                        errors: [],
                        modules: {},
                        dependencies: [],
                    };
                },
            ),
    };
});

// Mock parser from the compiler
jest.mock('../src/compiler/parser', () => {
    return {
        parser: jest
            .fn()
            .mockImplementation(
                (filename: string, content: string, lang: string) => {
                    return {
                        program: {
                            body: [],
                            sourceType: 'module',
                            start: 0,
                            end: content.length,
                        },
                        errors: [],
                        module: {
                            staticImports: [],
                        },
                    };
                },
            ),
    };
});

describe('Vue Compiler', () => {
    const testDir = path.join(process.cwd(), 'temp-test-vue');

    beforeEach(async () => {
        // Create temporary directory for tests
        await fs.ensureDir(testDir);
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.remove(testDir);
        jest.clearAllMocks();
    });

    describe('Basic Vue Component Compilation', () => {
        test('should compile a minimal Vue component', async () => {
            const vueCode = `
<template>
    <div>Hello World</div>
</template>

<script>
export default {
    name: 'HelloWorld'
}
</script>
            `;

            // Get the real Vue compiler module to properly mock its behavior for this test
            const vCompiler = require('vue/compiler-sfc');

            // Mock the parse method to return a basic descriptor
            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>Hello World</div>',
                                loc: { source: '<div>Hello World</div>' },
                            },
                            script: {
                                type: 'script',
                                content:
                                    "export default { name: 'HelloWorld' }",
                                lang: 'js',
                                loc: {
                                    source: "export default { name: 'HelloWorld' }",
                                },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            // Mock the compileScript method
            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: "export default { name: 'HelloWorld' }",
                        bindings: { name: 'setup-const' },
                        deps: [],
                    };
                },
            );

            // Mock the compileTemplate method
            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', 'Hello World'); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(vueCode, 'HelloWorld.vue', true);

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('js');

            // The compiled output should contain the component definition and render function
            expect(result.data).toContain('export default');
            expect(result.data).toContain("name: 'HelloWorld'");
        });

        test('should handle components without a script section', async () => {
            const vueCode = `
<template>
    <div>Template Only Component</div>
</template>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>Template Only Component</div>',
                                loc: {
                                    source: '<div>Template Only Component</div>',
                                },
                            },
                            script: null,
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', 'Template Only Component'); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'TemplateOnly.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('js');
            expect(result.data).toContain('export default');
        });

        test('should handle a component with script setup', async () => {
            const vueCode = `
<template>
    <div>{{ message }}</div>
</template>

<script setup>
import { ref } from 'vue';
const message = ref('Hello from script setup');
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>{{ message }}</div>',
                                loc: { source: '<div>{{ message }}</div>' },
                            },
                            script: null,
                            scriptSetup: {
                                type: 'script',
                                content:
                                    "import { ref } from 'vue';\nconst message = ref('Hello from script setup');",
                                lang: 'js',
                                loc: {
                                    source: "import { ref } from 'vue';\nconst message = ref('Hello from script setup');",
                                },
                            },
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content:
                            "import { ref } from 'vue';\nconst message = ref('Hello from script setup');\nexport default { setup() { return { message }; } }",
                        bindings: { message: 'setup-ref' },
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', message.value); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'ScriptSetup.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('js');
            expect(result.data).toContain("import { ref } from 'vue'");
            expect(result.data).toContain(
                "message = ref('Hello from script setup')",
            );
        });
    });

    describe('TypeScript Support', () => {
        test('should handle script with TypeScript', async () => {
            const vueCode = `
<template>
    <div>{{ typedMessage }}</div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

interface Message {
    text: string;
    id: number;
}

export default defineComponent({
    setup() {
        const typedMessage = ref<Message>({ text: 'Hello TypeScript', id: 1 });
        return { typedMessage };
    }
});
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>{{ typedMessage }}</div>',
                                loc: {
                                    source: '<div>{{ typedMessage }}</div>',
                                },
                            },
                            script: {
                                type: 'script',
                                content: `import { defineComponent, ref } from 'vue';

interface Message {
    text: string;
    id: number;
}

export default defineComponent({
    setup() {
        const typedMessage = ref<Message>({ text: 'Hello TypeScript', id: 1 });
        return { typedMessage };
    }
});`,
                                lang: 'ts',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `import { defineComponent, ref } from 'vue';
export default defineComponent({
    setup() {
        const typedMessage = ref({ text: 'Hello TypeScript', id: 1 });
        return { typedMessage };
    }
});`,
                        bindings: { typedMessage: 'setup-ref' },
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', typedMessage.value.text); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'TypeScriptComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('ts');
            expect(result.data).toContain('import { defineComponent, ref }');
            expect(result.data).toContain('typedMessage = ref');
        });

        test('should handle script setup with TypeScript', async () => {
            const vueCode = `
<template>
    <div>{{ user.name }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface User {
    name: string;
    age: number;
}

const user = ref<User>({ name: 'John', age: 30 });
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>{{ user.name }}</div>',
                                loc: { source: '<div>{{ user.name }}</div>' },
                            },
                            script: null,
                            scriptSetup: {
                                type: 'script',
                                content: `import { ref } from 'vue';

interface User {
    name: string;
    age: number;
}

const user = ref<User>({ name: 'John', age: 30 });`,
                                lang: 'ts',
                                loc: { source: '...' },
                            },
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `import { ref } from 'vue';
const user = ref({ name: 'John', age: 30 });
export default { setup() { return { user }; } }`,
                        bindings: { user: 'setup-ref' },
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', user.value.name); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'TypeScriptSetup.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('ts');
            expect(result.data).toContain("import { ref } from 'vue'");
            expect(result.data).toContain(
                "user = ref({ name: 'John', age: 30 })",
            );
        });
    });

    describe('Template Features', () => {
        test('should handle different template syntaxes', async () => {
            const vueCode = `
<template>
    <div>
        <p v-if="showMessage">{{ message }}</p>
        <button @click="toggleMessage">Toggle</button>
        <ul>
            <li v-for="item in items" :key="item.id">{{ item.text }}</li>
        </ul>
    </div>
</template>

<script>
export default {
    data() {
        return {
            showMessage: true,
            message: 'Hello Vue',
            items: [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' }
            ]
        };
    },
    methods: {
        toggleMessage() {
            this.showMessage = !this.showMessage;
        }
    }
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div>
        <p v-if="showMessage">{{ message }}</p>
        <button @click="toggleMessage">Toggle</button>
        <ul>
            <li v-for="item in items" :key="item.id">{{ item.text }}</li>
        </ul>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    data() {
        return {
            showMessage: true,
            message: 'Hello Vue',
            items: [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' }
            ]
        };
    },
    methods: {
        toggleMessage() {
            this.showMessage = !this.showMessage;
        }
    }
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    data() {
        return {
            showMessage: true,
            message: 'Hello Vue',
            items: [
                { id: 1, text: 'Item 1' },
                { id: 2, text: 'Item 2' }
            ]
        };
    },
    methods: {
        toggleMessage() {
            this.showMessage = !this.showMessage;
        }
    }
}`,
                        bindings: {
                            showMessage: 'data',
                            message: 'data',
                            items: 'data',
                            toggleMessage: 'method',
                        },
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    (_ctx.showMessage)
      ? (_openBlock(), _createBlock("p", { key: 0 }, _toDisplayString(_ctx.message), 1))
      : _createCommentVNode("v-if", true),
    _createVNode("button", { onClick: _ctx.toggleMessage }, "Toggle", 8, ["onClick"]),
    _createVNode("ul", null, [
      (_openBlock(true), _createBlock(_Fragment, null, _renderList(_ctx.items, (item) => {
        return (_openBlock(), _createBlock("li", { key: item.id }, _toDisplayString(item.text), 1))
      }), 128))
    ])
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'TemplateSyntax.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('toggleMessage');
            expect(result.data).toContain('showMessage');
            expect(result.data).toContain('items');
        });

        test('should handle template with slots', async () => {
            const vueCode = `
<template>
    <div>
        <header>
            <slot name="header">Default Header</slot>
        </header>
        <main>
            <slot>Default Content</slot>
        </main>
        <footer>
            <slot name="footer">Default Footer</slot>
        </footer>
    </div>
</template>

<script>
export default {
    name: 'SlotComponent'
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div>
        <header>
            <slot name="header">Default Header</slot>
        </header>
        <main>
            <slot>Default Content</slot>
        </main>
        <footer>
            <slot name="footer">Default Footer</slot>
        </footer>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    name: 'SlotComponent'
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: true, // Important for slot support
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    name: 'SlotComponent'
}`,
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    _createVNode("header", null, [
      _renderSlot(_ctx.$slots, "header", {}, () => [
        _createTextVNode("Default Header")
      ])
    ]),
    _createVNode("main", null, [
      _renderSlot(_ctx.$slots, "default", {}, () => [
        _createTextVNode("Default Content")
      ])
    ]),
    _createVNode("footer", null, [
      _renderSlot(_ctx.$slots, "footer", {}, () => [
        _createTextVNode("Default Footer")
      ])
    ])
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'SlotComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("name: 'SlotComponent'");
            expect(result.data).toContain('$slots');
        });
    });

    describe('Style Features', () => {
        test('should handle scoped styles', async () => {
            const vueCode = `
<template>
    <div class="container">
        <h1 class="title">Scoped Styles Example</h1>
    </div>
</template>

<script>
export default {
    name: 'ScopedStyleComponent'
}
</script>

<style scoped>
.container {
    padding: 20px;
    background-color: #f5f5f5;
}
.title {
    color: #333;
    font-size: 24px;
}
</style>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div class="container">
        <h1 class="title">Scoped Styles Example</h1>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    name: 'ScopedStyleComponent'
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [
                                {
                                    type: 'style',
                                    content: `
.container {
    padding: 20px;
    background-color: #f5f5f5;
}
.title {
    color: #333;
    font-size: 24px;
}`,
                                    scoped: true,
                                    module: false,
                                    loc: { source: '...' },
                                },
                            ],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    name: 'ScopedStyleComponent'
}`,
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { class: "container" }, [
    _createVNode("h1", { class: "title" }, "Scoped Styles Example")
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            vCompiler.compileStyle.mockImplementationOnce(
                (options: VueCompileStyleOptions): VueStyleCompileResult => {
                    return {
                        code: `
.container[data-v-${options.id}] {
    padding: 20px;
    background-color: #f5f5f5;
}
.title[data-v-${options.id}] {
    color: #333;
    font-size: 24px;
}`,
                        map: null,
                        errors: [],
                        modules: {},
                        dependencies: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'ScopedStyle.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('data-v-');
            expect(result.data).toContain('padding: 20px');
            expect(result.data).toContain('color: #333');
        });

        test('should handle CSS preprocessors (SCSS)', async () => {
            const vueCode = `
<template>
    <div class="scss-container">
        <h1>SCSS Example</h1>
    </div>
</template>

<script>
export default {
    name: 'ScssComponent'
}
</script>

<style lang="scss">
$primary-color: #3498db;
$padding: 20px;

.scss-container {
    padding: $padding;
    background-color: lighten($primary-color, 30%);

    h1 {
        color: $primary-color;
        font-size: 24px;
    }
}
</style>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div class="scss-container">
        <h1>SCSS Example</h1>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    name: 'ScssComponent'
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [
                                {
                                    type: 'style',
                                    content: `
$primary-color: #3498db;
$padding: 20px;

.scss-container {
    padding: $padding;
    background-color: lighten($primary-color, 30%);

    h1 {
        color: $primary-color;
        font-size: 24px;
    }
}`,
                                    lang: 'scss',
                                    scoped: false,
                                    module: false,
                                    loc: { source: '...' },
                                },
                            ],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    name: 'ScssComponent'
}`,
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { class: "scss-container" }, [
    _createVNode("h1", null, "SCSS Example")
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            vCompiler.compileStyle.mockImplementationOnce(
                (options: VueCompileStyleOptions): VueStyleCompileResult => {
                    // Simulated processed SCSS
                    return {
                        code: `
.scss-container {
    padding: 20px;
    background-color: #b8dbf5;
}
.scss-container h1 {
    color: #3498db;
    font-size: 24px;
}`,
                        map: null,
                        errors: [],
                        modules: {},
                        dependencies: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'ScssComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('scss-container');
            expect(result.data).toContain('padding: 20px');
            expect(result.data).toContain('color: #3498db');
        });

        test('should handle CSS modules', async () => {
            const vueCode = `
<template>
    <div :class="$style.container">
        <h1 :class="$style.title">CSS Modules Example</h1>
    </div>
</template>

<script>
export default {
    name: 'CssModulesComponent'
}
</script>

<style module>
.container {
    padding: 20px;
    background-color: #f5f5f5;
}
.title {
    color: #333;
    font-size: 24px;
}
</style>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div :class="$style.container">
        <h1 :class="$style.title">CSS Modules Example</h1>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    name: 'CssModulesComponent'
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [
                                {
                                    type: 'style',
                                    content: `
.container {
    padding: 20px;
    background-color: #f5f5f5;
}
.title {
    color: #333;
    font-size: 24px;
}`,
                                    module: true,
                                    scoped: false,
                                    loc: { source: '...' },
                                },
                            ],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    name: 'CssModulesComponent'
}`,
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", { class: _ctx.$style.container }, [
    _createVNode("h1", { class: _ctx.$style.title }, "CSS Modules Example")
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            vCompiler.compileStyle.mockImplementationOnce(
                (options: VueCompileStyleOptions): VueStyleCompileResult => {
                    return {
                        code: `
.container_hash12345 {
    padding: 20px;
    background-color: #f5f5f5;
}
.title_hash67890 {
    color: #333;
    font-size: 24px;
}`,
                        map: null,
                        errors: [],
                        modules: {
                            container: 'container_hash12345',
                            title: 'title_hash67890',
                        },
                        dependencies: [],
                    };
                },
            );

            const result = await preCompileVue(vueCode, 'CssModules.vue', true);

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain('container_hash');
            expect(result.data).toContain('title_hash');
        });
    });

    describe('Import/Export Features', () => {
        test('should handle components with imports', async () => {
            const vueCode = `
<template>
    <div>
        <child-component />
    </div>
</template>

<script>
import { defineComponent } from 'vue';
import ChildComponent from './ChildComponent.vue';

export default defineComponent({
    components: {
        ChildComponent
    }
});
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div>
        <child-component />
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `import { defineComponent } from 'vue';
import ChildComponent from './ChildComponent.vue';

export default defineComponent({
    components: {
        ChildComponent
    }
});`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `import { defineComponent } from 'vue';
import ChildComponent from './ChildComponent.vue';

export default defineComponent({
    components: {
        ChildComponent
    }
});`,
                        bindings: {},
                        deps: ['./ChildComponent.vue'],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
import { resolveComponent as _resolveComponent } from 'vue'

export function render(_ctx, _cache) {
  const _component_child_component = _resolveComponent("child-component")

  return (_openBlock(), _createBlock("div", null, [
    _createVNode(_component_child_component)
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            // Mock parser to detect imports
            const parser = require('../src/compiler/parser');
            parser.parser.mockImplementationOnce(
                (filename: string, content: string, lang: string): any => {
                    return {
                        program: {
                            body: [],
                            sourceType: 'module',
                            start: 0,
                            end: content.length,
                        },
                        errors: [],
                        module: {
                            staticImports: [
                                {
                                    moduleRequest: {
                                        value: './ChildComponent.vue',
                                    },
                                    entries: [
                                        {
                                            localName: {
                                                value: 'ChildComponent',
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'ParentComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain(
                "import ChildComponent from './ChildComponent.vue'",
            );
            expect(result.data).toContain('components: {');
            expect(result.data).toContain('ChildComponent');
        });

        test('should handle script setup with imports and defineProps', async () => {
            const vueCode = `
<template>
    <div>
        <h1>{{ title }}</h1>
        <child-component :message="message" />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import ChildComponent from './ChildComponent.vue';

const props = defineProps({
    title: {
        type: String,
        required: true
    }
});

const message = ref('Hello from parent');
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div>
        <h1>{{ title }}</h1>
        <child-component :message="message" />
    </div>`,
                                loc: { source: '...' },
                            },
                            script: null,
                            scriptSetup: {
                                type: 'script',
                                content: `import { ref } from 'vue';
import ChildComponent from './ChildComponent.vue';

const props = defineProps({
    title: {
        type: String,
        required: true
    }
});

const message = ref('Hello from parent');`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `import { ref } from 'vue';
import ChildComponent from './ChildComponent.vue';

export default {
    props: {
        title: {
            type: String,
            required: true
        }
    },
    setup(props) {
        const message = ref('Hello from parent');
        return { message };
    },
    components: {
        ChildComponent
    }
};`,
                        bindings: {
                            title: 'props',
                            message: 'setup-ref',
                        },
                        deps: ['./ChildComponent.vue'],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
import { resolveComponent as _resolveComponent } from 'vue'

export function render(_ctx, _cache) {
  const _component_child_component = _resolveComponent("child-component")

  return (_openBlock(), _createBlock("div", null, [
    _createVNode("h1", null, _toDisplayString(_ctx.title), 1),
    _createVNode(_component_child_component, { message: _ctx.message }, null, 8, ["message"])
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            // Mock parser to detect imports
            const parser = require('../src/compiler/parser');
            parser.parser.mockImplementationOnce(
                (filename: string, content: string, lang: string): any => {
                    return {
                        program: {
                            body: [],
                            sourceType: 'module',
                            start: 0,
                            end: content.length,
                        },
                        errors: [],
                        module: {
                            staticImports: [
                                {
                                    moduleRequest: {
                                        value: './ChildComponent.vue',
                                    },
                                    entries: [
                                        {
                                            localName: {
                                                value: 'ChildComponent',
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'PropsComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("import { ref } from 'vue'");
            expect(result.data).toContain(
                "import ChildComponent from './ChildComponent.vue'",
            );
            expect(result.data).toContain('props: {');
            expect(result.data).toContain("message = ref('Hello from parent')");
        });
    });

    describe('Hot Module Replacement (HMR)', () => {
        test('should add HMR support to components in development mode', async () => {
            const vueCode = `
<template>
    <div>Regular Component</div>
</template>

<script>
export default {
    name: 'RegularComponent'
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');
            vCompiler.parse.mockImplementationOnce(
                (
                    _source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    // El source ahora incluirá el código HMR inyectado
                    return {
                        descriptor: {
                            filename: options.filename,
                            source: _source,
                            template: {
                                type: 'template',
                                content:
                                    '<div :key="versaComponentKey">Regular Component</div>',
                                loc: {
                                    source: '<div :key="versaComponentKey">Regular Component</div>',
                                },
                            },
                            script: {
                                type: 'script',
                                content: `
            import { ref } from "vue";
            const versaComponentKey = ref(0);
            export default { name: 'RegularComponent' }`,
                                lang: 'js',
                                loc: { source: 'script content with HMR' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    _descriptor: VueSFCDescriptor,
                    _options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `
            import { ref } from "vue";
            const versaComponentKey = ref(0);
            export default { name: 'RegularComponent' }`,
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', { key: versaComponentKey.value }, 'Regular Component'); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            // Test in development mode (isProd = false)
            const result = await preCompileVue(
                vueCode,
                'RegularComponent.vue',
                false,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('js');
            // Check if versaComponentKey was added for HMR
            expect(result.data).toContain('import { ref } from');
            expect(result.data).toContain('const versaComponentKey = ref(0)');
            expect(result.data).toContain('key: versaComponentKey.value');
        });

        test('should not add HMR support in production mode', async () => {
            const vueCode = `
<template>
    <div>Production Component</div>
</template>

<script>
export default {
    name: 'ProductionComponent'
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>Production Component</div>',
                                loc: {
                                    source: '<div>Production Component</div>',
                                },
                            },
                            script: {
                                type: 'script',
                                content:
                                    "export default { name: 'ProductionComponent' }",
                                lang: 'js',
                                loc: {
                                    source: "export default { name: 'ProductionComponent' }",
                                },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content:
                            "export default { name: 'ProductionComponent' }",
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', 'Production Component'); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            // Test in production mode (isProd = true)
            const result = await preCompileVue(
                vueCode,
                'ProductionComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();

            // In production mode, no HMR code should be added
            expect(result.data).not.toContain('versaComponentKey');
            expect(result.data).not.toContain(':key="versaComponentKey"');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle components with syntax errors in script', async () => {
            const vueCode = `
<template>
    <div>Component with Error</div>
</template>

<script>
export default {
    data() {
        return {
            message: 'Hello'
        }
    }
    // Missing comma here
    methods: {
        greet() {
            return this.message;
        }
    }
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: '<div>Component with Error</div>',
                                loc: {
                                    source: '<div>Component with Error</div>',
                                },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    data() {
        return {
            message: 'Hello'
        }
    }
    // Missing comma here
    methods: {
        greet() {
            return this.message;
        }
    }
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            // Make parser return an error
            const parser = require('../src/compiler/parser');
            parser.parser.mockImplementationOnce(
                (filename: string, content: string, lang: string): any => {
                    return {
                        program: null,
                        errors: [{ message: 'Unexpected token' }],
                        module: null,
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'ErrorComponent.vue',
                true,
            );

            expect(result.error).not.toBeNull();
            expect(result.data).toBeNull();
            expect(result.error?.message).toContain(
                'Error al analizar el script',
            );
        });

        test('should handle components with errors in template', async () => {
            const vueCode = `
<template>
    <div>
        <h1>{{ title }}</h1>
        <!-- Unclosed tag -->
        <ul>
            <li>Item 1
            <li>Item 2</li>
        </ul>
    </div>
</template>

<script>
export default {
    data() {
        return {
            title: 'Template Error Example'
        }
    }
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div>
        <h1>{{ title }}</h1>
        <!-- Unclosed tag -->
        <ul>
            <li>Item 1
            <li>Item 2</li>
        </ul>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `export default {
    data() {
        return {
            title: 'Template Error Example'
        }
    }
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    data() {
        return {
            title: 'Template Error Example'
        }
    }
}`,
                        bindings: { title: 'data' },
                        deps: [],
                    };
                },
            );

            // Make compileTemplate return an error
            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: '',
                        source: options.source,
                        tips: [],
                        errors: [{ msg: 'Element is missing end tag' }],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'TemplateErrorComponent.vue',
                true,
            );

            expect(result.data).toBeTruthy(); // The component should still compile even with template errors
            expect(result.error).toBeNull(); // Vue handles template errors, but doesn't stop compilation
        });

        test('should handle components without a template', async () => {
            const vueCode = `
<script>
export default {
    name: 'RenderFunctionComponent',
    render() {
        return this.$createElement('div', 'Created with render function');
    }
}
</script>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: null, // No template
                            script: {
                                type: 'script',
                                content: `export default {
    name: 'RenderFunctionComponent',
    render() {
        return this.$createElement('div', 'Created with render function');
    }
}`,
                                lang: 'js',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `export default {
    name: 'RenderFunctionComponent',
    render() {
        return this.$createElement('div', 'Created with render function');
    }
}`,
                        bindings: {},
                        deps: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'NoTemplateComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("name: 'RenderFunctionComponent'");
            expect(result.data).toContain('render()');
        });

        test('should handle components with custom blocks', async () => {
            const vueCode = `
<template>
    <div>Component with Custom Block</div>
</template>

<script>
export default {
    name: 'CustomBlockComponent'
}
</script>

<docs>
# Documentation Block
This is a component with a custom documentation block.

## Usage
\`\`\`vue
<custom-block-component />
\`\`\`
</docs>
            `;

            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content:
                                    '<div>Component with Custom Block</div>',
                                loc: {
                                    source: '<div>Component with Custom Block</div>',
                                },
                            },
                            script: {
                                type: 'script',
                                content:
                                    "export default { name: 'CustomBlockComponent' }",
                                lang: 'js',
                                loc: {
                                    source: "export default { name: 'CustomBlockComponent' }",
                                },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [
                                {
                                    type: 'docs',
                                    content: `# Documentation Block
This is a component with a custom documentation block.

## Usage
\`\`\`vue
<custom-block-component />
\`\`\``,
                                    lang: undefined,
                                    loc: { source: '...' },
                                },
                            ],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content:
                            "export default { name: 'CustomBlockComponent' }",
                        bindings: {},
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: "export function render() { return h('div', 'Component with Custom Block'); }",
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'CustomBlockComponent.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.data).toContain("name: 'CustomBlockComponent'");
            // Custom blocks should be included in some form
            expect(result.data).toContain('Documentation Block');
        });
    });

    describe('Integration with TypeScript', () => {
        test('should integrate with TypeScript compilation pipeline', async () => {
            const vueCode = `
<template>
    <div>
        <p>{{ message }}</p>
        <button @click="incrementCount">Count: {{ count }}</button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

interface State {
    count: number;
    message: string;
}

export default defineComponent({
    name: 'TypeScriptIntegration',
    setup() {
        const count = ref<number>(0);
        const message = ref<string>('TypeScript Integration');

        const incrementCount = (): void => {
            count.value++;
        };

        return {
            count,
            message,
            incrementCount
        };
    }
});
</script>
            `;

            // Mock entire compilation process
            const vCompiler = require('vue/compiler-sfc');

            vCompiler.parse.mockImplementationOnce(
                (
                    source: string,
                    options: VueCompileOptions,
                ): VueParseResult => {
                    return {
                        descriptor: {
                            filename: options.filename,
                            source,
                            template: {
                                type: 'template',
                                content: `<div>
        <p>{{ message }}</p>
        <button @click="incrementCount">Count: {{ count }}</button>
    </div>`,
                                loc: { source: '...' },
                            },
                            script: {
                                type: 'script',
                                content: `import { defineComponent, ref } from 'vue';

interface State {
    count: number;
    message: string;
}

export default defineComponent({
    name: 'TypeScriptIntegration',
    setup() {
        const count = ref<number>(0);
        const message = ref<string>('TypeScript Integration');

        const incrementCount = (): void => {
            count.value++;
        };

        return {
            count,
            message,
            incrementCount
        };
    }
});`,
                                lang: 'ts',
                                loc: { source: '...' },
                            },
                            scriptSetup: null,
                            styles: [],
                            customBlocks: [],
                            cssVars: [],
                            slotted: false,
                        },
                        errors: [],
                    };
                },
            );

            vCompiler.compileScript.mockImplementationOnce(
                (
                    descriptor: VueSFCDescriptor,
                    options: VueCompileScriptOptions,
                ): VueScriptCompileResult => {
                    return {
                        content: `import { defineComponent, ref } from 'vue';

export default defineComponent({
    name: 'TypeScriptIntegration',
    setup() {
        const count = ref(0);
        const message = ref('TypeScript Integration');

        const incrementCount = () => {
            count.value++;
        };

        return {
            count,
            message,
            incrementCount
        };
    }
});`,
                        bindings: {
                            count: 'setup-ref',
                            message: 'setup-ref',
                            incrementCount: 'setup-const',
                        },
                        deps: [],
                    };
                },
            );

            vCompiler.compileTemplate.mockImplementationOnce(
                (
                    options: VueCompileTemplateOptions,
                ): VueTemplateCompileResult => {
                    return {
                        code: `
export function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", null, [
    _createVNode("p", null, _toDisplayString(_ctx.message), 1),
    _createVNode("button", { onClick: _ctx.incrementCount }, "Count: " + _toDisplayString(_ctx.count), 9, ["onClick"])
  ]))
}`,
                        source: options.source,
                        tips: [],
                        errors: [],
                    };
                },
            );

            const result = await preCompileVue(
                vueCode,
                'TypeScriptIntegration.vue',
                true,
            );

            expect(result.error).toBeNull();
            expect(result.data).toBeTruthy();
            expect(result.lang).toBe('ts');
            expect(result.data).toContain(
                "import { defineComponent, ref } from 'vue'",
            );
            expect(result.data).toContain("name: 'TypeScriptIntegration'");
            expect(result.data).toContain('count = ref(0)');
            expect(result.data).toContain(
                "message = ref('TypeScript Integration')",
            );
            expect(result.data).toContain('incrementCount = () => {');
        });
    });
});
