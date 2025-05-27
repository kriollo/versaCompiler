/**
 * Script para obtener la instancia de Vue usando solo JavaScript
 * Compatible con Vue 2 y Vue 3
 */

// Método 1: Obtener instancia desde el elemento raíz (Vue 2 y Vue 3)
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

// Método 2: Buscar en todos los elementos del DOM
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

// Método 3: Obtener desde window/global (si Vue está expuesto globalmente)
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

// Método 4: Obtener componente raíz de Vue 3
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

// Método principal que intenta todos los métodos
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

// Función para esperar a que Vue esté disponible
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

// Función para obtener información detallada de la instancia
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

// Función principal que obtiene la instancia con toda la lógica integrada
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

// Exportar la función principal simplificada
export default obtenerInstanciaVue;

// Exportar funciones adicionales si se necesitan individualmente
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
