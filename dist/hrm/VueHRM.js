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
    for (const parent of path) {
        if (parent.isRoot || parent.name === 'KeepAlive') {
            window.location.reload();
        }

        if (parent.name !== componentName) {
            console.log('🔄 Intentando actualizar componente:', componentName);

            if (!parent || !parent.instancia) {
                console.error('❌ Nodo final no válido en el camino:', parent);
                return false;
            }

            // Actualizar la instancia del componente
            const componentsDefinition =
                parent.instancia?.type?.components ||
                parent.instancia?.components;
            if (componentsDefinition) {
                componentsDefinition[componentName] = newComponent;
            }

            // Forzar actualización de la instancia
            if (tryForceUpdate(parent.instancia)) {
                console.log('✅ Componente actualizado y forzado a renderizar');
                return true;
            } else {
                console.error(
                    '❌ No se pudo forzar la actualización del componente',
                );
                return false;
            }
        }
    }
}

export async function reloadComponent(App, Component) {
    try {
        const { normalizedPath: relativePath, nameFile: componentName } =
            Component;
        console.log('🔄 Iniciando recarga de componente:', {
            relativePath,
            componentName,
        });

        if (!relativePath) {
            console.error('❌ No se proporcionó relativePath');
            return false;
        }

        const baseUrl = window.location.href;
        const newBaseUrl = new URL(baseUrl);
        const urlOrigin = `${newBaseUrl.origin}/${relativePath}`;
        const timestamp = Date.now();
        const moduleUrl = `${urlOrigin}?t=${timestamp}`;

        console.log('📥 Importando módulo:', moduleUrl);
        const module = await import(moduleUrl);

        if (!module.default) {
            console.error('❌ El módulo importado no tiene export default');
            return false;
        }

        console.log('📦 Componente cargado:', componentName);

        const componentTree = buildComponentTree(App._instance);
        if (!componentTree) {
            console.error('❌ No se pudo construir el árbol de componentes');
            return false;
        }

        console.log(
            '🌳 Árbol de componentes construido, buscando:',
            componentName,
        );
        const targetNode = findNodeByInstance(componentTree, componentName);

        if (!targetNode) {
            console.warn(
                '⚠️ No se encontró el nodo objetivo para:',
                componentName,
            );
            console.log(
                '🔍 Componentes disponibles en el árbol:',
                getAllComponentNames(componentTree),
            );

            // Intentar buscar por coincidencia parcial
            const allNames = getAllComponentNames(componentTree);
            const partialMatches = allNames.filter(
                name =>
                    name.toLowerCase().includes(componentName.toLowerCase()) ||
                    componentName.toLowerCase().includes(name.toLowerCase()),
            );

            if (partialMatches.length > 0) {
                console.log(
                    '🔍 Posibles coincidencias parciales:',
                    partialMatches,
                );
                // Intentar con la primera coincidencia parcial
                const fallbackTarget = findNodeByInstance(
                    componentTree,
                    partialMatches[0],
                );
                if (fallbackTarget) {
                    console.log(
                        '🔄 Usando coincidencia parcial:',
                        partialMatches[0],
                    );
                    const fallbackPath = getPathToRoot(fallbackTarget);
                    return await tryUpdateComponentPath(
                        fallbackPath,
                        module.default,
                        partialMatches[0],
                        App,
                    );
                }
            }
            return false;
        }

        console.log('🎯 Nodo objetivo encontrado:', targetNode.name);
        const path = getPathToRoot(targetNode);
        return await tryUpdateComponentPath(
            path,
            module.default,
            componentName,
            App,
        );
    } catch (error) {
        console.error('❌ Error en reloadComponent:', error);
        return false;
    }
}
