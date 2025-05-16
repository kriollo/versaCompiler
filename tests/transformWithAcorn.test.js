import { transformModuleWithAcorn } from '../dist/utils/transformWithAcorn';

describe('transformModuleWithAcorn', () => {
    test('debería transformar un import .js local a dinámico y añadir HMR', () => {
        const inputCode = `
import { myUtil } from './utils.js';

myUtil();
console.log('Hola desde el módulo');
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar imports si el archivo contiene "defineComponent" y debería añadir marca de recarga', () => {
        const inputCode = `
import { ref } from 'vue';
import { anotherUtil } from './another.js';
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const count = ref(0);
    anotherUtil();
    return { count };
  }
});
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar imports si el archivo contiene "createApp" y debería añadir marca de recarga', () => {
        const inputCode = `
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router.js';

const app = createApp(App);
app.use(router);
app.mount('#app');
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar imports si el archivo contiene "mount" (y no createApp) y debería añadir marca de recarga', () => {
        const inputCode = `
import { h, render } from 'vue'; // Asumiendo que no usa createApp directamente
import App from './App.vue';

// Lógica de montaje más manual
const vnode = h(App);
render(vnode, document.getElementById('#app'));
// Simulación de una condición que podría llevar a la marca de recarga
// si 'mount' fuera el único indicador.
// En la lógica actual, esto no activaría isVueInitializationFile por sí solo
// pero si 'mount' se añade explícitamente a la condición, sí lo haría.
// Para este test, asumimos que la lógica de 'isVueInitializationFile'
// considera '.mount('#app')' o similar.
// Si la lógica es estrictamente code.includes('mount'), entonces:
const someObject = { mount: () => {} };
someObject.mount();
        `;
        // Este snapshot reflejará cómo la lógica actual de isVueInitializationFile
        // (que busca code.includes('mount')) trata este caso.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar imports de librerías externas como "vue"', () => {
        const inputCode = `
import { ref, computed } from 'vue';
import { localUtil } from './local.js';

const count = ref(0);
const double = computed(() => count.value * 2);
localUtil();
        `;
        // Esperamos que local.js se transforme, pero vue no.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar un archivo que es principalmente imports/exports (CoreDefinitionFile) y debería añadir marca de recarga', () => {
        const inputCode = `
import { firstUtil } from './utils/first.js';
import { secondUtil } from './utils/second.js';
import { thirdUtil } from './utils/third.js'; // .js local
// Alguna lógica mínima o ninguna
const combined = () => firstUtil() + secondUtil();

export { firstUtil, secondUtil, thirdUtil, combined };
export const CONST_A = 123;
        `;
        // Asumiendo que la heurística de ratio (e.g., >=0.7) lo marca como CoreDefinitionFile
        // y que './utils/third.js' cuenta como hasLocalJsImport.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería manejar un archivo solo con exports', () => {
        const inputCode = `
export const message = "Hola";
export function greet(name) {
  return \`Hola, \${name}\`;
}
        `;
        // No hay imports dinámicos, no debería haber IIFE ni HMR.
        // No debería tener la marca de recarga a menos que cumpla otra condición.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería manejar un archivo vacío o solo con comentarios', () => {
        const inputCode = `
// Esto es un comentario
// Otro comentario
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();

        const emptyCode = ``;
        expect(transformModuleWithAcorn(emptyCode)).toMatchSnapshot();
    });

    test('debería mover el cuerpo del código dentro del IIFE si hay imports dinámicos', () => {
        const inputCode = `
import { $dom } from './dom-utils.js';

const button = $dom('#myButton');
button.addEventListener('click', () => {
    console.log('Button clicked!');
});
export const testVar = 123;
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería transformar diferentes tipos de imports .js locales', () => {
        const inputCode = `
import myDefault from './defaultUtil.js';
import * as allUtils from './allUtils.js';
import { specificUtil, originalName as aliasUtil } from './specificUtils.js';

myDefault();
allUtils.doSomething();
specificUtil();
aliasUtil();
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar un import .js si su variable se usa en _resolveComponent, pero SÍ otros imports .js', () => {
        const inputCode = `
import MyComponent from './MyComponent.js'; // Usado en _resolveComponent
import anotherUtil from './anotherUtil.js'; // No usado en _resolveComponent
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
    'my-component': _resolveComponent("MyComponent")
  },
  setup() {
    anotherUtil();
    return {};
  }
});
        `;
        // Esperamos que MyComponent.js NO se transforme (se mantenga estático)
        // pero anotherUtil.js SÍ se transforme a dinámico.
        // El archivo general NO debería tener la marca //versaHRM-reloadFILE porque contiene defineComponent,
        // pero la lógica de _resolveComponent es una capa adicional de no-transformación para imports específicos.
        // Sin embargo, la presencia de defineComponent hará que TODO el archivo sea marcado para recarga.
        // Este test verifica principalmente que _resolveComponent no cause errores y que la marca se aplique correctamente.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('NO debería transformar un archivo que está justo por debajo del ratio de CoreDefinitionFile', () => {
        const inputCode = `
import { utilOne } from './utils/utilOne.js'; // .js local
import { utilTwo } from './utils/utilTwo.js'; // .js local
export { utilOne, utilTwo };

function localLogic1() { /* ... */ }
function localLogic2() { /* ... */ }
const localValue = 123;

// 2 imports, 1 export (3 nodos import/export)
// 3 nodos de lógica local
// Total nodos = 6
// Ratio = 3/6 = 0.5. Si el umbral es 0.7, esto NO es CoreDefinitionFile.
// Por lo tanto, utilOne.js y utilTwo.js deberían transformarse.
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería manejar un archivo solo con imports .js locales y sin exports', () => {
        const inputCode = `
import './sideEffectModule1.js';
import { setup } from './setupModule.js';

setup();
console.log('Módulo de solo imports ejecutado');
        `;
        // Esperamos que ambos imports se transformen a dinámicos.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería preservar comentarios en el código', () => {
        const inputCode = `
// Comentario al inicio del archivo
import { myUtil } from './utils.js'; // Comentario junto al import

/**
 * Comentario de bloque
 */
function doWork() {
    // Comentario dentro de una función
    myUtil();
}

// Comentario al final
export { doWork };
        `;
        // Acorn debería preservar los comentarios. El snapshot lo verificará.
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería manejar re-exportaciones de módulos .js locales (considerándolos CoreDefinitionFile)', () => {
        const inputCode = `
export { default as myDefault } from './myDefaultExport.js';
export * from './myNamespaceExports.js';
export { namedExport, originalName as localReExport } from './myNamedExports.js';
// Este archivo es puramente de re-exportación de módulos locales .js
// Debería ser marcado como CoreDefinitionFile y no transformado, añadiendo la marca de recarga.
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });

    test('debería manejar re-exportaciones de librerías externas (manteniendo imports estáticos)', () => {
        const inputCode = `
export { ref, computed } from 'vue';
export { default as anotherDefault } from './anotherDefault.js'; // .js local
// El import de 'vue' debe permanecer estático.
// El import de './anotherDefault.js' debería transformarse.
// El archivo en sí no debería ser CoreDefinitionFile solo por re-exportar 'vue'.
        `;
        expect(transformModuleWithAcorn(inputCode)).toMatchSnapshot();
    });


});
