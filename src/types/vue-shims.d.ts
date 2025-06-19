/**
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
