// setupHMR.js - Helper to set up Hot Module Reloading for Vue
import instanciaVue from './instanciaVue.js';

/**
 * Set up Hot Module Reloading for a Vue application
 * @param {Object} app - The Vue application instance
 * @returns {Object} - The same Vue application instance
 */
export function setupHMR(app) {
    // Store the Vue app instance in our instanciaVue module
    instanciaVue.methods.set(app);

    // También lo guardamos directamente en window para mayor accesibilidad
    if (typeof window !== 'undefined') {
        window.__VUE_APP__ = app;
        console.log('Vue app instance stored directly in window.__VUE_APP__');
    }

    console.log('HMR setup complete - Vue instance stored for hot reloading');

    return app;
}

/**
 * Helper function to wrap your Vue app creation with HMR support
 * @param {Function} createAppFn - Function that creates and returns your Vue app
 * @returns {Object} - The Vue application instance with HMR support
 */
export function createAppWithHMR(createAppFn) {
    const app = createAppFn();
    return setupHMR(app);
}

/**
 * Función para obtener la instancia de Vue desde cualquier parte de la aplicación
 * @returns {Object|null} - La instancia de Vue o null si no está disponible
 */
export function getVueInstance() {
    // Intentar obtener la instancia desde diferentes fuentes
    if (typeof window !== 'undefined') {
        // Primero intentar desde window.__VUE_APP__
        if (window.__VUE_APP__) {
            return window.__VUE_APP__;
        }

        // Luego intentar desde window.__VUE_APP_INSTANCE__
        if (
            window.__VUE_APP_INSTANCE__ &&
            typeof window.__VUE_APP_INSTANCE__.get === 'function'
        ) {
            return window.__VUE_APP_INSTANCE__.get();
        }
    }

    // Finalmente intentar desde instanciaVue
    return instanciaVue.methods.get();
}
