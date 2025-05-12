let currentComponentTree = null;

function findNodeByInstance(tree, instance) {
    if (tree.name === instance) return tree;
    for (const child of tree.children) {
        const found = findNodeByInstance(child, instance);
        if (found) return found;
    }
    return null;
}

function getPathToRoot(node) {
    const path = [];
    while (node) {
        path.push(node);
        node = node.parent;
    }
    return path; // Ordenado desde hijo hasta raíz
}

// Función auxiliar para encontrar componentes recursivamente dentro de un VNode genérico
function recursivelyFindComponentsInVNode(vnode, parentTreeNode) {
    if (!vnode || typeof vnode !== 'object') {
        return;
    }

    if (vnode.component) {
        const childComponentInstance = vnode.component;

        let componentName = 'Anonymous';
        if (childComponentInstance.type) {
            if (childComponentInstance.type.name) {
                componentName = childComponentInstance.type.name;
            } else if (childComponentInstance.type.__name) {
                componentName = childComponentInstance.type.__name;
            } else if (typeof childComponentInstance.type === 'function') {
                const funcName = childComponentInstance.type.name;
                if (funcName && funcName !== 'Anonymous function') {
                    componentName = funcName;
                }
                // Heurísticas para componentes comunes de Vue
                const typeStr = childComponentInstance.type.toString();
                if (typeStr.includes('BaseTransition')) {
                    componentName = 'Transition';
                } else if (typeStr.includes('KeepAlive')) {
                    componentName = 'KeepAlive';
                } else if (typeStr.includes('Suspense')) {
                    componentName = 'Suspense';
                }
            }
        }

        const childTreeNode = {
            name: componentName,
            instancia: childComponentInstance,
            children: [],
            parent: parentTreeNode,
            isRoot: false,
        };
        parentTreeNode.children.push(childTreeNode);
        traverseComponentInstance(childComponentInstance, childTreeNode);
    } else {
        const childrenToExplore = vnode.children || vnode.dynamicChildren;
        if (Array.isArray(childrenToExplore)) {
            childrenToExplore.forEach(childVNode => {
                recursivelyFindComponentsInVNode(childVNode, parentTreeNode);
            });
        }
    }
}

// Función principal de recorrido, ahora llamada traverseComponentInstance
function traverseComponentInstance(componentInstance, currentTreeNode) {
    const subTreeVNode = componentInstance.subTree;

    if (!subTreeVNode) {
        return;
    }

    recursivelyFindComponentsInVNode(subTreeVNode, currentTreeNode);
}

export const buildComponentTree = componentRootInstance => {
    const tree = {
        name:
            componentRootInstance.type?.name ||
            componentRootInstance.type?.__name ||
            'Anonymous',
        instancia: componentRootInstance,
        children: [],
        parent: null,
        isRoot: true,
    };
    traverseComponentInstance(componentRootInstance, tree);
    return tree;
};

// Nueva función auxiliar para intentar forzar la actualización de una instancia
function tryForceUpdate(instance) {
    if (!instance) {
        return false;
    }
    if (instance.proxy && typeof instance.proxy.$forceUpdate === 'function') {
        console.log(
            'Versa HMR: Forcing update on component instance with $forceUpdate',
        );
        instance.proxy.$forceUpdate();
        instance.update();
        // buscar una varible en el componente que se llame versaComponentKey y sumarle 1
        if (instance.ctx._.setupState.versaComponentKey) {
            instance.ctx._.setupState.versaComponentKey++;
        }
        return true;
    }
    if (typeof instance.update === 'function') {
        console.log(
            'Versa HMR: Forcing update on component instance with update',
        );
        if (instance.ctx._.setupState.versaComponentKey) {
            instance.ctx._.setupState.versaComponentKey++;
        }
        instance.update();
        return true;
    }
    return false;
}

async function reloadComponent(
    app,
    componentName,
    relativePath,
    _extension,
    _type,
) {
    try {
        const module = await import(`${relativePath}?t=${Date.now()}`);
        currentComponentTree = buildComponentTree(app._instance);

        const targetNode = findNodeByInstance(
            currentComponentTree,
            componentName,
        );
        const path = getPathToRoot(targetNode);
        for (const instanciaParent of path) {
            if (
                instanciaParent.isRoot ||
                instanciaParent.name === 'KeepAlive'
            ) {
                window.location.reload();
                return;
            }
            if (instanciaParent.name !== componentName) {
                if (
                    instanciaParent.name !== 'BaseTransition' &&
                    instanciaParent.name !== 'Transition' &&
                    instanciaParent.name !== 'Suspense'
                ) {
                    const componentsDefinition =
                        instanciaParent.instancia?.type?.components ||
                        instanciaParent.instancia?.components;

                    if (
                        componentsDefinition &&
                        componentsDefinition[componentName]
                    ) {
                        componentsDefinition[componentName] = module.default;
                        if (tryForceUpdate(instanciaParent.instancia)) {
                            console.log(
                                'Versa HMR: Component updated successfully',
                            );
                            return;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(
            `Versa HMR: Error reloading component ${componentName}: ${error}`,
            error,
        );
        // window.location.reload();
    }
}

// Función Debounce
export function debounce(func, waitFor) {
    let timeout = null;

    const debounced = (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };

    return debounced;
}

async function reloadJS(_relativePath) {
    location.reload();
}

export function socketReload(app) {
    if (window.___browserSync___?.socket) {
        const socket = window.___browserSync___.socket;
        // Configura el observer para actualizar el árbol de componentes en cada mutación relevante
        if (app && app._container) {
            currentComponentTree = buildComponentTree(app._instance);
            initializeMutationObserver(app._container, () => {
                if (app._instance) {
                    currentComponentTree = buildComponentTree(app._instance);
                    // updateComponentTree(tree);
                    console.log(`✔️ Versa HMR: Component tree updated`);
                }
            });
        }
        socket.on('vue:update', data => {
            const { component, relativePath, extension, type, timestamp } =
                data;
            if (extension === 'vue') {
                reloadComponent(
                    app,
                    component,
                    `/${relativePath}`,
                    type,
                    extension,
                );
            } else {
                reloadJS(`/${relativePath}?t=${timestamp}`);
            }
        });
    } else {
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    }
}

function initializeMutationObserver(targetNode, callback, options) {
    const observerInstance = new MutationObserver(callback);
    const defaultOptions = {
        childList: true,
        subtree: true,
        attributes: false,
    };
    observerInstance.observe(targetNode, { ...defaultOptions, ...options });
    return observerInstance;
}
