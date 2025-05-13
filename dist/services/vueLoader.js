let socketReload, getInstancia, getVueInstance;

// En navegador: usar rutas relativas estáticas
(async () => {
    socketReload = (await import('./hrm/devMode.js')).socketReload;
    getInstancia = (await import('./hrm/instanciaVue.js')).default;
    getVueInstance = (await import('./hrm/setupHMR.js')).getVueInstance;
})();

// Obtención robusta de la instancia de Vue
const getInstanceVue = async () => {
    let instance = getVueInstance && getVueInstance();
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
    instance = getInstancia && getInstancia.methods.get();
    if (instance) return instance;
    return null;
};

// Reintentos con backoff exponencial para obtener la instancia
async function waitForVueInstance(maxTries = 5, delay = 300) {
    let tries = 0;
    while (tries < maxTries) {
        const instance = await getInstanceVue();
        if (instance) return instance;
        await new Promise(resolve =>
            globalThis.setTimeout(resolve, delay * 2 ** tries),
        );
        tries++;
    }
    // Si no se encuentra, recarga la página
    window.location.reload();
    return null;
}

// Initialize socket connection and HMR con reconexión automática
const initSocket = async (retries = 0) => {
    const maxRetries = 10;
    const retryDelay = Math.min(2000 * (retries + 1), 10000); // backoff hasta 10s
    if (window.___browserSync___?.socket) {
        const socket = window.___browserSync___.socket;
        let connected = false;
        socket.on('connect', async () => {
            connected = true;
            const vueAppInstance = await waitForVueInstance();
            if (vueAppInstance && vueAppInstance._instance) {
                socketReload(vueAppInstance);
            } else {
                console.error(
                    `❌ Versa HMR: Vue instance not found after socket connection`,
                );
            }
            console.log(`✔️ Versa HMR: Socket connected`);
        });
        socket.on('disconnect', () => {
            connected = false;
            console.log(`❌ Versa HMR: Socket disconnected, retrying...`);
            setTimeout(() => {
                if (!connected && retries < maxRetries) {
                    initSocket(retries + 1);
                } else if (!connected) {
                    console.error(
                        `❌ Versa HMR: Socket not connected after ${maxRetries} retries, reloading...`,
                    );
                }
            }, retryDelay);
        });
        // Si no conecta en 5s, reintenta
        setTimeout(() => {
            if (!connected && retries < maxRetries) {
                console.warn('Versa HMR: No socket connection, retrying...');
                initSocket(retries + 1);
            } else if (!connected) {
                console.error(
                    `❌ Versa HMR: Socket not connected after ${maxRetries} retries, reloading...`,
                );
            }
        }, 5000);
    } else {
        console.error(
            `❌ Versa HMR: Socket not found. Please ensure BrowserSync is running.`,
        );
        setTimeout(() => {
            if (retries < maxRetries) {
                initSocket(retries + 1);
            } else {
                console.error(
                    `❌ Versa HMR: Socket not found after ${maxRetries} retries, reloading...`,
                );
            }
        }, retryDelay);
    }
};

// Initialize socket connection when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
});
