import { hideErrorOverlay, showErrorOverlay } from './hrm/errorScreen.js';
import obtenerInstanciaVue from './hrm/getInstanciaVue.js';
import { reloadComponent } from './hrm/VueHRM.js';

async function initSocket(retries = 0) {
    const maxRetries = 10;
    const retryDelay = Math.min(2000 * (retries + 1), 10000); // backoff hasta 10s

    if (window.___browserSync___ && window.___browserSync___.socket) {
        const socket = window.___browserSync___.socket;
        let connected = socket.connected; // Verificar estado inicial

        // Limpiar listeners previos para evitar duplicados
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reloadFull');
        socket.off('HRMVue');
        socket.off('HRMHelper');
        socket.off('error');

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

        socket.on('reloadFull', () => window.location.reload());

        // Obtener la instancia de Vue con toda la lógica integrada
        let vueInstance = await obtenerInstanciaVue();
        socket.on('HRMVue', async data => {
            console.log('Versa HMR: Recibiendo datos de HMR:', data);
            vueInstance = window.__VUE_APP__ || vueInstance;
            if (vueInstance) {
                console.log('🔥 Preparando HMR para Vue...');
                await reloadComponent(vueInstance, data);
            } else {
                console.log('🔄 Usando método fallback:', vueInstance);
            }
        });
        socket.on('HRMHelper', data => {
            console.log('Versa HMR: Recibiendo datos de HMR:', data);
        });

        socket.on('error', err => {
            console.error('❌ Versa HMR: Error en el socket:', err);
            showErrorOverlay(
                'Error de Socket',
                'Se produjo un error en la conexión de BrowserSync.',
            );
        });

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
