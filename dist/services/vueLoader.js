let socketReload,
    getInstancia,
    getVueInstance,
    showErrorOverlay,
    hideErrorOverlay,
    reloadComponent,
    reloadJS;

// En navegador: usar rutas relativas estáticas
(async () => {
    try {
        // Importa todas las dependencias HMR necesarias aquí
        // CORREGIR RUTA DE IMPORTACIÓN PARA devMode.js
        const devModeModule = await import('./hrm/devMode.js');
        socketReload = devModeModule.socketReload;
        reloadComponent = devModeModule.reloadComponent;
        reloadJS = devModeModule.reloadJS;

        // Log para verificar la carga de reloadComponent
        if (typeof reloadComponent === 'function') {
            console.log(
                '[HMR] La función reloadComponent se cargó correctamente.',
            );
        } else {
            console.error(
                '[HMR] ERROR: La función reloadComponent NO se cargó o no es una función después de la importación.',
                devModeModule,
            );
        }

        getInstancia = (await import('./hrm/instanciaVue.js')).default; // Asumiendo que está en dist/hrm/
        getVueInstance = (await import('./hrm/setupHMR.js')).getVueInstance; // Asumiendo que está en dist/hrm/

        const errorScreenModule = await import('./hrm/errorScreen.js'); // Asumiendo que está en dist/hrm/
        showErrorOverlay = errorScreenModule.showErrorOverlay;
        hideErrorOverlay = errorScreenModule.hideErrorOverlay;

        // Esperar a que BrowserSync client esté listo y haya definido ___browserSync___
        let bsReadyRetries = 0;
        const maxBsReadyRetries = 30; // 30 * 500ms = 15 segundos de espera máxima
        const bsReadyCheckInterval = 500;

        while (
            !window.___browserSync___ &&
            bsReadyRetries < maxBsReadyRetries
        ) {
            console.warn(
                `[HMR] Esperando a que el script cliente de BrowserSync se inicialice... (${
                    bsReadyRetries + 1
                }/${maxBsReadyRetries})`,
            );
            await new Promise(resolve =>
                setTimeout(resolve, bsReadyCheckInterval),
            );
            bsReadyRetries++;
        }

        if (!window.___browserSync___) {
            console.error(
                '❌ Versa HMR: El script cliente de BrowserSync no se inicializó después de múltiples reintentos. HMR no funcionará.',
            );
            if (showErrorOverlay) {
                // Verificar si showErrorOverlay se cargó
                showErrorOverlay(
                    'Falló la inicialización de HMR',
                    'El cliente de BrowserSync no se inicializó. Revisa la consola y el servidor de BrowserSync.',
                );
            }
            return; // Detener la ejecución si BrowserSync no está listo
        }

        console.log(
            '✔️ Versa HMR: Cliente de BrowserSync detectado. Procediendo con la configuración de HMR.',
        );
        await initSocket(); // Llama a initSocket DESPUÉS de que las importaciones y la espera de BS hayan terminado
    } catch (error) {
        console.error(
            '❌ Versa HMR: Error durante la carga dinámica de módulos o initSocket:',
            error,
        );
        if (showErrorOverlay) {
            showErrorOverlay(
                'Falló la inicialización de HMR',
                error.stack || error.message,
            );
        } else {
            const errDiv = document.createElement('div');
            errDiv.textContent =
                'Falló la inicialización de HMR: ' + error.message;
            errDiv.style.cssText =
                'position:fixed;top:10px;left:10px;padding:10px;background:red;color:white;z-index:1000000;';
            document.body.appendChild(errDiv);
        }
    }
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
    // Si no se encuentra, muestra overlay y no recarga
    const errorMsg =
        'Instancia de Vue no encontrada después de múltiples reintentos.';
    const detailMsg =
        'La aplicación no pudo iniciarse. Esperando una corrección para recargar.';
    if (typeof showErrorOverlay === 'function') {
        showErrorOverlay(errorMsg, detailMsg);
    } else {
        console.error(
            '[HMR] showErrorOverlay no disponible, pero la instancia de Vue no se encontró.',
        );
    }
    console.error(errorMsg);
    return null; // Indica que falló
}

// Initialize socket connection and HMR con reconexión automática
const initSocket = async (retries = 0) => {
    const maxRetries = 10;
    const retryDelay = Math.min(2000 * (retries + 1), 10000); // backoff hasta 10s

    // Se asume que window.___browserSync___ ya existe debido a la espera en la IIFE
    // Pero se verifica window.___browserSync___.socket
    if (window.___browserSync___ && window.___browserSync___.socket) {
        const socket = window.___browserSync___.socket;
        let connected = socket.connected; // Verificar estado inicial

        // Listener para conexión
        socket.on('connect', async () => {
            connected = true;
            if (typeof hideErrorOverlay === 'function') {
                hideErrorOverlay();
            } else {
                console.warn(
                    '[HMR] hideErrorOverlay no es una función al momento de la conexión',
                );
            }
            const vueAppInstance = await waitForVueInstance();
            if (vueAppInstance && vueAppInstance._instance) {
                if (typeof socketReload === 'function') {
                    socketReload(vueAppInstance);
                } else {
                    console.warn(
                        '[HMR] socketReload no es una función al momento de la conexión',
                    );
                }
            } else {
                console.error(
                    '❌ Versa HMR: Instancia de Vue no encontrada después de la conexión del socket',
                );
            }
            console.log('✔️ Versa HMR: Socket conectado');
        });

        // Listener para desconexión
        socket.on('disconnect', () => {
            connected = false;
            console.log('❌ Versa HMR: Socket desconectado, reintentando...');
            // La lógica de reintentos original para desconexión
            setTimeout(() => {
                if (!socket.connected && retries < maxRetries) {
                    // Usar socket.connected aquí
                    initSocket(retries + 1);
                } else if (!socket.connected) {
                    console.error(
                        `❌ Versa HMR: Socket no conectado después de ${maxRetries} reintentos tras desconexión.`,
                    );
                    if (typeof showErrorOverlay === 'function') {
                        showErrorOverlay(
                            'HMR Desconectado',
                            'No se pudo reconectar a BrowserSync después de múltiples reintentos.',
                        );
                    }
                }
            }, retryDelay);
        });

        socket.on('vue:update', async data => {
            // Log para verificar reloadComponent al inicio del evento
            if (typeof reloadComponent !== 'function') {
                console.error(
                    '[HMR] ERROR en vue:update: reloadComponent no es una función.',
                );
                if (typeof showErrorOverlay === 'function') {
                    showErrorOverlay(
                        'Error Crítico de HMR',
                        'reloadComponent no está disponible. Verifique la consola para errores de carga.',
                    );
                }
                return;
            }

            if (typeof hideErrorOverlay === 'function') hideErrorOverlay();
            else
                console.warn(
                    '[HMR] hideErrorOverlay no disponible en vue:update',
                );

            const { component, relativePath, extension, type, timestamp } =
                data;
            const appInstance = await getInstanceVue();

            if (!appInstance) {
                if (typeof showErrorOverlay === 'function') {
                    showErrorOverlay(
                        'No se puede realizar HMR: Instancia de la aplicación Vue no disponible.',
                        'Esto usualmente significa que la app no se inicializó o falló la configuración de HMR.',
                    );
                } else {
                    console.error(
                        '[HMR] showErrorOverlay no disponible, e instancia de Vue faltante para HMR.',
                    );
                }
                return;
            }

            try {
                if (extension === 'vue') {
                    const result = await reloadComponent(
                        appInstance,
                        component,
                        `${relativePath}`,
                        type,
                        extension,
                    );
                    if (result && result.msg) {
                        throw new Error(result.msg);
                    }
                } else {
                    // Asumiendo que reloadJS existe
                    await reloadJS(`/${relativePath}?t=${timestamp}`);
                }
            } catch (hmrError) {
                const errorMsg = `HMR falló para ${relativePath}`;
                const errorStack =
                    hmrError.stack ||
                    (hmrError.toString
                        ? hmrError.toString()
                        : 'No hay stack disponible');
                if (typeof showErrorOverlay === 'function') {
                    showErrorOverlay(errorMsg, errorStack);
                } else {
                    console.error(
                        '[HMR] showErrorOverlay no disponible. Error HMR:',
                        errorMsg,
                        hmrError,
                    );
                }
                console.error(errorMsg, hmrError);
            }
        });

        // Watchdog para la conexión inicial si el socket existe pero no está conectado
        if (!connected) {
            console.log(
                `Versa HMR: Objeto socket encontrado, intentando conexión (Intento ${
                    retries + 1
                }/${maxRetries})`,
            );
            setTimeout(() => {
                if (!socket.connected && retries < maxRetries) {
                    console.warn(
                        'Versa HMR: Sin conexión de socket después del tiempo de espera inicial, reintentando initSocket...',
                    );
                    initSocket(retries + 1);
                } else if (!socket.connected) {
                    console.error(
                        `❌ Versa HMR: Socket aún no conectado después de ${maxRetries} intentos iniciales.`,
                    );
                    if (typeof showErrorOverlay === 'function') {
                        showErrorOverlay(
                            'Falló HMR de BrowserSync',
                            'No se pudo conectar al socket de BrowserSync después de intentos iniciales.',
                        );
                    }
                }
            }, 5000); // Timeout de 5s para el watchdog inicial
        }
    } else {
        // Este bloque se ejecuta si window.___browserSync___ existe pero window.___browserSync___.socket no,
        // o si window.___browserSync___ no existe (aunque la IIFE debería haberlo esperado).
        console.warn(
            `[HMR] Socket de BrowserSync no encontrado o BrowserSync no completamente inicializado. Reintentando initSocket... (${
                retries + 1
            }/${maxRetries})`,
        );
        if (retries < maxRetries) {
            setTimeout(() => initSocket(retries + 1), retryDelay);
        } else {
            console.error(
                `❌ Versa HMR: Socket de BrowserSync no encontrado después de ${maxRetries} reintentos.`,
            );
            if (typeof showErrorOverlay === 'function') {
                showErrorOverlay(
                    'Falló HMR de BrowserSync',
                    'Socket o cliente de BrowserSync no encontrado después de múltiples reintentos.',
                );
            }
        }
    }
};
