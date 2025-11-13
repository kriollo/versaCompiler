import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

// Mock window.location
const mockLocation = {
    href: 'http://localhost:3000/',
    reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
    value: mockLocation,
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
                    components: {
                        ChildComponent: {},
                    },
                },
                subTree: {
                    type: { name: 'div' },
                    children: [
                        {
                            component: {
                                type: { name: 'ChildComponent' },
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

            expect(tree).not.toBeNull();
            expect(tree.name).toBe('App');
            expect(tree.isRoot).toBe(true);
            expect(tree.children).toHaveLength(1);
            expect(tree.children[0].name).toBe('ChildComponent');
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

        it('debe manejar heurísticas para componentes comunes', () => {
            const mockComponentInstance = {
                type: {
                    toString: () => 'function BaseTransition() {}',
                },
                subTree: {
                    type: { name: 'div' },
                    children: [],
                },
            };

            const tree = buildComponentTree(mockComponentInstance);

            expect(tree.name).toBe('Transition');
        });
    });

    describe('reloadComponent', () => {
        let mockApp;
        let mockComponent;

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

            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: {
                    href: 'http://localhost:3000/',
                    origin: 'http://localhost:3000',
                },
                writable: true,
            });

            // Mock Date.now
            vi.spyOn(Date, 'now').mockReturnValue(1234567890);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('debe recargar componente exitosamente', async () => {
            const mockNewComponent = { name: 'TestComponent', render: vi.fn() };

            // Mock dynamic import
            global.import.mockResolvedValue({ default: mockNewComponent });

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(true);
            expect(global.import).toHaveBeenCalledWith(
                'http://localhost:3000/components/TestComponent.vue?t=1234567890',
            );
        });

        it('debe manejar error cuando no se encuentra instancia de Vue', async () => {
            const { obtenerInstanciaVue } = await import(
                '../src/hrm/getInstanciaVue.js'
            );
            obtenerInstanciaVue.mockResolvedValue(null);

            const result = await reloadComponent({}, mockComponent);

            expect(result).toBe(false);
        });

        it('debe manejar error cuando falta relativePath', async () => {
            const result = await reloadComponent(mockApp, {
                nameFile: 'TestComponent',
            });

            expect(result).toBe(false);
        });

        it('debe manejar error cuando el módulo no tiene export default', async () => {
            global.import.mockResolvedValue({});

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(false);
        });

        it('debe manejar múltiples instancias del mismo componente', async () => {
            // Add another instance of TestComponent
            mockApp._instance.subTree.children.push({
                component: {
                    type: { name: 'TestComponent' },
                    subTree: { type: { name: 'span' }, children: [] },
                    proxy: { $forceUpdate: vi.fn() },
                    update: vi.fn(),
                    ctx: {
                        _: {
                            setupState: { versaComponentKey: 1 },
                        },
                    },
                },
            });

            const mockNewComponent = { name: 'TestComponent', render: vi.fn() };
            global.import.mockResolvedValue({ default: mockNewComponent });

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(true);
        });

        it('debe manejar componentes padre con KeepAlive', async () => {
            // Mock buildComponentTree to return a tree with KeepAlive parent
            const mockBuildComponentTree = vi.fn().mockReturnValue({
                name: 'App',
                instancia: mockApp._instance,
                children: [
                    {
                        name: 'KeepAlive',
                        instancia: {
                            type: { components: { TestComponent: {} } },
                            proxy: { $forceUpdate: vi.fn() },
                            update: vi.fn(),
                        },
                        children: [
                            {
                                name: 'TestComponent',
                                instancia:
                                    mockApp._instance.subTree.children[0]
                                        .component,
                                children: [],
                                parent: null,
                                isRoot: false,
                            },
                        ],
                        parent: null,
                        isRoot: false,
                    },
                ],
                parent: null,
                isRoot: true,
            });

            // Temporarily replace the function
            const originalModule = await import('../src/hrm/VueHRM.js');
            originalModule.buildComponentTree = mockBuildComponentTree;

            const mockNewComponent = { name: 'TestComponent', render: vi.fn() };
            global.import.mockResolvedValue({ default: mockNewComponent });

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(true);
            expect(window.location.reload).toHaveBeenCalled();
        });

        it('debe manejar error en dynamic import', async () => {
            global.import.mockRejectedValue(new Error('Import failed'));

            const result = await reloadComponent(mockApp, mockComponent);

            expect(result).toBe(false);
        });
    });

    describe('Funciones auxiliares', () => {
        it('findNodeByInstance debe encontrar nodos por nombre', () => {
            const { findNodeByInstance } = require('../src/hrm/VueHRM.js');

            const tree = {
                name: 'Root',
                children: [
                    { name: 'Child1', children: [] },
                    {
                        name: 'Child2',
                        children: [{ name: 'Child1', children: [] }],
                    },
                ],
            };

            const matches = findNodeByInstance(tree, 'Child1');

            expect(matches).toHaveLength(2);
            expect(matches[0].name).toBe('Child1');
            expect(matches[1].name).toBe('Child1');
        });

        it('getPathToRoot debe devolver camino desde nodo hasta raíz', () => {
            const { getPathToRoot } = require('../src/hrm/VueHRM.js');

            const root = { name: 'Root', parent: null };
            const child = { name: 'Child', parent: root };
            const grandchild = { name: 'Grandchild', parent: child };

            const path = getPathToRoot(grandchild);

            expect(path).toEqual([grandchild, child, root]);
        });

        it('tryForceUpdate debe actualizar instancia correctamente', () => {
            const { tryForceUpdate } = require('../src/hrm/VueHRM.js');

            const mockInstance = {
                proxy: { $forceUpdate: vi.fn() },
                update: vi.fn(),
                ctx: {
                    _: {
                        setupState: { versaComponentKey: 0 },
                    },
                },
            };

            const result = tryForceUpdate(mockInstance);

            expect(result).toBe(true);
            expect(mockInstance.proxy.$forceUpdate).toHaveBeenCalled();
            expect(mockInstance.ctx._.setupState.versaComponentKey).toBe(1);
        });

        it('tryForceUpdate debe manejar instancias sin proxy', () => {
            const { tryForceUpdate } = require('../src/hrm/VueHRM.js');

            const mockInstance = {
                update: vi.fn(),
                ctx: {
                    _: {
                        setupState: { versaComponentKey: 0 },
                    },
                },
            };

            const result = tryForceUpdate(mockInstance);

            expect(result).toBe(true);
            expect(mockInstance.update).toHaveBeenCalled();
            expect(mockInstance.ctx._.setupState.versaComponentKey).toBe(1);
        });

        it('tryForceUpdate debe devolver false para instancias inválidas', () => {
            const { tryForceUpdate } = require('../src/hrm/VueHRM.js');

            expect(tryForceUpdate(null)).toBe(false);
            expect(tryForceUpdate({})).toBe(false);
        });
    });
});
