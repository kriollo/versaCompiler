import { inject, type InjectionKey, provide } from 'vue';

export interface InjectionBundle<T> {
    key: InjectionKey<T>;
    provide: (value: T) => void;
    inject: () => T;
    tryInject: () => T | null | undefined;
}

export default function createInjection<T>(keyDesc: string): InjectionBundle<T> {
    const key: InjectionKey<T> = Symbol(keyDesc);
    return {
        key,
        provide: (value: T): void => provide(key, value),
        inject: (): T => {
            const injected = inject<T>(key);
            if (!injected) {
                throw new Error(`[Injection] "${keyDesc}" not provided`);
            }
            return injected;
        },
        tryInject: (): T | null | undefined => inject<T>(key), // Versión opcional que puede ser null
    };
}
