/**
 * SPA Navigation System para versaWYS
 *
 * CONFIGURACIÓN:
 * - Modifica las constantes de configuración al inicio del archivo para personalizar el comportamiento
 * - DOM_SELECTORS: Selectores de elementos DOM utilizados por el sistema
 * - SCRIPT_NAMES: Nombres de archivos de scripts para manejo consistente
 * - SCRIPT_RELOAD_CONFIG: Configuración de qué scripts recargar/mantener
 * - SPA_EVENTS: Nombres de eventos del sistema para hooks externos
 * - VUE_DETECTION: Patrones para detectar páginas Vue
 * - PAGE_DETECTION: Configuración para detección de tipos de página
 * - GLOBAL_INIT_FUNCTIONS: Funciones globales que se ejecutan tras navegación
 *
 * EXTENSIBILIDAD:
 * - Agregar nuevos scripts a SCRIPT_RELOAD_CONFIG para configurar su comportamiento
 * - Agregar nuevos selectores a DOM_SELECTORS para mantener consistencia
 * - Agregar nuevos eventos a SPA_EVENTS para hooks personalizados
 * - Usar los métodos utilitarios (isVuePage, isVendorScript, etc.) para lógica consistente
 */
import { updateCsrfToken } from '@/dashboard/js/composables/csrfStore';
import { initializeSessionManager } from '@/dashboard/js/composables/SessionManager';
import VersaLinkElement from '@/dashboard/js/versa-link-element';
import { obtenerInstanciaVue } from '@/dashboard/js/vueLoader/getInstanciaVue';

// =============================================================================
// CONFIGURACIÓN DEL SISTEMA SPA
// =============================================================================

/**
 * Selectores DOM utilizados por el sistema SPA
 */
const DOM_SELECTORS = {
    // Contenedores principales
    MAIN_CONTENT: '#main-content',
    CONTENT_GENERAL: '#content-general',
    MAIN_ELEMENT: '#main',

    // Inputs de datos
    CSRF_TOKEN: '#csrf_token',
    CURRENT_USER: '#current_user',
    URL_ACTUAL: 'input[name="urlActual"]',

    // Navegación
    SPA_LINKS: 'a[data-spa]',

    // Loader
    SPA_LOADER: '#spa-loader',
    LOADER_STYLES: '#spa-loader-styles',

    // Bootstrap components
    BOOTSTRAP_TOOLTIP: '[data-bs-toggle="tooltip"]',
    BOOTSTRAP_DROPDOWN: '[data-bs-toggle="dropdown"]',
} as const;

/**
 * Nombres de archivos de scripts del sistema
 */
const SCRIPT_NAMES = {
    // Scripts principales del sistema
    SPA_NAVIGATION: 'spa-navigation.js',
    VUE_LOADER: 'vue-loader.js',
    DASHBOARD: 'dashboard.js',

    // Scripts de inicialización
    EARLY_INIT: 'early-init.js',

    // Scripts de desarrollo
    BROWSER_SYNC: 'browser-sync-client.js',

    // Librerías principales
    BOOTSTRAP: 'bootstrap.js',
    JQUERY: 'jquery.js',
    VUE: 'vue.js',
    ALPINE: 'alpine.js',
    FLOWBITE: 'flowbite.min.js',

    // Scripts personalizados comunes
    CUSTOM_SCRIPTS: 'custom-scripts.js',
    APP: 'app.js',
    MAIN: 'main.js',
} as const;

/**
 * Patrones de detección para tipos de páginas
 */
const PAGE_DETECTION = {
    VUE_MODULE_PATTERN: 'vue-loader.js',
    VENDOR_PATHS: ['/vendor/', '/node_modules/', '/public/vendor/', '/assets/vendor/'],
} as const;

/**
 * Configuración de scripts que deben/no deben recargarse
 */
const SCRIPT_RELOAD_CONFIG = {
    // Scripts que SIEMPRE deben recargarse
    ALWAYS_RELOAD: [SCRIPT_NAMES.CUSTOM_SCRIPTS, SCRIPT_NAMES.APP, SCRIPT_NAMES.MAIN],

    // Scripts que NUNCA deben recargarse (core/framework)
    NEVER_RELOAD: [
        SCRIPT_NAMES.SPA_NAVIGATION,
        SCRIPT_NAMES.VUE_LOADER,
        SCRIPT_NAMES.BROWSER_SYNC,
        SCRIPT_NAMES.BOOTSTRAP,
        SCRIPT_NAMES.JQUERY,
        SCRIPT_NAMES.VUE,
        SCRIPT_NAMES.ALPINE,
        SCRIPT_NAMES.FLOWBITE,
        SCRIPT_NAMES.EARLY_INIT,
    ],
} as const;

/**
 * Eventos del sistema SPA
 */
const SPA_EVENTS = {
    // Eventos de navegación
    START: 'spa:start',
    PROGRESS: 'spa:progress',
    FINISH: 'spa:finish',
    ERROR: 'spa:error',

    // Eventos de componentes
    COMPONENT_UPDATED: 'spa:component:updated',
    LIBRARIES_REINITIALIZED: 'spa:libraries:reinitialized',

    // Eventos DOM personalizados
    CONTENT_CHANGED: 'spa:contentChanged',
    APP_REINITIALIZE: 'app:reinitialize',
    PAGE_LOADED: 'page:loaded',
} as const;

/**
 * Utilidad de logging interna para el sistema SPA
 */
