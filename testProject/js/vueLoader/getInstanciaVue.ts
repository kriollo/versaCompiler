// Extender las interfaces de TypeScript para incluir las propiedades personalizadas

declare global {
    interface Element {
        __vue_app__?: unknown;
        __vue__?: unknown;
    }

    interface Window {
        Vue?: unknown;
        __VUE_APP_INSTANCE__?: unknown;
        __VUE_DEVTOOLS_GLOBAL_HOOK__?: {
            apps: unknown[];
        };
    }
}

// Definir correctamente el tipo ExtendedElement
interface ExtendedElement extends Element {
    _vnode?: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- estructura interna de Vue
        component?: any;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- estructura interna de Vue
    __vueParentComponent?: any;
}

function getVueInstanceFromElement(selector = '#app'): any | null {
    const element = document.querySelector(selector);
    if (!element) {
        return null;
    }

    // Para Vue 3
    if (element.__vue_app__) {
        return element.__vue_app__;
    }

    // Para Vue 2
    if (element.__vue__) {
        return element.__vue__;
    }

    return null;
}

/**
 * Busca instancias de Vue en todos los elementos del DOM
 * @returns {VueInstance|null} Primera instancia de Vue encontrada o null si no se encuentra ninguna
 */
function findVueInstanceInDOM(): any | null {
    const allElements = document.querySelectorAll('*');

    for (const element of allElements) {
        // Vue 3
        if (element.__vue_app__) {
            return element.__vue_app__;
        }

        // Vue 2
        if (element.__vue__) {
            return element.__vue__;
        }
    }

    return null;
}

/**
 * Obtiene la instancia de Vue desde variables globales o herramientas de desarrollo
 * @returns {VueInstance|null} Instancia de Vue desde el contexto global o null si no se encuentra
 */
function getVueFromGlobal(): any | null {
    // Verificar si Vue está en el objeto global
    if (typeof window !== 'undefined') {
        // Vue como variable global
        if (window.Vue) {
            return window.Vue;
        }

        // Instancia específica guardada globalmente
        if (window.__VUE_APP_INSTANCE__) {
            return window.__VUE_APP_INSTANCE__;
        }

        // Vue DevTools
        if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
            const { apps } = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
            if (Array.isArray(apps) && apps.length > 0) {
                const [first] = apps;
                return first;
            }
        }
    }

    return null;
}

/**
 * Obtiene el componente raíz específico de Vue 3
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @returns {VueInstance|null} Componente raíz de Vue 3 o null si no se encuentra
 */
function getVue3RootComponent(selector = '#app'): any | null {
    const element = document.querySelector(selector);
    if (!element) {
        return null;
    }

    // Vue 3 específico
    const extendedElement = element as ExtendedElement;
    if (extendedElement._vnode && extendedElement._vnode.component) {
        return extendedElement._vnode.component;
    }

    if (extendedElement.__vueParentComponent) {
        return extendedElement.__vueParentComponent;
    }

    return null;
}

/**
 * Método principal que intenta obtener la instancia de Vue usando múltiples estrategias
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @returns {VueInstance|null} Instancia de Vue encontrada o null si no se encuentra
 */
function getVueInstance(selector = '#app'): any | null {
    let instance = null;

    // Intentar método 1: Desde elemento específico
    instance = getVueInstanceFromElement(selector);
    if (instance) {
        return instance;
    }

    // Intentar método 2: Buscar en DOM
    instance = findVueInstanceInDOM();
    if (instance) {
        return instance;
    }

    // Intentar método 3: Desde global
    instance = getVueFromGlobal();
    if (instance) {
        return instance;
    } // Intentar método 4: Componente raíz Vue 3
    instance = getVue3RootComponent(selector);
    if (instance) {
        return instance;
    }

    return null;
}

/**
 * Espera a que una instancia de Vue esté disponible en el DOM
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @param {number} [timeout=5000] - Tiempo máximo de espera en milisegundos
 * @param {function} callback - Función callback que se llama con la instancia de Vue encontrada
 */
function waitForVue(selector: string, timeout: number, callback: (instance: any) => void): void {
    const startTime = Date.now();

    const interval = setInterval(() => {
        const instance = getVueInstance(selector);
        if (instance) {
            clearInterval(interval);
            callback(instance);
        } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            throw new Error('Timeout waiting for Vue instance');
        }
    }, 100);
}

/**
 * Obtiene información detallada sobre una instancia de Vue
 * @param {VueInstance} instance - Instancia de Vue a analizar
 * @returns {VueInstanceInfo|null} Objeto con información detallada de la instancia o null si no es válida
 */
type VueInstanceInfo = {
    type: string | null;
    version: string | null;
    data: string[] | null;
    hasRouter?: boolean;
    hasStore?: boolean;
    components?: number;
} | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- API dinámica multi versión
function getVueInstanceInfo(instance: unknown): VueInstanceInfo {
    if (!instance || typeof instance !== 'object') {
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- acceso dinámico a propiedades internas
    const anyInstance = instance as any;
    const info: Exclude<VueInstanceInfo, null> = {
        type: null,
        version: null,
        data: null,
    };

    if (anyInstance.version) {
        info.version = anyInstance.version;
        info.type = 'Vue Constructor';
    } else if (anyInstance.config && anyInstance.config.globalProperties) {
        info.type = 'Vue 3 App Instance';
        info.version = '3.x';
    } else if (anyInstance.$options) {
        info.type = 'Vue 2 Component Instance';
        info.version = '2.x';
    }

    if (anyInstance.$router || (anyInstance.config && anyInstance.config.globalProperties.$router)) {
        info.hasRouter = true;
    }
    if (anyInstance.$store || (anyInstance.config && anyInstance.config.globalProperties.$store)) {
        info.hasStore = true;
    }
    if (anyInstance.$children) {
        try {
            info.components = anyInstance.$children.length;
        } catch {
            // Ignorar
        }
    }
    if (anyInstance.$data) {
        try {
            info.data = Object.keys(anyInstance.$data);
        } catch {
            info.data = null;
        }
    }
    return info;
}

/**
 * Función principal que obtiene la instancia de Vue con toda la lógica integrada
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @param {number} [timeout=3000] - Tiempo máximo de espera en milisegundos
 * @returns {Promise<any|null>} Promise que resuelve con la instancia de Vue o null si no se encuentra
 */
function obtenerInstanciaVue(selector = '#app', timeout = 3000): Promise<any | null> {
    try {
        // Intentar obtener la instancia inmediatamente
        const instance = getVueInstance(selector);

        if (instance) {
            return instance;
        }

        // Si no se encuentra inmediatamente, esperar
        waitForVue(selector, timeout, instance => instance);

        return Promise.resolve(null);
    } catch {
        return Promise.resolve(null);
    }
}

/**
 * Exporta la función principal para obtener instancias de Vue
 * @default obtenerInstanciaVue
 */
export default obtenerInstanciaVue;

/**
 * Exporta funciones adicionales para uso individual
 * @namespace VueInstanceHelpers
 */
export {
    findVueInstanceInDOM,
    getVue3RootComponent,
    getVueFromGlobal,
    getVueInstance,
    getVueInstanceFromElement,
    getVueInstanceInfo,
    obtenerInstanciaVue,
    waitForVue,
};
