/**
 * @fileoverview Inicialización del sistema Hot Module Replacement (HMR) para VersaCompiler
 * Este archivo maneja la conexión con BrowserSync y configura los listeners para HMR de Vue
 */

/**
 * @typedef {Object} ComponentInfo
 * @property {string} normalizedPath - Ruta normalizada del componente
 * @property {string} nameFile - Nombre del archivo del componente
 */

import { hideErrorOverlay, showErrorOverlay } from './errorScreen.js';
import { obtenerInstanciaVue } from './getInstanciaVue.js';
import { reloadComponent } from './VueHRM.js';

/**
 * Inicializa la conexión socket con BrowserSync y configura los listeners para HMR
 * @param {number} [retries=0] - Número de reintentos realizados
 * @returns {Promise<void>} Promise que se resuelve cuando la conexión está configurada
 */
async function initSocket(retries = 0) {
    const maxRetries = 10;
    const retryDelay = Math.min(2000 * (retries + 1), 10000); // Backoff exponencial hasta 10s

    // Verificar si BrowserSync está disponible y tiene socket
    if (window.___browserSync___ && window.___browserSync___.socket) {
        const socket = window.___browserSync___.socket;
        let connected = socket.connected; // Verificar estado inicial de conexión

        // Limpiar listeners previos para evitar duplicados
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reloadFull');
        socket.off('HRMVue');
        socket.off('HRMHelper');
        socket.off('error');

        // Configurar listener para eventos de conexión
        socket.on('connect', async () => {
            connected = true;
            hideErrorOverlay();
            console.log('✔️ Versa HMR: Socket conectado');
        });

        // Configurar listener para eventos de desconexión
        socket.on('disconnect', () => {
            connected = false;
            console.log('❌ Versa HMR: Socket desconectado, reintentando...');
            // Lógica de reintentos para desconexión
            setTimeout(() => {
                if (!socket.connected && retries < maxRetries) {
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

        // Configurar listener para recarga completa
        socket.on('reloadFull', () => window.location.reload()); // Obtener la instancia de Vue con toda la lógica integrada
        let vueInstance = await obtenerInstanciaVue();

        // Configurar listener para HMR de componentes Vue
        socket.on('HRMVue', async (/** @type {ComponentInfo} */ data) => {
            hideErrorOverlay();
            vueInstance = window.__VUE_APP__ || vueInstance;
            if (vueInstance) {
                console.log('🔥 Preparando HMR para Vue...');
                await reloadComponent(vueInstance, data);
            } else {
                console.log('🔄 Usando método fallback:', vueInstance);
            }
        });

        // Configurar listener para datos auxiliares de HMR
        socket.on('HRMHelper', data => {
            //TODO: Implementar lógica de HMRHelper
            window.location.reload();
            console.log('🔄 Recargando página por HMRHelper:', data);
        });

        // Configurar listener para errores de socket
        socket.on('error', err => {
            console.error('❌ Versa HMR: Error en el socket:', err);
            showErrorOverlay(
                'Error de Socket',
                'Se produjo un error en la conexión de BrowserSync.',
            );
        }); // Watchdog para verificar conexión inicial si el socket existe pero no está conectado
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
        // BrowserSync no está disponible, intentar reinicializar
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

// Inicializar el sistema HMR al cargar el script
initSocket();
