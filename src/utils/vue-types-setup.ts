/**
 * Utilidad para configurar automáticamente los tipos de Vue en proyectos
 * Facilita la integración de tipado robusto para archivos Vue
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Configuración para la instalación de tipos Vue
 */
interface VueTypesConfig {
    targetDir?: string;
    createTsConfig?: boolean;
    enableStrictMode?: boolean;
    includeRouterTypes?: boolean;
    includePiniaTypes?: boolean;
}

/**
 * Instala los archivos de tipos Vue en el proyecto
 * @param projectRoot - Directorio raíz del proyecto
 * @param config - Configuración para la instalación
 */
export const setupVueTypes = async (
    projectRoot: string,
    config: VueTypesConfig = {},
): Promise<boolean> => {
    try {
        const {
            targetDir = 'src/types',
            createTsConfig = false,
            enableStrictMode = false,
            includeRouterTypes = true,
            includePiniaTypes = true,
        } = config;

        const typesDir = path.join(projectRoot, targetDir);

        // Crear directorio de tipos si no existe
        if (!fs.existsSync(typesDir)) {
            fs.mkdirSync(typesDir, { recursive: true });
        } // Crear vue-shims.d.ts si no existe
        const vueShimsPath = path.join(typesDir, 'vue-shims.d.ts');

        if (!fs.existsSync(vueShimsPath)) {
            const shimsContent = generateVueShimsContent();
            fs.writeFileSync(vueShimsPath, shimsContent);
        }

        // Crear archivo de configuración específico del proyecto si se solicita
        if (createTsConfig) {
            await createProjectTsConfig(projectRoot, {
                enableStrictMode,
                includeRouterTypes,
                includePiniaTypes,
            });
        }

        // Crear archivo de entorno global para tipos adicionales
        const globalTypesPath = path.join(typesDir, 'global.d.ts');
        const globalTypesContent = generateGlobalTypes({
            includeRouterTypes,
            includePiniaTypes,
        });

        fs.writeFileSync(globalTypesPath, globalTypesContent);

        return true;
    } catch (error) {
        console.error('Error setting up Vue types:', error);
        return false;
    }
};

/**
 * Crea o actualiza tsconfig.json con configuración optimizada para Vue
 */
const createProjectTsConfig = async (
    projectRoot: string,
    options: {
        enableStrictMode: boolean;
        includeRouterTypes: boolean;
        includePiniaTypes: boolean;
    },
): Promise<void> => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

    const tsconfigContent = {
        compilerOptions: {
            target: 'esnext',
            module: 'esnext',
            lib: ['esnext', 'dom', 'dom.iterable'],
            allowJs: true,
            checkJs: false,
            jsx: 'preserve',
            declaration: true,
            declarationMap: true,
            sourceMap: true,
            outDir: './dist',
            removeComments: true,
            importHelpers: true,
            isolatedModules: true,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            forceConsistentCasingInFileNames: true,
            useDefineForClassFields: true,
            resolveJsonModule: true,
            skipLibCheck: true,
            moduleResolution: 'node',
            // Configuraciones de strictness
            strict: options.enableStrictMode,
            noImplicitAny: options.enableStrictMode,
            noImplicitReturns: options.enableStrictMode,
            noImplicitThis: options.enableStrictMode,
            strictNullChecks: options.enableStrictMode,
            strictFunctionTypes: options.enableStrictMode,
            // Paths para tipos
            baseUrl: '.',
            paths: {
                '@/*': ['src/*'],
                '@/types/*': ['src/types/*'],
            },
            types: [
                'node',
                'vue/ref-macros',
                ...(options.includeRouterTypes ? ['@vue/router'] : []),
                ...(options.includePiniaTypes ? ['pinia'] : []),
            ],
        },
        include: [
            'src/**/*.ts',
            'src/**/*.tsx',
            'src/**/*.vue',
            'src/types/**/*.d.ts',
        ],
        exclude: ['node_modules', 'dist'],
        'ts-node': {
            esm: true,
        },
    };

    // Si ya existe tsconfig.json, hacer merge inteligente
    if (fs.existsSync(tsconfigPath)) {
        try {
            const existingConfig = JSON.parse(
                fs.readFileSync(tsconfigPath, 'utf-8'),
            );
            const mergedConfig = {
                ...existingConfig,
                compilerOptions: {
                    ...existingConfig.compilerOptions,
                    ...tsconfigContent.compilerOptions,
                },
                include: Array.from(
                    new Set([
                        ...(existingConfig.include || []),
                        ...tsconfigContent.include,
                    ]),
                ),
            };
            fs.writeFileSync(
                tsconfigPath,
                JSON.stringify(mergedConfig, null, 2),
            );
        } catch {
            // Si hay error parseando, crear nuevo archivo
            fs.writeFileSync(
                tsconfigPath,
                JSON.stringify(tsconfigContent, null, 2),
            );
        }
    } else {
        fs.writeFileSync(
            tsconfigPath,
            JSON.stringify(tsconfigContent, null, 2),
        );
    }
};

