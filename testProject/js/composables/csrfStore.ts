import { ref, type Ref } from 'vue';

/**
 * Singleton reactivo para el token CSRF.
 * Compartido entre vue-loader (inicialización) y SessionManager (actualización por heartbeat/SPA).
 * Permite que los componentes Vue obtengan siempre el token vigente mediante inject reactivo.
 */
const csrfTokenRef: Ref<string> = ref('');

/** Retorna la referencia reactiva del token CSRF. */
export const getCsrfTokenRef = (): Ref<string> => csrfTokenRef;

/**
 * Actualiza el token CSRF en el store reactivo.
 * Solo actualiza si el nuevo token es distinto al actual para evitar renders innecesarios.
 */
export const updateCsrfToken = (token: string): void => {
    if (token && token !== csrfTokenRef.value) {
        csrfTokenRef.value = token;
    }
};

/** Inicializa el store con el token leído del DOM al montar la aplicación. */
export const initCsrfToken = (initialValue: string): void => {
    csrfTokenRef.value = initialValue;
};
