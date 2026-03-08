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
 * Analiza el contenido de un módulo para extraer sus imports/exports
 * @param {string} content - Contenido del archivo JavaScript/TypeScript
 * @returns {{imports: string[], exports: string[], hasHMRAccept: boolean}}
 */
function analyzeModuleContent(content) {
    const imports = [];
    const exports = [];
    let hasHMRAccept = false;

    // Detectar imports (ESM y CommonJS)
    const importMatches = content.matchAll(
        /import\s+(?:{[^}]*}|[^\s]+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g,
    );
    const requireMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);

    for (const match of importMatches) {
        if (match[1]) imports.push(match[1]);
    }
    for (const match of requireMatches) {
        if (match[1]) imports.push(match[1]);
    }

    // Detectar exports
    const exportMatches = content.matchAll(
        /export\s+(?:default|const|let|var|function|class|{[^}]*})\s+(\w+)/g,
    );
    for (const match of exportMatches) {
        if (match[1]) exports.push(match[1]);
    }

    // Detectar si el módulo acepta HMR (import.meta.hot.accept)
    hasHMRAccept = /import\.meta\.hot\.accept/.test(content);

    return { imports, exports, hasHMRAccept };
}

/**
 * Detecta automáticamente la estrategia de HMR para un archivo modificado
 * @param {string} filePath - Ruta del archivo modificado
 * @param {string|null} content - Contenido del archivo (si está disponible)
 * @returns {Promise<{strategy: 'self-accept'|'propagate'|'full-reload', boundary?: string}>}
 */
async function detectHMRStrategy(filePath, content = null) {
    try {
        // Si no tenemos el contenido, intentar leerlo
        if (!content && typeof fetch !== 'undefined') {
            try {
                const response = await fetch(filePath);
                content = await response.text();
            } catch (error) {
                console.warn(
                    '⚠️ No se pudo obtener contenido del módulo:',
                    error,
                );
                return { strategy: 'full-reload' };
            }
        }

        if (!content) {
            return { strategy: 'full-reload' };
        }

        const analysis = analyzeModuleContent(content);

        // Estrategia 1: Self-accept (el módulo declara que puede reemplazarse a sí mismo)
        if (analysis.hasHMRAccept) {
            console.log('✨ Módulo con self-accept HMR:', filePath);
            return { strategy: 'self-accept', boundary: filePath };
        }

        // Estrategia 2: Propagate (buscar el primer importador que acepte HMR)
        // En el browser no tenemos acceso al módulo graph del servidor,
        // así que usamos heurísticas basadas en el contenido

        // Si solo exporta funciones/constantes simples, probablemente sea seguro recargar
        const hasOnlySimpleExports =
            analysis.exports.length > 0 &&
            !content.includes('class ') &&
            !content.includes('new ');

        if (hasOnlySimpleExports) {
            console.log(
                '✨ Módulo con exports simples, propagando HMR:',
                filePath,
            );
            return { strategy: 'propagate', boundary: filePath };
        }

        // Estrategia 3: Full reload (no es seguro hacer HMR)
        console.log('⚠️ Módulo requiere recarga completa:', filePath);
        return { strategy: 'full-reload' };
    } catch (error) {
        console.error('❌ Error detectando estrategia HMR:', error);
        return { strategy: 'full-reload' };
    }
}

/**
 * Envía un error del cliente al servidor para debugging
 * @param {string} type - Tipo de error (hmr, reload, vue, etc)
 * @param {Error|string} error - El error a reportar
 * @param {Object} [context] - Contexto adicional del error
 */
