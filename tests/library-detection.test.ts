import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Tests para la función detectLibraryFromFile
 */
describe('detectLibraryFromFile', () => {
    let detectLibraryFromFile: any;

    beforeEach(() => {
        // FILE_TO_LIBRARY_MAP simulado
        const FILE_TO_LIBRARY_MAP = {
            vue: {
                patterns: [
                    '/vue.global.js',
                    'vue.global.prod.js',
                    'vue.esm-browser.js',
                ],
                libraryName: 'Vue',
                libraryPath: '/node_modules/vue/dist/vue.esm-browser.js',
                globalName: 'Vue',
            },
            'vue-router': {
                patterns: ['vue-router.global.js', 'vue-router.esm-browser.js'],
                libraryName: 'VueRouter',
                libraryPath:
                    '/node_modules/vue-router/dist/vue-router.esm-browser.js',
                globalName: 'VueRouter',
            },
            sweetalert2: {
                patterns: ['sweetalert2.all.js', 'sweetalert2.js'],
                libraryName: 'sweetalert2',
                libraryPath:
                    '/node_modules/sweetalert2/dist/sweetalert2.all.js',
                globalName: 'Swal',
            },
            sortablejs: {
                patterns: ['Sortable.js'],
                libraryName: 'sortablejs',
                libraryPath: '/node_modules/sortablejs/Sortable.js',
                globalName: 'Sortable',
            },
        };

        // Función detectLibraryFromFile
        detectLibraryFromFile = (filePath: string, nameFile: string) => {
            if (!filePath || !nameFile) return null;

            for (const [key, config] of Object.entries(FILE_TO_LIBRARY_MAP)) {
                for (const pattern of (config as any).patterns) {
                    if (
                        filePath.includes(pattern) ||
                        nameFile === pattern ||
                        nameFile.includes(pattern.replace('.js', ''))
                    ) {
                        return config;
                    }
                }
            }
            return null;
        };
    });

    describe('Detección por coincidencia exacta de nombre de archivo', () => {
        it('debe detectar Vue con vue.global.js', () => {
            const result = detectLibraryFromFile(
                '/node_modules/vue/dist/vue.global.js',
                'vue.global.js',
            );

            expect(result).toEqual(
                expect.objectContaining({
                    libraryName: 'Vue',
                    libraryPath: '/node_modules/vue/dist/vue.esm-browser.js',
                    globalName: 'Vue',
                }),
            );
        });

        it('debe detectar Vue con vue.esm-browser.js', () => {
            const result = detectLibraryFromFile(
                '/node_modules/vue/dist/vue.esm-browser.js',
                'vue.esm-browser.js',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('Vue');
        });

        it('debe detectar VueRouter con vue-router.global.js', () => {
            const result = detectLibraryFromFile(
                '/node_modules/vue-router/dist/vue-router.global.js',
                'vue-router.global.js',
            );

            expect(result).toEqual(
                expect.objectContaining({
                    libraryName: 'VueRouter',
                    globalName: 'VueRouter',
                }),
            );
        });

        it('debe detectar sweetalert2 con sweetalert2.all.js', () => {
            const result = detectLibraryFromFile(
                '/node_modules/sweetalert2/dist/sweetalert2.all.js',
                'sweetalert2.all.js',
            );

            expect(result).toEqual(
                expect.objectContaining({
                    libraryName: 'sweetalert2',
                    globalName: 'Swal',
                }),
            );
        });

        it('debe detectar Sortable con Sortable.js', () => {
            const result = detectLibraryFromFile(
                '/node_modules/sortablejs/Sortable.js',
                'Sortable.js',
            );

            expect(result).toEqual(
                expect.objectContaining({
                    libraryName: 'sortablejs',
                    globalName: 'Sortable',
                }),
            );
        });
    });

    describe('Detección por ruta que contiene el pattern', () => {
        it('debe detectar Vue cuando la ruta incluye vue.global.js', () => {
            const result = detectLibraryFromFile(
                '/public/js/vue.global.js',
                'vue.global',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('Vue');
        });

        it('debe detectar VueRouter cuando la ruta incluye vue-router.esm-browser.js', () => {
            const result = detectLibraryFromFile(
                '/dist/vue-router.esm-browser.js',
                'vue-router.esm-browser',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('VueRouter');
        });

        it('debe detectar sweetalert2 desde ruta completa', () => {
            const result = detectLibraryFromFile(
                '/public/node_modules/sweetalert2/dist/sweetalert2.all.js',
                'sweetalert2.all',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('sweetalert2');
        });
    });

    describe('Detección por nombre parcial (sin .js)', () => {
        it('debe detectar Vue con nombre "vue.global" sin extensión', () => {
            const result = detectLibraryFromFile(
                '/some/path/vue.global.js',
                'vue.global',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('Vue');
        });

        it('debe detectar sweetalert2 con nombre parcial', () => {
            const result = detectLibraryFromFile(
                '/path/sweetalert2.all.js',
                'sweetalert2.all',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('sweetalert2');
        });

        it('debe detectar Sortable con nombre parcial', () => {
            const result = detectLibraryFromFile(
                '/path/Sortable.js',
                'Sortable',
            );

            expect(result).toBeDefined();
            expect(result.libraryName).toBe('sortablejs');
        });
    });

    describe('Casos negativos - No debe detectar', () => {
        it('debe retornar null para archivo desconocido', () => {
            const result = detectLibraryFromFile(
                '/src/utils/helper.js',
                'helper.js',
            );

            expect(result).toBeNull();
        });

        it('debe retornar null para archivo de componente Vue', () => {
            const result = detectLibraryFromFile(
                '/src/components/Card.vue',
                'Card.vue',
            );

            expect(result).toBeNull();
        });

        it('debe retornar null para archivo TypeScript genérico', () => {
            const result = detectLibraryFromFile('/src/main.ts', 'main.ts');

            expect(result).toBeNull();
        });

        it('debe retornar null para archivo CSS', () => {
            const result = detectLibraryFromFile(
                '/src/styles/main.css',
                'main.css',
            );

            expect(result).toBeNull();
        });
    });

    describe('Casos edge - Manejo de errores', () => {
        it('debe retornar null si filePath es undefined', () => {
            const result = detectLibraryFromFile(undefined as any, 'test.js');

            expect(result).toBeNull();
        });

        it('debe retornar null si nameFile es undefined', () => {
            const result = detectLibraryFromFile(
                '/path/test.js',
                undefined as any,
            );

            expect(result).toBeNull();
        });

        it('debe retornar null si ambos son undefined', () => {
            const result = detectLibraryFromFile(
                undefined as any,
                undefined as any,
            );

            expect(result).toBeNull();
        });

        it('debe retornar null si filePath es string vacío', () => {
            const result = detectLibraryFromFile('', 'test.js');

            expect(result).toBeNull();
        });

        it('debe retornar null si nameFile es string vacío', () => {
            const result = detectLibraryFromFile('/path/test.js', '');

            expect(result).toBeNull();
        });
    });

    describe('Múltiples patrones por librería', () => {
        it('debe detectar Vue con cualquiera de sus patrones', () => {
            const patterns = [
                '/vue.global.js',
                'vue.global.prod.js',
                'vue.esm-browser.js',
            ];

            patterns.forEach(pattern => {
                const result = detectLibraryFromFile(
                    `/node_modules/vue/dist${pattern}`,
                    pattern.replace('/', ''),
                );
                expect(result).toBeDefined();
                expect(result.libraryName).toBe('Vue');
            });
        });

        it('debe detectar VueRouter con cualquiera de sus patrones', () => {
            const patterns = [
                'vue-router.global.js',
                'vue-router.esm-browser.js',
            ];

            patterns.forEach(pattern => {
                const result = detectLibraryFromFile(
                    `/node_modules/vue-router/dist/${pattern}`,
                    pattern,
                );
                expect(result).toBeDefined();
                expect(result.libraryName).toBe('VueRouter');
            });
        });

        it('debe detectar sweetalert2 con cualquiera de sus patrones', () => {
            const patterns = ['sweetalert2.all.js', 'sweetalert2.js'];

            patterns.forEach(pattern => {
                const result = detectLibraryFromFile(
                    `/node_modules/sweetalert2/dist/${pattern}`,
                    pattern,
                );
                expect(result).toBeDefined();
                expect(result.libraryName).toBe('sweetalert2');
            });
        });
    });

    describe('Verificación de todas las propiedades retornadas', () => {
        it('debe retornar objeto completo con todas las propiedades para Vue', () => {
            const result = detectLibraryFromFile(
                '/node_modules/vue/dist/vue.global.js',
                'vue.global.js',
            );

            expect(result).toEqual({
                patterns: expect.any(Array),
                libraryName: 'Vue',
                libraryPath: '/node_modules/vue/dist/vue.esm-browser.js',
                globalName: 'Vue',
            });
        });

        it('debe retornar objeto completo con todas las propiedades para sweetalert2', () => {
            const result = detectLibraryFromFile(
                '/node_modules/sweetalert2/dist/sweetalert2.all.js',
                'sweetalert2.all.js',
            );

            expect(result).toEqual({
                patterns: expect.any(Array),
                libraryName: 'sweetalert2',
                libraryPath:
                    '/node_modules/sweetalert2/dist/sweetalert2.all.js',
                globalName: 'Swal',
            });
        });

        it('debe incluir patterns array en el resultado', () => {
            const result = detectLibraryFromFile(
                '/node_modules/vue/dist/vue.global.js',
                'vue.global.js',
            );

            expect(result.patterns).toBeInstanceOf(Array);
            expect(result.patterns.length).toBeGreaterThan(0);
        });
    });
});
