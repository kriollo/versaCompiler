/**
 * DYNAMIC MODULE RESOLVER v2.0 - SISTEMA ABSOLUTAMENTE DINÁMICO
 *
 * Sistema que usa APIs del servidor para resolver CUALQUIER dependencia npm automáticamente.
 * Funciona con TODOS los módulos npm sin configuración previa ni listas predefinidas.
 * Inspirado en Vite pero mejorado para trabajar con resolución server-side.
 */

class AbsolutelyDynamicModuleResolver {
    constructor(options = {}) {
        this.resolvedModules = new Map();
        this.availableDependencies = new Set();
        this.cache = new Map(); // Caché inteligente para módulos ya resueltos
        this.pendingResolutions = new Map(); // Evitar resoluciones duplicadas
        this.isInitialized = false;

        // Configuración de caché
        this.cacheExpiration = 5 * 60 * 1000; // 5 minutos
        this.maxCacheSize = 100;

        // **NUEVA OPCIÓN**: Modo optimizado que solo incluye dependencias usadas
        this.optimizedMode = options.optimizedMode || false;

        console.log(
            `🚀 Iniciando Absolutely Dynamic Module Resolver v2.0${this.optimizedMode ? ' (Modo Optimizado)' : ''}...`,
        );
        this.init();
    }

