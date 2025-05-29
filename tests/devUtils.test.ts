import {
    handleError,
    isValidModuleName,
    sanitizeModulePath,
} from '../src/js/devUtils';

describe('sanitizeModulePath', () => {
    test('debe eliminar intentos de traversal de directorios', () => {
        expect(sanitizeModulePath('../malicious/path')).toBe('malicious/path');
        expect(sanitizeModulePath('../../etc/passwd')).toBe('etc/passwd');
    });

    test('debe normalizar barras múltiples', () => {
        expect(sanitizeModulePath('path//to///module')).toBe('path/to/module');
    });

    test('debe eliminar caracteres no permitidos', () => {
        expect(sanitizeModulePath('path$with@special#chars')).toBe(
            'pathwithspecialchars',
        );
    });
});

describe('isValidModuleName', () => {
    test('debe validar nombres de módulo correctos', () => {
        expect(isValidModuleName('valid-module')).toBe(true);
        expect(isValidModuleName('@/components/valid')).toBe(true);
        expect(isValidModuleName('valid_module123')).toBe(true);
    });

    test('debe rechazar nombres de módulo inválidos', () => {
        expect(isValidModuleName('')).toBe(false);
        expect(isValidModuleName('../invalid')).toBe(false);
        expect(isValidModuleName('invalid$module')).toBe(false);
    });
});

describe('handleError', () => {
    let mockContainer: HTMLElement;
    let mockConsoleError: jest.SpyInstance;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        mockConsoleError = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        document.body.appendChild(mockContainer);
    });

    afterEach(() => {
        mockConsoleError.mockRestore();
        document.body.removeChild(mockContainer);
    });

    test('debe mostrar mensaje de error en el contenedor', () => {
        const error = new Error('Test error');
        handleError(error, 'test-module', mockContainer);
        expect(mockContainer.innerHTML.toLowerCase()).toContain('error');
        expect(mockContainer.innerHTML).toContain('test-module');
        expect(mockConsoleError).toHaveBeenCalled();
    });

    test('debe manejar errores sin mensaje', () => {
        handleError(null, 'test-module', mockContainer);
        expect(mockContainer.innerHTML.toLowerCase()).toContain('error');
        expect(mockConsoleError).toHaveBeenCalled();
    });
});
