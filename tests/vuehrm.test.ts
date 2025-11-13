import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildComponentTree, reloadComponent } from '../src/hrm/VueHRM.js';

// Mocks
vi.mock('../src/hrm/getInstanciaVue.js', () => ({
    obtenerInstanciaVue: vi.fn(),
}));

// Mock console methods
const originalConsole = global.console;
beforeEach(() => {
    global.console = {
        ...originalConsole,
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
});

afterEach(() => {
    global.console = originalConsole;
    vi.clearAllMocks();
});

// Mock window and location
const mockLocation = {
    href: 'http://localhost:3000/',
    reload: vi.fn(),
    origin: 'http://localhost:3000',
};

Object.defineProperty(global, 'window', {
    value: {
        location: mockLocation,
    },
    writable: true,
});

// Mock dynamic import
global.import = vi.fn();

describe('VueHRM - Hot Module Replacement', () => {
    describe('buildComponentTree', () => {
        it('debe construir árbol de componentes con instancia válida', () => {
            const mockComponentInstance = {
                type: {
                    name: 'App',
                },
                subTree: {
                    type: { name: 'div' },
                    children: [],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree).not.toBeNull();
            expect(tree?.name).toBe('App');
            expect(tree?.isRoot).toBe(true);
            expect(tree?.children).toHaveLength(0);
        });

        it('debe devolver null para instancia inválida', () => {
            const tree = buildComponentTree(null);
            expect(tree).toBeNull();

            const tree2 = buildComponentTree({});
            expect(tree2).toBeNull();

            const tree3 = buildComponentTree({ type: null });
            expect(tree3).toBeNull();
        });

        it('debe manejar componentes anónimos', () => {
            const mockComponentInstance = {
                type: {},
                subTree: {
                    type: { name: 'div' },
                    children: [],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree.name).toBe('Anonymous');
        });

        it('debe manejar componentes con __name', () => {
            const mockComponentInstance = {
                type: {
                    __name: 'MyComponent',
                },
                subTree: {
                    type: { name: 'div' },
                    children: [],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree.name).toBe('MyComponent');
        });

        it('debe manejar componentes Suspense', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'Suspense' },
                    suspense: {
                        activeBranch: {
                            type: { name: 'AsyncComponent' },
                            subTree: { type: { name: 'div' }, children: [] },
                        },
                    },
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree.children[0].name).toBe('Suspense');
        });

        it('debe manejar componentes con __name', () => {
            const mockComponentInstance = {
                type: {
                    __name: 'MyComponent',
                },
                subTree: {
                    type: { name: 'div' },
                    children: [],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree?.name).toBe('MyComponent');
        });

        it('debe manejar componentes sin subTree', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: null as any,
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree).not.toBeNull();
            expect(tree?.children).toHaveLength(0);
        });
    });

    describe('reloadComponent', () => {
        let mockApp: any;
        let mockComponent: any;

        beforeEach(() => {
            mockApp = {
                _instance: {
                    type: { name: 'App' },
                    subTree: {
                        type: { name: 'div' },
                        children: [
                            {
                                component: {
                                    type: { name: 'TestComponent' },
                                    subTree: {
                                        type: { name: 'span' },
                                        children: [],
                                    },
                                    proxy: { $forceUpdate: vi.fn() },
                                    update: vi.fn(),
                                    ctx: {
                                        _: {
                                            setupState: {
                                                versaComponentKey: 0,
                                            },
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            };

            mockComponent = {
                normalizedPath: 'components/TestComponent.vue',
                nameFile: 'TestComponent',
            };

            // Window is already mocked globally

            // Mock Date.now
            vi.spyOn(Date, 'now').mockReturnValue(1234567890);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('debe manejar error cuando falta relativePath', async () => {
            const result = await reloadComponent(mockApp, {
                nameFile: 'TestComponent',
                normalizedPath: '',
            } as any);

            expect(result).toBe(false);
        });

        it('debe manejar error cuando no se encuentra instancia de Vue', async () => {
            const { obtenerInstanciaVue } = await import(
                '../src/hrm/getInstanciaVue.js'
            );
            (obtenerInstanciaVue as any).mockResolvedValue(null);

            const result = await reloadComponent({} as any, mockComponent);

            expect(result).toBe(false);
        });

        it('debe manejar error cuando falta normalizedPath', async () => {
            const result = await reloadComponent(mockApp, {
                nameFile: 'TestComponent',
                normalizedPath: '',
            } as any);

            expect(result).toBe(false);
        });

        it('debe manejar error cuando el módulo no tiene export default', async () => {
            (global as any).import.mockResolvedValue({});

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(false);
        });

        it('debe manejar error en dynamic import', async () => {
            (global as any).import.mockRejectedValue(
                new Error('Import failed'),
            );

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(false);
        });

        it('debe retornar false cuando no se encuentra el componente en el árbol', async () => {
            const mockNewComponent = {
                template: '<div>Updated</div>',
                name: 'TestComponent',
            };

            (global as any).import.mockResolvedValue({
                default: mockNewComponent,
            });

            // El componente hijo tiene un nombre diferente al que buscamos
            mockApp._instance.subTree.children[0].component.type.name =
                'OtherComponent';

            const result = await reloadComponent(mockApp, mockComponent);

            // No debe encontrar el componente porque el nombre no coincide
            expect(result).toBe(false);
        });

        it('debe intentar actualizar componente sin componentsDefinition', async () => {
            const mockNewComponent = {
                template: '<div>Updated</div>',
                name: 'TestComponent',
            };

            (global as any).import.mockResolvedValue({
                default: mockNewComponent,
            });

            // No establecer componentsDefinition en el padre
            // El componente debe encontrarse pero no actualizarse
            mockApp._instance.subTree.children[0].component.type.name =
                'TestComponent';

            const result = await reloadComponent(mockApp, mockComponent);

            // Debería retornar false porque no se puede actualizar sin componentsDefinition
            expect(result).toBe(false);
        });

        it('debe manejar componente que no se encuentra en el árbol', async () => {
            const mockNewComponent = {
                template: '<div>Updated</div>',
                name: 'NonExistentComponent',
            };

            (global as any).import.mockResolvedValue({
                default: mockNewComponent,
            });

            mockComponent.nameFile = 'NonExistentComponent';

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(false);
        });

        it('debe manejar error cuando no se puede construir el árbol', async () => {
            const mockNewComponent = {
                template: '<div>Updated</div>',
                name: 'TestComponent',
            };

            (global as any).import.mockResolvedValue({
                default: mockNewComponent,
            });

            // Hacer que buildComponentTree falle
            mockApp._instance = null;

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(false);
        });
    });

    describe('findNodeByInstance y getPathToRoot', () => {
        it('debe encontrar un nodo por nombre en el árbol', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        {
                            type: { name: 'vnode' },
                            component: {
                                type: { name: 'TestComponent' },
                                subTree: {
                                    type: { name: 'span' },
                                    children: [],
                                },
                            },
                        },
                    ],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            // Verificar que el árbol se construyó correctamente
            expect(tree).not.toBeNull();
            expect(tree?.children).toHaveLength(1);
            expect(tree?.children[0]?.name).toBe('TestComponent');
        });

        it('debe construir relaciones parent-child correctamente', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        {
                            type: { name: 'vnode' },
                            component: {
                                type: { name: 'Parent' },
                                subTree: {
                                    type: { name: 'div' },
                                    children: [
                                        {
                                            type: { name: 'vnode' },
                                            component: {
                                                type: { name: 'Child' },
                                                subTree: {
                                                    type: { name: 'span' },
                                                    children: [],
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree?.parent).toBeNull();
            expect(tree?.isRoot).toBe(true);
            expect(tree?.children[0]?.parent).toBe(tree);
            expect(tree?.children[0]?.children[0]?.parent).toBe(
                tree?.children[0],
            );
        });
    });

    describe('buildComponentTree - casos adicionales', () => {
        it('debe manejar componentes con children en array', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        {
                            type: { name: 'vnode' }, // Agregar type al VNode
                            component: {
                                type: { name: 'Child1' },
                                subTree: {
                                    type: { name: 'span' },
                                    children: [],
                                },
                            },
                        },
                        {
                            type: { name: 'vnode' }, // Agregar type al VNode
                            component: {
                                type: { name: 'Child2' },
                                subTree: { type: { name: 'p' }, children: [] },
                            },
                        },
                    ],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree?.children).toHaveLength(2);
            expect(tree?.children[0]?.name).toBe('Child1');
            expect(tree?.children[1]?.name).toBe('Child2');
        });

        it('debe manejar VNodes sin component', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        { type: { name: 'text' } }, // VNode sin component
                    ],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree).not.toBeNull();
            expect(tree?.children).toHaveLength(0); // No debe agregar nodos sin component
        });

        it('debe manejar componentes anidados profundamente', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        {
                            type: { name: 'vnode' }, // Agregar type al VNode
                            component: {
                                type: { name: 'Parent' },
                                subTree: {
                                    type: { name: 'div' },
                                    children: [
                                        {
                                            type: { name: 'vnode' }, // Agregar type al VNode
                                            component: {
                                                type: { name: 'Child' },
                                                subTree: {
                                                    type: { name: 'span' },
                                                    children: [],
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree?.children).toHaveLength(1);
            expect(tree?.children[0]?.name).toBe('Parent');
            expect(tree?.children[0]?.children).toHaveLength(1);
            expect(tree?.children[0]?.children[0]?.name).toBe('Child');
        });

        it('debe establecer parent correctamente en el árbol', () => {
            const mockComponentInstance = {
                type: { name: 'App' },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        {
                            type: { name: 'vnode' }, // Agregar type al VNode
                            component: {
                                type: { name: 'Child' },
                                subTree: {
                                    type: { name: 'span' },
                                    children: [],
                                },
                            },
                        },
                    ],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree?.parent).toBeNull();
            expect(tree?.children[0]?.parent).toBe(tree);
            expect(tree?.children[0]?.isRoot).toBe(false);
        });
    });
});
