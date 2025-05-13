import { createApp, defineAsyncComponent } from 'vue';
// Add Vite client types for import.meta.glob
/// <reference types="vite/client" />

// Detectar el módulo desde la URL (?modulo=otroModulo/dashModule)
const url = new URL(import.meta.url);
const urlParams = url.search;
const searchParams = new URLSearchParams(urlParams);
const modulo = searchParams.get('modulo') || 'appLoader';

// Importar todos los .vue recursivamente
const components = import.meta.glob('@/js/module/**/*.vue');

// Resolver la clave correcta
const path = `/src/js/module/${modulo}.vue`;

if (!(path in components)) {
    throw new Error(`Componente no encontrado: ${modulo}`);
}

const AsyncComponent = defineAsyncComponent(components[path]);

const app = createApp({
    components: { AsyncComponent },
    template: `<AsyncComponent />`,
});

app.mount('#app');
