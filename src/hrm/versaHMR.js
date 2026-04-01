/**
 * @fileoverview VersaHMR — Registry de módulos para Hot Module Replacement
 *
 * Permite que librerías y utilidades JS/TS reciban actualizaciones sin full-reload.
 *
 * Uso básico (en cualquier módulo que consuma una librería):
 *
 *   window.__versaHMR.accept('/public/utils/math.js', (newModule) => {
 *     // Recibir la nueva versión y actualizar referencias locales
 *     mathLib = newModule;
 *   });
 *
 * Uso automático (para módulos que solo exportan funciones/constantes):
 *   El sistema detecta automáticamente si es seguro hacer HMR y llama a los callbacks.
 */

/**
 * @typedef {Object} ModuleEntry
 * @property {any} module - La instancia actual del módulo
 * @property {Set<Function>} callbacks - Callbacks registrados para actualizaciones
 * @property {number} version - Versión (incrementa en cada update)
 */

class VersaModuleRegistry {
    constructor() {
        /** @type {Map<string, ModuleEntry>} */
        this._registry = new Map();

        /** @type {Map<string, Set<string>>} Árbol inverso: módulo → quién lo importa */
        this._importers = new Map();

        /** @type {Set<string>} Módulos que han fallado al actualizarse */
        this._failedUpdates = new Set();

        /** @type {Map<string, Set<Function>>} Callbacks de cleanup por módulo */
        this._disposeCallbacks = new Map();

        /** @type {Map<string, Object>} Datos persistentes entre ciclos HMR */
        this._hotData = new Map();
    }

    /**
     * Normaliza un moduleId para uso como clave en el registry.
     * Elimina query params y asegura formato consistente.
     * @param {string} moduleId
     * @returns {string}
     */
    _normalizeId(moduleId) {
        try {
            // Si es una URL relativa, la convertimos a pathname limpio
            const url = new URL(moduleId, window.location.origin);
            return url.pathname;
        } catch {
            return moduleId.split('?')[0];
        }
    }

    /**
     * Registra un callback para recibir actualizaciones de un módulo.
     * El callback se llama con (newModule, { moduleId, version }) cuando el módulo cambia.
     *
     * @param {string} moduleId - Path/URL del módulo a observar (ej: '/public/utils/math.js')
     * @param {Function} updateCallback - Función llamada cuando el módulo cambia
     * @returns {Function} Función para cancelar el registro (unsubscribe)
     */
    accept(moduleId, updateCallback) {
        const id = this._normalizeId(moduleId);

        if (!this._registry.has(id)) {
            this._registry.set(id, {
                module: null,
                callbacks: new Set(),
                version: 0,
            });
        }

        const entry = this._registry.get(id);
        entry.callbacks.add(updateCallback);

        console.log(`[VersaHMR] Registrado observer para: ${id}`);

        // Retornar función de cleanup
        return () => {
            const e = this._registry.get(id);
            if (e) {
                e.callbacks.delete(updateCallback);
                if (e.callbacks.size === 0) {
                    this._registry.delete(id);
                    console.log(`[VersaHMR] Registry limpiado para: ${id}`);
                }
            }
        };
    }

    /**
     * Notifica a todos los observers registrados que un módulo fue actualizado.
     * Llamado internamente por el handler de HRMHelper cuando recibe un nuevo módulo.
     *
     * @param {string} moduleId - Path del módulo actualizado
     * @param {any} newModule - La nueva instancia del módulo exportado
     * @returns {boolean} true si había al menos un observer y todos ejecutaron sin error
     */
    notifyUpdate(moduleId, newModule) {
        const id = this._normalizeId(moduleId);
        const entry = this._registry.get(id);

        if (!entry || entry.callbacks.size === 0) {
            return false;
        }

        // Ejecutar dispose callbacks antes de actualizar
        this._runDispose(id);

        entry.version++;
        entry.module = newModule;
        const meta = { moduleId: id, version: entry.version };

        let allSucceeded = true;

        for (const callback of entry.callbacks) {
            try {
                callback(newModule, meta);
            } catch (err) {
                console.error(
                    `[VersaHMR] Error en callback de update para ${id}:`,
                    err,
                );
                allSucceeded = false;
                this._failedUpdates.add(id);
            }
        }

        if (allSucceeded) {
            this._failedUpdates.delete(id);
            console.log(
                `[VersaHMR] ✅ Módulo actualizado (v${entry.version}): ${id} — ${entry.callbacks.size} observer(s) notificado(s)`,
            );
        }

        return allSucceeded;
    }

