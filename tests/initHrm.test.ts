import { vi } from 'vitest';

// Declaraciones de tipos para los globals de Vitest
declare const describe: (name: string, fn: () => void | Promise<void>) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: {
    (value: unknown): {
        toBe: (expected: unknown) => void;
        toHaveBeenCalled: () => void;
        toHaveBeenCalledWith: (...args: unknown[]) => void;
        toMatch: (pattern: RegExp | string) => void;
        not: {
            toHaveBeenCalled: () => void;
            toHaveBeenCalledWith: (...args: unknown[]) => void;
        };
    };
};
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void) => void;

// Mock console methods
const mockConsole = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
};

// Mock window.performance
const mockPerformance = {
    clearResourceTimings: vi.fn(),
};

// Mock window and location
const mockLocation = {
    href: 'http://localhost:3000/',
    reload: vi.fn(),
    origin: 'http://localhost:3000',
};

// Configurar console global
Object.defineProperty(global, 'console', {
    value: mockConsole,
    writable: true,
});

// Mock dynamic import - debe estar antes de importar el módulo
const mockDynamicImport = vi.fn();
vi.stubGlobal('import', mockDynamicImport);

// Mockear módulos antes de cualquier import
vi.mock('../src/hrm/errorScreen.js', () => ({
    hideErrorOverlay: vi.fn(),
    showErrorOverlay: vi.fn(),
}));

vi.mock('../src/hrm/getInstanciaVue.js', () => ({
    obtenerInstanciaVue: vi.fn(),
}));

vi.mock('../src/hrm/VueHRM.js', () => ({
    reloadComponent: vi.fn(),
}));

// Configurar window ANTES de importar initHRM
Object.defineProperty(global, 'window', {
    value: {
        location: mockLocation,
        performance: mockPerformance,
        TestLibrary: { version: '1.0.0' },
        Vue: { version: '3.0.0' },
        // Evitar que initSocket se ejecute
        ___browserSync___: undefined,
    },
    writable: true,
    configurable: true,
});

// Ahora podemos importar el módulo
let handleLibraryHotReload: any;

// Usamos import dinámico para cargar el módulo después de configurar todo
beforeEach(async () => {
    if (!handleLibraryHotReload) {
        const module = await import('../src/hrm/initHRM.js');
        handleLibraryHotReload = module.handleLibraryHotReload;
    }
});

