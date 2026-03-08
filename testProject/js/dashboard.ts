import { $dom, $domAll } from '@/dashboard/js/composables/dom';
import { type ThemeValue, useSidebar, useTheme } from '@/dashboard/js/composables/storage';
import { UI_BREAKPOINTS } from '@/dashboard/js/constants';

// Declarar tipos para Flowbite
declare global {
    interface Window {
        Flowbite?: any;
        initFlowbite?: () => void;
        __dashboardLoaded?: boolean;
        __dashboardInstance?: any;
    }
}

// Limpiar estilos de inicialización temprana si existen
const cleanupEarlyStyles = (): void => {
    const earlyStyle = document.querySelector('#sidebar-early-init');
    if (earlyStyle) {
        earlyStyle.remove();
    }
};

class DashboardManager {
    private static instance: DashboardManager;
    private eventListeners: { element: EventTarget; type: string; listener: EventListenerOrEventListenerObject }[] = [];
    private isInitialized = false;
    private initializationTimeout: number | null = null;
    private readonly instanceId: string;

    private constructor() {
        // Constructor privado para el patrón Singleton
        this.instanceId = `dashboard-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    public static getInstance(): DashboardManager {
        if (!DashboardManager.instance) {
            DashboardManager.instance = new DashboardManager();
            // Registrar en window para evitar duplicados
            window.__dashboardInstance = DashboardManager.instance;
        }
        return DashboardManager.instance;
    }

    private addEventListener(element: EventTarget, type: string, listener: EventListenerOrEventListenerObject) {
        element.addEventListener(type, listener);
        this.eventListeners.push({ element, type, listener });
    }

    public cleanup() {
        for (const { element, type, listener } of this.eventListeners) {
            try {
                element.removeEventListener(type, listener);
            } catch {
                // Silently handle cleanup errors
            }
        }

        this.eventListeners = [];

        if (this.initializationTimeout) {
            clearTimeout(this.initializationTimeout);
            this.initializationTimeout = null;
        }

        this.isInitialized = false;
    }

    public init() {
        // Prevenir múltiples inicializaciones simultáneas
        if (this.isInitialized) {
            return;
        }

        // Limpiar listeners de eventos anteriores para evitar duplicados en navegación SPA
        this.cleanup();

        // Verificar que los elementos críticos existan antes de continuar
        if (!this.verifyDOMElements()) {
            this.initializationTimeout = window.setTimeout(() => {
                this.init();
            }, 100);
            return;
        }

        this.isInitialized = true;

        // Inicializar composables
        const { isDarkTheme, setTheme } = useTheme();
        const { isSidebarCollapsed, setSidebarCollapsed } = useSidebar();

        // Ejecutar limpieza inmediatamente
        cleanupEarlyStyles();

        // Reinicializar Flowbite después de navegación SPA
        this.reinitializeFlowbite();

        this.initializeThemeToggle(isDarkTheme, setTheme);
        this.initializeSidebar(isSidebarCollapsed, setSidebarCollapsed);

        // Actualizar el menú activo en la carga inicial
        this.updateActiveMenuItems();
    }

    private verifyDOMElements(): boolean {
        // Verificar que al menos el contenedor principal exista
        const mainContent = document.querySelector('#main-content');
        return mainContent !== null;
    }

    private initializeThemeToggle(isDarkTheme: () => boolean, setTheme: (theme: ThemeValue) => void) {
        const $themeToggleDarkIcon = $dom('#theme-toggle-dark-icon');
        const $themeToggleLightIcon = $dom('#theme-toggle-light-icon');

        if ($themeToggleDarkIcon && $themeToggleLightIcon) {
            // Change the icons inside the button based on previous settings
            if (isDarkTheme()) {
                $themeToggleLightIcon.classList.remove('hidden');
                document.documentElement.classList.add('dark');
            } else {
                $themeToggleDarkIcon.classList.remove('hidden');
                document.documentElement.classList.remove('dark');
            }

            const $themeToggleBtn = $dom('#theme-toggle');
            if ($themeToggleBtn) {
                // Verificar si ya hay listeners registrados
                const existingListeners = this.eventListeners.filter(
                    el => el.element === $themeToggleBtn && el.type === 'click',
                );

                const event = new Event('dark-mode');

                const themeToggleClickListener = (): void => {
                    const updateThemeState = (): void => {
                        const isCurrentlyDark = document.documentElement.classList.contains('dark');

                        if (isCurrentlyDark) {
                            document.documentElement.classList.remove('dark');
                            setTheme('light');
                        } else {
                            document.documentElement.classList.add('dark');
                            setTheme('dark');
                        }

                        // Alternar iconos
                        $themeToggleDarkIcon.classList.toggle('hidden');
                        $themeToggleLightIcon.classList.toggle('hidden');

                        document.dispatchEvent(event);
                    };

                    if (document.startViewTransition) {
                        // Añadir una clase para indicar que es una transición de tema
                        document.documentElement.classList.add('theme-transition');

                        const transition = document.startViewTransition((): void => {
                            updateThemeState();
                        });

                        // Limpiar la clase después de que la transición termine
                        transition.finished.finally((): void => {
                            document.documentElement.classList.remove('theme-transition');
                        });
                    } else {
                        updateThemeState();
                    }
                };

                // Solo agregar listener si no existe ya
                if (existingListeners.length === 0) {
                    this.addEventListener($themeToggleBtn, 'click', themeToggleClickListener);
                }
            }
        }
    }

    private initializeSidebar(isSidebarCollapsed: () => boolean, setSidebarCollapsed: (collapsed: boolean) => void) {
        this.initializeSidebarSubmenus();
        this.initializeSidebarToggle(isSidebarCollapsed, setSidebarCollapsed);
    }

    private initializeSidebarSubmenus() {
        const $sidebar = $dom('#sidebar');
        if (!$sidebar) {
            return;
        }

        const $sidebarItems = $dom('.sidebar-item', $sidebar);
        if (!$sidebarItems) {
            return;
        }

        const $sidebarItemsButton = $domAll('.sidebar-item-button', $sidebarItems);

        for (const button of $sidebarItemsButton) {
            const buttonElement = button as HTMLElement;
            const dropdownId = buttonElement.getAttribute('aria-controls');

            if (dropdownId) {
                const $dropdown = $dom(`#${dropdownId}`) as HTMLElement;
                if ($dropdown) {
                    const $caret = $dom('[sidebar-item-i]', buttonElement) as HTMLElement;
                    this.setupSubmenuEvents(buttonElement, $dropdown, $caret);
                }
            }
        }
    }

    private initializeSidebarToggle(
        isSidebarCollapsed: () => boolean,
        setSidebarCollapsed: (collapsed: boolean) => void,
    ) {
        const $toggleAside = $dom('#toggleAside');
        if (!$toggleAside) {
            return;
        }

        const $toggleAsideHamburger = $dom('#toggleAsideHamburger');
        const $aside = $dom('#sidebar');
        const $maincontent = $dom('#main-content');
        const $maincontentParent = $maincontent?.parentElement;
        const $sidebarBackdrop = $dom('#sidebarBackdrop');

        if (!$toggleAsideHamburger || !$aside || !$maincontent || !$maincontentParent || !$sidebarBackdrop) {
            console.error('One or more sidebar elements are missing in the DOM.');
            return;
        }

        // Aplicar estado inicial basado en las preferencias guardadas
        const isCollapsed = isSidebarCollapsed();
        this.applySidebarState($aside as HTMLElement, $maincontentParent as HTMLElement, isCollapsed);

        // IMPORTANTE: Asegurar estado correcto del backdrop en móvil después de navegación SPA
        this.ensureCorrectMobileState(
            $aside as HTMLElement,
            $sidebarBackdrop as HTMLElement,
            $toggleAsideHamburger as HTMLElement,
        );

        const toggleSidebarMobile = (): void => {
            $toggleAsideHamburger.classList.toggle('rotate-90');

            const width = window.innerWidth;
            if (UI_BREAKPOINTS.MOBILE_MAX_WIDTH > width) {
                // En móvil, solo toggle la visibilidad del sidebar
                $aside.classList.toggle('hidden');
                $sidebarBackdrop.classList.toggle('hidden');

                // En móvil cuando se muestra, asegurar que esté expandido (w-56) para mostrar textos
                if (!$aside.classList.contains('hidden')) {
                    $aside.classList.remove('w-16');
                    $aside.classList.add('w-56');
                    ($maincontentParent as HTMLElement).classList.add('lg:ml-56');
                    ($maincontentParent as HTMLElement).classList.remove('lg:ml-16');
                } else {
                    ($maincontentParent as HTMLElement).classList.remove('lg:ml-56', 'lg:ml-16');
                }
            } else if ($aside.classList.contains('w-56')) {
                // Contraer sidebar en desktop
                $aside.classList.remove('w-56');
                $aside.classList.add('w-16');
                ($maincontentParent as HTMLElement).classList.remove('lg:ml-56');
                ($maincontentParent as HTMLElement).classList.add('lg:ml-16');
                setSidebarCollapsed(true);
            } else {
                // Expandir sidebar en desktop
                $aside.classList.remove('w-16');
                $aside.classList.add('w-56');
                ($maincontentParent as HTMLElement).classList.remove('lg:ml-16');
                ($maincontentParent as HTMLElement).classList.add('lg:ml-56');
                setSidebarCollapsed(false);
            }
        };

        this.addEventListener($sidebarBackdrop, 'click', toggleSidebarMobile);
        this.addEventListener($toggleAside, 'click', toggleSidebarMobile);

        // Listener para el redimensionamiento de ventana
        const resizeListener = (): void => {
            const width = window.innerWidth;
            const isCollapsed = isSidebarCollapsed();

            if (width >= UI_BREAKPOINTS.DESKTOP_MIN_WIDTH) {
                $sidebarBackdrop.classList.add('hidden');
                $aside.classList.remove('hidden');
                this.applySidebarState($aside as HTMLElement, $maincontentParent as HTMLElement, isCollapsed);
            } else {
                $aside.classList.add('hidden');
                $sidebarBackdrop.classList.add('hidden');
                ($maincontentParent as HTMLElement).classList.remove('lg:ml-56', 'lg:ml-16');
                $toggleAsideHamburger.classList.remove('rotate-90');
            }
        };
        this.addEventListener(window, 'resize', resizeListener);
    }

    private setupSubmenuEvents(button: HTMLElement, dropdown: HTMLElement, caret: HTMLElement | null) {
        let hoverTimeout: number | null = null;

        // Función para mostrar el submenú
        const showDropdown = () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            dropdown.classList.remove('hidden');

            // Actualizar el icono del caret
            if (caret) {
                caret.classList.remove('bi-caret-right-fill');
                caret.classList.add('bi-caret-down-fill');
            }
        };

        // Función para ocultar el submenú con delay
        const hideDropdown = (delay: number = 200) => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            hoverTimeout = window.setTimeout(() => {
                dropdown.classList.add('hidden');

                // Actualizar el icono del caret
                if (caret) {
                    caret.classList.remove('bi-caret-down-fill');
                    caret.classList.add('bi-caret-right-fill');
                }
            }, delay);
        };

        // Función para toggle manual (click)
        const toggleDropdown = () => {
            if (dropdown.classList.contains('hidden')) {
                showDropdown();
            } else {
                hideDropdown(0);
            }
        };

        // Eventos de hover para desktop
        if (window.innerWidth >= UI_BREAKPOINTS.DESKTOP_MIN_WIDTH) {
            this.addEventListener(button, 'mouseenter', showDropdown);
            this.addEventListener(button, 'mouseleave', () => hideDropdown());

            this.addEventListener(dropdown, 'mouseenter', () => {
                if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    hoverTimeout = null;
                }
            });
            this.addEventListener(dropdown, 'mouseleave', () => hideDropdown());
        }

        // Evento de click (funciona en desktop y móvil)
        this.addEventListener(button, 'click', (target: Event) => {
            target.preventDefault();
            toggleDropdown();
        });
    }

    private applySidebarState($aside: HTMLElement, $maincontentParent: HTMLElement, isCollapsed: boolean): void {
        const width = window.innerWidth;

        if (width >= UI_BREAKPOINTS.DESKTOP_MIN_WIDTH) {
            // Desktop: aplicar estado colapsado/expandido
            if (isCollapsed) {
                $aside.classList.remove('w-56');
                $aside.classList.add('w-16');
                $maincontentParent.classList.remove('lg:ml-56');
                $maincontentParent.classList.add('lg:ml-16');
            } else {
                $aside.classList.remove('w-16');
                $aside.classList.add('w-56');
                $maincontentParent.classList.remove('lg:ml-16');
                $maincontentParent.classList.add('lg:ml-56');
            }
            // En desktop, asegurar que el sidebar esté visible
            $aside.classList.remove('hidden');
        } else {
            // Móvil: ocultar sidebar por defecto y limpiar clases de margen
            $aside.classList.add('hidden');
            $maincontentParent.classList.remove('lg:ml-56', 'lg:ml-16');

            // En móvil, usar siempre el ancho expandido cuando se muestre
            $aside.classList.remove('w-16');
            $aside.classList.add('w-56');
        }
    }

    /**
     * Actualiza los elementos activos del menú basándose en la URL actual
     * Este método se ejecuta después de cada navegación SPA para mantener
     * el estado visual del menú sincronizado con la página actual
     */
    public updateActiveMenuItems(): void {
        const currentPath = window.location.pathname;

        // Normalizar la URL para comparación (remover trailing slash si existe, excepto para root)
        const normalizedPath = currentPath === '/' ? currentPath : currentPath.replace(/\/$/, '');

        // Debug mode
        const debugMode = localStorage.getItem('spa_debug') === 'true';
        if (debugMode) {
            console.log('[Menu] Current URL:', normalizedPath);
        }

        // Obtener todos los links del sidebar con data-spa
        const $sidebar = $dom('#sidebar');
        if (!$sidebar) {
            return;
        }

        const $allLinks = $domAll('versa-link[data-spa]', $sidebar) as NodeListOf<HTMLElement>;

        // Clases que se aplican cuando un elemento está activo
        const ACTIVE_CLASSES = {
            link: ['bg-gray-100', 'dark:bg-[#1a1a1a]', 'dark:text-brand', 'font-bold'],
            icon: ['text-black', 'dark:text-brand'],
            iconInactive: [
                'text-gray-500',
                'dark:text-gray-400',
                'group-hover:text-black',
                'dark:group-hover:text-brand',
            ],
            button: ['text-brand'],
            caret: ['rotate-90', 'text-brand'],
            caretInactive: ['text-gray-400'],
            parentLi: ['bg-gray-100', 'dark:bg-[#1a1a1a]', 'dark:text-brand', 'text-dark'],
        };

        // Primero, remover todas las clases activas de todos los elementos
        for (const link of $allLinks) {
            // Remover clases activas del link
            link.classList.remove(...ACTIVE_CLASSES.link);

            // Remover clases activas del icono dentro del link
            const $icon = link.querySelector('.flex-shrink-0') as HTMLElement;
            if ($icon) {
                $icon.classList.remove(...ACTIVE_CLASSES.icon);
                $icon.classList.add(...ACTIVE_CLASSES.iconInactive);
            }

            // Remover clases activas del parent li
            const $parentLi = link.closest('li');
            if ($parentLi) {
                $parentLi.classList.remove(...ACTIVE_CLASSES.parentLi);

                // Si el parent li tiene un botón de submenu, también limpiarlo
                const $button = $parentLi.querySelector('.sidebar-item-button') as HTMLElement;
                if ($button) {
                    $button.classList.remove(...ACTIVE_CLASSES.button);

                    // Limpiar el caret del botón
                    const $caret = $button.querySelector('[sidebar-item-i]') as HTMLElement;
                    if ($caret) {
                        $caret.classList.remove(...ACTIVE_CLASSES.caret);
                        $caret.classList.add(...ACTIVE_CLASSES.caretInactive);
                    }
                }
            }
        }

        // Ahora, encontrar y activar el link que corresponde a la URL actual
        let bestMatch: {
            link: HTMLElement;
            href: string;
            matchLength: number;
        } | null = null;

        for (const link of $allLinks) {
            const href = link.getAttribute('href');
            if (href) {
                // Normalizar el href para comparación
                const normalizedHref = href === '/' ? href : href.replace(/\/$/, '');

                // Debug
                if (debugMode) {
                    console.log('[Menu] Checking link:', normalizedHref);
                }

                // Verificar si este link corresponde a la URL actual
                let isMatch = false;
                let matchLength = 0;

                // Para '/' debe ser una coincidencia exacta
                if (normalizedHref === '/') {
                    if (normalizedPath === '/') {
                        isMatch = true;
                        matchLength = normalizedHref.length;
                    }
                } else if (normalizedPath === normalizedHref) {
                    // Para otras rutas, verificar coincidencia exacta primero
                    isMatch = true;
                    matchLength = normalizedHref.length;
                } else if (normalizedPath.startsWith(`${normalizedHref}/`)) {
                    // Solo coincide si hay un slash después (para evitar matches parciales)
                    isMatch = true;
                    matchLength = normalizedHref.length;
                }

                if (isMatch) {
                    if (debugMode) {
                        console.log('[Menu] Match found:', normalizedHref, 'length:', matchLength);
                    }

                    // Guardar el match más largo (más específico)
                    if (!bestMatch || matchLength > bestMatch.matchLength) {
                        bestMatch = { link, href: normalizedHref, matchLength };
                    }
                }
            }
        }

        if (debugMode && bestMatch) {
            console.log('[Menu] Best match selected:', bestMatch.href);
        }

        // Activar el mejor match si se encontró uno
        if (bestMatch) {
            const { link } = bestMatch;

            // Añadir clases activas al link
            link.classList.add(...ACTIVE_CLASSES.link);

            // Añadir clases activas al icono
            const $icon = link.querySelector('.flex-shrink-0') as HTMLElement;
            if ($icon) {
                $icon.classList.remove(...ACTIVE_CLASSES.iconInactive);
                $icon.classList.add(...ACTIVE_CLASSES.icon);
            }

            // Activar el parent li si existe
            const $parentLi = link.closest('li');
            if ($parentLi) {
                // Verificar si este link está dentro de un submenu
                const $parentDropdown = link.closest('ul[id^="dropdown-"]');

                if ($parentDropdown) {
                    // Es un submenu, necesitamos activar el padre también
                    const dropdownId = $parentDropdown.getAttribute('id');
                    if (dropdownId) {
                        // Encontrar el botón que controla este dropdown
                        const $menuButton = $sidebar.querySelector(`[aria-controls="${dropdownId}"]`) as HTMLElement;
                        if ($menuButton) {
                            // Activar el botón del menú principal
                            $menuButton.classList.add(...ACTIVE_CLASSES.button);

                            // Activar el caret
                            const $caret = $menuButton.querySelector('[sidebar-item-i]') as HTMLElement;
                            if ($caret) {
                                $caret.classList.remove(...ACTIVE_CLASSES.caretInactive);
                                $caret.classList.add(...ACTIVE_CLASSES.caret);
                            }

                            // Activar el li padre del botón
                            const $parentButtonLi = $menuButton.closest('li');
                            if ($parentButtonLi) {
                                $parentButtonLi.classList.add(...ACTIVE_CLASSES.parentLi);
                            }
                        }
                    }
                }
            }
        }
    }

    private reinitializeFlowbite(): void {
        // Reinicializar Flowbite para elementos DOM actualizados después de navegación SPA
        try {
            // Verificar si Flowbite está disponible globalmente
            if (window.Flowbite !== undefined) {
                // Reinicializar todos los componentes de Flowbite
                if (typeof window.Flowbite.init === 'function') {
                    window.Flowbite.init();
                } else if (typeof window.Flowbite.initFlowbite === 'function') {
                    window.Flowbite.initFlowbite();
                }
            } else if (window.initFlowbite !== undefined) {
                window.initFlowbite();
            }
        } catch {
            // Silently handle Flowbite initialization errors
        }
    }

    public reinitialize(): void {
        // Forzar reinicialización limpiando el estado
        this.isInitialized = false;

        // Limpiar completamente antes de reinicializar
        this.cleanup();

        // Reinicializar todo el dashboard
        this.init();

        // Actualizar el menú activo después de reinicializar
        this.updateActiveMenuItems();

        // Asegurar que el estado móvil sea correcto después de la reinicialización
        const $aside = $dom('#sidebar') as HTMLElement;
        const $sidebarBackdrop = $dom('#sidebarBackdrop') as HTMLElement;
        const $toggleAsideHamburger = $dom('#toggleAsideHamburger') as HTMLElement;

        if ($aside && $sidebarBackdrop && $toggleAsideHamburger) {
            this.ensureCorrectMobileState($aside, $sidebarBackdrop, $toggleAsideHamburger);
        }
    }

    /**
     * Asegura que el sidebar esté en el estado correcto para móvil después de navegación SPA
     */
    private ensureCorrectMobileState(
        $aside: HTMLElement,
        $sidebarBackdrop: HTMLElement,
        $toggleAsideHamburger: HTMLElement,
    ): void {
        const width = window.innerWidth;

        if (width <= UI_BREAKPOINTS.MOBILE_MAX_WIDTH) {
            // En móvil, asegurar que el sidebar esté oculto por defecto y el backdrop también
            $aside.classList.add('hidden');
            $sidebarBackdrop.classList.add('hidden');

            // Resetear el estado del hamburger menu
            $toggleAsideHamburger.classList.remove('rotate-90');

            // Asegurar que no haya clases de margen en el contenido principal en móvil
            const $maincontentParent = $aside.parentElement?.querySelector('#main');
            if ($maincontentParent) {
                $maincontentParent.classList.remove('lg:ml-56', 'lg:ml-16');
            }
        } else {
            // En desktop, asegurar que el backdrop esté oculto
            $sidebarBackdrop.classList.add('hidden');
            $aside.classList.remove('hidden');
            $toggleAsideHamburger.classList.remove('rotate-90');
        }
    }
}

