import { html } from 'code-tag';

/**
 * Sanitize the module path to prevent directory traversal attacks.
 * @param {string} module - The module path to sanitize.
 * @returns {string} - The sanitized module path.
 */
export const sanitizeModulePath = (module: string): string => {
    return module
        .replace(/\.\.\//g, '') // Eliminar ".."
        .replace(/\/+/g, '/') // Normalizar barras
        .replace(/[^a-zA-Z0-9/_-]/g, ''); // Eliminar caracteres no permitidos
};

type ModuleName = string & { __brand: 'ModuleName' };
export function isValidModuleName(module: string): module is ModuleName {
    const MODULE_NAME_REGEX = /^(?:@\/)?[a-zA-Z0-9][a-zA-Z0-9/_-]*[a-zA-Z0-9]$/;
    return MODULE_NAME_REGEX.test(module);
}

/**
 * Manejar errores durante la carga del módulo.
 * @param {any} error - El error ocurrido.
 * @param {string} module - El módulo que causó el error.
 */
export function handleError(
    error: any,
    module: string,
    container: HTMLElement,
): void {
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
}

export const $dom = (
    selector: string,
    context: Document | Element = document,
): Element | null => context.querySelector(selector);
