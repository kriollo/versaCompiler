/**
 * Composable para manejar el localStorage de manera tipada y organizada
 * Proporciona métodos para guardar, obtener y verificar datos en localStorage
 */

// Tipos para las claves de localStorage que manejamos
export type StorageKeys = string; // Ahora acepta cualquier string

// Tipos para los valores que pueden almacenarse
export type ThemeValue = 'light' | 'dark';
export type SidebarValue = 'true' | 'false';

export interface StorageValues {
    [key: string]: any; // Permite cualquier valor asociado a cualquier clave
    'color-theme'?: ThemeValue;
    'sidebar-collapsed'?: SidebarValue;
    'documento-list-vista'?: 'tarjeta' | 'lista';
}

/**
 * Clase para manejar el localStorage de manera tipada
 */
class LocalStorageManager {
    /**
     * Guarda un valor en localStorage
     * @param key - Clave del storage
     * @param value - Valor a guardar
     */
    set<K extends StorageKeys>(key: K, value: StorageValues[K]): void {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn(`Error al guardar en localStorage (${key}):`, error);
        }
    }

    /**
     * Obtiene un valor del localStorage
     * @param key - Clave del storage
     * @returns El valor almacenado o null si no existe
     */
    get<K extends StorageKeys>(key: K): StorageValues[K] | null {
        try {
            return localStorage.getItem(key) as StorageValues[K] | null;
        } catch (error) {
            console.warn(`Error al leer del localStorage (${key}):`, error);
            return null;
        }
    }

    /**
     * Verifica si una clave existe en localStorage
     * @param key - Clave a verificar
     * @returns true si existe, false si no
     */
    has(key: StorageKeys): boolean {
        try {
            return localStorage.getItem(key) !== null;
        } catch (error) {
            console.warn(`Error al verificar localStorage (${key}):`, error);
            return false;
        }
    }

    /**
     * Elimina una clave del localStorage
     * @param key - Clave a eliminar
     */
    remove(key: StorageKeys): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Error al eliminar del localStorage (${key}):`, error);
        }
    }

    /**
     * Limpia todo el localStorage (usar con precaución)
     */
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn('Error al limpiar localStorage:', error);
        }
    }
}

// Instancia singleton del gestor de localStorage
export const storage = new LocalStorageManager();

/**
 * Composables específicos para cada tipo de dato
 */

/**
 * Composable para manejar el tema (dark/light)
 */
export const useTheme = (): {
    getTheme: () => ThemeValue | null;
    setTheme: (theme: ThemeValue) => void;
    hasTheme: () => boolean;
    isDarkTheme: () => boolean;
    isLightTheme: () => boolean;
} => {
    const getTheme = (): ThemeValue | null => {
        const value = storage.get('color-theme');
        return typeof value === 'string' ? (value as ThemeValue) : null;
    };

    const setTheme = (theme: ThemeValue): void => {
        storage.set('color-theme', theme);
    };

    const hasTheme = (): boolean => storage.has('color-theme');

    const isDarkTheme = (): boolean => {
        const theme = getTheme();
        if (theme) {
            return theme === 'dark';
        }
        // Si no hay tema guardado, verificar preferencia del sistema
        return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const isLightTheme = (): boolean => !isDarkTheme();

    return {
        getTheme,
        setTheme,
        hasTheme,
        isDarkTheme,
        isLightTheme,
    };
};

/**
 * Composable para manejar el estado del sidebar
 */
export const useSidebar = (): {
    getSidebarState: () => SidebarValue | null;
    setSidebarCollapsed: (collapsed: boolean) => void;
    hasSidebarState: () => boolean;
    isSidebarCollapsed: () => boolean;
    isSidebarExpanded: () => boolean;
} => {
    const getSidebarState = (): SidebarValue | null => {
        const value = storage.get('sidebar-collapsed');
        return typeof value === 'string' ? (value as SidebarValue) : null;
    };

    const setSidebarCollapsed = (collapsed: boolean): void => {
        storage.set('sidebar-collapsed', collapsed ? 'true' : 'false');
    };

    const hasSidebarState = (): boolean => storage.has('sidebar-collapsed');

    const isSidebarCollapsed = (): boolean => {
        const state = getSidebarState();
        return state === 'true';
    };

    const isSidebarExpanded = (): boolean => !isSidebarCollapsed();

    return {
        getSidebarState,
        setSidebarCollapsed,
        hasSidebarState,
        isSidebarCollapsed,
        isSidebarExpanded,
    };
};

/**
 * Composable general para acceso directo al storage
 */
export const useStorage = (): {
    storage: LocalStorageManager;
    useTheme: typeof useTheme;
    useSidebar: typeof useSidebar;
} => ({
    storage,
    useTheme,
    useSidebar,
});
