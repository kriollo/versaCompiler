/**
 * DYNAMIC MODULE RESOLVER v2.0 - SISTEMA SIMPLIFICADO
 *
 * Sistema que usa APIs del servidor para resolver dependencias npm automáticamente.
 * Versión simplificada enfocada en funcionalidad core.
 */

interface ModuleResolverOptions {
    optimizedMode?: boolean;
}

interface CacheEntry {
    path: string | null;
    timestamp: number;
}

interface ModuleStats {
    initialized: boolean;
    resolvedModules: number;
    availableDependencies: number;
    cacheSize: number;
    modules: string[];
    dependencies: string[];
    cache: string[];
}

class AbsolutelyDynamicModuleResolver {
    private resolvedModules: Map<string, string>;
    private availableDependencies: Set<string>;
    private cache: Map<string, CacheEntry>;
    private pendingResolutions: Map<string, Promise<string | null>>;
    private isInitialized: boolean;
    private cacheExpiration: number;
    private maxCacheSize: number;
    private optimizedMode: boolean;

    constructor(options: ModuleResolverOptions = {}) {
        this.resolvedModules = new Map();
        this.availableDependencies = new Set();
        this.cache = new Map();
        this.pendingResolutions = new Map();
        this.isInitialized = false;

        // Configuración de caché
        this.cacheExpiration = 5 * 60 * 1000; // 5 minutos
        this.maxCacheSize = 100;

        this.optimizedMode = options.optimizedMode || false;

        console.log(
            `🚀 Iniciando Absolutely Dynamic Module Resolver v2.0${this.optimizedMode ? ' (Modo Optimizado)' : ''}...`,
        );
        this.init();
    } /**
     * Inicialización del sistema completamente dinámico
     */
    private async init(): Promise<void> {
        try {
            console.log('🔧 Cargando dependencias desde el servidor...');
            await this.loadDependenciesFromServer();

            console.log('📦 Resolviendo módulos automáticamente...');
            await this.resolveAllAvailableModules();
            console.log('🎯 Generando import map dinámico...');
            this.generateImportMapData();

            this.isInitialized = true;
            console.log(
                '✅ Sistema absolutamente dinámico inicializado correctamente',
            );
        } catch (error) {
            console.error(
                '❌ Error al inicializar el sistema dinámico:',
                error,
            );
            this.handleInitializationError(error as Error);
        }
    } /**
     * Cargar dependencias desde el servidor (todas o solo las usadas)
     */
    private async loadDependenciesFromServer(): Promise<
        Record<string, string>
    > {
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
    } /**
     * Resolver TODOS los módulos disponibles automáticamente
     */
    private async resolveAllAvailableModules(): Promise<void> {
        if (this.availableDependencies.size === 0) {
            console.warn('⚠️ No hay dependencias para resolver');
            return;
        }

        const resolutionPromises = Array.from(this.availableDependencies).map(
            moduleName => this.resolveModule(moduleName), // Resolver módulo
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
    } /**
     * Resolver un módulo específico usando la API del servidor
     */
    private async resolveModule(moduleName: string): Promise<string | null> {
        // Verificar caché primero
        if (this.cache.has(moduleName)) {
            const cached = this.cache.get(moduleName);
            if (
                cached &&
                Date.now() - cached.timestamp < this.cacheExpiration
            ) {
                console.log(`💾 Usando caché para: ${moduleName}`);
                if (cached.path) {
                    this.resolvedModules.set(moduleName, cached.path);
                    this.generateImportMapData();
                }
                return cached.path;
            } else {
                // Caché expirado
                this.cache.delete(moduleName);
            }
        }

        // Evitar resoluciones duplicadas
        if (this.pendingResolutions.has(moduleName)) {
            return (
                this.pendingResolutions.get(moduleName) || Promise.resolve(null)
            );
        }
        const resolutionPromise = this.performModuleResolution(moduleName);
        this.pendingResolutions.set(moduleName, resolutionPromise);

        try {
            const result = await resolutionPromise;
            return result;
        } finally {
            this.pendingResolutions.delete(moduleName);
        }
    } /**
     * Realizar la resolución real del módulo usando la API del servidor
     */
    private async performModuleResolution(
        moduleName: string,
    ): Promise<string | null> {
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
                this.updateCache(moduleName, data.path); // Agregar al mapa de módulos resueltos
                this.resolvedModules.set(moduleName, data.path);
                this.generateImportMapData();

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
    } /**
     * Actualizar caché inteligente
     */
    private updateCache(moduleName: string, path: string | null): void {
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
    private createImportMap(): { imports: Record<string, string> } {
        const imports: Record<string, string> = {};

        for (const [name, path] of this.resolvedModules) {
            imports[name] = path;
        }

        return { imports };
    } /**
     * Generar import map para ser usado en Node.js/servidor
     */
    private generateImportMapData(): void {
        if (this.resolvedModules.size === 0) {
            console.debug('📝 No hay módulos resueltos para el import map');
            return;
        }

        console.log(
            `🎯 Import map generado con ${this.resolvedModules.size} módulos:`,
            this.createImportMap(),
        );
    }

    /**
     * Resolver módulo bajo demanda (on-demand)
     */
    public async resolveOnDemand(moduleName: string): Promise<string | null> {
        if (!this.isInitialized) {
            console.warn(
                `⚠️ Sistema no inicializado, intentando resolver: ${moduleName}`,
            );
        }

        if (this.resolvedModules.has(moduleName)) {
            console.log(`✅ Módulo ya resuelto: ${moduleName}`);
            return this.resolvedModules.get(moduleName) || null;
        }
        console.log(`🔍 Resolviendo bajo demanda: ${moduleName}`);
        const path = await this.resolveModule(moduleName);

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
    private enableFallbackMode(): void {
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
    private handleInitializationError(error: Error): void {
        console.error('❌ Error crítico en la inicialización:', error);
        console.log('🔄 Intentando modo de recuperación...'); // Modo de recuperación básico
        this.enableFallbackMode();
        this.resolveAllAvailableModules();
        this.generateImportMapData();
    }

    /**
     * Agregar módulo manualmente (API pública)
     */
    public addModule(name: string, path: string): void {
        this.resolvedModules.set(name, path);
        this.updateCache(name, path);
        this.generateImportMapData();
        console.log(`➕ Módulo agregado manualmente: ${name} -> ${path}`);
    }

    /**
     * Obtener estadísticas del sistema
     */
    public getStats(): ModuleStats {
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
    public clearCache(): void {
        this.cache.clear();
        console.log('🧹 Caché limpiado');
    }

    /**
     * Refrescar sistema completo
     */
    public async refresh(): Promise<void> {
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

// Función para crear resolver para uso en Node.js
export function createModuleResolver(
    options: ModuleResolverOptions = {},
): AbsolutelyDynamicModuleResolver {
    return new AbsolutelyDynamicModuleResolver(options);
}

// Exportar la clase principal
export { AbsolutelyDynamicModuleResolver };
export type { ModuleResolverOptions, ModuleStats };