describe('InitHRM - handleLibraryHotReload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.reload.mockClear();
        mockConsole.log.mockClear();
        mockConsole.error.mockClear();
        mockConsole.warn.mockClear();
        mockPerformance.clearResourceTimings.mockClear();

        // Resetear librerías globales
        (window as any).TestLibrary = { version: '1.0.0' };
        (window as any).Vue = { version: '3.0.0' };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debe retornar false cuando faltan datos requeridos', async () => {
        const result = await handleLibraryHotReload(
            {
                libraryName: '',
                libraryPath: '',
            },
            mockDynamicImport,
        );

        expect(result).toBe(false);
        expect(mockConsole.error).toHaveBeenCalledWith(
            '❌ HRMHelper: Datos incompletos para hot reload de librería',
        );
    });

    it('debe retornar false cuando falta libraryName', async () => {
        const result = await handleLibraryHotReload(
            {
                libraryName: '',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(false);
    });

    it('debe retornar false cuando falta libraryPath', async () => {
        const result = await handleLibraryHotReload(
            {
                libraryName: 'TestLib',
                libraryPath: '',
            },
            mockDynamicImport,
        );

        expect(result).toBe(false);
    });

    it('debe actualizar librería exitosamente con default export', async () => {
        const newLibraryVersion = { version: '2.0.0', newFeature: true };

        mockDynamicImport.mockResolvedValue({
            default: newLibraryVersion,
        });

        const result = await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(true);
        expect((window as any).TestLibrary).toBe(newLibraryVersion);
        expect(mockConsole.log).toHaveBeenCalledWith(
            '🔄 Iniciando hot reload de librería: TestLibrary',
        );
    });

    it('debe actualizar librería con named export', async () => {
        const newLibraryVersion = { version: '2.0.0' };

        mockDynamicImport.mockResolvedValue({
            TestLibrary: newLibraryVersion,
        });

        const result = await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(true);
        expect((window as any).TestLibrary).toBe(newLibraryVersion);
    });

    it('debe usar globalName cuando se proporciona', async () => {
        const newLibraryVersion = { version: '2.0.0' };

        mockDynamicImport.mockResolvedValue({
            default: newLibraryVersion,
        });

        await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
                globalName: 'TestLibrary',
            },
            mockDynamicImport,
        );

        expect((window as any).TestLibrary).toBe(newLibraryVersion);
    });

    it('debe recargar página completa para librerías Vue', async () => {
        const newVueVersion = { version: '3.5.0' };

        mockDynamicImport.mockResolvedValue({
            default: newVueVersion,
        });

        const result = await handleLibraryHotReload(
            {
                libraryName: 'Vue',
                libraryPath: '/lib/vue.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(true);
        expect(mockLocation.reload).toHaveBeenCalled();
        expect(mockConsole.log).toHaveBeenCalledWith(
            '🔄 Librería Vue actualizada, se recomienda recarga completa',
        );
    });

    it('debe recargar página para librerías que incluyen "vue" en el nombre', async () => {
        const newLib = { version: '1.0.0' };

        mockDynamicImport.mockResolvedValue({
            default: newLib,
        });

        await handleLibraryHotReload(
            {
                libraryName: 'vue-router',
                libraryPath: '/lib/vue-router.js',
            },
            mockDynamicImport,
        );

        expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('debe limpiar cache de performance si está disponible', async () => {
        const newLib = { version: '2.0.0' };

        mockDynamicImport.mockResolvedValue({
            default: newLib,
        });

        await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(mockPerformance.clearResourceTimings).toHaveBeenCalled();
    });

    it('debe retornar false cuando el módulo no tiene exports válidos', async () => {
        mockDynamicImport.mockResolvedValue({});

        const result = await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(false);
        expect(mockConsole.error).toHaveBeenCalledWith(
            '❌ HRMHelper: La nueva versión no tiene export válido',
        );
    });

    it('debe hacer rollback cuando falla la actualización', async () => {
        const oldVersion = (window as any).TestLibrary;

        mockDynamicImport.mockRejectedValue(new Error('Failed to load module'));

        const result = await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(false);
        expect((window as any).TestLibrary).toBe(oldVersion);
        expect(mockConsole.error).toHaveBeenCalled();
        expect(mockConsole.log).toHaveBeenCalledWith(
            '🔄 Intentando rollback de librería...',
        );
    });

    it('debe agregar timestamp a la URL para evitar cache', async () => {
        const newLib = { version: '2.0.0' };

        mockDynamicImport.mockResolvedValue({
            default: newLib,
        });

        await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        const importCall = mockDynamicImport.mock.calls[0][0];
        expect(importCall).toMatch(/\/lib\/test\.js\?t=\d+/);
    });

    it('debe llamar clearCache si la librería lo expone', async () => {
        const clearCacheMock = vi.fn();
        const newLib = {
            version: '2.0.0',
            clearCache: clearCacheMock,
        };

        mockDynamicImport.mockResolvedValue({
            default: newLib,
        });

        await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        expect(clearCacheMock).toHaveBeenCalled();
    });

    it('debe manejar error cuando clearCache falla', async () => {
        const newLib = {
            version: '2.0.0',
            clearCache: () => {
                throw new Error('Clear cache failed');
            },
        };

        mockDynamicImport.mockResolvedValue({
            default: newLib,
        });

        const result = await handleLibraryHotReload(
            {
                libraryName: 'TestLibrary',
                libraryPath: '/lib/test.js',
            },
            mockDynamicImport,
        );

        // Debería continuar a pesar del error
        expect(result).toBe(true);
    });

    it('NO debe hacer rollback si la librería no existía previamente', async () => {
        mockDynamicImport.mockRejectedValue(new Error('Failed to load'));

        delete (window as any).NewLibrary;

        const result = await handleLibraryHotReload(
            {
                libraryName: 'NewLibrary',
                libraryPath: '/lib/new.js',
            },
            mockDynamicImport,
        );

        expect(result).toBe(false);
        expect(mockConsole.log).not.toHaveBeenCalledWith(
            '🔄 Intentando rollback de librería...',
        );
    });
});
