function findNodeByInstance(tree, instance) {
    const matches = [];

    function searchRecursively(node) {
        if (node.name === instance) {
            matches.push(node);
        }
        for (const child of node.children) {
            searchRecursively(child);
        }
    }

    searchRecursively(tree);
    return matches;
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
    if (vnode?.type.name === 'Suspense') {
        const childComponentInstance = vnode?.suspense.activeBranch;
        const childTreeNode = {
            name: vnode?.type.name,
            instancia: childComponentInstance,
            children: [],
            parent: parentTreeNode,
            isRoot: false,
        };
        parentTreeNode.children.push(childTreeNode);
        recursivelyFindComponentsInVNode(childComponentInstance, childTreeNode);
    } else if (vnode.component) {
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
    if (!componentRootInstance || !componentRootInstance.type) {
        console.warn(
            'No se pudo construir el árbol de componentes: instancia inválida',
        );
        return null;
    }
    const tree = {
        name:
            componentRootInstance.type?.name ||
            componentRootInstance.type?.__name ||
            'Anonymous',
        instancia: componentRootInstance,
        children: [],
        parent: null,
        isRoot: true,
        from: 'root',
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
        instance.proxy.$forceUpdate();
        instance.update();
        // buscar una varible en el componente que se llame versaComponentKey y sumarle 1
        instance.ctx._.setupState.versaComponentKey++;
        return true;
    }
    if (typeof instance.update === 'function') {
        if (instance.ctx._.setupState.versaComponentKey) {
            instance.ctx._.setupState.versaComponentKey++;
        }
        instance.update();
        return true;
    }
    return false;
}

function tryUpdateComponentPath(path, newComponent, componentName, App) {
    if (!path || !newComponent || !componentName || !App) {
        console.error('❌ Parámetros inválidos para tryUpdateComponentPath');
        return false;
    }

    // Recorrer el path desde el padre hacia la raíz (saltando el primer elemento que es el propio componente)
    for (let i = 1; i < path.length; i++) {
        const parent = path[i];

        if (parent.isRoot || parent.name === 'KeepAlive') {
            window.location.reload();
            return true;
        }

        if (!parent || !parent.instancia) {
            console.error('❌ Nodo padre no válido en el camino:', parent);
            continue; // Continúa con el siguiente padre en lugar de fallar
        }

        // Actualizar la instancia del componente
        const componentsDefinition =
            parent.instancia?.type?.components || parent.instancia?.components;

        if (componentsDefinition && componentsDefinition[componentName]) {
            componentsDefinition[componentName] = newComponent;

            // Forzar actualización de la instancia padre
            return (
                tryForceUpdate(parent.instancia) ||
                tryForceUpdate(parent.instancia.proxy)
            );
        }
    }

    return false;
}

export async function reloadComponent(App, Component) {
    try {
        const { normalizedPath: relativePath, nameFile: componentName } =
            Component;
        if (!App || !App._instance) {
            console.error('❌ App o App._instance no están definidos');
            return false;
        }

        if (!relativePath) {
            console.error('❌ No se proporcionó relativePath');
            return false;
        }

        const baseUrl = window.location.href;
        const newBaseUrl = new URL(baseUrl);
        const urlOrigin = `${newBaseUrl.origin}/${relativePath}`;
        const timestamp = Date.now();
        const moduleUrl = `${urlOrigin}?t=${timestamp}`;

        const module = await import(moduleUrl);

        if (!module.default) {
            console.error('❌ El módulo importado no tiene export default');
            return false;
        }

        const componentTree = buildComponentTree(App._instance);
        if (!componentTree) {
            console.error('❌ No se pudo construir el árbol de componentes');
            return false;
        }

        const targetNodes = findNodeByInstance(componentTree, componentName);
        if (!targetNodes) {
            console.warn(
                '⚠️ No se encontró el nodo objetivo para:',
                componentName,
            );

            return false;
        }

        console.log(
            `🔍 Se encontraron ${targetNodes.length} instancias del componente ${componentName}`,
        );

        let successfulUpdates = 0;

        // Procesar TODAS las instancias encontradas
        for (let i = 0; i < targetNodes.length; i++) {
            const node = targetNodes[i];
            const path = getPathToRoot(node);
            const updateResult = await tryUpdateComponentPath(
                path,
                module.default,
                componentName,
                App,
            );

            if (updateResult) {
                successfulUpdates++;
            } else {
                console.error(`❌ No se pudo actualizar la instancia ${i + 1}`);
            }
        }

        const hasSuccessfulUpdate = successfulUpdates > 0;
        console.log(
            `\n📊 Resultado final: ${successfulUpdates}/${targetNodes.length} instancias actualizadas`,
        );

        return hasSuccessfulUpdate;
    } catch (error) {
        console.error('❌ Error en reloadComponent:', error);
        return false;
    }
}
