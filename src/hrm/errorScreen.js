/**
 * Variable global que mantiene la referencia al overlay de error actual
 * @type {HTMLElement|null}
 */
let errorOverlay;

/**
 * Oculta y remueve el overlay de error actual del DOM
 * @returns {void}
 */
export function hideErrorOverlay() {
    const existingOverlay = document.getElementById('versa-hmr-error-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    errorOverlay = null;
}

/**
 * Muestra un overlay de error personalizado para errores de HMR (Hot Module Replacement).
 * @param {string} errorMessage - Mensaje de error principal.
 * @param {string} [errorDetails=''] - Detalles adicionales del error, opcional.
 * @returns {void}
 */
export function showErrorOverlay(errorMessage, errorDetails = '') {
    hideErrorOverlay(); // Asegurar que no haya overlays duplicados

    // Crear el contenedor principal del overlay
    errorOverlay = document.createElement('div');
    errorOverlay.id = 'versa-hmr-error-overlay';
    errorOverlay.style.position = 'fixed';
    errorOverlay.style.top = '0';
    errorOverlay.style.left = '0';
    errorOverlay.style.width = '100vw';
    errorOverlay.style.height = '100vh';
    errorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 1.85)';
    errorOverlay.style.color = '#ff8080';
    errorOverlay.style.zIndex = '999999';
    errorOverlay.style.display = 'flex';
    errorOverlay.style.flexDirection = 'column';
    errorOverlay.style.alignItems = 'center';
    errorOverlay.style.justifyContent = 'center';
    errorOverlay.style.fontFamily = 'monospace';
    errorOverlay.style.fontSize = '16px';
    errorOverlay.style.padding = '20px';
    errorOverlay.style.boxSizing = 'border-box';
    errorOverlay.style.textAlign = 'left';
    errorOverlay.style.overflow = 'auto';

    // Crear el título del overlay
    const title = document.createElement('h2');
    title.textContent = 'Versa HMR Error';
    title.style.color = '#ff4d4d';
    title.style.fontSize = '24px';
    title.style.marginBottom = '20px';

    // Crear el contenedor del mensaje principal
    const messageDiv = document.createElement('div');
    messageDiv.textContent = errorMessage;
    messageDiv.style.marginBottom = '15px';
    messageDiv.style.whiteSpace = 'pre-wrap';

    // Crear el contenedor de detalles del error
    const detailsPre = document.createElement('pre');
    detailsPre.textContent = errorDetails;
    detailsPre.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    detailsPre.style.padding = '10px';
    detailsPre.style.borderRadius = '5px';
    detailsPre.style.maxHeight = '50vh';
    detailsPre.style.overflow = 'auto';
    detailsPre.style.width = '100%';
    detailsPre.style.maxWidth = '800px';

    // Agregar elementos al overlay
    errorOverlay.appendChild(title);
    errorOverlay.appendChild(messageDiv);
    if (errorDetails) {
        errorOverlay.appendChild(detailsPre);
    }

    // Agregar el overlay al DOM
    document.body.appendChild(errorOverlay);
}
