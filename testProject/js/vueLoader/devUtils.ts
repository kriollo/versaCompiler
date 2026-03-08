import { html } from 'code-tag';

import { $dom } from '@/dashboard/js/composables/dom';

/**
 * Manejar errores durante la carga del módulo.
 * @param {any} error - El error ocurrido.
 * @param {string} module - El módulo que causó el error.
 */
const handleError = (error: unknown, module: string, container: HTMLElement): void => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorStack = error instanceof Error ? error.stack : '';
    const errorName = error instanceof Error ? error.constructor.name : 'Error';
    const moduleInfo = module ? `Módulo: ${module}` : 'Módulo no especificado';
    const safeMessage = `${moduleInfo}<br>${errorMessage}`.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const safeStack = (errorStack || '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const finalContent: HTMLElement = container || ($dom('body') as HTMLElement);

    // Mostrar mensaje de error en el contenedor
    finalContent.textContent = ''; // Limpiar contenido previo

    finalContent.insertAdjacentHTML(
        'beforeend',
        html`
            <div
                style="padding: 1rem; background-color: #f44336; color: #fff; font-family: monospace;"
                id="error-container">
                <h2 style="margin: 0 0 1rem 0;">🚨 Error crítico: ${errorName}</h2>
                <p
                    style="text-align: left; margin: 0 0 0.5rem 0; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
                    <strong>${moduleInfo}</strong>
                    <br />
                    <br />
                    ${safeMessage}
                </p>
                ${safeStack
                    ? html`
                          <details style="margin-top: 1rem;">
                              <summary
                                  style="cursor: pointer; padding: 0.5rem; background: rgba(0,0,0,0.1); border-radius: 4px;">
                                  📋 Ver Stack Trace
                              </summary>
                              <pre
                                  style="margin: 0.5rem 0; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-break: break-all;">
${safeStack}</pre
                              >
                          </details>
                      `
                    : ''}
                <button
                    style="margin-top: 1rem; padding: 0.5rem 1rem; background-color: #fff; color: #333; border: 1px solid #333; cursor: pointer; border-radius: 4px;"
                    onclick="window.location.reload()">
                    🔄 Reintentar
                </button>
            </div>
        `,
    );

    console.error('[Module Loader]', error);
};
const handleHMRError = (errorMessage: string, trace: unknown): void => {
    const safeMessage = `${errorMessage}`.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    // Escapa también la variable 'trace'
    const safeTrace = `${trace}`.replaceAll('<', '&lt;').replaceAll('>', '&gt;');

    let ErrorContainer = $dom('#error-container');
    if (!ErrorContainer) {
        ErrorContainer = document.createElement('div');
        ErrorContainer.id = 'versa-hmr-error-overlay';
        ErrorContainer.classList.add('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
        document.body.append(ErrorContainer);

        ErrorContainer.insertAdjacentHTML(
            'beforeend',
            html`
                <div class="p-4 bg-orange-400 dark:bg-orange-500 text-orange-900 dark:text-orange-100">
                    <h2 class="text-xl font-bold">VERSA ERROR</h2>
                </div>
                <div id="error-container" style="overflow: auto; max-height: 600px;"></div>
            `,
        );
    }
    const error = $dom('#error-container');
    if (!error) {
        console.error('Error container not found');
        return;
    }
    if (ErrorContainer.hasAttribute('hidden')) {
        error.innerHTML = '';
    }

    // Mostrar mensaje de error en el contenedor (o área de notificación)
    error.insertAdjacentHTML(
        `beforeend`,
        html`
            <div class="p-4 bg-orange-300 text-orange-900">
                <pre class="whitespace-pre-wrap">${safeMessage}</pre>
                <pre><code>${safeTrace}</code></pre>
            </div>
        `,
    );
};

export { handleError, handleHMRError };