    /**
     * Inicialización del sistema completamente dinámico
     */
    async init() {
        try {
            console.log('🔧 Cargando dependencias desde el servidor...');
            await this.loadDependenciesFromServer();

            console.log('📦 Resolviendo módulos automáticamente...');
            await this.resolveAllAvailableModules();

            console.log('🎯 Aplicando import map dinámico...');
            this.applyImportMap();

            this.isInitialized = true;
            console.log(
                '✅ Sistema absolutamente dinámico inicializado correctamente',
            );
        } catch (error) {
            console.error(
                '❌ Error al inicializar el sistema dinámico:',
                error,
            );
            this.handleInitializationError(error);
        }
    } /**
     * Cargar dependencias desde el servidor (todas o solo las usadas)
     */
    async loadDependenciesFromServer() {
        try {
            // **NUEVA FUNCIONALIDAD**: Elegir endpoint según el modo
            const endpoint = this.optimizedMode
                ? '/api/dependencies/used'
                : '/api/dependencies';

            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(
                    `Error del servidor: ${response.status} ${response.statusText}`,
                );
            }

            const data = await response.json();

            if (data.success) {
                if (this.optimizedMode && data.usedDependencies) {
                    // Modo optimizado: solo dependencias realmente usadas
                    data.usedDependencies.forEach(dep => {
                        this.availableDependencies.add(dep.name);
                    });

                    console.log(
                        `📋 ${this.availableDependencies.size} dependencias USADAS detectadas automáticamente:`,
                    );
                    console.log(
                        '🎯 Módulos optimizados:',
                        Array.from(this.availableDependencies),
                    );

                    // Mostrar información detallada de análisis
                    console.log(
                        `📁 ${data.analyzedFiles || 0} archivos analizados en src/`,
                    );
                    if (data.usedDependencies.length > 0) {
                        console.log('📊 Detalle de uso por módulo:');
                        data.usedDependencies.forEach(dep => {
                            console.log(
                                `  - ${dep.name}@${dep.version}: usado en ${dep.files.length} archivo(s)`,
                            );
                        });
                    }

                    return data.usedDependencies.reduce((acc, dep) => {
                        acc[dep.name] = dep.version;
                        return acc;
                    }, {});
                } else if (!this.optimizedMode && data.dependencies) {
                    // Modo normal: todas las dependencias de package.json
                    Object.keys(data.dependencies).forEach(dep => {
                        this.availableDependencies.add(dep);
                    });

                    console.log(
                        `📋 ${this.availableDependencies.size} dependencias detectadas automáticamente:`,
                    );
                    console.log(
                        '🔍 Módulos disponibles:',
                        Array.from(this.availableDependencies),
                    );

                    return data.dependencies;
                } else {
                    throw new Error('Respuesta inválida del servidor');
                }
            } else {
                throw new Error(
                    data.error || 'Respuesta inválida del servidor',
                );
            }
        } catch (error) {
            console.warn(
                '⚠️ Error al cargar dependencias del servidor:',
                error.message,
            );
            console.log('🔄 Usando modo fallback...');
            this.enableFallbackMode();
            return {};
        }
    }

    /**
     * Resolver TODOS los módulos disponibles automáticamente
     */
    async resolveAllAvailableModules() {
        if (this.availableDependencies.size === 0) {
            console.warn('⚠️ No hay dependencias para resolver');
            return;
        }

        const resolutionPromises = Array.from(this.availableDependencies).map(
            moduleName => this.resolveModule(moduleName, false), // false = no aplicar import map aún
        );

        const results = await Promise.allSettled(resolutionPromises);

        let resolvedCount = 0;
        let failedCount = 0;

        results.forEach((result, index) => {
            const moduleName = Array.from(this.availableDependencies)[index];
            if (result.status === 'fulfilled' && result.value) {
                resolvedCount++;
                console.log(`✅ ${moduleName} -> ${result.value}`);
            } else {
                failedCount++;
                console.debug(`❌ No se pudo resolver: ${moduleName}`);
            }
        });

        console.log(
            `📊 Resolución completada: ${resolvedCount} exitosos, ${failedCount} fallidos`,
        );
    }

    /**
     * Resolver un módulo específico usando la API del servidor
     */
    async resolveModule(moduleName, applyImportMap = true) {
        // Verificar caché primero
        if (this.cache.has(moduleName)) {
            const cached = this.cache.get(moduleName);
            if (Date.now() - cached.timestamp < this.cacheExpiration) {
                console.log(`💾 Usando caché para: ${moduleName}`);
                if (cached.path) {
                    this.resolvedModules.set(moduleName, cached.path);
                    if (applyImportMap) {
                        this.applyImportMap();
                    }
                }
                return cached.path;
            } else {
                // Caché expirado
                this.cache.delete(moduleName);
            }
        }

        // Evitar resoluciones duplicadas
        if (this.pendingResolutions.has(moduleName)) {
            return this.pendingResolutions.get(moduleName);
        }

        const resolutionPromise = this.performModuleResolution(
            moduleName,
            applyImportMap,
        );
        this.pendingResolutions.set(moduleName, resolutionPromise);

        try {
            const result = await resolutionPromise;
            return result;
        } finally {
            this.pendingResolutions.delete(moduleName);
        }
    }

    /**
     * Realizar la resolución real del módulo usando la API del servidor
     */
    async performModuleResolution(moduleName, applyImportMap) {
        try {
            const response = await fetch(
                `/api/resolve/${encodeURIComponent(moduleName)}`,
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const data = await response.json();

            if (data.success && data.path) {
                // Guardar en caché
                this.updateCache(moduleName, data.path);

                // Agregar al mapa de módulos resueltos
                this.resolvedModules.set(moduleName, data.path);

                if (applyImportMap) {
                    this.applyImportMap();
                }

                return data.path;
            } else {
                console.debug(
                    `❌ No se pudo resolver: ${moduleName} - ${data.error || 'Error desconocido'}`,
                );
                this.updateCache(moduleName, null); // Cachear fallos temporalmente
                return null;
            }
        } catch (error) {
            console.debug(`❌ Error al resolver ${moduleName}:`, error.message);
            this.updateCache(moduleName, null);
            return null;
        }
    }

    /**
     * Actualizar caché inteligente
     */
    updateCache(moduleName, path) {
        // Limpiar caché si está lleno
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(moduleName, {
            path,
            timestamp: Date.now(),
        });
    }

    /**
     * Crear import map dinámico optimizado
     */
    createImportMap() {
        const imports = {};

        for (const [name, path] of this.resolvedModules) {
            imports[name] = path;
        }

        return { imports };
    }

    /**
     * Aplicar import map al DOM de forma inteligente
     */
    applyImportMap() {
        if (this.resolvedModules.size === 0) {
            console.debug('📝 No hay módulos resueltos para el import map');
            return;
        }

        // Remover import map existente
        const existingImportMap = document.querySelector(
            'script[type="importmap"]',
        );
        if (existingImportMap) {
            existingImportMap.remove();
        }

        // Crear nuevo import map
        const importMapScript = document.createElement('script');
        importMapScript.type = 'importmap';
        importMapScript.textContent = JSON.stringify(
            this.createImportMap(),
            null,
            2,
        );

        // Insertar en la posición correcta
        const firstModuleScript = document.querySelector(
            'script[type="module"]',
        );
        if (firstModuleScript) {
            firstModuleScript.parentNode.insertBefore(
                importMapScript,
                firstModuleScript,
            );
        } else {
            document.head.appendChild(importMapScript);
        }

        console.log(
            `🎯 Import map actualizado con ${this.resolvedModules.size} módulos:`,
            this.createImportMap(),
        );
    }

    /**
     * Resolver módulo bajo demanda (on-demand)
     */
    async resolveOnDemand(moduleName) {
        if (!this.isInitialized) {
            console.warn(
                `⚠️ Sistema no inicializado, intentando resolver: ${moduleName}`,
            );
        }

        if (this.resolvedModules.has(moduleName)) {
            console.log(`✅ Módulo ya resuelto: ${moduleName}`);
            return this.resolvedModules.get(moduleName);
        }

        console.log(`🔍 Resolviendo bajo demanda: ${moduleName}`);
        const path = await this.resolveModule(moduleName, true);

        if (path) {
            console.log(
                `✅ Módulo resuelto bajo demanda: ${moduleName} -> ${path}`,
            );
        } else {
            console.error(`❌ No se pudo resolver bajo demanda: ${moduleName}`);
        }

        return path;
    }

    /**
     * Modo fallback para casos de error
     */
    enableFallbackMode() {
        console.log('🔄 Activando modo fallback...');

        // Módulos comunes como fallback
        const fallbackModules = [
            'vue',
            'react',
            'react-dom',
            'lodash',
            'axios',
            'moment',
            'dayjs',
            'uuid',
            'classnames',
            'clsx',
            'date-fns',
            '@vue/reactivity',
            '@vue/runtime-core',
            'pinia',
            'typescript',
            'code-tag',
            'chalk',
        ];

        fallbackModules.forEach(module => {
            this.availableDependencies.add(module);
        });
    }

    /**
     * Manejar errores de inicialización
     */
    handleInitializationError(error) {
        console.error('❌ Error crítico en la inicialización:', error);
        console.log('🔄 Intentando modo de recuperación...');

        // Modo de recuperación básico
        this.enableFallbackMode();
        this.resolveAllAvailableModules();
        this.applyImportMap();
    }

    /**
     * Agregar módulo manualmente (API pública)
     */
    addModule(name, path) {
        this.resolvedModules.set(name, path);
        this.updateCache(name, path);
        this.applyImportMap();
        console.log(`➕ Módulo agregado manualmente: ${name} -> ${path}`);
    }

    /**
     * Obtener estadísticas del sistema
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            resolvedModules: this.resolvedModules.size,
            availableDependencies: this.availableDependencies.size,
            cacheSize: this.cache.size,
            modules: Array.from(this.resolvedModules.keys()),
            dependencies: Array.from(this.availableDependencies),
            cache: Array.from(this.cache.keys()),
        };
    }

    /**
     * Limpiar caché
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Caché limpiado');
    }

    /**
     * Refrescar sistema completo
     */
    async refresh() {
        console.log('🔄 Refrescando sistema completo...');

        // Limpiar estado
        this.resolvedModules.clear();
        this.availableDependencies.clear();
        this.clearCache();
        this.isInitialized = false;

        // Reinicializar
        await this.init();
    }
}
// Inicializar automáticamente cuando se carga la página
let moduleResolver;

