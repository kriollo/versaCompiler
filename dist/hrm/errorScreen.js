let errorOverlay;
export function hideErrorOverlay() {
    const existingOverlay = document.getElementById('versa-hmr-error-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    errorOverlay = null;
}
export function showErrorOverlay(errorMessage, errorDetails = '') {
    hideErrorOverlay(); // Ensure no duplicate overlays

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

    const title = document.createElement('h2');
    title.textContent = 'Versa HMR Error';
    title.style.color = '#ff4d4d';
    title.style.fontSize = '24px';
    title.style.marginBottom = '20px';

    const messageDiv = document.createElement('div');
    messageDiv.textContent = errorMessage;
    messageDiv.style.marginBottom = '15px';
    messageDiv.style.whiteSpace = 'pre-wrap';

    const detailsPre = document.createElement('pre');
    detailsPre.textContent = errorDetails;
    detailsPre.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    detailsPre.style.padding = '10px';
    detailsPre.style.borderRadius = '5px';
    detailsPre.style.maxHeight = '50vh';
    detailsPre.style.overflow = 'auto';
    detailsPre.style.width = '100%';
    detailsPre.style.maxWidth = '800px';

    errorOverlay.appendChild(title);
    errorOverlay.appendChild(messageDiv);
    if (errorDetails) {
        errorOverlay.appendChild(detailsPre);
    }

    document.body.appendChild(errorOverlay);
}
