/**
 * Manejador de hover inteligente para submenús del sidebar
 * Mejora la experiencia de usuario al navegar entre menús y submenús
 */

let currentOpenDropdown: HTMLElement | null = null;
let _currentParentItem: HTMLElement | null = null;
let hoverTimeout: number | null = null;
let showTimeout: number | null = null;

const HOVER_DELAY = 250; // Ms de delay antes de ocultar
const SHOW_DELAY = 150; // Ms de delay antes de mostrar

/**
 * Oculta todos los dropdowns abiertos inmediatamente
 */
function hideAllDropdowns(): void {
    const allDropdowns = document.querySelectorAll<HTMLElement>('ul[id^="dropdown-"]');
    allDropdowns.forEach(dropdown => {
        dropdown.style.visibility = 'hidden';
        dropdown.style.opacity = '0';
        dropdown.style.pointerEvents = 'none';
    });

    // Ocultar todos los tooltips también
    const allTooltips = document.querySelectorAll<HTMLElement>('.tooltip-sidebar');
    allTooltips.forEach(tooltip => {
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
    });

    currentOpenDropdown = null;
    _currentParentItem = null;
}

/**
 * Muestra un submenú con delay
 */
function showDropdown(dropdown: HTMLElement, parentItem: HTMLElement): void {
    // Cancelar cualquier timeout pendiente
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
    }

    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }

    // Si ya hay un dropdown abierto diferente, cerrarlo inmediatamente
    if (currentOpenDropdown && currentOpenDropdown !== dropdown) {
        hideAllDropdowns();
    }

    // Ocultar el tooltip del item padre cuando se muestra el dropdown
    const tooltip = parentItem.querySelector<HTMLElement>('.tooltip-sidebar');
    if (tooltip) {
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
    }

    showTimeout = window.setTimeout(() => {
        dropdown.style.visibility = 'visible';
        dropdown.style.opacity = '1';
        dropdown.style.pointerEvents = 'auto';
        currentOpenDropdown = dropdown;
        _currentParentItem = parentItem;
        showTimeout = null;
    }, SHOW_DELAY);
}

/**
 * Oculta un submenú con delay
 */
function hideDropdown(dropdown: HTMLElement, parentItem?: HTMLElement): void {
    dropdown.style.visibility = 'hidden';
    dropdown.style.opacity = '0';
    dropdown.style.pointerEvents = 'none';

    if (currentOpenDropdown === dropdown) {
        currentOpenDropdown = null;
        _currentParentItem = null;
    } // Restaurar el tooltip si existe
    if (parentItem) {
        const tooltip = parentItem.querySelector<HTMLElement>('.tooltip-sidebar');
        if (tooltip && document.querySelector('#sidebar')?.classList.contains('w-16')) {
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        }
    }
}

/**
 * Programa el ocultado de un submenú
 */
function scheduleHideDropdown(dropdown: HTMLElement, parentItem?: HTMLElement): void {
    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }

    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
    }

    hoverTimeout = window.setTimeout(() => {
        hideDropdown(dropdown, parentItem);
        hoverTimeout = null;
    }, HOVER_DELAY);
}

/**
 * Cancela el ocultado programado
 */
function cancelHideDropdown(): void {
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
    }

    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }
}

/**
 * Inicializa los event listeners para los menús
 */
function initSidebarDropdowns(): void {
    const sidebarItems = document.querySelectorAll<HTMLElement>('.sidebar-item');

    // Primero ocultar todos los dropdowns
    hideAllDropdowns();

    sidebarItems.forEach(item => {
        const dropdown = item.querySelector<HTMLElement>('ul[id^="dropdown-"]');

        if (!dropdown) {
            return;
        }

        // Eventos del item del menú padre
        item.addEventListener('mouseenter', () => {
            cancelHideDropdown();
            showDropdown(dropdown, item);
        });

        item.addEventListener('mouseleave', event => {
            // Solo programar ocultado si no nos movemos al submenú
            const mouseEvent = event as MouseEvent;
            const relatedTarget = mouseEvent.relatedTarget as HTMLElement;
            if (!dropdown.contains(relatedTarget)) {
                scheduleHideDropdown(dropdown, item);
            }
        });

        // Eventos del submenú
        dropdown.addEventListener('mouseenter', () => {
            cancelHideDropdown();
        });

        dropdown.addEventListener('mouseleave', () => {
            scheduleHideDropdown(dropdown, item);
        });

        // Asegurar que el submenú esté oculto inicialmente
        hideDropdown(dropdown, item);
    });

    // Gestionar tooltips para items sin submenús
    const simpleItems = document.querySelectorAll<HTMLElement>('.sidebar-item:not(:has(ul[id^="dropdown-"]))');
    simpleItems.forEach(simpleItem => {
        const tooltip = simpleItem.querySelector<HTMLElement>('.tooltip-sidebar');
        if (!tooltip) {
            return;
        }

        simpleItem.addEventListener('mouseenter', () => {
            // Solo mostrar tooltip si el sidebar está contraído
            const sidebar = document.querySelector('#sidebar');
            if (sidebar?.classList.contains('w-16')) {
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '1';
            }
        });

        simpleItem.addEventListener('mouseleave', () => {
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });
    });
}

/**
 * Limpia los event listeners existentes
 */
function cleanup(): void {
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
    }
    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }
    hideAllDropdowns();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarDropdowns);
} else {
    initSidebarDropdowns();
}

// Re-inicializar después de navegación SPA
document.addEventListener('spa:component:updated', () => {
    cleanup();
    setTimeout(initSidebarDropdowns, 150);
});

// Cerrar todos los dropdowns al hacer clic fuera del sidebar
document.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const sidebar = document.querySelector('#sidebar');
    if (sidebar && !sidebar.contains(target)) {
        hideAllDropdowns();
    }
});

export default initSidebarDropdowns;
