import {
    handleError,
    isValidModuleName,
    sanitizeModulePath,
    $dom,
} from '@/js/devUtils';
import { createApp, ref } from 'vue';

const debug = ref(false);
const $contenedor = ref(null);

async function loadModule() {
    try {
        const url = new URL(import.meta.url);
        const urlParams = url.search;
        const searchParams = new URLSearchParams(urlParams);
        let module = searchParams.get('m');

        $contenedor.value = $dom('#app');

        if (!$contenedor.value) {
            throw new Error(
                'No se ha encontrado el contenedor para cargar el módulo.',
            );
        }

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
            const app = createApp({
                components: { [component]: moduleResponse.default },
                setup() {
                    // Configuración de la aplicación según el modo de depuración
                    if (debug.value) {
                        console.log('Debug mode is enabled');
                    }
                    const componentKey = ref(Date.now());
                    return {
                        componentKey,
                    };
                },
                name: 'App',
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

            app.mount($contenedor.value, true);

            // --- FRAGMENTO CLAVE PARA HMR Y ACCESO GLOBAL ---
            if (typeof window !== 'undefined') {
                // Exponemos la instancia de la app para HMR y depuración
                (window as any).__VUE_APP__ = app;
                // Exponemos el proxy raíz, útil para acceder a métodos, $forceUpdate, etc.
                (window as any).__VUE_APP_PROXY__ = app._instance?.proxy;
            }
        }
    } catch (e) {
        handleError(e, module, $contenedor);
    }
}

loadModule();