// Prevenir múltiples cargas del mismo script
if (window.__dashboardLoaded) {
    // Usar la instancia existente pero forzar reinicialización
    if (window.__dashboardInstance) {
        window.__dashboardInstance.reinitialize();
    }
} else {
    window.__dashboardLoaded = true;

    // Cambiar la estrategia de inicialización para resolver el problema de timing con SPA
    let dashboardInitialized = false;
    let isReinitializing = false;
    let globalDashboardInstance: DashboardManager | null = null;

    const initializeDashboard = () => {
        if (dashboardInitialized && !isReinitializing) {
            return;
        }

        // Si ya hay una instancia global, usarla en lugar de crear una nueva
        if (!globalDashboardInstance) {
            globalDashboardInstance = DashboardManager.getInstance();
        }
        globalDashboardInstance.init();

        dashboardInitialized = true;
        isReinitializing = false;
    };

    // Ejecutar en la carga inicial de la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
        initializeDashboard();
    }

    // Escuchar eventos específicos de SPA navigation con debounce
    let spaNavigationTimeout: number | null = null;

    const handleSPANavigation = (eventName: string = 'unknown') => {
        const debugMode = localStorage.getItem('spa_debug') === 'true';

        if (debugMode) {
            console.log(`[Dashboard] SPA Event received: ${eventName}`);
        }

        if (isReinitializing) {
            if (debugMode) {
                console.log('[Dashboard] Already reinitializing, skipping...');
            }
            return;
        }

        if (spaNavigationTimeout) {
            clearTimeout(spaNavigationTimeout);
        }

        spaNavigationTimeout = window.setTimeout(() => {
            isReinitializing = true;

            if (debugMode) {
                console.log('[Dashboard] Starting reinitialization...');
            }

            // Resetear el flag de inicialización para permitir reinicialización
            dashboardInitialized = false;

            // Usar la instancia global si existe
            if (globalDashboardInstance) {
                globalDashboardInstance.reinitialize();
            } else {
                globalDashboardInstance = DashboardManager.getInstance();
                globalDashboardInstance.init();
            }

            if (debugMode) {
                console.log('[Dashboard] Reinitialization complete');
            }

            // Marcar como completado después de un pequeño delay
            setTimeout(() => {
                isReinitializing = false;
                dashboardInitialized = true;
            }, 100);
        }, 50); // Pequeño delay para asegurar que el DOM esté actualizado
    };

    // Escuchar múltiples eventos de navegación SPA
    document.addEventListener('spa:finish', () => handleSPANavigation('spa:finish'));
    document.addEventListener('spa:component:updated', () => handleSPANavigation('spa:component:updated'));
    document.addEventListener('spa:libraries:reinitialized', () => handleSPANavigation('spa:libraries:reinitialized'));
}
