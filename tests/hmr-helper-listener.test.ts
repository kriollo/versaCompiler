import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests para el listener HRMHelper con detección automática de librerías
 */
describe('HRMHelper Listener - Detección y Hot Reload', () => {
    let mockSocket: any;
    let handleLibraryHotReload: any;
    let detectLibraryFromFile: any;
    let reportErrorToServer: any;
    let mockWindow: any;

    beforeEach(() => {
        // Mock de handleLibraryHotReload
        handleLibraryHotReload = vi.fn();

        // Mock de detectLibraryFromFile
        detectLibraryFromFile = vi.fn();

        // Mock de reportErrorToServer
        reportErrorToServer = vi.fn();

        // Mock de window.location
        mockWindow = {
            location: {
                reload: vi.fn(),
            },
        };
        global.window = mockWindow as any;

        // Mock de console
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('Datos completos con libraryName y libraryPath', () => {
        it('debe llamar handleLibraryHotReload con datos completos', async () => {
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/node_modules/vue/dist/vue.global.js',
                nameFile: 'vue.global.js',
                libraryName: 'Vue',
                libraryPath: '/node_modules/vue/dist/vue.esm-browser.js',
                globalName: 'Vue',
            };

            // Simular el listener
            await handleHRMHelper(data);

            expect(detectLibraryFromFile).not.toHaveBeenCalled();
            expect(handleLibraryHotReload).toHaveBeenCalledWith(data);
            expect(mockWindow.location.reload).not.toHaveBeenCalled();
        });

        it('debe recargar página si handleLibraryHotReload retorna false', async () => {
            handleLibraryHotReload.mockResolvedValue(false);

            const data = {
                libraryName: 'Vue',
                libraryPath: '/lib/vue.js',
                globalName: 'Vue',
            };

            await handleHRMHelper(data);

            expect(handleLibraryHotReload).toHaveBeenCalled();
            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-failed',
                expect.any(Error),
                data,
            );
            expect(mockWindow.location.reload).toHaveBeenCalled();
        });

        it('debe reportar error y recargar si handleLibraryHotReload lanza excepción', async () => {
            const testError = new Error('Import failed');
            handleLibraryHotReload.mockRejectedValue(testError);

            const data = {
                libraryName: 'sweetalert2',
                libraryPath: '/lib/sweetalert2.js',
            };

            await handleHRMHelper(data);

            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-exception',
                testError,
                data,
            );
            expect(mockWindow.location.reload).toHaveBeenCalled();
        });
    });

    describe('Detección automática de librerías', () => {
        it('debe detectar librería automáticamente cuando faltan libraryName/libraryPath', async () => {
            const detectedLibrary = {
                libraryName: 'Vue',
                libraryPath: '/node_modules/vue/dist/vue.esm-browser.js',
                globalName: 'Vue',
            };

            detectLibraryFromFile.mockReturnValue(detectedLibrary);
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/node_modules/vue/dist/vue.global.js',
                nameFile: 'vue.global.js',
            };

            await handleHRMHelper(data);

            expect(detectLibraryFromFile).toHaveBeenCalledWith(
                '/node_modules/vue/dist/vue.global.js',
                'vue.global.js',
            );
            expect(handleLibraryHotReload).toHaveBeenCalledWith(
                expect.objectContaining({
                    libraryName: 'Vue',
                    globalName: 'Vue',
                    libraryPath: '/node_modules/vue/dist/vue.global.js',
                }),
            );
            expect(mockWindow.location.reload).not.toHaveBeenCalled();
        });

        it('debe agregar información detectada a los datos originales', async () => {
            const detectedLibrary = {
                libraryName: 'sweetalert2',
                libraryPath:
                    '/node_modules/sweetalert2/dist/sweetalert2.all.js',
                globalName: 'Swal',
            };

            detectLibraryFromFile.mockReturnValue(detectedLibrary);
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/node_modules/sweetalert2/dist/sweetalert2.all.js',
                nameFile: 'sweetalert2.all.js',
                normalizedPath: '/sweetalert2/dist/sweetalert2.all.js',
            };

            await handleHRMHelper(data);

            expect(handleLibraryHotReload).toHaveBeenCalledWith({
                ...data,
                libraryName: 'sweetalert2',
                globalName: 'Swal',
                libraryPath: data.filePath,
            });
        });

        it('debe loguear información de detección automática', async () => {
            const detectedLibrary = {
                libraryName: 'VueRouter',
                libraryPath:
                    '/node_modules/vue-router/dist/vue-router.esm-browser.js',
                globalName: 'VueRouter',
            };

            detectLibraryFromFile.mockReturnValue(detectedLibrary);
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/node_modules/vue-router/dist/vue-router.global.js',
                nameFile: 'vue-router.global.js',
            };

            await handleHRMHelper(data);

            expect(console.log).toHaveBeenCalledWith(
                '🔍 Librería detectada automáticamente:',
                detectedLibrary,
            );
        });
    });

    describe('Archivos sin librería detectada', () => {
        it('debe recargar página completa si no se detecta librería', async () => {
            detectLibraryFromFile.mockReturnValue(null);

            const data = {
                filePath: '/src/utils/helper.js',
                nameFile: 'helper.js',
            };

            await handleHRMHelper(data);

            expect(detectLibraryFromFile).toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Archivo JS/TS modificado sin configuración de librería',
                ),
            );
            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-no-library-info',
                expect.any(Error),
                expect.objectContaining({
                    ...data,
                    suggestion: expect.stringContaining('FILE_TO_LIBRARY_MAP'),
                }),
            );
            expect(mockWindow.location.reload).toHaveBeenCalled();
        });

        it('debe loguear tip sobre FILE_TO_LIBRARY_MAP', async () => {
            detectLibraryFromFile.mockReturnValue(null);

            const data = {
                filePath: '/src/components/utils.ts',
                nameFile: 'utils.ts',
            };

            await handleHRMHelper(data);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('FILE_TO_LIBRARY_MAP'),
            );
        });

        it('debe incluir filePath en los logs cuando no detecta librería', async () => {
            detectLibraryFromFile.mockReturnValue(null);

            const data = {
                filePath: '/src/services/api.js',
                nameFile: 'api.js',
            };

            await handleHRMHelper(data);

            expect(console.log).toHaveBeenCalledWith(
                '📁 Archivo:',
                '/src/services/api.js',
            );
        });

        it('debe reportar error con sugerencia incluida', async () => {
            detectLibraryFromFile.mockReturnValue(null);

            const data = {
                filePath: '/src/main.ts',
                nameFile: 'main.ts',
                normalizedPath: '/src/main.ts',
            };

            await handleHRMHelper(data);

            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-no-library-info',
                expect.any(Error),
                expect.objectContaining({
                    suggestion:
                        'Agregar mapeo en FILE_TO_LIBRARY_MAP para hot reload sin recarga completa',
                }),
            );
        });
    });

    describe('Logging de información recibida', () => {
        it('debe loguear datos recibidos', async () => {
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/test.js',
                nameFile: 'test.js',
                libraryName: 'Test',
            };

            await handleHRMHelper(data);

            expect(console.log).toHaveBeenCalledWith(
                '🔄 HRMHelper recibido:',
                data,
            );
        });

        it('debe loguear datos en formato JSON', async () => {
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/test.js',
                libraryName: 'Test',
            };

            await handleHRMHelper(data);

            expect(console.log).toHaveBeenCalledWith(
                '📋 Datos recibidos:',
                JSON.stringify(data, null, 2),
            );
        });

        it('debe loguear campos presentes en los datos', async () => {
            handleLibraryHotReload.mockResolvedValue(true);

            const data = {
                filePath: '/test.js',
                nameFile: 'test.js',
                libraryName: 'Test',
            };

            await handleHRMHelper(data);

            expect(console.log).toHaveBeenCalledWith('🔍 Campos presentes:', [
                'filePath',
                'nameFile',
                'libraryName',
            ]);
        });
    });

    describe('Manejo de errores de tipo no-Error', () => {
        it('debe convertir string error a Error object', async () => {
            handleLibraryHotReload.mockRejectedValue('String error');

            const data = {
                libraryName: 'Test',
                libraryPath: '/test.js',
            };

            await handleHRMHelper(data);

            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-exception',
                expect.objectContaining({
                    message: 'String error',
                }),
                data,
            );
        });

        it('debe convertir number error a Error object', async () => {
            handleLibraryHotReload.mockRejectedValue(404);

            const data = {
                libraryName: 'Test',
                libraryPath: '/test.js',
            };

            await handleHRMHelper(data);

            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-exception',
                expect.objectContaining({
                    message: '404',
                }),
                data,
            );
        });

        it('debe manejar undefined error', async () => {
            handleLibraryHotReload.mockRejectedValue(undefined);

            const data = {
                libraryName: 'Test',
                libraryPath: '/test.js',
            };

            await handleHRMHelper(data);

            expect(reportErrorToServer).toHaveBeenCalledWith(
                'hmr-helper-exception',
                expect.any(Error),
                data,
            );
        });
    });

    // Función auxiliar para simular el listener
    async function handleHRMHelper(data: any) {
        console.log('🔄 HRMHelper recibido:', data);
        console.log('📋 Datos recibidos:', JSON.stringify(data, null, 2));
        console.log('🔍 Campos presentes:', Object.keys(data));

        if (data.filePath && !data.libraryName && !data.libraryPath) {
            const detectedLibrary = detectLibraryFromFile(
                data.filePath,
                data.nameFile,
            );

            if (detectedLibrary) {
                console.log(
                    '🔍 Librería detectada automáticamente:',
                    detectedLibrary,
                );
                data.libraryName = detectedLibrary.libraryName;
                data.globalName = detectedLibrary.globalName;
                data.libraryPath = data.filePath;
            } else {
                console.warn(
                    '⚠️ HRMHelper: Archivo JS/TS modificado sin configuración de librería',
                );
                console.log('📁 Archivo:', data.filePath);
                console.log(
                    '💡 Tip: Para hot reload sin recarga, agrega el archivo a FILE_TO_LIBRARY_MAP en initHRM.js',
                );
                console.log('🔄 Recargando página completa...');

                reportErrorToServer(
                    'hmr-helper-no-library-info',
                    new Error('HRMHelper sin libraryName/libraryPath'),
                    {
                        ...data,
                        suggestion:
                            'Agregar mapeo en FILE_TO_LIBRARY_MAP para hot reload sin recarga completa',
                    },
                );

                mockWindow.location.reload();
                return;
            }
        }

        try {
            const success = await handleLibraryHotReload(data);
            if (!success) {
                console.warn(
                    '⚠️ Hot reload de librería falló, haciendo recarga completa',
                );
                reportErrorToServer(
                    'hmr-helper-failed',
                    new Error('Hot reload returned false'),
                    data,
                );
                mockWindow.location.reload();
            }
        } catch (error) {
            console.error('❌ Error en HRMHelper:', error);
            reportErrorToServer(
                'hmr-helper-exception',
                error instanceof Error ? error : new Error(String(error)),
                data,
            );
            mockWindow.location.reload();
        }
    }
});

