let currentComponentTree = null;
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
    };
    traverseComponentInstance(componentRootInstance, tree);
    return tree;
};

// Nueva función para encontrar el/los padre(s) de un nodo específico (por instancia) en el árbol.
// Devuelve una lista de nodos padre. En un árbol bien formado, un nodo solo tiene un padre.
function findParentNodesOfInstance(currentTree, childInstanceToFindParentFor) {
    const parentsFound = [];
    if (!currentTree || !childInstanceToFindParentFor) {
        return parentsFound;
    }

    function traverse(potentialParentNode) {
        if (
            potentialParentNode.children &&
            Array.isArray(potentialParentNode.children)
        ) {
            for (const childNode of potentialParentNode.children) {
                if (childNode.instancia === childInstanceToFindParentFor) {
                    parentsFound.push({
                        name: potentialParentNode.name,
                        instancia: potentialParentNode.instancia,
                    });
                    // En un árbol de componentes Vue, una instancia de componente tiene un solo padre.
                    // Podríamos optimizar para no seguir buscando en este subárbol si solo esperamos un padre,
                    // pero la estructura actual es segura.
                }
                // Continuar buscando recursivamente en los hijos de este childNode,
                // ya que el childInstanceToFindParentFor podría estar más abajo.
                if (childNode.instancia !== childInstanceToFindParentFor) {
                    traverse(childNode);
                }
            }
        }
    }

    traverse(currentTree);
    return parentsFound;
}

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
        return true;
    }
    if (typeof instance.update === 'function') {
        console.log(
            'Versa HMR: Forcing update on component instance with update',
        );
        instance.update();
        return true;
    }
    return false;
}

function updateNestedComponents(
    app,
    componentName,
    NewComponent,
    parents = [],
) {
    if (parents.length === 0) {
        return;
    }
    let pageReloaded = false;
    parents.forEach(parent => {
        if (pageReloaded) return;
        const parentInstance = parent.instancia;
        const parentName = parent.name;
        if (parentName === 'KeepAlive') {
            window.location.reload();
            pageReloaded = true;
            return;
        }
        let parentEffectivelyUpdated = false;
        if (
            parentName === 'Transition' ||
            parentName === 'Suspense' ||
            parentName === 'BaseTransition'
        ) {
            parentEffectivelyUpdated = tryForceUpdate(parentInstance);
            console.log('paso por transition');
        } else {
            const componentsDefinition =
                parentInstance?.type?.components || parentInstance?.components;
            if (componentsDefinition && componentsDefinition[componentName]) {
                componentsDefinition[componentName] = NewComponent;
                if (tryForceUpdate(parentInstance)) {
                    parentEffectivelyUpdated = true;
                }
            } else {
                if (tryForceUpdate(parentInstance)) {
                    parentEffectivelyUpdated = true;
                }
            }
            const isParentThin =
                !componentsDefinition ||
                (typeof componentsDefinition === 'object' &&
                    Object.keys(componentsDefinition).length === 0);
            if (parentEffectivelyUpdated && isParentThin) {
                // Si el padre no tiene componentes definidos, lo actualizamos
                // y luego buscamos sus abuelos para forzar la actualización
                // de los componentes que dependen de él.
                // Esto es útil para componentes que no tienen un nombre específico
                // o que son componentes de nivel superior.
                console.log('Versa HMR: Parent is thin, updating its parents');
                const currentFullTree = buildComponentTree(parentInstance);
                if (currentFullTree && parentInstance) {
                    const grandParents = findParentNodesOfInstance(
                        currentFullTree,
                        parentInstance,
                    );
                    if (grandParents.length > 0) {
                        grandParents.forEach(grandParentNode => {
                            tryForceUpdate(grandParentNode.instancia);
                        });
                    }
                }
            }
        }
    });
    if (!pageReloaded && app && app._instance) {
        currentComponentTree = buildComponentTree(app._instance);
    }
}

function getParents(componentTreeToSearch, name) {
    let parents = [];
    if (!componentTreeToSearch) return parents;

    function traverse(currentNode) {
        if (
            currentNode &&
            Array.isArray(currentNode.children) &&
            currentNode.children.length > 0
        ) {
            currentNode.children.forEach(child => {
                if (child.name === name) {
                    parents.push({
                        name: currentNode.name,
                        instancia: currentNode.instancia,
                    });
                }
                traverse(child);
            });
        }
    }
    traverse(componentTreeToSearch);
    return parents;
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
        if (!currentComponentTree) {
            // window.location.reload();
            console.error('Versa HMR: No component tree found');
            return;
        }
        const parents = getParents(currentComponentTree, componentName);
        console.log('Versa HMR: Parents found', parents);
        const isRootChild = parents.find(
            parent => parent.instancia === app._instance,
        );
        if (isRootChild || parents.length === 0) {
            // Si el componente es un hijo directo de la raíz o no tiene padres, recargamos la página
            console.log(
                `Versa HMR: Component ${componentName} is a root child or has no parents, reloading page`,
                componentName,
            );
            // window.location.reload();
            return;
        }
        if (parents.some(parent => parent.name === 'KeepAlive')) {
            console.log(
                'Versa HMR: Component is inside a KeepAlive, reloading page',
            );
            // window.location.reload();
            return;
        }
        updateNestedComponents(app, componentName, module.default, parents);
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