function reportErrorToServer(type, error, context = {}) {
    try {
        // Verificar que estamos en un navegador
        if (typeof window === 'undefined') {
            return;
        }

        if (!window.___browserSync___ || !window.___browserSync___.socket) {
            console.warn(
                '⚠️ BrowserSync socket no disponible para reportar error',
            );
            return;
        }

        const errorData = {
            type,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            context,
            error: {
                message: error?.message || String(error),
                stack: error?.stack || '',
                name: error?.name || 'Error',
            },
        };

        // Enviar error al servidor
        window.___browserSync___.socket.emit('client:error', errorData);

        console.error(`📤 Error reportado al servidor [${type}]:`, errorData);
    } catch (err) {
        console.error('❌ Error al reportar error al servidor:', err);
    }
}

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
            } catch {
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
        } catch {
            // Ignorar errores de limpieza de cache
        }

        console.log(`✅ Hot reload exitoso de librería: ${libraryName}`);
        return true;
    } catch (error) {
        console.error(
            `❌ Error en hot reload de librería ${libraryName}:`,
            error,
        );

        // Reportar error al servidor
        reportErrorToServer('library-hotreload', error, {
            libraryName,
            libraryPath,
            globalName,
            hadOldVersion: oldLibraryVersion !== undefined,
        });

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
            try {
                hideErrorOverlay();
                vueInstance = window.__VUE_APP__ || vueInstance;
                if (vueInstance) {
                    console.log('🔥 Preparando HMR para Vue...');
                    await reloadComponent(vueInstance, data);
                } else {
                    console.log('🔄 Usando método fallback:', vueInstance);
                }
            } catch (error) {
                console.error('❌ Error en HMR de Vue:', error);
                reportErrorToServer('vue-hmr', error, {
                    component: data?.nameFile,
                    path: data?.normalizedPath,
                });
                showErrorOverlay(
                    'Error en HMR de Vue',
                    error.message || String(error),
                );
            }
        });

        // Configurar listener para datos auxiliares de HMR
        socket.on('HRMHelper', async data => {
            console.log('🔄 HRMHelper recibido:', data);
            console.log('📋 Archivo modificado:', data.filePath);

            // Sistema inteligente de detección automática (como Vite/esbuild)
            if (data.filePath && !data.libraryName && !data.libraryPath) {
                console.log('🔍 Analizando estrategia HMR automática...');

                // Detectar la estrategia de HMR apropiada
                const hmrStrategy = await detectHMRStrategy(
                    data.filePath,
                    data.content,
                );

                console.log('📊 Estrategia detectada:', hmrStrategy.strategy);

                // Ejecutar la estrategia apropiada
                switch (hmrStrategy.strategy) {
                    case 'self-accept':
                        // El módulo puede reemplazarse a sí mismo
                        console.log('✨ Aplicando self-accept HMR');
                        try {
                            // Reimportar el módulo con cache busting
                            const timestamp = Date.now();
                            await import(`${data.filePath}?t=${timestamp}`);
                            console.log('✅ Módulo recargado exitosamente');
                            return;
                        } catch (error) {
                            console.error(
                                '❌ Error en self-accept HMR:',
                                error,
                            );
                            reportErrorToServer(
                                'hmr-self-accept-failed',
                                error instanceof Error
                                    ? error
                                    : new Error(String(error)),
                                data,
                            );
                        }
                        break;

                    case 'propagate':
                        // Propagar la actualización a los importadores
                        console.log(
                            '🔄 Propagando actualización a importadores',
                        );
                        try {
                            // Invalidar el módulo en el cache del navegador
                            // y dejar que los importadores se actualicen
                            const timestamp = Date.now();
                            await import(`${data.filePath}?t=${timestamp}`);
                            console.log(
                                '✅ Actualización propagada exitosamente',
                            );
                            return;
                        } catch (error) {
                            console.error(
                                '❌ Error propagando actualización:',
                                error,
                            );
                            reportErrorToServer(
                                'hmr-propagate-failed',
                                error instanceof Error
                                    ? error
                                    : new Error(String(error)),
                                data,
                            );
                        }
                        break;

                    case 'full-reload':
                    default:
                        // Recarga completa necesaria
                        console.log(
                            '🔄 Recarga completa requerida - módulo no soporta HMR',
                        );
                        reportErrorToServer(
                            'hmr-full-reload',
                            new Error(
                                'Módulo requiere recarga completa (no self-accept)',
                            ),
                            {
                                ...data,
                                strategy: hmrStrategy.strategy,
                                hint: 'Considera agregar import.meta.hot.accept() al módulo para HMR sin recarga',
                            },
                        );
                        window.location.reload();
                        return;
                }
            }

            try {
                // Intentar hacer hot reload de librería sin recarga completa
                const success = await handleLibraryHotReload(data);
                if (!success) {
                    console.warn(
                        '⚠️ Hot reload de librería falló, haciendo recarga completa',
                    );
                    reportErrorToServer(
                        'hmr-helper-failed',
                        new Error('Hot reload returned false'),
                        data,
                    );
                    window.location.reload();
                }
            } catch (error) {
                console.error('❌ Error en HRMHelper:', error);
                reportErrorToServer(
                    'hmr-helper-exception',
                    error instanceof Error ? error : new Error(String(error)),
                    data,
                );
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

// Solo ejecutar en ambiente de navegador (no en tests de Node.js)
if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
) {
    // Capturar errores globales no manejados
    window.addEventListener('error', event => {
        if (
            event.filename &&
            (event.filename.includes('/hrm/') || event.filename.includes('HRM'))
        ) {
            reportErrorToServer(
                'uncaught-error',
                event.error || new Error(event.message),
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                },
            );
        }
    });

    // Capturar promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', event => {
        const error = event.reason;
        if (
            error &&
            (error.stack?.includes('/hrm/') || error.message?.includes('HRM'))
        ) {
            reportErrorToServer('unhandled-rejection', error, {
                promise: String(event.promise),
            });
        }
    });

    // Inicializar el sistema HMR al cargar el script
    initSocket();
}
