/**
 * Script de inicialización temprana para evitar el "flash" del menú
 * Este script debe ejecutarse antes que el DOM esté completamente cargado
 * para aplicar las preferencias de usuario de inmediato
 */

// Función para obtener el estado del sidebar desde localStorage
const getSidebarCollapsedState = (): boolean => {
    try {
        const state = localStorage.getItem('sidebar-collapsed');
        return state === 'true';
    } catch {
        return false; // Por defecto expandido
    }
};

// Función para detectar si estamos en desktop
const isDesktop = (): boolean => window.innerWidth >= 1024; // UI_BREAKPOINTS.DESKTOP_MIN_WIDTH

// Función para limpiar estilos temporales
const cleanupEarlyStyles = (): void => {
    const earlyStyle = document.querySelector('#sidebar-early-init');
    if (earlyStyle) {
        earlyStyle.remove();
    }
};

(function initializeSidebarPreferences(): void {
    // Aplicar estilos CSS inmediatamente si es necesario
    const applySidebarStateImmediately = (): void => {
        if (!isDesktop()) {
            return; // En móvil no aplicamos preferencias
        }

        const isCollapsed = getSidebarCollapsedState();

        if (isCollapsed) {
            // Crear CSS para estado contraído
            const style = document.createElement('style');
            style.id = 'sidebar-early-init';
            style.innerHTML = `
                #sidebar {
                    width: 4rem !important; /* w-16 */
                }
                #sidebar.w-56 {
                    width: 4rem !important;
                }
                .lg\\:ml-56 {
                    margin-left: 4rem !important; /* lg:ml-16 */
                }
            `;
            document.head.append(style);
        }
    };

    // Ejecutar inmediatamente
    applySidebarStateImmediately();

    // Limpiar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanupEarlyStyles);
    } else {
        cleanupEarlyStyles();
    }

    // También limpiar cuando se ejecute el script principal
    window.addEventListener('load', cleanupEarlyStyles);
})();