// API Global para crear resolver optimizado
window.createOptimizedResolver = function () {
    return new AbsolutelyDynamicModuleResolver({ optimizedMode: true });
};

// API Global para comparar rendimiento
window.compareResolvers = async function () {
    console.log('🔍 Iniciando comparación de resolvers...');

    const normalResolver = new AbsolutelyDynamicModuleResolver({
        optimizedMode: false,
    });
    const optimizedResolver = new AbsolutelyDynamicModuleResolver({
        optimizedMode: true,
    });

    // Esperar a que ambos se inicialicen
    await Promise.all([
        new Promise(resolve => {
            const checkNormal = setInterval(() => {
                if (normalResolver.isInitialized) {
                    clearInterval(checkNormal);
                    resolve();
                }
            }, 100);
        }),
        new Promise(resolve => {
            const checkOptimized = setInterval(() => {
                if (optimizedResolver.isInitialized) {
                    clearInterval(checkOptimized);
                    resolve();
                }
            }, 100);
        }),
    ]);

    const normalStats = normalResolver.getStats();
    const optimizedStats = optimizedResolver.getStats();

    console.log('📊 Comparación de Resolvers:');
    console.log('🔹 Normal (todas las deps):', normalStats);
    console.log('🔸 Optimizado (solo usadas):', optimizedStats);

    const reduction = Math.round(
        ((normalStats.totalModules - optimizedStats.totalModules) /
            normalStats.totalModules) *
            100,
    );
    console.log(
        `🎯 Reducción de módulos: ${reduction}% (de ${normalStats.totalModules} a ${optimizedStats.totalModules})`,
    );

    return {
        normal: normalStats,
        optimized: optimizedStats,
        reduction: reduction,
    };
};

