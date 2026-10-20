import { describe, expect, it } from 'vitest';

import { estandarizaCode } from '../src/compiler/transforms';

/**
 * Defensa de 2.7.8: si a la estandarización llega TypeScript (loader 'ts'), se parsea como TS. En modo JS,
 * el modificador `type` de un import inline es un error de sintaxis.
 */
const CODIGO_TS = `import { ref, type Ref } from 'vue';
const token: Ref<string> = ref('');
export default token;
`;

describe('estandarizaCode según el loader', () => {
    it("con loader 'ts' acepta sintaxis de TypeScript", async () => {
        const result = await estandarizaCode(
            CODIGO_TS,
            '/tmp/Ejemplo.vue',
            'ts',
        );

        expect(result.error).toBeNull();
    });

    it('sin loader sigue parseando como JS (un import type inline es un error ahí)', async () => {
        const result = await estandarizaCode(CODIGO_TS, '/tmp/EjemploJs.vue');

        expect(result.error).not.toBeNull();
    });

    it("con loader 'js' el JavaScript normal se estandariza igual que antes", async () => {
        const js = "import { ref } from 'vue';\nexport default ref('');\n";

        expect(await estandarizaCode(js, '/tmp/ejemplo.js', 'js')).toEqual(
            await estandarizaCode(js, '/tmp/ejemplo2.js'),
        );
    });
});
