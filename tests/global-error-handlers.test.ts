import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests para manejadores globales de errores
 */
describe('Manejadores Globales de Errores', () => {
    let mockReportErrorToServer: any;
    let mockWindow: any;
    let errorHandler: any;
    let unhandledRejectionHandler: any;

    beforeEach(() => {
        mockReportErrorToServer = vi.fn();

        // Mock de window con addEventListener
        mockWindow = {
            addEventListener: vi.fn((event, handler) => {
                if (event === 'error') {
                    errorHandler = handler;
                } else if (event === 'unhandledrejection') {
                    unhandledRejectionHandler = handler;
                }
            }),
        };

        // Simular el setup de los listeners
        setupGlobalErrorHandlers();

        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    function setupGlobalErrorHandlers() {
        mockWindow.addEventListener('error', (event: any) => {
            if (
                event.filename &&
                (event.filename.includes('/hrm/') ||
                    event.filename.includes('HRM'))
            ) {
                mockReportErrorToServer(
                    'uncaught-error',
                    event.error || new Error(event.message),
                    {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                    },
                );
            }
        });

        mockWindow.addEventListener('unhandledrejection', (event: any) => {
            const error = event.reason;
            if (
                error &&
                (error.stack?.includes('/hrm/') ||
                    error.message?.includes('HRM'))
            ) {
                mockReportErrorToServer('unhandled-rejection', error, {
                    promise: String(event.promise),
                });
            }
        });
    }

    describe('window.addEventListener("error") - Errores no capturados', () => {
        it('debe capturar errores de archivos HRM', () => {
            const errorEvent = {
                filename: '/hrm/initHRM.js',
                error: new Error('Test error'),
                message: 'Test error',
                lineno: 100,
                colno: 25,
            };

            errorHandler(errorEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'uncaught-error',
                errorEvent.error,
                {
                    filename: '/hrm/initHRM.js',
                    lineno: 100,
                    colno: 25,
                },
            );
        });

        it('debe capturar errores con "HRM" en el filename', () => {
            const errorEvent = {
                filename: '/src/utils/HRMHelper.js',
                error: new Error('Helper error'),
                message: 'Helper error',
                lineno: 50,
                colno: 10,
            };

            errorHandler(errorEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'uncaught-error',
                errorEvent.error,
                expect.objectContaining({
                    filename: '/src/utils/HRMHelper.js',
                }),
            );
        });

        it('debe crear Error object si event.error es undefined', () => {
            const errorEvent = {
                filename: '/hrm/VueHRM.js',
                message: 'Error without error object',
                lineno: 75,
                colno: 15,
            };

            errorHandler(errorEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'uncaught-error',
                expect.any(Error),
                expect.any(Object),
            );

            const reportedError = mockReportErrorToServer.mock.calls[0][1];
            expect(reportedError.message).toBe('Error without error object');
        });

        it('NO debe capturar errores de archivos no-HRM', () => {
            const errorEvent = {
                filename: '/src/components/Card.vue',
                error: new Error('Vue component error'),
                message: 'Vue component error',
                lineno: 20,
                colno: 5,
            };

            errorHandler(errorEvent);

            expect(mockReportErrorToServer).not.toHaveBeenCalled();
        });

        it('NO debe capturar errores sin filename', () => {
            const errorEvent = {
                error: new Error('Generic error'),
                message: 'Generic error',
                lineno: 10,
                colno: 2,
            };

            errorHandler(errorEvent);

            expect(mockReportErrorToServer).not.toHaveBeenCalled();
        });

        it('debe incluir lineno y colno en el contexto', () => {
            const errorEvent = {
                filename: '/hrm/errorScreen.js',
                error: new Error('Screen error'),
                message: 'Screen error',
                lineno: 123,
                colno: 45,
            };

            errorHandler(errorEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'uncaught-error',
                expect.any(Error),
                {
                    filename: '/hrm/errorScreen.js',
                    lineno: 123,
                    colno: 45,
                },
            );
        });

        it('debe manejar rutas con /hrm/ en cualquier posición', () => {
            const paths = [
                '/public/hrm/initHRM.js',
                '/dist/hrm/helpers.js',
                '/src/hrm/VueHRM.js',
            ];

            paths.forEach(path => {
                mockReportErrorToServer.mockClear();

                const errorEvent = {
                    filename: path,
                    error: new Error('Test'),
                    message: 'Test',
                    lineno: 1,
                    colno: 1,
                };

                errorHandler(errorEvent);

                expect(mockReportErrorToServer).toHaveBeenCalled();
            });
        });
    });

    describe('window.addEventListener("unhandledrejection") - Promesas rechazadas', () => {
        it('debe capturar rechazos de promesas con /hrm/ en stack', () => {
            const error = new Error('Promise rejection');
            error.stack =
                'Error: Promise rejection\n    at /hrm/initHRM.js:150:5';

            const rejectionEvent = {
                reason: error,
                promise: Promise.reject(error).catch(() => {}), // Silenciar warning de Vitest
            };

            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'unhandled-rejection',
                error,
                {
                    promise: String(rejectionEvent.promise),
                },
            );
        });

        it('debe capturar rechazos con "HRM" en el mensaje', () => {
            const error = new Error('Failed to initialize HRM system');

            const rejectionEvent = {
                reason: error,
                promise: Promise.reject(error).catch(() => {}),
            };

            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'unhandled-rejection',
                error,
                expect.objectContaining({
                    promise: expect.any(String),
                }),
            );
        });

        it('NO debe capturar rechazos sin relación con HRM', () => {
            const error = new Error('Generic promise rejection');
            error.stack = 'Error: Generic\n    at /src/utils.js:10:5';

            const rejectionEvent = {
                reason: error,
                promise: Promise.reject(error).catch(() => {}),
            };

            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).not.toHaveBeenCalled();
        });

        it('NO debe capturar rechazos sin error', () => {
            const rejectionEvent = {
                reason: null,
                promise: Promise.reject(null).catch(() => {}),
            };

            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).not.toHaveBeenCalled();
        });

        it('debe incluir promise en el contexto', () => {
            const error = new Error('HRM promise error');

            const testPromise = Promise.reject(error).catch(() => {});
            const rejectionEvent = {
                reason: error,
                promise: testPromise,
            };

            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'unhandled-rejection',
                error,
                expect.objectContaining({
                    promise: expect.stringContaining('Promise'),
                }),
            );
        });

        it('debe manejar stack trace con /hrm/ en cualquier línea', () => {
            const error = new Error('Multi-line stack');
            error.stack = `Error: Multi-line stack
                at function1 (/src/main.js:10:5)
                at function2 (/hrm/initHRM.js:150:10)
                at function3 (/src/utils.js:20:3)`;

            const rejectionEvent = {
                reason: error,
                promise: Promise.reject(error).catch(() => {}),
            };

            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).toHaveBeenCalled();
        });

        it('debe capturar rechazos con "HRM" case-sensitive', () => {
            const errorWithUpperCase = new Error('HRM failed');
            const errorWithLowerCase = new Error('hrm failed');
            const errorMixed = new Error('Hrm failed');

            const event1 = {
                reason: errorWithUpperCase,
                promise: Promise.reject().catch(() => {}),
            };
            const event2 = {
                reason: errorWithLowerCase,
                promise: Promise.reject().catch(() => {}),
            };
            const event3 = {
                reason: errorMixed,
                promise: Promise.reject().catch(() => {}),
            };

            unhandledRejectionHandler(event1);
            expect(mockReportErrorToServer).toHaveBeenCalled();

            mockReportErrorToServer.mockClear();
            unhandledRejectionHandler(event2);
            expect(mockReportErrorToServer).not.toHaveBeenCalled();

            mockReportErrorToServer.mockClear();
            unhandledRejectionHandler(event3);
            expect(mockReportErrorToServer).not.toHaveBeenCalled();
        });

        it('debe capturar HRM error incluso sin stack trace (basándose en el mensaje)', () => {
            const error = new Error('HRM error without stack');
            delete error.stack;

            const rejectionEvent = {
                reason: error,
                promise: Promise.reject(error).catch(() => {}),
            };

            unhandledRejectionHandler(rejectionEvent);

            // Debe capturar porque el mensaje contiene "HRM"
            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'unhandled-rejection',
                error,
                expect.objectContaining({
                    promise: expect.any(String),
                }),
            );
        });
    });

    describe('Integración de manejadores', () => {
        it('debe registrar ambos listeners en window', () => {
            expect(mockWindow.addEventListener).toHaveBeenCalledWith(
                'error',
                expect.any(Function),
            );
            expect(mockWindow.addEventListener).toHaveBeenCalledWith(
                'unhandledrejection',
                expect.any(Function),
            );
        });

        it('debe tener handlers distintos para error y unhandledrejection', () => {
            expect(errorHandler).toBeDefined();
            expect(unhandledRejectionHandler).toBeDefined();
            expect(errorHandler).not.toBe(unhandledRejectionHandler);
        });

        it('ambos handlers deben reportar con tipos diferentes', () => {
            const errorEvent = {
                filename: '/hrm/test.js',
                error: new Error('Test'),
                message: 'Test',
                lineno: 1,
                colno: 1,
            };

            const rejectionEvent = {
                reason: new Error('HRM test'),
                promise: Promise.reject().catch(() => {}),
            };

            errorHandler(errorEvent);
            unhandledRejectionHandler(rejectionEvent);

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'uncaught-error',
                expect.any(Error),
                expect.any(Object),
            );

            expect(mockReportErrorToServer).toHaveBeenCalledWith(
                'unhandled-rejection',
                expect.any(Error),
                expect.any(Object),
            );
        });
    });

    describe('Filtrado de errores por origen', () => {
        it('debe filtrar correctamente errores HRM vs no-HRM', () => {
            const hrmErrors = [
                { filename: '/hrm/initHRM.js', isHRM: true },
                { filename: '/public/hrm/utils.js', isHRM: true },
                { filename: '/src/HRMHelper.js', isHRM: true },
                { filename: '/src/utils.js', isHRM: false },
                { filename: '/components/Card.vue', isHRM: false },
                { filename: undefined, isHRM: false },
            ];

            hrmErrors.forEach(testCase => {
                mockReportErrorToServer.mockClear();

                const errorEvent = {
                    filename: testCase.filename,
                    error: new Error('Test'),
                    message: 'Test',
                    lineno: 1,
                    colno: 1,
                };

                errorHandler(errorEvent);

                if (testCase.isHRM) {
                    expect(mockReportErrorToServer).toHaveBeenCalled();
                } else {
                    expect(mockReportErrorToServer).not.toHaveBeenCalled();
                }
            });
        });

        it('debe filtrar correctamente rechazos HRM vs no-HRM', () => {
            const rejections = [
                {
                    message: 'HRM failed',
                    stack: '/hrm/init.js:10',
                    isHRM: true,
                },
                {
                    message: 'Generic error',
                    stack: '/src/utils.js:10',
                    isHRM: false,
                },
                { message: 'HRM init', stack: undefined, isHRM: true },
                { message: 'Generic', stack: undefined, isHRM: false },
            ];

            rejections.forEach(testCase => {
                mockReportErrorToServer.mockClear();

                const error = new Error(testCase.message);
                if (testCase.stack) {
                    error.stack = testCase.stack;
                } else {
                    delete error.stack;
                }

                const rejectionEvent = {
                    reason: error,
                    promise: Promise.reject(error).catch(() => {}),
                };

                unhandledRejectionHandler(rejectionEvent);

                if (testCase.isHRM) {
                    expect(mockReportErrorToServer).toHaveBeenCalled();
                } else {
                    expect(mockReportErrorToServer).not.toHaveBeenCalled();
                }
            });
        });
    });
});