// API Global para acceso desde cualquier lugar
window.resolveModule = async function (moduleName) {
    if (!moduleResolver) {
        console.warn('⚠️ Module Resolver no inicializado, esperando...');
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (moduleResolver && moduleResolver.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    return await moduleResolver.resolveOnDemand(moduleName);
};

// API Global para obtener estadísticas
window.getModuleStats = function () {
    return moduleResolver
        ? moduleResolver.getStats()
        : { error: 'Resolver no inicializado' };
};

// API Global para refrescar el sistema
window.refreshModuleResolver = async function () {
    if (moduleResolver) {
        await moduleResolver.refresh();
    } else {
        console.warn('⚠️ Module Resolver no inicializado');
    }
};

// Inicialización automática
function initializeModuleResolver() {
    if (!moduleResolver) {
        moduleResolver = new AbsolutelyDynamicModuleResolver();
        window.moduleResolver = moduleResolver;

        // Exponer métodos útiles
        window.addModule = (name, path) => moduleResolver.addModule(name, path);
        window.clearModuleCache = () => moduleResolver.clearCache();

        console.log(
            '🌟 Absolutely Dynamic Module Resolver v2.0 inicializado globalmente',
        );
    }
}

// Inicializar según el estado del DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModuleResolver);
} else {
    initializeModuleResolver();
}

// Interceptor para imports fallidos (experimental)
window.addEventListener('error', event => {
    if (
        event.message &&
        event.message.includes('Failed to resolve module specifier')
    ) {
        const moduleMatch = event.message.match(/"([^"]+)"/);
        if (moduleMatch && moduleResolver) {
            const moduleName = moduleMatch[1];
            console.log(`🔍 Intentando resolver módulo fallido: ${moduleName}`);
            moduleResolver.resolveOnDemand(moduleName);
        }
    }
});

console.log('🚀 Absolutely Dynamic Module Resolver v2.0 cargado y listo');
