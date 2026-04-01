/**
 * @typedef {Object} TreeNode
 * @property {string} name - Nombre del componente
 * @property {Object} instancia - Instancia del componente Vue
 * @property {TreeNode[]} children - Nodos hijos
 * @property {TreeNode|null} parent - Nodo padre
 * @property {boolean} isRoot - Si es el nodo raíz
 * @property {string} [from] - Origen del nodo
 */

import { obtenerInstanciaVue } from './getInstanciaVue.js';

/**
 * @typedef {Object} VNode
 * @property {Object} [type] - Tipo del VNode
 * @property {Object} [component] - Componente asociado
 * @property {VNode[]} [children] - VNodes hijos
 * @property {VNode[]} [dynamicChildren] - VNodes dinámicos
 * @property {Object} [suspense] - Objeto suspense
 */

/**
 * @typedef {Object} ComponentInstance
 * @property {Object} type - Tipo del componente
 * @property {string} [type.name] - Nombre del tipo
 * @property {string} [type.__name] - Nombre alternativo del tipo
 * @property {Object} [components] - Componentes registrados
 * @property {VNode} subTree - Subárbol del componente
 * @property {Object} [proxy] - Proxy del componente
 * @property {Function} [proxy.$forceUpdate] - Función de actualización forzada
 * @property {Function} [update] - Función de actualización
 * @property {Object} [ctx] - Contexto del componente
 * @property {Object} [ctx._] - Contexto interno del componente
 * @property {Object} [ctx._.setupState] - Estado del setup del componente
 * @property {number} [ctx._.setupState.versaComponentKey] - Clave del componente para HMR
 */

/**
 * @typedef {Object} ComponentInfo
 * @property {string} normalizedPath - Ruta normalizada del componente
 * @property {string} nameFile - Nombre del archivo del componente
 */

/**
 * @typedef {Object} VueApp
 * @property {ComponentInstance} _instance - Instancia principal de la aplicación
 */

/**
 * Busca nodos en el árbol por nombre de instancia
 * @param {TreeNode} tree - Árbol de componentes
 * @param {string} instance - Nombre de la instancia a buscar
 * @returns {TreeNode[]} Array de nodos encontrados
 */