    /**
     * Registra la relación de importación entre módulos.
     * Esto permite propagación en cadena cuando cambia un módulo.
     *
     * @param {string} importer - Path del módulo que importa
     * @param {string} imported - Path del módulo importado
     */
    registerImporter(importer, imported) {
        const importedId = this._normalizeId(imported);
        const importerId = this._normalizeId(importer);

        if (!this._importers.has(importedId)) {
            this._importers.set(importedId, new Set());
        }
        this._importers.get(importedId).add(importerId);
    }

    /**
     * Obtiene el módulo actual registrado (si fue cargado via notifyUpdate).
     * @param {string} moduleId
     * @returns {any | null}
     */
    getModule(moduleId) {
        const id = this._normalizeId(moduleId);
        return this._registry.get(id)?.module ?? null;
    }

    /**
     * Registra un callback de dispose que se ejecuta antes de que el módulo
     * sea reemplazado. Permite cleanup de timers, event listeners, etc.
     * Expuesto como import.meta.hot.dispose(cb) en el shim de HMR.
     *
     * @param {string} moduleId
     * @param {Function} cb - Llamado con (data) donde data = _getHotData(moduleId)
     */
    _onDispose(moduleId, cb) {
        const id = this._normalizeId(moduleId);
        if (!this._disposeCallbacks.has(id)) {
            this._disposeCallbacks.set(id, new Set());
        }
        this._disposeCallbacks.get(id).add(cb);
    }

    /**
     * Retorna el objeto de datos persistentes de un módulo.
     * El objeto sobrevive entre ciclos HMR para preservar estado local.
     * Expuesto como import.meta.hot.data en el shim de HMR.
     *
     * @param {string} moduleId
     * @returns {Object}
     */
    _getHotData(moduleId) {
        const id = this._normalizeId(moduleId);
        if (!this._hotData.has(id)) {
            this._hotData.set(id, {});
        }
        return this._hotData.get(id);
    }

    /**
     * Ejecuta los callbacks de dispose antes de un update HMR.
     * Llamado internamente desde notifyUpdate antes de notificar observers.
     *
     * @param {string} moduleId
     */
    _runDispose(moduleId) {
        const id = this._normalizeId(moduleId);
        const disposers = this._disposeCallbacks.get(id);
        if (!disposers || disposers.size === 0) return;

        const data = this._getHotData(id);
        for (const cb of disposers) {
            try {
                cb(data);
            } catch (err) {
                console.error(
                    `[VersaHMR] Error en dispose callback para ${id}:`,
                    err,
                );
            }
        }
        this._disposeCallbacks.delete(id);
    }

    /**
     * Invalida un módulo: ejecuta dispose callbacks y fuerza recarga de página.
     * Expuesto como import.meta.hot.invalidate() en el shim de HMR.
     *
     * @param {string} moduleId
     */
    _invalidate(moduleId) {
        const id = this._normalizeId(moduleId);

        // Ejecutar dispose callbacks antes de invalidar
        this._runDispose(id);

        // Limpiar estado del módulo
        this._hotData.delete(id);
        this._registry.delete(id);

        console.log(
            `[VersaHMR] Módulo invalidado: ${id} — forzando recarga completa`,
        );
        window.location.reload();
    }

    /**
     * Indica si un módulo tiene observers registrados (puede hacer HMR).
     * @param {string} moduleId
     * @returns {boolean}
     */
    hasObservers(moduleId) {
        const id = this._normalizeId(moduleId);
        const entry = this._registry.get(id);
        return !!(entry && entry.callbacks.size > 0);
    }

    /**
     * Indica si un módulo tuvo fallos en el último update.
     * @param {string} moduleId
     * @returns {boolean}
     */
    hasFailed(moduleId) {
        return this._failedUpdates.has(this._normalizeId(moduleId));
    }

    /**
     * Limpia todos los registros (útil para tests o hot-reload del propio sistema).
     */
    clear() {
        this._registry.clear();
        this._importers.clear();
        this._failedUpdates.clear();
        this._disposeCallbacks.clear();
        this._hotData.clear();
    }

    /**
     * Estadísticas del registry (para debugging).
     * @returns {{ modules: number, totalObservers: number, failedModules: number }}
     */
    getStats() {
        let totalObservers = 0;
        for (const entry of this._registry.values()) {
            totalObservers += entry.callbacks.size;
        }
        return {
            modules: this._registry.size,
            totalObservers,
            failedModules: this._failedUpdates.size,
        };
    }
}

// Singleton global expuesto en window.__versaHMR
// Se preserva entre recargas parciales para no perder observers
if (!window.__versaHMR) {
    window.__versaHMR = new VersaModuleRegistry();
    console.log('[VersaHMR] Registry inicializado');
}

export const versaHMR = window.__versaHMR;
export default versaHMR;
