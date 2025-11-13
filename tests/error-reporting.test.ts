import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests para el sistema de reporte de errores del cliente al servidor
 */
describe('Sistema de Reporte de Errores', () => {
    let mockSocket: any;
    let mockBrowserSync: any;
    let reportErrorToServer: any;

    beforeEach(() => {
        // Mock del socket de BrowserSync
        mockSocket = {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
        };

        mockBrowserSync = {
            socket: mockSocket,
        };

        // Mock de window global
        (global as any).window = {
            ___browserSync___: mockBrowserSync,
            location: {
                href: 'http://localhost:3000/test',
            },
            navigator: {
                userAgent: 'Test Browser 1.0',
            },
        };

        // Mock de console
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Definir la función reportErrorToServer en el scope del test
        reportErrorToServer = (
            type: string,
            error: Error | string,
            context: any = {},
        ) => {
            try {
                if (
                    !(global as any).window.___browserSync___ ||
                    !(global as any).window.___browserSync___.socket
                ) {
                    console.warn(
                        '⚠️ BrowserSync socket no disponible para reportar error',
                    );
                    return;
                }

                const errorData = {
                    type,
                    timestamp: new Date().toISOString(),
                    userAgent: (global as any).window.navigator.userAgent,
                    url: (global as any).window.location.href,
                    context,
                    error: {
                        message:
                            typeof error === 'string'
                                ? error
                                : error?.message || String(error),
                        stack:
                            typeof error === 'string' ? '' : error?.stack || '',
                        name:
                            typeof error === 'string'
                                ? 'Error'
                                : error?.name || 'Error',
                    },
                };

                (global as any).window.___browserSync___.socket.emit(
                    'client:error',
                    errorData,
                );

                console.error(
                    `📤 Error reportado al servidor [${type}]:`,
                    errorData,
                );
            } catch (err) {
                console.error('❌ Error al reportar error al servidor:', err);
            }
        };
    });

    it('debe enviar error correctamente al servidor con todos los campos', () => {
        const testError = new Error('Test error message');
        testError.stack = 'Error: Test error message\n    at test.js:10:5';

        reportErrorToServer('test-error', testError, {
            testContext: 'value',
        });

        expect(mockSocket.emit).toHaveBeenCalledTimes(1);
        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                type: 'test-error',
                url: 'http://localhost:3000/test',
                userAgent: 'Test Browser 1.0',
                context: { testContext: 'value' },
                error: {
                    message: 'Test error message',
                    stack: 'Error: Test error message\n    at test.js:10:5',
                    name: 'Error',
                },
            }),
        );
    });

    it('debe manejar errores como strings', () => {
        reportErrorToServer('string-error', 'Simple error string');

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                error: {
                    message: 'Simple error string',
                    stack: '',
                    name: 'Error',
                },
            }),
        );
    });

    it('debe incluir timestamp en formato ISO', () => {
        const beforeCall = new Date().toISOString();
        reportErrorToServer('timestamp-test', new Error('Test'));
        const afterCall = new Date().toISOString();

        const callArgs = mockSocket.emit.mock.calls[0][1];
        expect(callArgs.timestamp).toBeDefined();
        expect(callArgs.timestamp).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
    });

    it('debe advertir cuando BrowserSync no está disponible', () => {
        (global as any).window.___browserSync___ = null;

        reportErrorToServer('no-browsersync', new Error('Test'));

        expect(console.warn).toHaveBeenCalledWith(
            '⚠️ BrowserSync socket no disponible para reportar error',
        );
        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('debe advertir cuando socket no está disponible', () => {
        (global as any).window.___browserSync___.socket = null;

        reportErrorToServer('no-socket', new Error('Test'));

        expect(console.warn).toHaveBeenCalledWith(
            '⚠️ BrowserSync socket no disponible para reportar error',
        );
        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('debe incluir contexto adicional en el reporte', () => {
        const context = {
            libraryName: 'Vue',
            libraryPath: '/lib/vue.js',
            globalName: 'Vue',
        };

        reportErrorToServer('library-hotreload', new Error('Failed'), context);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                context: expect.objectContaining(context),
            }),
        );
    });

    it('debe manejar errores sin stack trace', () => {
        const errorWithoutStack = new Error('No stack');
        delete errorWithoutStack.stack;

        reportErrorToServer('no-stack', errorWithoutStack);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                error: expect.objectContaining({
                    stack: '',
                }),
            }),
        );
    });

    it('debe manejar errores personalizados con nombre específico', () => {
        const customError = new Error('Custom error');
        customError.name = 'CustomError';

        reportErrorToServer('custom-error', customError);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                error: expect.objectContaining({
                    name: 'CustomError',
                }),
            }),
        );
    });

    it('debe capturar excepciones al enviar errores', () => {
        mockSocket.emit.mockImplementation(() => {
            throw new Error('Socket error');
        });

        reportErrorToServer('socket-fails', new Error('Test'));

        expect(console.error).toHaveBeenCalledWith(
            '❌ Error al reportar error al servidor:',
            expect.any(Error),
        );
    });

    it('debe incluir URL actual en el reporte', () => {
        (global as any).window.location.href =
            'http://localhost:3000/dashboard';

        reportErrorToServer('url-test', new Error('Test'));

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                url: 'http://localhost:3000/dashboard',
            }),
        );
    });

    it('debe incluir User Agent en el reporte', () => {
        (global as any).window.navigator.userAgent =
            'Mozilla/5.0 Custom Browser';

        reportErrorToServer('ua-test', new Error('Test'));

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                userAgent: 'Mozilla/5.0 Custom Browser',
            }),
        );
    });

    it('debe loguear el error reportado en consola', () => {
        reportErrorToServer('console-test', new Error('Test'));

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining(
                '📤 Error reportado al servidor [console-test]:',
            ),
            expect.any(Object),
        );
    });
});

