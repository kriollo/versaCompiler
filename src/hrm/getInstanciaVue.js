/**
 * Script para obtener la instancia de Vue usando solo JavaScript
 * Compatible con Vue 2 y Vue 3
 */

/**
 * @typedef {Object} VueInstance
 * @property {string} [version] - Versión de Vue
 * @property {Object} [config] - Configuración de Vue
 * @property {Object} [proxy] - Proxy del componente
 * @property {Object} [$options] - Opciones del componente (Vue 2)
 * @property {Object} [$router] - Router de Vue
 * @property {Object} [$store] - Store de Vuex/Pinia
 * @property {Array} [$children] - Componentes hijos (Vue 2)
 * @property {Object} [$data] - Datos del componente (Vue 2)
 */

/**
 * @typedef {Object} VueInstanceInfo
 * @property {string|null} version - Versión de Vue detectada
 * @property {string|null} type - Tipo de instancia de Vue
 * @property {boolean} hasRouter - Indica si tiene Vue Router
 * @property {boolean} hasStore - Indica si tiene Vuex/Pinia
 * @property {Object|number} components - Información de componentes
 * @property {string[]|null} data - Claves de datos del componente
 */

/**
 * Obtiene la instancia de Vue desde un elemento específico del DOM
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @returns {VueInstance|null} Instancia de Vue o null si no se encuentra
 */
function getVueInstanceFromElement(selector = '#app') {
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
function findVueInstanceInDOM() {
    const allElements = document.querySelectorAll('*');

    for (let element of allElements) {
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
function getVueFromGlobal() {
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
            const apps = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps;
            if (apps && apps.length > 0) {
                return apps[0];
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
function getVue3RootComponent(selector = '#app') {
    const element = document.querySelector(selector);
    if (!element) return null;

    // Vue 3 específico
    if (element._vnode && element._vnode.component) {
        return element._vnode.component;
    }

    if (element.__vueParentComponent) {
        return element.__vueParentComponent;
    }

    return null;
}

/**
 * Método principal que intenta obtener la instancia de Vue usando múltiples estrategias
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @returns {VueInstance|null} Instancia de Vue encontrada o null si no se encuentra
 */
function getVueInstance(selector = '#app') {
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
 * @returns {Promise<VueInstance>} Promise que resuelve con la instancia de Vue o rechaza si hay timeout
 */
function waitForVue(selector = '#app', timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        function check() {
            const instance = getVueInstance(selector);

            if (instance) {
                resolve(instance);
                return;
            }

            if (Date.now() - startTime > timeout) {
                reject(
                    new Error(
                        'Timeout: No se pudo encontrar la instancia de Vue',
                    ),
                );
                return;
            }

            setTimeout(check, 100);
        }

        check();
    });
}

/**
 * Obtiene información detallada sobre una instancia de Vue
 * @param {VueInstance} instance - Instancia de Vue a analizar
 * @returns {VueInstanceInfo|null} Objeto con información detallada de la instancia o null si no es válida
 */
function getVueInstanceInfo(instance) {
    if (!instance) return null;

    const info = {
        version: null,
        type: null,
        hasRouter: false,
        hasStore: false,
        components: {},
        data: null,
    };

    // Detectar versión y tipo
    if (instance.version) {
        info.version = instance.version;
        info.type = 'Vue Constructor';
    } else if (instance.config && instance.config.globalProperties) {
        info.type = 'Vue 3 App Instance';
        info.version = '3.x';
    } else if (instance.$options) {
        info.type = 'Vue 2 Component Instance';
        info.version = '2.x';
    }

    // Verificar router
    if (
        instance.$router ||
        (instance.config && instance.config.globalProperties.$router)
    ) {
        info.hasRouter = true;
    }

    // Verificar store (Vuex/Pinia)
    if (
        instance.$store ||
        (instance.config && instance.config.globalProperties.$store)
    ) {
        info.hasStore = true;
    }

    // Obtener componentes (Vue 2)
    if (instance.$children) {
        info.components = instance.$children.length;
    }

    // Obtener data (Vue 2)
    if (instance.$data) {
        info.data = Object.keys(instance.$data);
    }
    return info;
}

/**
 * Función principal que obtiene la instancia de Vue con toda la lógica integrada
 * @param {string} [selector='#app'] - Selector CSS del elemento que contiene la aplicación Vue
 * @param {number} [timeout=3000] - Tiempo máximo de espera en milisegundos
 * @returns {Promise<VueInstance|null>} Promise que resuelve con la instancia de Vue o null si no se encuentra
 */
async function obtenerInstanciaVue(selector = '#app', timeout = 3000) {
    try {
        // Intentar obtener la instancia inmediatamente
        let instance = getVueInstance(selector);

        if (instance) {
            // Obtener información detallada
            const info = getVueInstanceInfo(instance);
            console.log('✔️ Instancia Vue encontrada:', {
                instance,
                info,
                version: info?.version || 'Desconocida',
                type: info?.type || 'Desconocido',
            });
            return instance;
        }

        // Si no se encuentra inmediatamente, esperar
        console.log('⏳ Esperando instancia Vue...');
        instance = await waitForVue(selector, timeout);

        if (instance) {
            const info = getVueInstanceInfo(instance);
            console.log('✔️ Instancia Vue encontrada después de esperar:', {
                instance,
                info,
                version: info?.version || 'Desconocida',
                type: info?.type || 'Desconocido',
            });
            return instance;
        }

        console.warn('⚠️ No se pudo encontrar la instancia de Vue');
        return null;
    } catch (error) {
        console.error('❌ Error obteniendo instancia Vue:', error);
        return null;
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