/**
 * Genera tipos globales adicionales basados en las opciones
 */
const generateGlobalTypes = (options: {
    includeRouterTypes: boolean;
    includePiniaTypes: boolean;
}): string => {
    let content = `/**
 * Tipos globales adicionales para el proyecto
 * Generado automáticamente por VersaCompiler
 */

// Extensiones para window object si es necesario
declare global {
    interface Window {
        // Agregar propiedades globales si es necesario
        [key: string]: any;
    }
}

// Tipos para archivos de assets
declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.jpeg' {
    const src: string;
    export default src;
}

declare module '*.webp' {
    const src: string;
    export default src;
}

declare module '*.gif' {
    const src: string;
    export default src;
}

declare module '*.ico' {
    const src: string;
    export default src;
}
`;

    if (options.includeRouterTypes) {
        content += `
// Vue Router tipos adicionales
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $route: import('vue-router').RouteLocationNormalized;
        $router: import('vue-router').Router;
    }
}
`;
    }

    if (options.includePiniaTypes) {
        content += `
// Pinia tipos adicionales
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $pinia: import('pinia').Pinia;
    }
}
`;
    }

    content += '\nexport {};';

    return content;
};

/**
 * Genera el contenido del archivo vue-shims.d.ts
 * @returns El contenido completo del archivo de shims
 */
