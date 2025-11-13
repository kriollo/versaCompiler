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
 * Maneja el hot reload de librerías sin recarga completa de página
 * @param {Object} data - Datos del evento HRMHelper
 * @param {string} data.libraryName - Nombre de la librería a actualizar
 * @param {string} data.libraryPath - Ruta de la nueva librería
 * @param {string} [data.globalName] - Nombre global de la librería (ej: 'Vue', 'React')
 * @param {Function} [importFn] - Función import para cargar módulos (inyectable para tests)
 * @returns {Promise<boolean>} True si el hot reload fue exitoso
 */
export async function handleLibraryHotReload(
    data,
    importFn = url => import(url),
) {
    const { libraryName, libraryPath, globalName } = data;

    if (!libraryName || !libraryPath) {
        console.error(
            '❌ HRMHelper: Datos incompletos para hot reload de librería',
        );
        return false;
    }

    // 2. Determinar el nombre global de la librería
    const targetGlobalName = globalName || libraryName;

    // 3. Backup de la versión anterior (antes de cargar la nueva)
    let oldLibraryVersion;

    try {
        console.log(`🔄 Iniciando hot reload de librería: ${libraryName}`);

        oldLibraryVersion = window[targetGlobalName];

        // 4. Cargar la nueva versión de la librería
        const timestamp = Date.now();
        const moduleUrl = `${libraryPath}?t=${timestamp}`;

        console.log(`📦 Cargando nueva versión desde: ${moduleUrl}`);
        const module = await importFn(moduleUrl);

        if (!module.default && !module[libraryName]) {
            console.error(
                '❌ HRMHelper: La nueva versión no tiene export válido',
            );
            return false;
        }

        const newLibraryVersion = module.default || module[libraryName];

        // 3. Reemplazar la librería en el contexto global
        console.log(`🔄 Reemplazando ${targetGlobalName} en contexto global`);
        window[targetGlobalName] = newLibraryVersion;

        // 4. Limpiar caches si existen
        if (
            typeof newLibraryVersion === 'object' &&
            newLibraryVersion.clearCache
        ) {
            try {
                newLibraryVersion.clearCache();
            } catch (_e) {
                // Ignorar errores de clearCache, no es crítico
            }
        }

        // 5. Re-inicializar aplicación si es necesario
        if (targetGlobalName === 'Vue' || libraryName.includes('vue')) {
            console.log(
                '🔄 Librería Vue actualizada, se recomienda recarga completa',
            );
            // Para Vue, es más seguro hacer recarga completa
            window.location.reload();
            return true;
        }

        // 6. Intentar limpiar caches si existen
        try {
            // Limpiar cualquier cache que pueda existir
            if (
                typeof window !== 'undefined' &&
                window.performance &&
                window.performance.clearResourceTimings
            ) {
                window.performance.clearResourceTimings();
            }
        } catch (_e) {
            // Ignorar errores de limpieza de cache
        }

        console.log(`✅ Hot reload exitoso de librería: ${libraryName}`);
        return true;
    } catch (error) {
        console.error(
            `❌ Error en hot reload de librería ${libraryName}:`,
            error,
        );

        // Intentar rollback si es posible
        if (targetGlobalName && oldLibraryVersion !== undefined) {
            console.log('🔄 Intentando rollback de librería...');
            window[targetGlobalName] = oldLibraryVersion;
        }

        return false;
    }
}

// Variable para controlar si ya se está inicializando
let isInitializing = false;
let initializationTimeout = null;

/**
 * Inicializa la conexión socket con BrowserSync y configura los listeners para HMR
 * @param {number} [retries=0] - Número de reintentos realizados
 * @returns {Promise<void>} Promise que se resuelve cuando la conexión está configurada
 */
async function initSocket(retries = 0) {
    // Evitar inicializaciones concurrentes
    if (isInitializing && retries > 0) {
        console.log(
            '⏳ Versa HMR: Ya hay una inicialización en curso, saltando...',
        );
        return;
    }

    isInitializing = true;

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

        // Limpiar timeout previo si existe
        if (initializationTimeout) {
            clearTimeout(initializationTimeout);
            initializationTimeout = null;
        }

        // Configurar listener para eventos de conexión
        socket.on('connect', async () => {
            connected = true;
            isInitializing = false;
            hideErrorOverlay();
            console.log('✔️ Versa HMR: Socket conectado');
        });

        // Configurar listener para eventos de desconexión
        socket.on('disconnect', () => {
            connected = false;
            isInitializing = false;
            console.log('❌ Versa HMR: Socket desconectado, reintentando...');
            // Lógica de reintentos para desconexión
            initializationTimeout = setTimeout(() => {
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
        socket.on('HRMHelper', async data => {
            console.log('🔄 HRMHelper recibido:', data);

            try {
                // Intentar hacer hot reload de librería sin recarga completa
                const success = await handleLibraryHotReload(data);
                if (!success) {
                    console.warn(
                        '⚠️ Hot reload de librería falló, haciendo recarga completa',
                    );
                    window.location.reload();
                }
            } catch (error) {
                console.error('❌ Error en HRMHelper:', error);
                window.location.reload();
            }
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
            initializationTimeout = setTimeout(() => {
                if (!socket.connected && retries <= maxRetries) {
                    console.warn(
                        'Versa HMR: Sin conexión de socket después del tiempo de espera inicial, reintentando initSocket...',
                    );
                    initSocket(retries + 1);
                } else if (!socket.connected) {
                    isInitializing = false;
                    console.error(
                        `❌ Versa HMR: Socket aún no conectado después de ${maxRetries} intentos iniciales.`,
                    );
                    showErrorOverlay(
                        'Falló HMR de BrowserSync',
                        'No se pudo conectar al socket de BrowserSync después de intentos iniciales.',
                    );
                }
            }, 5000); // Timeout de 5s para el watchdog inicial
        } else {
            isInitializing = false;
        }
    } else {
        // BrowserSync no está disponible, intentar reinicializar
        console.warn(
            `[HMR] Socket de BrowserSync no encontrado o BrowserSync no completamente inicializado. Reintentando initSocket... (${
                retries + 1
            }/${maxRetries})`,
        );
        if (retries < maxRetries) {
            initializationTimeout = setTimeout(
                () => initSocket(retries + 1),
                retryDelay,
            );
        } else {
            isInitializing = false;
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