function findNodeByInstance(tree, instance) {
    const matches = [];
    /**
     * @param {TreeNode} node - Nodo a buscar recursivamente
     */
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
/**
 * Obtiene el camino desde un nodo hasta la raíz
 * @param {TreeNode} node - Nodo inicial
 * @returns {TreeNode[]} Camino desde el nodo hasta la raíz
 */
function getPathToRoot(node) {
    const path = [];
    while (node) {
        path.push(node);
        node = node.parent;
    }
    return path; // Ordenado desde hijo hasta raíz
}

/**
 * Encuentra componentes recursivamente dentro de un VNode
 * @param {VNode} vnode - VNode a explorar
 * @param {TreeNode} parentTreeNode - Nodo padre en el árbol
 */
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

/**
 * Recorre una instancia de componente y construye el árbol
 * @param {ComponentInstance} componentInstance - Instancia del componente
 * @param {TreeNode} currentTreeNode - Nodo actual del árbol
 */
function traverseComponentInstance(componentInstance, currentTreeNode) {
    const subTreeVNode = componentInstance.subTree;

    if (!subTreeVNode) {
        return;
    }

    recursivelyFindComponentsInVNode(subTreeVNode, currentTreeNode);
}

/**
 * Construye el árbol de componentes desde una instancia raíz
 * @param {ComponentInstance} componentRootInstance - Instancia raíz del componente
 * @returns {TreeNode|null} Árbol de componentes o null si falla
 */
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

/**
 * Intenta forzar la actualización de una instancia de componente
 * @param {ComponentInstance} instance - Instancia del componente a actualizar
 * @returns {boolean} True si la actualización fue exitosa, false en caso contrario
 */
function tryForceUpdate(instance) {
    if (!instance) {
        return false;
    }
    if (instance.proxy && typeof instance.proxy.$forceUpdate === 'function') {
        instance.proxy.$forceUpdate();
        if (typeof instance.update === 'function') {
            instance.update();
        }
        // buscar una variable en el componente que se llame versaComponentKey y sumarle 1
        if (instance.ctx?._.setupState?.versaComponentKey !== undefined) {
            instance.ctx._.setupState.versaComponentKey++;
        }
        return true;
    }
    if (typeof instance.update === 'function') {
        if (instance.ctx?._.setupState?.versaComponentKey !== undefined) {
            instance.ctx._.setupState.versaComponentKey++;
        }
        instance.update();
        return true;
    }
    return false;
}

/**
 * Limpia los caches internos de Vue para una definición de componente.
 * Necesario para que Vue detecte el cambio de props/emits/options.
 * @param {Object} appContext - Contexto de la app Vue (instance.appContext)
 * @param {Object} componentDef - Definición del componente
 */
function clearVueCaches(appContext, componentDef) {
    if (!appContext || !componentDef) return;
    try {
        appContext.propsCache?.delete(componentDef);
        appContext.emitsCache?.delete(componentDef);
        appContext.optionsCache?.delete(componentDef);
    } catch {
        // Los caches pueden no existir en todas las versiones de Vue
    }
}

/**
 * Actualiza una instancia de componente Vue en-place con la nueva definición.
 * Muta el objeto `instance.type` directamente para que TODAS las referencias
 * a la definición (incluidas las capturadas en closures de render functions
 * de componentes padre que hacen import estático) vean la nueva versión.
 *
 * @param {Object} instance - Instancia Vue del componente a actualizar
 * @param {Object} newComponentDef - Nueva definición del componente
 * @returns {boolean} true si la actualización fue exitosa
 */
function updateInstanceInPlace(instance, newComponentDef) {
    if (!instance || !newComponentDef) return false;

    const oldDef = instance.type;
    if (!oldDef || typeof oldDef !== 'object') return false;

    // 1. Mutar la definición existente en-place.
    //    Object.assign copia propiedades enumerables; copiamos render/setup
    //    explícitamente porque pueden no ser enumerables en algunos builds.
    Object.assign(oldDef, newComponentDef);
    if (newComponentDef.render) oldDef.render = newComponentDef.render;
    if (newComponentDef.setup) oldDef.setup = newComponentDef.setup;
    if (newComponentDef.ssrRender) oldDef.ssrRender = newComponentDef.ssrRender;

    // 2. Actualizar instance.render directamente.
    //    Vue almacena la referencia a la render function en instance.render durante
    //    el mount (handleSetupResult), y es ESA la que llama en cada patch.
    //    Cambiar solo instance.type.render NO es suficiente — hay que actualizar
    //    también instance.render para que el próximo update use la nueva template.
    if (newComponentDef.render && typeof instance.render !== 'undefined') {
        instance.render = newComponentDef.render;
    }

    // 3. Limpiar caches internos de Vue para que re-evalúe props/emits/options.
    clearVueCaches(instance.appContext, oldDef);

    // 4. Forzar actualización de ESTA instancia directamente (no solo del padre).
    //    Incrementar versaComponentKey para triggear el :key del template.
    if (instance.ctx?._.setupState?.versaComponentKey !== undefined) {
        instance.ctx._.setupState.versaComponentKey++;
    }
    if (typeof instance.update === 'function') {
        instance.update();
        return true;
    }
    if (instance.proxy && typeof instance.proxy.$forceUpdate === 'function') {
        instance.proxy.$forceUpdate();
        return true;
    }

    return false;
}

/**
 * Intenta actualizar un componente en el camino del árbol.
 * Ahora usa mutación in-place de la definición + limpieza de caches Vue,
 * en lugar de reemplazar la referencia en el mapa de components del padre.
 *
 * @param {TreeNode[]} path - Camino de nodos desde el componente hasta la raíz
 * @param {Object} newComponent - Nuevo componente a usar
 * @param {string} componentName - Nombre del componente
 * @param {VueApp} App - Aplicación Vue
 * @returns {boolean} True si la actualización fue exitosa
 */
function tryUpdateComponentPath(path, newComponent, componentName, App) {
    if (!path || !newComponent || !componentName || !App) {
        console.error('❌ Parámetros inválidos para tryUpdateComponentPath');
        return false;
    }

    // path[0] es el nodo del propio componente a actualizar.
    // Intentar actualización directa en la instancia del componente.
    const targetNode = path[0];
    if (targetNode?.instancia) {
        const updated = updateInstanceInPlace(
            targetNode.instancia,
            newComponent,
        );
        if (updated) {
            // También forzar actualización del padre para que el vdom se reconcilie.
            const parentNode = path[1];
            if (parentNode?.instancia && !parentNode.isRoot) {
                tryForceUpdate(parentNode.instancia);
            }
            return true;
        }
    }

    // Fallback: recorrer hacia el padre si el nodo propio no es accesible.
    for (let i = 1; i < path.length; i++) {
        const parent = path[i];

        if (parent.isRoot || parent.name === 'KeepAlive') {
            window.location.reload();
            return true;
        }

        if (!parent?.instancia) {
            console.error('❌ Nodo padre no válido en el camino:', parent);
            continue;
        }

        const componentsDefinition =
            parent.instancia?.type?.components || parent.instancia?.components;

        if (componentsDefinition && componentsDefinition[componentName]) {
            // Mutar la definición existente en el mapa del padre también,
            // para que nuevas instancias del componente creadas después se usen
            // con la definición actualizada.
            const existingDef = componentsDefinition[componentName];
            if (existingDef && typeof existingDef === 'object') {
                Object.assign(existingDef, newComponent);
                if (newComponent.render)
                    existingDef.render = newComponent.render;
                if (newComponent.setup) existingDef.setup = newComponent.setup;
                clearVueCaches(parent.instancia.appContext, existingDef);
            } else {
                componentsDefinition[componentName] = newComponent;
            }

            return (
                tryForceUpdate(parent.instancia) ||
                tryForceUpdate(parent.instancia.proxy)
            );
        }
    }

    return false;
}

/**
 * Recarga un componente Vue con Hot Module Replacement
 * @param {VueApp} App - Aplicación Vue principal
 * @param {ComponentInfo} Component - Información del componente a recargar
 * @returns {Promise<boolean>} Promise que resuelve a true si la recarga fue exitosa
 */
export async function reloadComponent(App, Component) {
    try {
        const { normalizedPath: relativePath, nameFile: componentName } =
            Component;
        if (!App || !App._instance) {
            const vueInstance = await obtenerInstanciaVue();
            if (!vueInstance) {
                console.error('❌ No se pudo obtener la instancia de Vue');
                return false;
            }
            App = vueInstance;
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

        // Eliminar style tags del ciclo HMR anterior para este componente
        // para evitar acumulación de estilos duplicados en el documento.
        const componentName_clean = componentName.replace(
            /[^a-zA-Z0-9_-]/g,
            '',
        );
        document
            .querySelectorAll(
                `[data-versa-hmr-component="${componentName_clean}"]`,
            )
            .forEach(el => el.remove());

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

        let successfulUpdates = 0; // Procesar TODAS las instancias encontradas
        for (let i = 0; i < targetNodes.length; i++) {
            const node = targetNodes[i];
            if (node) {
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
                    console.error(
                        `❌ No se pudo actualizar la instancia ${i + 1}`,
                    );
                }
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