/**
 * Tests para tipos de errores específicos
 */
describe('Tipos de Errores Específicos', () => {
    let reportErrorToServer: any;
    let mockSocket: any;

    beforeEach(() => {
        mockSocket = {
            emit: vi.fn(),
        };

        (global as any).window = {
            ___browserSync___: {
                socket: mockSocket,
            },
            location: { href: 'http://localhost:3000' },
            navigator: { userAgent: 'Test' },
        };

        vi.spyOn(console, 'error').mockImplementation(() => {});

        reportErrorToServer = (
            type: string,
            error: Error | string,
            context: any = {},
        ) => {
            const errorData = {
                type,
                timestamp: new Date().toISOString(),
                userAgent: (global as any).window.navigator.userAgent,
                url: (global as any).window.location.href,
                context,
                error: {
                    message:
                        typeof error === 'string'
                            ? error
                            : error?.message || String(error),
                    stack: typeof error === 'string' ? '' : error?.stack || '',
                    name:
                        typeof error === 'string'
                            ? 'Error'
                            : error?.name || 'Error',
                },
            };

            (global as any).window.___browserSync___.socket.emit(
                'client:error',
                errorData,
            );
        };
    });

    it('debe reportar error library-hotreload con contexto correcto', () => {
        const context = {
            libraryName: 'Vue',
            libraryPath: '/lib/vue.js',
            globalName: 'Vue',
            hadOldVersion: true,
        };

        reportErrorToServer(
            'library-hotreload',
            new Error('Cannot load module'),
            context,
        );

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                type: 'library-hotreload',
                context,
            }),
        );
    });

    it('debe reportar error vue-hmr con información de componente', () => {
        const context = {
            component: 'DashboardCard',
            path: './src/components/DashboardCard.vue',
        };

        reportErrorToServer(
            'vue-hmr',
            new Error('Cannot reload component'),
            context,
        );

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                type: 'vue-hmr',
                context,
            }),
        );
    });

    it('debe reportar error hmr-helper-no-library-info con sugerencia', () => {
        const context = {
            filePath: '/src/utils.js',
            nameFile: 'utils',
            suggestion:
                'Agregar mapeo en FILE_TO_LIBRARY_MAP para hot reload sin recarga completa',
        };

        reportErrorToServer(
            'hmr-helper-no-library-info',
            new Error('HRMHelper sin libraryName/libraryPath'),
            context,
        );

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                type: 'hmr-helper-no-library-info',
                context: expect.objectContaining({
                    suggestion: expect.stringContaining('FILE_TO_LIBRARY_MAP'),
                }),
            }),
        );
    });

    it('debe reportar error uncaught-error con información de archivo', () => {
        const context = {
            filename: '/hrm/initHRM.js',
            lineno: 150,
            colno: 23,
        };

        reportErrorToServer(
            'uncaught-error',
            new Error('Uncaught exception'),
            context,
        );

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                type: 'uncaught-error',
                context: expect.objectContaining({
                    filename: expect.stringContaining('initHRM'),
                    lineno: expect.any(Number),
                    colno: expect.any(Number),
                }),
            }),
        );
    });

    it('debe reportar error unhandled-rejection con promise', () => {
        const context = {
            promise: 'Promise { <rejected> Error }',
        };

        reportErrorToServer(
            'unhandled-rejection',
            new Error('Unhandled promise rejection'),
            context,
        );

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'client:error',
            expect.objectContaining({
                type: 'unhandled-rejection',
                context: expect.objectContaining({
                    promise: expect.any(String),
                }),
            }),
        );
    });
});