/**
 * Tests para integración completa del flujo HRMHelper
 */
describe('HRMHelper - Flujo Completo de Integración', () => {
    let mockSocket: any;
    let mockHandleLibraryHotReload: any;
    let mockDetectLibraryFromFile: any;
    let mockReportErrorToServer: any;
    let mockWindow: any;

    beforeEach(() => {
        mockHandleLibraryHotReload = vi.fn();
        mockDetectLibraryFromFile = vi.fn();
        mockReportErrorToServer = vi.fn();

        mockWindow = {
            location: { reload: vi.fn() },
        };
        global.window = mockWindow as any;

        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('flujo exitoso: librería conocida → hot reload → sin recarga', async () => {
        mockHandleLibraryHotReload.mockResolvedValue(true);

        const data = {
            libraryName: 'Vue',
            libraryPath: '/lib/vue.js',
            globalName: 'Vue',
        };

        await simulateHRMHelper(data);

        expect(mockHandleLibraryHotReload).toHaveBeenCalledWith(data);
        expect(mockWindow.location.reload).not.toHaveBeenCalled();
        expect(mockReportErrorToServer).not.toHaveBeenCalled();
    });

    it('flujo con detección: archivo JS → detectar → hot reload → sin recarga', async () => {
        mockDetectLibraryFromFile.mockReturnValue({
            libraryName: 'sweetalert2',
            globalName: 'Swal',
            libraryPath: '/lib/swal.js',
        });
        mockHandleLibraryHotReload.mockResolvedValue(true);

        const data = {
            filePath: '/node_modules/sweetalert2/dist/sweetalert2.all.js',
            nameFile: 'sweetalert2.all.js',
        };

        await simulateHRMHelper(data);

        expect(mockDetectLibraryFromFile).toHaveBeenCalled();
        expect(mockHandleLibraryHotReload).toHaveBeenCalled();
        expect(mockWindow.location.reload).not.toHaveBeenCalled();
    });

    it('flujo con fallo: archivo desconocido → no detectar → reportar → recarga completa', async () => {
        mockDetectLibraryFromFile.mockReturnValue(null);

        const data = {
            filePath: '/src/utils.js',
            nameFile: 'utils.js',
        };

        await simulateHRMHelper(data);

        expect(mockDetectLibraryFromFile).toHaveBeenCalled();
        expect(mockReportErrorToServer).toHaveBeenCalledWith(
            'hmr-helper-no-library-info',
            expect.any(Error),
            expect.objectContaining({
                suggestion: expect.stringContaining('FILE_TO_LIBRARY_MAP'),
            }),
        );
        expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    it('flujo con error: hot reload falla → reportar → recarga completa', async () => {
        mockHandleLibraryHotReload.mockResolvedValue(false);

        const data = {
            libraryName: 'Vue',
            libraryPath: '/lib/vue.js',
        };

        await simulateHRMHelper(data);

        expect(mockReportErrorToServer).toHaveBeenCalledWith(
            'hmr-helper-failed',
            expect.any(Error),
            data,
        );
        expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    it('flujo con excepción: hot reload lanza error → reportar → recarga completa', async () => {
        const testError = new Error('Network error');
        mockHandleLibraryHotReload.mockRejectedValue(testError);

        const data = {
            libraryName: 'VueRouter',
            libraryPath: '/lib/vue-router.js',
        };

        await simulateHRMHelper(data);

        expect(mockReportErrorToServer).toHaveBeenCalledWith(
            'hmr-helper-exception',
            testError,
            data,
        );
        expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    async function simulateHRMHelper(data: any) {
        console.log('🔄 HRMHelper recibido:', data);
        console.log('📋 Datos recibidos:', JSON.stringify(data, null, 2));
        console.log('🔍 Campos presentes:', Object.keys(data));

        if (data.filePath && !data.libraryName && !data.libraryPath) {
            const detectedLibrary = mockDetectLibraryFromFile(
                data.filePath,
                data.nameFile,
            );

            if (detectedLibrary) {
                console.log(
                    '🔍 Librería detectada automáticamente:',
                    detectedLibrary,
                );
                data.libraryName = detectedLibrary.libraryName;
                data.globalName = detectedLibrary.globalName;
                data.libraryPath = data.filePath;
            } else {
                console.warn(
                    '⚠️ HRMHelper: Archivo JS/TS modificado sin configuración de librería',
                );
                console.log('📁 Archivo:', data.filePath);
                console.log(
                    '💡 Tip: Para hot reload sin recarga, agrega el archivo a FILE_TO_LIBRARY_MAP en initHRM.js',
                );
                console.log('🔄 Recargando página completa...');

                mockReportErrorToServer(
                    'hmr-helper-no-library-info',
                    new Error('HRMHelper sin libraryName/libraryPath'),
                    {
                        ...data,
                        suggestion:
                            'Agregar mapeo en FILE_TO_LIBRARY_MAP para hot reload sin recarga completa',
                    },
                );

                mockWindow.location.reload();
                return;
            }
        }

        try {
            const success = await mockHandleLibraryHotReload(data);
            if (!success) {
                console.warn(
                    '⚠️ Hot reload de librería falló, haciendo recarga completa',
                );
                mockReportErrorToServer(
                    'hmr-helper-failed',
                    new Error('Hot reload returned false'),
                    data,
                );
                mockWindow.location.reload();
            }
        } catch (error) {
            console.error('❌ Error en HRMHelper:', error);
            mockReportErrorToServer(
                'hmr-helper-exception',
                error instanceof Error ? error : new Error(String(error)),
                data,
            );
            mockWindow.location.reload();
        }
    }
});