const generateVueShimsContent = (): string => {
    return `/**
 * Declaraciones de tipos Vue para VersaCompiler
 * Proporciona tipado robusto para archivos Vue
 */

/// <reference types="vue/ref-macros" />
/// <reference types="vue/reactivity-transform/macros" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

// Declaraciones globales para Composition API
declare global {
    // Reactivity API
    function ref<T>(value: T): { value: T };
    function reactive<T extends object>(target: T): T;
    function computed<T>(getter: () => T): { value: T };
    function readonly<T>(target: T): T;
    function unref<T>(ref: T): T extends { value: infer V } ? V : T;
    function toRef<T, K extends keyof T>(object: T, key: K): { value: T[K] };
    function toRefs<T extends object>(
        object: T,
    ): { [K in keyof T]: { value: T[K] } };
    function isRef<T>(ref: any): ref is { value: T };
    function isReactive(value: any): boolean;
    function isReadonly(value: any): boolean;
    function isProxy(value: any): boolean;
    function shallowRef<T>(value: T): { value: T };
    function shallowReactive<T extends object>(target: T): T;
    function shallowReadonly<T>(target: T): T;
    function toRaw<T>(observed: T): T;
    function markRaw<T>(value: T): T;
    function triggerRef<T>(ref: { value: T }): void;

    // Component API
    function defineComponent<T extends Record<string, any>>(options: T): T;
    function defineAsyncComponent<T>(loader: () => Promise<T>): T;

    // Props & Emits
    function defineProps<T = {}>(): T;
    function defineEmits<T extends Record<string, any> = {}>(): T;
    function defineExpose<T = {}>(exposed: T): void;
    function defineModel<T>(modelName?: string): { value: T };
    function withDefaults<T, D>(props: T, defaults: D): T & D;

    // Lifecycle Hooks
    function onBeforeMount(hook: () => void): void;
    function onMounted(hook: () => void): void;
    function onBeforeUpdate(hook: () => void): void;
    function onUpdated(hook: () => void): void;
    function onBeforeUnmount(hook: () => void): void;
    function onUnmounted(hook: () => void): void;
    function onActivated(hook: () => void): void;
    function onDeactivated(hook: () => void): void;
    function onErrorCaptured(
        hook: (err: Error, instance: any, info: string) => boolean | void,
    ): void;
    function onRenderTracked(hook: (event: any) => void): void;
    function onRenderTriggered(hook: (event: any) => void): void;
    function onServerPrefetch(hook: () => Promise<any>): void;

    // Dependency Injection
    function provide<T>(key: string | symbol, value: T): void;
    function inject<T>(key: string | symbol, defaultValue?: T): T | undefined;

    // Template Refs
    function templateRef<T = any>(key?: string): { value: T | null };

    // Watchers
    type WatchCallback<T> = (newValue: T, oldValue: T) => void;
    type WatchStopHandle = () => void;
    function watch<T>(
        source: () => T,
        callback: WatchCallback<T>,
        options?: any,
    ): WatchStopHandle;
    function watchEffect(effect: () => void, options?: any): WatchStopHandle;
    function watchPostEffect(
        effect: () => void,
        options?: any,
    ): WatchStopHandle;
    function watchSyncEffect(
        effect: () => void,
        options?: any,
    ): WatchStopHandle;

    // Utilities
    function nextTick(callback?: () => void): Promise<void>;
    function useSlots(): { [key: string]: (...args: any[]) => any };
    function useAttrs(): { [key: string]: any };
    function useModel<T>(modelName?: string): { value: T };
    function useCssModule(name?: string): { [key: string]: string };
    function useCssVars(vars: Record<string, string>): void;

    // Advanced Reactivity
    function customRef<T>(
        factory: (
            track: () => void,
            trigger: () => void,
        ) => { get: () => T; set: (value: T) => void },
    ): { value: T };
    function effectScope(): any;
    function getCurrentScope(): any;
    function onScopeDispose(fn: () => void): void;

    // Component Instance
    function getCurrentInstance(): any;
    function hasInjectionContext(): boolean;

    // Vue Router (common imports)
    function useRouter(): any;
    function useRoute(): any;

    // Pinia (common imports)
    function useStore(): any;
    function defineStore(id: string, setup: () => any): any;

    // Legacy Options API support
    interface ComponentOptions {
        name?: string;
        props?: any;
        data?: () => any;
        computed?: any;
        methods?: any;
        watch?: any;
        emits?: any;
        setup?: any;
        [key: string]: any;
    }

    // Vue 3 specific APIs
    function createApp(rootComponent: any, rootProps?: any): any;
    function defineCustomElement(options: any): any;
    function mergeModels<T>(models: T): T;
}

// Module augmentation for common Vue ecosystem types
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $route: any;
        $router: any;
        $store: any;
        [key: string]: any;
    }
}

// Support for .vue files in TypeScript
declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

// CSS Modules support
declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
}

declare module '*.module.scss' {
    const classes: { [key: string]: string };
    export default classes;
}

declare module '*.module.sass' {
    const classes: { [key: string]: string };
    export default classes;
}

declare module '*.module.less' {
    const classes: { [key: string]: string };
    export default classes;
}

declare module '*.module.styl' {
    const classes: { [key: string]: string };
    export default classes;
}

export {};
`;
};

/**
 * Verifica si el proyecto ya tiene tipos Vue configurados
 */
export const hasVueTypesSetup = (projectRoot: string): boolean => {
    const typesDir = path.join(projectRoot, 'src/types');
    const vueShimsPath = path.join(typesDir, 'vue-shims.d.ts');

    return fs.existsSync(vueShimsPath);
};

/**
 * Configuración automática para proyectos Vue detectados
 */
export const autoSetupVueTypes = async (
    projectRoot: string,
): Promise<boolean> => {
    // Verificar si es un proyecto Vue
    const packageJsonPath = path.join(projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        return false;
    }

    try {
        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf-8'),
        );
        const hasVue =
            packageJson.dependencies?.vue || packageJson.devDependencies?.vue;

        if (!hasVue) {
            return false;
        }

        // Si ya tiene tipos configurados, no hacer nada
        if (hasVueTypesSetup(projectRoot)) {
            return true;
        }

        // Detectar qué librerías adicionales usar
        const hasRouter =
            packageJson.dependencies?.['vue-router'] ||
            packageJson.devDependencies?.['vue-router'];
        const hasPinia =
            packageJson.dependencies?.pinia ||
            packageJson.devDependencies?.pinia;

        // Configurar tipos automáticamente
        return await setupVueTypes(projectRoot, {
            createTsConfig: !fs.existsSync(
                path.join(projectRoot, 'tsconfig.json'),
            ),
            includeRouterTypes: !!hasRouter,
            includePiniaTypes: !!hasPinia,
        });
    } catch (error) {
        console.error('Error in auto-setup Vue types:', error);
        return false;
    }
};
