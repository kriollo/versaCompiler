import { html } from 'code-tag';
import { createApp, ref } from 'vue';

import {
    $dom,
    handleError,
    isValidModuleName,
    sanitizeModulePath,
} from '@/js/devUtils';

const debug = ref(false);
const $contenedor = ref<HTMLElement | null>(null);

async function loadModule() {
    const url = new URL(import.meta.url);
    const urlParams = url.search;
    const searchParams = new URLSearchParams(urlParams);
    const module = searchParams.get('m');
    let validatedModule = 'unknown'; // Declarar fuera para uso en catch

    try {
        $contenedor.value = $dom('#app') as HTMLElement | null;

        if (!$contenedor.value) {
            throw new Error(
                'No se ha encontrado el contenedor para cargar el módulo.',
            );
        }
        if (
            !module ||
            module.trim() === '' ||
            module === 'undefined' ||
            module === 'null'
        ) {
            throw new Error('No se ha especificado un módulo para cargar.');
        } // Type assertion: en este punto sabemos que module no es null
        validatedModule = module;
        validatedModule = sanitizeModulePath(validatedModule);
        validatedModule = validatedModule.startsWith('/')
            ? validatedModule.slice(1)
            : validatedModule;

        // Validar el parámetro del módulo
        if (!isValidModuleName(validatedModule)) {
            throw new Error(
                'El parámetro del módulo contiene caracteres no permitidos.',
            );
        }

        const component = validatedModule.split('/').pop() as string;
        if (!component) {
            throw new Error('No se ha especificado un componente para cargar.');
        } // Importar dinámicamente el módulo
        const moduleResponse = await import(
            `@/${validatedModule}.js?v=${Date.now()}`
        );
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
                template: html`
                    <${component} :key="componentKey" />
                `,
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
        }
    } catch (e) {
        handleError(e, validatedModule, $contenedor.value);
    }
}
loadModule();
