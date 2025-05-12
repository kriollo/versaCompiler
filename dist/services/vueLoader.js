import getInstancia from '../hrm/instanciaVue.js';
import { socketReload } from '../hrm/devMode.js';
import { getVueInstance } from '../hrm/setupHMR.js';

// Obtención robusta de la instancia de Vue
const getInstanceVue = async () => {
    let instance = getVueInstance();
    if (instance) return instance;
    if (typeof window !== 'undefined') {
        if (window.__VUE_APP__) return window.__VUE_APP__;
        if (
            window.__VUE_APP_INSTANCE__ &&
            typeof window.__VUE_APP_INSTANCE__.get === 'function'
        ) {
            const winInstance = window.__VUE_APP_INSTANCE__.get();
            if (winInstance) return winInstance;
        }
    }
    instance = getInstancia.methods.get();
    if (instance) return instance;
    return null;
};

// Reintentos con backoff exponencial para obtener la instancia
async function waitForVueInstance(maxTries = 5, delay = 300) {
    let tries = 0;
    while (tries < maxTries) {
        const instance = await getInstanceVue();
        if (instance) return instance;
        await new Promise(resolve => setTimeout(resolve, delay * 2 ** tries));
        tries++;
    }
    // Si no se encuentra, recarga la página
    window.location.reload();
    return null;
}

// Initialize socket connection and HMR
const initSocket = async () => {
    if (window.___browserSync___?.socket) {
        const socket = window.___browserSync___.socket;
        socket.on('connect', async () => {
            const vueAppInstance = await waitForVueInstance();
            if (vueAppInstance && vueAppInstance._instance) {
                socketReload(vueAppInstance);
            } else {
                // Si no se puede obtener la instancia, recarga la página
                window.location.reload();
            }
            console.log(`✔️ Versa HMR: Socket connected`);
        });
        socket.on('disconnect', () => {
            console.log(`❌ Versa HMR: Socket disconnected`);
        });
    }
};

// Initialize socket connection when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
});
