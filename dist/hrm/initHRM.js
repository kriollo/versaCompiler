import { hideErrorOverlay, showErrorOverlay } from './hrm/errorScreen.js';

async function initSocket(retries = 0) {
    const maxRetries = 10;
    const retryDelay = Math.min(2000 * (retries + 1), 10000); // backoff hasta 10s

    if (window.___browserSync___ && window.___browserSync___.socket) {
        const socket = window.___browserSync___.socket;
        let connected = socket.connected; // Verificar estado inicial

        // Listener para conexión
        socket.on('connect', async () => {
            connected = true;
            hideErrorOverlay();
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
                    showErrorOverlay(
                        'HMR Desconectado',
                        'No se pudo reconectar a BrowserSync después de múltiples reintentos.',
                    );
                }
            }, retryDelay);
        });

        // socket.on('vue:update', async data => {
        //     // Log para verificar reloadComponent al inicio del evento
        //     if (typeof reloadComponent !== 'function') {
        //         console.error(
        //             '[HMR] ERROR en vue:update: reloadComponent no es una función.',
        //         );
        //         showErrorOverlay(
        //             'Error Crítico de HMR',
        //             'reloadComponent no está disponible. Verifique la consola para errores de carga.',
        //         );
        //         return;
        //     }
        //     hideErrorOverlay();

        //     const { component, relativePath, extension, type, timestamp } =
        //         data;
        //     const appInstance = await getInstanceVue();

        //     if (!appInstance) {
        //         // Si la instancia de Vue no existe, la carga inicial probablemente falló.
        //         // Una actualización de módulo (presumiblemente la corrección del error) ha llegado.
        //         // Recargar la página completa para permitir que vue-loader.ts intente de nuevo.
        //         console.log(
        //             '[HMR] La instancia de Vue no existe (posible fallo en la carga inicial). Se recibió una actualización de módulo. Recargando la página...',
        //         );
        //         window.location.reload();
        //         return; // Detener la ejecución adicional de HMR para esta actualización.
        //     }

        //     try {
        //         let result;
        //         if (extension === 'vue') {
        //             result = await reloadComponent(
        //                 appInstance,
        //                 component,
        //                 `${relativePath}`,
        //                 type,
        //                 extension,
        //             );
        //             if (result && result.msg) {
        //                 throw new Error(result.msg);
        //             }
        //         } else {
        //             // Asumiendo que reloadJS existe
        //             result = await reloadJS(`/${relativePath}?t=${timestamp}`);
        //             if (result && result.msg) {
        //                 throw new Error(result.msg);
        //             }
        //         }
        //     } catch (hmrError) {
        //         const errorMsg = `HMR falló para ${relativePath}`;
        //         const errorStack =
        //             hmrError.stack ||
        //             (hmrError.toString
        //                 ? hmrError.toString()
        //                 : 'No hay stack disponible');
        //         showErrorOverlay(errorMsg, errorStack);
        //         console.error(errorMsg, hmrError);
        //     }
        // });

        // Watchdog para la conexión inicial si el socket existe pero no está conectado
        if (!connected) {
            console.log(
                `Versa HMR: Objeto socket encontrado, intentando conexión (Intento ${
                    retries + 1
                }/${maxRetries})`,
            );
            setTimeout(() => {
                if (!socket.connected && retries <= maxRetries) {
                    console.warn(
                        'Versa HMR: Sin conexión de socket después del tiempo de espera inicial, reintentando initSocket...',
                    );
                    initSocket(retries + 1);
                } else if (!socket.connected) {
                    console.error(
                        `❌ Versa HMR: Socket aún no conectado después de ${maxRetries} intentos iniciales.`,
                    );
                    showErrorOverlay(
                        'Falló HMR de BrowserSync',
                        'No se pudo conectar al socket de BrowserSync después de intentos iniciales.',
                    );
                }
            }, 5000); // Timeout de 5s para el watchdog inicial
        }
    } else {
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
            showErrorOverlay(
                'Falló HMR de BrowserSync',
                'Socket o cliente de BrowserSync no encontrado después de múltiples reintentos.',
            );
        }
    }
}
initSocket();
