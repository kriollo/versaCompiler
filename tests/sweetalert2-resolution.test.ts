// Test específico para verificar la resolución de sweetalert2
import { getModulePath } from '../src/utils/module-resolver';

describe('Verificación específica de sweetalert2', () => {
    test('debe resolver sweetalert2 a la versión ESM optimizada', () => {
        const result = getModulePath('sweetalert2');
        console.log('Sweetalert2 resuelto:', result);

        // Debe devolver una ruta absoluta desde /
        expect(result).toMatch(/^\/node_modules\/sweetalert2\/dist\//);

        // Debe priorizar versión ESM sobre CommonJS
        expect(result).toMatch(/\.esm\./);

        // Idealmente debe ser la versión .esm.all.min.js
        if (result) {
            expect(result).toContain('sweetalert2.esm.all.min.js');
        }
    });
});
