import { html } from 'P@/vendor/code-tag/code-tag-esm';
import { createApp, ref } from 'vue';

declare global {
    interface Window {
        Sentry?: any;
        ___browserSync___?: {
            socket: {
                on: (event: string, callback: (data: any) => void) => void;
            };
        };
    }
}

interface PublicProvider {
    debug: typeof debug;
    csrf_token: string;
    current_user: Record<string, any>;
}

const componentTree = ref();
export const debug = true;
export let app: ReturnType<typeof createApp>;

const public_provider: PublicProvider = {
    debug,
    csrf_token: '',
    current_user: {},
};
const componentKey = ref(0);

const $contenedor = '#app';
const container = document.querySelector($contenedor);
if (!container) {
    throw new Error('No se ha encontrado el contenedor para cargar el módulo.');
}

/**
 * Sanitize the module path to prevent directory traversal attacks.
 * @param {string} module - The module path to sanitize.
 * @returns {string} - The sanitized module path.
 */
const sanitizeModulePath = (module: string): string => {
    return module
        .replace(/\.\.\//g, '') // Eliminar ".."
        .replace(/\/+/g, '/') // Normalizar barras
        .replace(/[^a-zA-Z0-9\/_-]/g, ''); // Eliminar caracteres no permitidos
};

type ModuleName = string & { __brand: 'ModuleName' };
function isValidModuleName(module: string): module is ModuleName {
    const MODULE_NAME_REGEX =
        /^(?:@\/)?[a-zA-Z0-9][a-zA-Z0-9\/_-]*[a-zA-Z0-9]$/;
    return MODULE_NAME_REGEX.test(module);
}

/**
 * Manejar errores durante la carga del módulo.
 * @param {any} error - El error ocurrido.
 * @param {string} module - El módulo que causó el error.
 */
function handleError(error: any, module: string): void {
    const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
    const moduleInfo = module ? `Módulo: ${module}` : 'Módulo no especificado';
    const safeMessage = `${moduleInfo}<br>${errorMessage}`
        .replace(/</g, '<')
        .replace(/>/g, '>');

    // Mostrar mensaje de error en el contenedor
    container.textContent = ''; // Limpiar contenido previo
    container.insertAdjacentHTML(
        'beforeend',
        html`
            <div style="padding: 1rem; background-color: #f44336; color: #fff;">
                <h2>Error crítico</h2>
                <p style="text-align: left;">${safeMessage}</p>
                <button
                    style="padding: 0.5rem 1rem; background-color: #fff; color: #333; border: 1px solid #333; cursor: pointer;"
                    onclick="window.location.reload()">
                    Reintentar
                </button>
            </div>
        `,
    );

    console.error('[Module Loader]', error);

    // Enviar el error a Sentry si está configurado
    if (window.Sentry) {
        window.Sentry.captureException(error, { extra: { module } });
    }
}

/**
 * Initialize the module loader.
 */
async function init(): Promise<void> {
    try {
        socketReload();

        const url = new URL(import.meta.url);
        const urlParams = url.search;
        const searchParams = new URLSearchParams(urlParams);
        let module = searchParams.get('m');
        if (!module) {
            throw new Error('No se ha especificado un módulo para cargar.');
        }
        module = sanitizeModulePath(module);
        module = module.startsWith('/') ? module.slice(1) : module;
        // Validar el parámetro del módulo
        if (!isValidModuleName(module)) {
            throw new Error(
                'El parámetro del módulo contiene caracteres no permitidos.',
            );
        }

        const component = module.split('/').pop();
        // Importar dinámicamente el módulo
        const moduleResponse = await import(`@/${module}.js?v=${Date.now()}`);
        if (moduleResponse) {
            // Montar el módulo en el contenedor
            app = createApp({
                components: { [component]: moduleResponse.default },
                name: 'App',
                setup() {
                    return { componentKey, componentTree };
                },
                template: `<${component} :key="componentKey" />`,
            });

            // Configuración de la aplicación según el modo de depuración
            if (debug) {
                app.config.warnHandler = function (msg, vm, trace) {
                    console.warn(msg, vm, trace);
                };
                app.config.errorHandler = function (err, vm, info) {
                    console.error(err, vm, info);
                };
                app.config.compilerOptions.comments = true;
            } else {
                app.config.compilerOptions.comments = false;
            }
            app.config.performance = true;
            app.config.compilerOptions.whitespace = 'condense';

            app.mount($contenedor, true);

            // Construir el árbol de componentes para el HMR
            componentTree.value = buildComponentTree(app._instance);
        }
    } catch (e) {
        handleError(e, '');
    }
}

async function socketReload() {
    if (debug) {
        if (window.___browserSync___?.socket) {
            const socket = window.___browserSync___.socket;
            // Escucha mensajes del servidor
            socket.on('vue:update', data => {
                console.log('📥 : Mensaje recibido:', data);

                const { component, relativePath, extension, type, timestamp } =
                    data;

                // Recargar el componente
                if (extension === 'vue')
                    reloadComponent(
                        component,
                        `/${relativePath}?t=${timestamp}`,
                        type,
                        extension,
                    );
                else reloadJS(`/${relativePath}?t=${timestamp}`);
            });

            //reconectar si se pierde la conexion
            // socket.on('disconnect', () => {
            //     console.warn('🔌 : Socket desconectado.');
            //     setTimeout(() => {
            //         window.location.reload();
            //     }, 5000);
            // });

            console.log('🔌 : Socket conectado y escuchando eventos.');
        } else {
            console.warn('BrowserSync no está disponible.');
            // esperar 5 segundos y recargar la pagina
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
    }
}

async function reloadComponent(
    componentName: string,
    relativePath: string,
    extension: string,
    type: string,
) {
    try {
        console.log(`♻️  Recargando componente: ${componentName}`);

        // 🚀 3️⃣ Importar el nuevo componente (con timestamp para evitar caché)
        const module = await import(`${relativePath}`);

        const parents = getParents(componentTree.value, componentName);

        // revisa si en el padre existe el componente App y recargar la pagina
        const result = parents.find(parent => parent.name === 'App');
        if (result) {
            window.location.reload();
            return;
        }

        updateNestedComponents(
            app._instance,
            componentName,
            module.default,
            parents,
        );
        console.log(`✅ Componente "${componentName}" recargado y montado.`);
    } catch (error) {
        console.error(
            `❌ Error al recargar el componente "${componentName}":`,
            error,
        );
    }
}

function updateNestedComponents(
    instance: any,
    componentName: string,
    NewComponent: any,
    parents: any[] = [],
) {
    parents.forEach(parent => {
        const parentInstance = parent.instancia;
        const parentComponent = parentInstance.type.components[componentName];
        if (parentComponent) {
            parentInstance.type.components[componentName] = NewComponent;
            parentInstance.proxy.$forceUpdate();

            componentTree.value = buildComponentTree(app._instance);
        } else {
            console.warn(
                `❌ Componente "${componentName}" no encontrado en "${parent.name}".`,
            );
        }
    });
}

async function reloadJS(relativePath: string) {
    try {
        console.log(`♻️  Recargando JS: ${relativePath}`);

        // 🗑 Eliminar de la caché para forzar la recarga
        const fullPath = new URL(relativePath, import.meta.url).href;
        if (import.meta.hot) {
            import.meta.hot.invalidate(fullPath);
        }

        // 🚀 3️⃣ Importar el nuevo componente (con timestamp para evitar caché)
        const module = await import(`${relativePath}`);

        // 🚀 4️⃣ Volver a registrar el componente
        console.log(`✅ JS "${relativePath}" registrado nuevamente.`);

        // 🚀 5️⃣ Forzar actualización del árbol de Vue
        componentKey.value++;

        console.log(`✅ JS "${relativePath}" recargado y montado.`);
    } catch (error) {
        console.error(`❌ Error al recargar el JS "${relativePath}":`, error);
    }
}

document.addEventListener('DOMContentLoaded', init);

function buildComponentTree(component) {
    const tree = {
        name: component.type.name || 'Anonymous',
        instancia: component,
        children: [],
    };

    function traverse(currentComponent, currentNode) {
        // Obtener el árbol virtual renderizado del componente
        const vnode = currentComponent.subTree;

        if (vnode?.component) {
            // Componente hijo directo
            const childComponent = vnode.component;
            const childNode = {
                name: childComponent.type.name || 'Anonymous',
                instancia: childComponent,
                children: [],
            };
            currentNode.children.push(childNode);
            traverse(childComponent, childNode);
        } else if (vnode?.dynamicChildren) {
            // Buscar componentes en hijos recursivamente
            vnode.dynamicChildren.forEach(child => {
                if (typeof child === 'object') {
                    if (child.component) {
                        // Componente en el árbol
                        const childComp = child.component;
                        const childNode = {
                            name: childComp.type.name || 'Anonymous',
                            instancia: childComp,
                            children: [],
                        };
                        currentNode.children.push(childNode);
                        traverse(childComp, childNode);
                    } else if (child?.subTree) {
                        // Fragmentos y elementos normales
                        child.subTree.forEach(nestedChild => {
                            if (nestedChild?.component) {
                                const nestedComp = nestedChild.component;
                                const nestedNode = {
                                    name: nestedComp.type.name || 'Anonymous',
                                    instancia: nestedComp,
                                    children: [],
                                };
                                currentNode.children.push(nestedNode);
                                traverse(nestedComp, nestedNode);
                            }
                        });
                    }
                }
            });
        }
    }

    traverse(component, tree);
    return tree;
}

//crea una funcion para obtener los parenst de componentTree
function getParents(componentTree, name) {
    let parents = [];
    function traverse(currentNode) {
        if (currentNode.children.length > 0) {
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
    traverse(componentTree);
    return parents;
}