const logger = {
    info: (message: string, ...args: any[]) => {
        if (localStorage.getItem('spa_debug') === 'true' || window.location.hostname === 'localhost') {
            console.info(
                `%c[SPA]%c ${message}`,
                'background: #3b82f6; color: white; padding: 2px 5px; border-radius: 3px;',
                '',
                ...args,
            );
        }
    },
    warn: (message: string, ...args: any[]) => {
        console.warn(`[SPA] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
        console.error(`[SPA] ${message}`, ...args);
    },
};

// ========================================
// INTERFACES Y TIPOS
// ========================================

interface SPAResponse {
    type: 'html' | 'vue' | 'redirect';
    content: string;
    url?: string; // Para tipo 'redirect'
    module?: string;
    csrf_token?: string;
    current_user?: Record<string, unknown>;
    urlActual?: string;
    scripts?: {
        type: 'external' | 'inline';
        src?: string;
        content?: string;
    }[];
    styles?: {
        type: 'link' | 'inline';
        href?: string;
        content?: string;
    }[];
}

interface NavigationOptions {
    preserveScroll?: boolean;
    preserveState?: boolean;
    replace?: boolean;
}

class SPANavigation {
    private static instance: SPANavigation | null = null;
    private isNavigating = false;

    // Configuración de límites de memoria
    private readonly MAX_MAP_ENTRIES = 30;

    private scrollPositions = new Map<string, number>();
    private formStates = new Map<string, FormData>();
    private loadedScriptSources = new Set<string>();

    // Sistema de cache inteligente
    private scriptHashes = new Map<string, string>();

    // Control de navegación para evitar duplicación
    private abortController: AbortController | null = null;

    // Control de eventos de dashboard para evitar duplicación
    // (reservado para uso futuro de reinicialización contextual)

    // Sistema de debouncing para navegación
    private navigationDebounce: number | null = null;
    private readonly NAVIGATION_DEBOUNCE_DELAY = 100; // Ms

    // Sistema de monitoreo de rendimiento
    private navigationMetrics: {
        id: string;
        url: string;
        startTime: number;
        endTime?: number;
        duration?: number;
        type: 'html' | 'vue' | 'redirect' | 'unknown';
        success: boolean;
    }[] = [];

    // Identificador único de pestaña para prevenir sincronización entre pestañas duplicadas
    private readonly tabId: string;
    private isPageVisible = true;

    constructor() {
        // Generar un ID único para esta pestaña/ventana
        this.tabId = this.getOrCreateTabId();

        this.init();
        this.initializeSessionManager();
        // Inicializar con los scripts ya presentes en la carga inicial
        this.scanInitialScripts();

        // Configurar listeners para eventos de visibilidad
        this.setupVisibilityHandlers();
    }

    private init(): void {
        // Registrar el Web Component <versa-link> para navegación SPA
        this.registerVersaLinkComponent();

        // Escuchar eventos emitidos por versa-link-element para evitar dependencia circular
        document.addEventListener('spa:link:click', (event: Event) => {
            const customEvent = event as CustomEvent<{ href: string; options: NavigationOptions }>;
            const { href, options } = customEvent.detail;
            this.debounceNavigation(() => {
                this.navigate(href, true, options).catch(console.error);
            });
        });

        // Asegurar que la página actual tenga estado SPA al inicializar
        this.ensureCurrentPageHasSPAState();

        // PASO 1: Interceptar clicks en links
        document.addEventListener('click', (event: Event) => {
            if (!event.target) {
                return;
            }

            const target = event.target as Element;
            const link = target.closest('a[data-spa]') as HTMLAnchorElement | null;

            if (link && !this.isNavigating) {
                event.preventDefault();

                // Extraer opciones del link
                const options: NavigationOptions = {
                    preserveScroll: link.dataset.preserveScroll === 'true',
                    preserveState: link.dataset.preserveState === 'true',
                    replace: link.dataset.replace === 'true',
                };

                // Implementar debouncing para evitar clicks múltiples accidentales
                this.debounceNavigation(() => {
                    this.navigate(link.href, true, options).catch(console.error);
                });
            }
        });

        // PASO 5: Manejar el botón "atrás" del navegador - IDÉNTICO A CLICK EN LINK
        window.addEventListener('popstate', (event: PopStateEvent) => {
            // Si ya estamos navegando, ignorar
            if (this.isNavigating) {
                return;
            }

            // Logging para debugging de pestañas múltiples
            if (event.state?.tabId && event.state.tabId !== this.tabId) {
                logger.info(
                    `Evento popstate de diferente origen - Actual: ${this.tabId}, Evento: ${event.state.tabId}`,
                );
            }

            const currentUrl = window.location.href;

            // Validar si la URL debería manejarse como SPA
            if (!this.shouldHandleAsSPA(currentUrl, history.state)) {
                window.location.reload();
                return;
            }

            // SIMPLEMENTE hacer lo mismo que un click, pero sin pushState

            this.navigate(currentUrl, false)
                .then(() => true)
                .catch(error => {
                    console.error('❌ Error en navegación atrás:', error);
                    // Fallback: recargar página
                    window.location.reload();
                });
        });
    }

    async navigate(url: string, pushState = true, options: NavigationOptions = {}): Promise<void> {
        if (this.isNavigating) {
            logger.info('Navegación bloqueada: ya hay una en curso');
            return;
        }

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const currentProtocol = window.location.protocol;
        let targetUrl = url;

        // Normalizar protocolo en localhost para evitar ERR_SSL_PROTOCOL_ERROR
        if (isLocalhost && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
            try {
                const urlObj = new URL(targetUrl);
                if (
                    (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') &&
                    urlObj.protocol !== currentProtocol
                ) {
                    logger.info(`Corrigiendo protocolo de ${urlObj.protocol} a ${currentProtocol}`);
                    targetUrl = targetUrl.replace(urlObj.protocol, currentProtocol);
                }
            } catch (error) {
                logger.error('Error al normalizar URL:', error);
            }
        }

        const perfId = this.startPerformanceMonitoring(targetUrl);
        const currentUrl = window.location.href;

        // Evitar navegación si la URL base es la misma
        const [currentBaseUrl] = currentUrl.split('#');
        const [targetBaseUrl] = targetUrl.split('#');

        if (pushState && currentBaseUrl === targetBaseUrl) {
            logger.info('Ruta base idéntica, ignorando navegación SPA');
            this.showLoader();
            setTimeout(() => this.hideLoader(), 300);
            return;
        }

        try {
            this.isNavigating = true;

            // Limpieza y preparación
            if (this.abortController) {
                this.abortController.abort();
            }
            this.abortController = new AbortController();

            this.dispatchNavigationEvent(SPA_EVENTS.START, { url: targetUrl, options });
            this.saveScrollPosition(currentUrl);
            this.saveFormState(currentUrl);
            this.showLoader();

            logger.info(`Navegando a: ${targetUrl}`);

            // Realizar la petición
            const response = await fetch(targetUrl, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-SPA': 'true',
                },
                signal: this.abortController.signal,
                redirect: 'follow', // Para redirects 302 estándar (fallback)
                credentials: 'same-origin',
            });

            if (response.redirected) {
                logger.info(`Redirección detectada hacia: ${response.url}`);
                if (pushState) {
                    targetUrl = response.url;
                }
            }

            // Verificar content-type antes de decidir si la respuesta es procesable
            const contentType = response.headers.get('content-type');
            const isJsonResponse = contentType?.includes('application/json') ?? false;

            // Para respuestas no exitosas, solo lanzar error si NO es JSON renderable
            // Esto permite que páginas como 404 se rendericen correctamente vía SPA
            if (!response.ok && !isJsonResponse) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            if (!isJsonResponse) {
                throw new Error('La respuesta del servidor no es un JSON válido');
            }

            // Si la respuesta no es OK pero es JSON, intentar renderizar igualmente (ej: 404 SPA)
            if (!response.ok) {
                logger.warn(`Respuesta HTTP ${response.status}, procesando como contenido SPA`);
            }

            const data = (await response.json()) as SPAResponse;

            if (!data) {
                throw new Error('Respuesta vacía del servidor');
            }

            // Manejar redirección JSON (Inertia-style)
            if (data.type === 'redirect' && data.url) {
                logger.info(`Procesando redirección JSON interna: ${data.url}`);
                this.isNavigating = false;
                return this.navigate(data.url, pushState, options);
            }

            // Actualizar el DOM
            await this.updateContent(data, targetUrl);

            // Actualizar historial
            if (pushState) {
                const stateData = {
                    spa: true,
                    url: targetUrl,
                    timestamp: Date.now(),
                    type: data.type,
                    tabId: this.tabId, // Marcar con ID de pestaña
                };

                if (options.replace) {
                    history.replaceState(stateData, '', targetUrl);
                } else {
                    history.pushState(stateData, '', targetUrl);
                }
            }

            // Gestión de scroll y estado
            this.restoreScrollPosition(targetUrl, options.preserveScroll);
            this.restoreFormState(targetUrl, options.preserveState);

            this.endPerformanceMonitoring(perfId, data.type, true);
            this.hideLoader();
            this.dispatchNavigationEvent(SPA_EVENTS.FINISH, { url: targetUrl, success: true });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            logger.error(`Error en navegación:`, error);
            this.endPerformanceMonitoring(perfId, 'unknown', false);
            this.hideLoader();
            this.dispatchNavigationEvent(SPA_EVENTS.ERROR, { url: targetUrl, error });

            if (!this.detectDebugMode()) {
                window.location.href = targetUrl;
            }
        } finally {
            this.isNavigating = false;
            this.abortController = null;
        }
    }

    /**
     * Detecta si estamos en modo debug
     */
    private detectDebugMode(): boolean {
        // Verificar cookie de debug
        try {
            const debugCookie = document.cookie.split(';').find(row => row.trim().startsWith('debug='));
            if (debugCookie && debugCookie.split('=')[1] === '1') {
                return true;
            }
        } catch {
            // Ignorar errores de cookies
        }

        // Verificar localStorage
        try {
            const spaDebug = localStorage.getItem('spa_debug') === 'true';
            const sessionDebug = localStorage.getItem('session_debug') === 'true';

            // También considerar modo debug si estamos en desarrollo (localhost)
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            return spaDebug || sessionDebug || isDevelopment;
        } catch {
            return false;
        }
    }

    /**
     * Determina si una URL corresponde a una página SPA basándose en patrones conocidos
     */
    private isSPAPageFromURL(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const { pathname } = urlObj;

            // Lista de rutas que sabemos son páginas SPA (más amplia)
            const spaRoutes = [
                '/dashboard',
                '/modules',
                '/perfil',
                '/users',
                '/empresas',
                '/documentos',
                '/admin',
                '/panel',
            ];

            // Verificar si la ruta actual coincide con alguna ruta SPA
            return spaRoutes.some(route => pathname.startsWith(route));
        } catch (error) {
            console.warn('Error parsing URL:', url, error);
            return false;
        }
    }

    /**
     * Determina de manera más inteligente si una navegación debe manejarse como SPA
     * Considera múltiples factores: URL, estado del historial, presencia de elementos SPA
     */
    private shouldHandleAsSPA(url: string, state: any): boolean {
        // 1. Si el estado explícitamente dice que es SPA
        if (state && state.spa) {
            return true;
        }

        // 2. Verificar si la URL coincide con patrones SPA conocidos
        if (this.isSPAPageFromURL(url)) {
            return true;
        }

        // 3. Verificar si el documento actual tiene elementos/atributos que indican SPA
        const hasSPAElements = this.detectSPAElements();
        if (hasSPAElements) {
            return true;
        }

        // 4. Verificar si estamos en el contexto de una aplicación dashboard
        const isDashboardContext = this.isDashboardContext();
        if (isDashboardContext) {
            return true;
        }

        // 5. Por defecto, si no estamos seguros y la URL no parece ser estática, intentar SPA
        try {
            const urlObj = new URL(url);
            const isStaticFile = /\.(html|php|htm)$/i.test(urlObj.pathname);
            const isRoot = urlObj.pathname === '/' || urlObj.pathname === '';

            if (!isStaticFile && !isRoot) {
                return true;
            }
        } catch (error) {
            console.warn('Error analizando URL:', error);
        }

        return false;
    }

    /**
     * Asegura que la página actual tenga estado SPA al inicializar el sistema
     */
    private ensureCurrentPageHasSPAState(): void {
        const currentUrl = window.location.href;

        // Si ya hay estado y es SPA, no hacer nada
        if (history.state && history.state.spa) {
            return;
        }

        // Verificar si esta página debería ser manejada como SPA
        if (this.shouldHandleAsSPA(currentUrl, null)) {
            const initialState = {
                spa: true,
                url: currentUrl,
                timestamp: Date.now(),
                source: 'initial-load',
                tabId: this.tabId, // Marcar con ID de pestaña
            };

            history.replaceState(initialState, '', currentUrl);
        }
    }

    /**
     * Detecta si hay elementos en el DOM que indican que estamos en una aplicación SPA
     */
    private detectSPAElements(): boolean {
        // Buscar selectores que indican SPA
        const spaSelectors = [
            '#main-content',
            '#content-general',
            '[data-spa]',
            '[data-vue]',
            '.spa-app',
            '.dashboard-app',
        ];

        return spaSelectors.some(selector => document.querySelector(selector) !== null);
    }

    /**
     * Detecta si estamos en el contexto de un dashboard/admin
     */
    private isDashboardContext(): boolean {
        // Verificar URL
        const currentPath = window.location.pathname;
        const dashboardPaths = ['/dashboard', '/admin', '/panel'];

        if (dashboardPaths.some(path => currentPath.startsWith(path))) {
            return true;
        }

        // Verificar presencia de scripts/elementos típicos del dashboard
        const dashboardIndicators = [
            'script[src*="dashboard.js"]',
            'script[src*="spa-navigation.js"]',
            '.sidebar',
            '.dashboard-layout',
            '#dashboard',
            '[data-dashboard]',
        ];

        return dashboardIndicators.some(selector => document.querySelector(selector) !== null);
    }

    private async updateContent(data: SPAResponse, targetUrl: string): Promise<void> {
        if (data.type === 'html') {
            const mainContent = document.querySelector(DOM_SELECTORS.CONTENT_GENERAL) as HTMLElement | null;
            if (!mainContent) {
                logger.warn(`No se encontró ${DOM_SELECTORS.CONTENT_GENERAL}, navegando a ${targetUrl}`);
                window.location.href = targetUrl;
                return;
            }

            // Usar DOMParser para sanitización básica y mejor manejo de scripts
            this.safeInsertHTML(mainContent, data.content);
        } else if (data.type === 'vue') {
            const mainContent = document.querySelector(DOM_SELECTORS.MAIN_CONTENT) as HTMLElement | null;
            if (!mainContent) {
                logger.warn(`No se encontró ${DOM_SELECTORS.MAIN_CONTENT} para página Vue, navegando a ${targetUrl}`);
                window.location.href = targetUrl;
                return;
            }

            this.safeInsertHTML(mainContent, data.content);

            // Cargar el módulo Vue especificado
            if (data.module) {
                await this.loadVueModule(data.module);
            }
        }

        // === Actualización unificada de estado global (aplicable a HTML y Vue) ===
        this.syncGlobalState(data, targetUrl);

        // Cargar estilos y scripts si existen
        if (data.styles && data.styles.length > 0) {
            await this.loadStyles(data.styles);
        }

        if (data.scripts && data.scripts.length > 0) {
            await this.loadScripts(data.scripts);
        }

        // PASO 7: Disparar evento de componente actualizado para que otras librerías lo manejen
        this.dispatchNavigationEvent(SPA_EVENTS.COMPONENT_UPDATED, {
            type: data.type,
            module: data.module,
            content: 'updated',
        });

        // PASO ADICIONAL: Reinicializar librerías globales después de actualizar el contenido
        // Esto es crítico para asegurar que todas las funcionalidades sigan trabajando
        // Usamos un timing más preciso para asegurar que el DOM esté completamente actualizado
        requestAnimationFrame(() => {
            // SetTimeout(() => {
            this.reinitializeGlobalLibraries();

            // Actualizar el menú activo del dashboard después de la navegación
            this.updateDashboardActiveMenu();
            // }, 50);
        });
    }

    /**
     * Sincroniza el estado global del SPA después de actualizar el contenido.
     * Unifica la actualización de urlActual, csrf_token y current_user
     * para evitar duplicación entre tipos de respuesta (html/vue).
     *
     * Inspirado en Inertia.js: mantiene props compartidos actualizados
     * en cada navegación sin importar el tipo de página.
     */
    private syncGlobalState(data: SPAResponse, targetUrl: string): void {
        // Actualizar urlActual
        const urlActualValue = data.urlActual || targetUrl;
        const urlActualInput = document.querySelector(DOM_SELECTORS.URL_ACTUAL) as HTMLInputElement | null;
        if (urlActualInput) {
            urlActualInput.value = urlActualValue;
        }

        // Actualizar CSRF token si viene nuevo (DOM + store reactivo de Vue)
        if (data.csrf_token) {
            const csrfInput = document.querySelector(DOM_SELECTORS.CSRF_TOKEN) as HTMLInputElement | null;
            if (csrfInput) {
                csrfInput.value = data.csrf_token;
            }
            updateCsrfToken(data.csrf_token);
        }

        // Actualizar datos del usuario si vienen nuevos
        if (data.current_user) {
            const userInput = document.querySelector(DOM_SELECTORS.CURRENT_USER) as HTMLInputElement | null;
            if (userInput) {
                userInput.value = JSON.stringify(data.current_user);
            }
        }
    }

    /**
     * Inserta HTML de forma segura utilizando DOMParser y ejecuta scripts inline correctamente
     */
    private safeInsertHTML(container: HTMLElement, htmlContent: string): void {
        // Limpiar contenido anterior
        container.innerHTML = '';

        // Usar DOMParser para análisis seguro
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Extraer scripts antes de insertar el contenido
        const scripts = doc.querySelectorAll('script');
        const scriptContents: { content: string; isModule: boolean; src?: string }[] = [];

        scripts.forEach(script => {
            if (script.src) {
                // Script externo - será manejado por loadScripts
                return;
            }

            // Script inline
            const content = script.textContent || script.innerHTML;
            const isModule = script.type === 'module' || this.isModuleScript(content);

            scriptContents.push({ content, isModule, src: script.src || undefined });
            script.remove(); // Remover del DOM parseado
        });

        // Insertar el contenido HTML sin scripts
        // Const elementsToInsert = doc.body.children.length;

        while (doc.body.firstChild) {
            container.append(doc.body.firstChild);
        }

        // Ejecutar scripts inline después de insertar el contenido, en orden correcto
        requestAnimationFrame(() => {
            scriptContents.forEach(({ content, isModule }) => {
                this.executeInlineScriptSafe(content, isModule);
            });
        });
    }

    /**
     * Detecta si un script es un módulo ES6
     */
    private isModuleScript(content: string): boolean {
        const modulePatterns = [/import\s+.*\s+from\s+['"`]/, /export\s+/, /import\s*\(/, /import\s*\{/];

        return modulePatterns.some(pattern => pattern.test(content));
    }

    /**
     * Ejecuta un script inline de forma segura con el tipo correcto
     */
    private executeInlineScriptSafe(content: string, isModule: boolean): void {
        try {
            const cleanContent = content.trim();
            if (!cleanContent || cleanContent.startsWith('//') || cleanContent.startsWith('/*')) {
                return;
            }

            // Verificar que no contenga sintaxis de template
            if (cleanContent.includes('<?php') || cleanContent.includes('{{') || cleanContent.includes('{%')) {
                return;
            }

            // Verificar sintaxis básica antes de ejecutar
            if (!this.isValidJavaScript(cleanContent)) {
                return;
            }

            const script = document.createElement('script');
            script.type = isModule ? 'module' : 'text/javascript';
            script.textContent = cleanContent;
            document.head.append(script);

            // Limpiar después de un tiempo
            setTimeout(() => {
                script.remove();
            }, 100);
        } catch (error) {
            console.error('Error ejecutando script inline:', error);
        }
    }

    private async loadVueModule(modulePath: string): Promise<void> {
        try {
            // Manejo robusto de errores para obtener instancia Vue
            let vueInstance: any = null;
            try {
                vueInstance = await obtenerInstanciaVue(DOM_SELECTORS.MAIN_CONTENT, 1000);
            } catch (error) {
                console.warn('Error obteniendo instancia Vue:', error);
                // Continuar sin desmontar instancia anterior
                vueInstance = null;
            }

            if (vueInstance) {
                try {
                    if (typeof (vueInstance as any).unmount === 'function') {
                        (vueInstance as any).unmount();
                    } else if (typeof (vueInstance as any).$destroy === 'function') {
                        (vueInstance as any).$destroy();
                    }
                } catch (error) {
                    console.warn('Error al desmontar instancia de Vue:', error);
                }
            }

            // Verificar que el contenedor existe
            const container = document.querySelector(DOM_SELECTORS.MAIN_CONTENT);
            if (!container) {
                // Crear contenedor básico si no existe
                const mainElement = document.querySelector(DOM_SELECTORS.MAIN_ELEMENT);
                if (mainElement) {
                    const newContainer = document.createElement('div');
                    newContainer.id = DOM_SELECTORS.MAIN_CONTENT.replace('#', '');
                    newContainer.className = 'flex-1 p-4';
                    mainElement.append(newContainer);
                }
            }

            // Crear y cargar el script Vue
            const script = document.createElement('script');
            script.type = 'module';
            script.src = `/public/dashboard/js/${SCRIPT_NAMES.VUE_LOADER}?${Date.now()}&m=${modulePath}`;

            // Remover scripts anteriores
            const oldVueLoaderScripts = document.querySelectorAll(`script[src*="${SCRIPT_NAMES.VUE_LOADER}"]`);
            oldVueLoaderScripts.forEach(oldScript => {
                const src = oldScript.getAttribute('src') || '';
                if (!src.includes('browser-sync') && !src.includes('hot') && !src.includes('dev')) {
                    oldScript.remove();
                }
            });

            document.head.append(script);
        } catch (error) {
            console.error('Error cargando módulo Vue:', error);
        }
    }

    private async loadStyles(styles: { type: 'link' | 'inline'; href?: string; content?: string }[]): Promise<void> {
        // Separar estilos externos e inline
        const externalStyles = styles.filter(style => style.type === 'link' && typeof style.href === 'string');
        const inlineStyles = styles.filter(style => style.type === 'inline' && typeof style.content === 'string');

        // Cargar TODOS los estilos externos en paralelo con Promise.all()
        if (externalStyles.length > 0) {
            await Promise.all(
                externalStyles.map(style => (style.href ? this.loadExternalStyle(style.href) : Promise.resolve())),
            );
        }

        // Agregar estilos inline inmediatamente
        inlineStyles.forEach(style => {
            if (style.content) {
                this.addInlineStyle(style.content);
            }
        });
    }

    private loadExternalStyle(href: string): Promise<void> {
        // Convertir URL absoluta a relativa para evitar problemas CORS
        const relativeHref = this.convertToRelativeURL(href);

        // Agregar timestamp para evitar caché
        const timestampedHref = this.addConfigurableTimestamp(relativeHref);

        if (document.querySelector(`link[href*="${relativeHref.split('?')[0]}"]`)) {
            return Promise.resolve();
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = timestampedHref;
        document.head.append(link);

        return Promise.resolve();
    }

    private addInlineStyle(content: string): void {
        const style = document.createElement('style');
        style.textContent = content;
        document.head.append(style);
    }

    private async loadScripts(
        scripts: { type: 'external' | 'inline'; src?: string; content?: string; priority?: number }[],
    ): Promise<void> {
        const externalScripts = scripts.filter(script => script.type === 'external' && script.src);
        const inlineScripts = scripts.filter(script => script.type === 'inline' && script.content);

        // Separar scripts por prioridad para evitar race conditions
        const highPriorityScripts = externalScripts.filter(script => (script.priority ?? 0) > 0);
        const normalPriorityScripts = externalScripts.filter(script => (script.priority ?? 0) <= 0);

        // Cargar scripts de alta prioridad primero (secuencialmente)
        if (highPriorityScripts.length > 0) {
            // Usar un bucle for...of para garantizar la carga secuencial y fiable
            for (const script of highPriorityScripts) {
                if (script.src) {
                    // eslint-disable-next-line no-await-in-loop
                    await this.loadExternalScript(script.src);
                }
            }
        }

        // Cargar scripts normales en paralelo
        if (normalPriorityScripts.length > 0) {
            const scriptPromises = normalPriorityScripts
                .filter(script => typeof script.src === 'string')
                .map(script => this.loadExternalScript(script.src ?? ''));

            await Promise.all(scriptPromises);
        }

        // Ejecutar scripts inline después de que todos los externos estén cargados
        // Esto evita race conditions donde scripts inline dependen de librerías externas
        if (inlineScripts.length > 0) {
            // Agregar pequeño delay para asegurar que scripts externos están listos
            setTimeout(() => {
                inlineScripts.forEach(script => {
                    if (script.content) {
                        this.executeInlineScript(script.content);
                    }
                });
            }, 50);
        }
    }

    private loadExternalScript(src: string): Promise<void> {
        const relativeSrc = this.convertToRelativeURL(src);
        const timestampedSrc = this.addConfigurableTimestamp(relativeSrc);
        const baseUrl = relativeSrc.split('?')[0] as string;

        if (this.loadedScriptSources.has(baseUrl)) {
            if (this.shouldReloadScript(relativeSrc)) {
                logger.info(`Recargando script: ${baseUrl}`);
                document.querySelectorAll(`script[src*="${baseUrl}"]`).forEach(s => s.remove());
            } else {
                return Promise.resolve();
            }
        }

        const globalScripts = ['spa-navigation.js', 'vue-loader.js', 'bootstrap.js', 'jquery.js', 'vue.js'];
        if (globalScripts.some(s => relativeSrc.includes(s))) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = timestampedSrc;
            script.type = 'module';
            script.async = true;

            script.addEventListener('load', () => {
                this.loadedScriptSources.add(baseUrl);
                resolve();
            });

            script.addEventListener('error', () => {
                logger.error(`Error al cargar script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            });

            document.head.append(script);
        });
    }

    /**
     * Ejecuta un script inline validando su contenido.
     * Delega a executeInlineScriptSafe para evitar duplicación.
     */
    private executeInlineScript(content: string): void {
        const cleanContent = content.trim();
        if (!cleanContent || cleanContent.startsWith('//') || cleanContent.startsWith('/*')) {
            return;
        }

        // Verificar que no contenga sintaxis de template
        if (cleanContent.includes('<?php') || cleanContent.includes('{{') || cleanContent.includes('{%')) {
            return;
        }

        // Verificar que no contenga sintaxis de configuración (JSON/YAML)
        if (cleanContent.includes(':') && !cleanContent.includes('function') && !cleanContent.includes('=')) {
            return;
        }

        if (!this.isValidJavaScript(cleanContent)) {
            return;
        }

        const isModule = this.isModuleScript(cleanContent);
        this.executeInlineScriptSafe(cleanContent, isModule);
    }

    /**
     * PASO 6: Gestión del scroll y estado
     * Preserva la posición del scroll y el estado de formularios
     */
    private saveScrollPosition(url: string): void {
        this.scrollPositions.set(url, window.scrollY);

        if (this.scrollPositions.size > this.MAX_MAP_ENTRIES) {
            const firstKey = this.scrollPositions.keys().next().value;
            if (firstKey) {
                this.scrollPositions.delete(firstKey);
            }
        }
    }

    private restoreScrollPosition(url: string, preserveScroll = false): void {
        if (preserveScroll) {
            const savedPosition = this.scrollPositions.get(url);
            if (savedPosition !== undefined) {
                window.scrollTo({ top: savedPosition, behavior: 'instant' });
                return;
            }
        }

        try {
            const urlObj = new URL(url, window.location.origin);
            if (urlObj.hash) {
                const targetElement = document.querySelector(urlObj.hash);
                if (targetElement) {
                    requestAnimationFrame(() => {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                    return;
                }
            }
        } catch (error) {
            logger.warn('Error al procesar hash para scroll:', error);
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    private saveFormState(url: string): void {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const formData = new FormData(form);
            const formId = form.id || form.getAttribute('name') || 'default';
            this.formStates.set(`${url}_${formId}`, formData);
        });

        if (this.formStates.size > this.MAX_MAP_ENTRIES) {
            const firstKey = this.formStates.keys().next().value;
            if (firstKey) {
                this.formStates.delete(firstKey);
            }
        }
    }

    private restoreFormState(url: string, preserveState = false): void {
        if (!preserveState) {
            return;
        }

        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const formId = form.id || form.getAttribute('name') || 'default';
            const savedData = this.formStates.get(`${url}_${formId}`);
            if (savedData) {
                for (const [key, value] of savedData.entries()) {
                    if (typeof value === 'string') {
                        const inputs = form.querySelectorAll(`[name="${key}"]`) as NodeListOf<
                            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                        >;

                        inputs.forEach(input => {
                            if (input instanceof HTMLInputElement) {
                                if (input.type === 'radio' || input.type === 'checkbox') {
                                    input.checked = input.value === value;
                                } else if (input.type !== 'file') {
                                    input.value = value;
                                }
                            } else {
                                input.value = value;
                            }
                        });
                    }
                }
            }
        });
    }

    /**
     * PASO 7: Sistema de eventos y hooks completo
     * Dispara eventos del ciclo de vida para hooks externos
     */
    private dispatchNavigationEvent(eventName: string, detail: any = {}): void {
        const event = new CustomEvent(`spa:${eventName}`, {
            detail: {
                url: detail.url || window.location.href,
                timestamp: Date.now(),
                ...detail,
            },
        });
        document.dispatchEvent(event);
    }

    /**
     * SISTEMA DE MONITOREO DE RENDIMIENTO
     * Recopila métricas de navegación para optimización y debugging
     */
    private startPerformanceMonitoring(url: string): string {
        const id = `nav_${Date.now()}`;
        this.navigationMetrics.push({
            id,
            url,
            startTime: performance.now(),
            type: 'unknown',
            success: false,
        });

        if (this.navigationMetrics.length > this.MAX_MAP_ENTRIES) {
            this.navigationMetrics.shift();
        }

        return id;
    }

    private endPerformanceMonitoring(
        id: string,
        type: 'html' | 'vue' | 'redirect' | 'unknown',
        success: boolean,
    ): void {
        const metric = this.navigationMetrics.find(m => m.id === id);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
            metric.type = type;
            metric.success = success;

            logger.info(`Navegación completada (${type}): ${metric.duration.toFixed(2)}ms`);
        }
    }

    public getPerformanceMetrics(): any[] {
        return [...this.navigationMetrics];
    }

    /**
     * API PÚBLICA: Limpiar métricas de rendimiento
     */
    public clearPerformanceMetrics(): void {
        this.navigationMetrics.length = 0;
    }

    /**
     * API PÚBLICA: Limpiar debouncing de navegación
     * Útil para testing o casos especiales donde se necesite navegación inmediata
     */
    public clearNavigationDebounce(): void {
        if (this.navigationDebounce) {
            clearTimeout(this.navigationDebounce);
            this.navigationDebounce = null;
        }
    }

    /**
     * API PÚBLICA: Obtener instancia singleton
     */
    public static getInstance(): SPANavigation {
        if (!SPANavigation.instance) {
            SPANavigation.instance = new SPANavigation();
        }
        return SPANavigation.instance;
    }

    // ===============================================
    // MÉTODOS AUXILIARES PARA GESTIÓN DE PESTAÑAS
    // ===============================================

    /**
     * Obtiene o crea un ID único para esta pestaña usando sessionStorage
     * sessionStorage es único por pestaña, a diferencia de localStorage
     */
    private getOrCreateTabId(): string {
        const storageKey = 'spa_tab_id';

        try {
            let tabId = sessionStorage.getItem(storageKey);

            if (!tabId) {
                // Generar nuevo ID único para esta pestaña
                tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
                sessionStorage.setItem(storageKey, tabId);
                logger.info(`Nueva pestaña creada con ID: ${tabId}`);
            } else {
                logger.info(`Pestaña existente con ID: ${tabId}`);
            }

            return tabId;
        } catch {
            // Fallback si sessionStorage no está disponible
            logger.warn('sessionStorage no disponible, usando ID temporal');
            return `tab-fallback-${Date.now()}`;
        }
    }

    /**
     * Configura los manejadores de visibilidad de página
     */
    private setupVisibilityHandlers(): void {
        // Detectar cuando la pestaña cambia de visibilidad
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;

            if (this.isPageVisible) {
                logger.info(`Pestaña ${this.tabId} ahora visible`);
            } else {
                logger.info(`Pestaña ${this.tabId} ahora oculta`);
            }
        });

        // Inicializar estado de visibilidad
        this.isPageVisible = !document.hidden;
    }

    // ===============================================
    // MÉTODOS AUXILIARES FALTANTES
    // ===============================================

    /**
     * SISTEMA DE LOADER PARA NAVEGACIÓN SPA
     * Muestra un indicador de carga elegante durante las transiciones
     */
    private showLoader(): void {
        // Verificar si ya existe un loader
        let loader = document.querySelector(DOM_SELECTORS.SPA_LOADER) as HTMLElement | null;

        if (!loader) {
            // Crear el loader con diseño moderno
            loader = document.createElement('div');
            loader.id = 'spa-loader';
            loader.className = 'spa-loader';

            loader.innerHTML = `
                <div class="spa-loader-backdrop bg-black bg-opacity-50 backdrop-blur-sm">
                    <div class="spa-loader-container bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl">
                        <div class="spa-loader-spinner flex gap-2 mb-4">
                            <div class="spa-loader-circle w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                            <div class="spa-loader-circle w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                            <div class="spa-loader-circle w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        </div>
                        <p class="spa-loader-text text-gray-700 dark:text-gray-300 text-sm font-medium">Cargando...</p>
                    </div>
                </div>
            `;

            // Agregar estilos CSS básicos
            const styles = document.createElement('style');
            styles.textContent = `
                .spa-loader {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease-in-out;
                }
                .spa-loader.spa-loader-visible {
                    opacity: 1;
                }
                .spa-loader-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .spa-loader-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 200px;
                }
            `;
            document.head.append(styles);
            document.body.append(loader);
        }

        // Mostrar el loader
        loader.style.display = 'flex';
        requestAnimationFrame(() => {
            loader?.classList.add('spa-loader-visible');
        });
    }

    private hideLoader(): void {
        const loader = document.querySelector(DOM_SELECTORS.SPA_LOADER) as HTMLElement | null;
        if (loader) {
            loader.classList.remove('spa-loader-visible');
            setTimeout(() => {
                if (loader) {
                    loader.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * SISTEMA DE REINICIALIZACIÓN DE LIBRERÍAS GLOBALES
     */
    private reinitializeGlobalLibraries(): void {
        // Reinicializar Flowbite
        try {
            if (typeof (window as any).initFlowbite === 'function') {
                (window as any).initFlowbite();
            }
        } catch (error) {
            console.warn('Error reinicializando Flowbite:', error);
        }

        // Reinicializar Bootstrap components
        try {
            if ((window as any).bootstrap?.Tooltip) {
                const tooltipTriggerList = document.querySelectorAll(DOM_SELECTORS.BOOTSTRAP_TOOLTIP);
                tooltipTriggerList.forEach(tooltipTriggerEl => {
                    try {
                        // eslint-disable-next-line no-new
                        new (window as any).bootstrap.Tooltip(tooltipTriggerEl);
                    } catch (error) {
                        console.warn('Error inicializando tooltip:', error);
                    }
                });
            }
        } catch (error) {
            console.warn('Error reinicializando Bootstrap:', error);
        }

        // Disparar evento global para que otras librerías se reinicialicen
        this.dispatchNavigationEvent(SPA_EVENTS.LIBRARIES_REINITIALIZED, {
            timestamp: Date.now(),
            libraries: ['flowbite', 'bootstrap', 'custom-scripts'],
        });
    }

    /**
     * Actualiza el menú activo del dashboard después de la navegación SPA
     * Accede a la instancia global del DashboardManager si existe
     */
    private updateDashboardActiveMenu(): void {
        try {
            // Intentar acceder a la instancia global del dashboard
            const dashboardInstance = (window as any).__dashboardInstance;

            if (dashboardInstance && typeof dashboardInstance.updateActiveMenuItems === 'function') {
                const debugMode = localStorage.getItem('spa_debug') === 'true';
                if (debugMode) {
                    logger.info('Actualizando menú activo del dashboard...');
                }

                // Llamar al método para actualizar el menú activo
                dashboardInstance.updateActiveMenuItems();

                if (debugMode) {
                    logger.info('Menú activo actualizado correctamente');
                }
            }
        } catch (error) {
            logger.warn('Error actualizando menú activo del dashboard:', error);
        }
    }

    /**
     * UTILIDADES DE VALIDACIÓN Y CONVERSIÓN
     */
    private isValidJavaScript(content: string): boolean {
        const jsPatterns = [
            /^(var|let|const|function|if|for|while|do|switch|try|catch|class|import|export)\s/,
            /^\s*[\w$]+\s*[=]/,
            /^\s*document\./,
            /^\s*window\./,
            /addEventListener/,
            /querySelector/,
        ];

        const hasJsPattern = jsPatterns.some(pattern => pattern.test(content));
        const hasCommonJs =
            content.includes('function') || content.includes('document.') || content.includes('window.');

        return hasJsPattern || hasCommonJs;
    }

    private convertToRelativeURL(url: string): string {
        if (!url.startsWith('http')) {
            return url;
        }

        try {
            const urlObj = new URL(url);
            return urlObj.pathname + urlObj.search;
        } catch (error) {
            console.warn('Error converting URL to relative:', url, error);
            return url;
        }
    }

    private addConfigurableTimestamp(url: string): string {
        const [baseUrl] = url.split('?');

        if (!baseUrl) {
            return url;
        }

        // Para scripts críticos del sistema, usar hash estable
        const criticalScripts = ['dashboard.js', 'spa-navigation.js', 'vue-loader.js'];
        const isCriticalScript = criticalScripts.some(script => baseUrl.includes(script));

        let cacheParam = '';

        if (isCriticalScript) {
            // Para scripts críticos, usar hash más estable
            const existingHash = this.scriptHashes.get(baseUrl);
            if (existingHash) {
                cacheParam = existingHash;
            } else {
                cacheParam = this.generateResourceHash(baseUrl);
                this.scriptHashes.set(baseUrl, cacheParam);
            }
        } else {
            // Para otros recursos, usar timestamp para forzar recarga
            cacheParam = String(Date.now());
        }

        // Si la URL ya tiene parámetros, agregar cache param con &
        if (url.includes('?')) {
            return `${url}&_v=${cacheParam}`;
        }
        // No tiene parámetros, agregar cache param con ?
        return `${url}?_v=${cacheParam}`;
    }

    private generateResourceHash(url: string): string {
        // Generar hash simple usando algoritmo de string hash
        let hash = 0;
        for (let index = 0; index < url.length; index++) {
            const char = url.codePointAt(index) || 0;
            hash = (hash * 31 + char) % 2147483647; // Usar módulo para evitar overflow
        }
        return Math.abs(hash).toString(36);
    }

    private shouldReloadScript(src: string): boolean {
        // Scripts que SIEMPRE deben recargarse
        const alwaysReloadScripts = SCRIPT_RELOAD_CONFIG.ALWAYS_RELOAD;

        // Scripts que NUNCA deben recargarse
        const neverReloadScripts = SCRIPT_RELOAD_CONFIG.NEVER_RELOAD;

        // Verificar si debe recargarse siempre
        const shouldAlwaysReload = alwaysReloadScripts.some(script => src.includes(script));
        if (shouldAlwaysReload) {
            return true;
        }

        // Verificar si nunca debe recargarse
        const shouldNeverReload = neverReloadScripts.some(script => src.includes(script));
        if (shouldNeverReload) {
            return false;
        }

        // Por defecto, recargar scripts personalizados/de página específica
        const isPageSpecificScript = !PAGE_DETECTION.VENDOR_PATHS.some(path => src.includes(path));
        return isPageSpecificScript;
    }

    /**
     * Registra el Web Component <versa-link> para navegación SPA
     */
    private registerVersaLinkComponent(): void {
        if (customElements.get('versa-link')) {
            return;
        }

        customElements.define('versa-link', VersaLinkElement);
    }

    /**
     * Inicializa el SessionManager para gestión avanzada de sesiones
     */
    private initializeSessionManager(): void {
        try {
            // Configuración personalizada para el SessionManager
            const sessionConfig = {
                heartbeatInterval: 30000, // 30 segundos
                nearExpiryWarning: 600, // 10 minutos
                maxRetries: 3,
                retryDelay: 5000, // 5 segundos
                initialDelay: 10000, // 10 segundos de delay inicial para permitir carga completa
                autoStart: true, // Iniciar automáticamente pero con delay
            };

            // Inicializar SessionManager solo si estamos en una página autenticada
            const csrfToken = document.querySelector('#csrf_token');
            if (csrfToken) {
                const sessionManager = initializeSessionManager(sessionConfig);

                // Configurar listeners para eventos de sesión
                sessionManager.on('expired', event => {
                    console.warn('SessionManager: Sesión expirada', event);
                    // La redirección se maneja automáticamente en SessionManager
                });

                sessionManager.on('nearExpiry', event => {
                    console.warn('SessionManager: Sesión próxima a expirar', event);
                });

                sessionManager.on('error', event => {
                    console.warn('SessionManager: Error de conectividad', event);
                });

                sessionManager.on('restored', event => {
                    console.info('SessionManager: Conexión restaurada', event);
                });
            }
        } catch (error) {
            console.warn('Error inicializando SessionManager:', error);
        }
    }

    /**
     * SISTEMA DE DEBOUNCING PARA NAVEGACIÓN
     * Previene navegaciones múltiples accidentales y mejora la experiencia del usuario
     */
    private debounceNavigation(callback: () => void): void {
        // Limpiar timeout anterior si existe
        if (this.navigationDebounce) {
            clearTimeout(this.navigationDebounce);
        }

        // Establecer nuevo timeout
        this.navigationDebounce = window.setTimeout(() => {
            this.navigationDebounce = null;
            callback();
        }, this.NAVIGATION_DEBOUNCE_DELAY);
    }

    /**
     * Escanea los scripts iniciales en el DOM para poblar el set de scripts cargados.
     */
    private scanInitialScripts(): void {
        document.querySelectorAll('script[src]').forEach(script => {
            const { src } = script as HTMLScriptElement;
            if (!src) {
                return;
            }
            const [baseSrc] = this.convertToRelativeURL(src).split('?');
            this.loadedScriptSources.add(baseSrc || '');
        });
    }
}

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SPANavigation.getInstance();
    });
} else {
    SPANavigation.getInstance();
}

export default SPANavigation;
