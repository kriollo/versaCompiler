import { describe, expect, it } from 'vitest';

import { validateTypesWithLanguageService } from '../src/compiler/typescript-sync-validator';

// TypeScript normaliza las rutas a `/` en cualquier SO, así que una ruta con
// barras de Windows reproduce en Linux el bug del CI de Windows: el archivo
// virtual .vue.ts no se encontraba y el type check devolvía cero errores.
describe('validateTypesWithLanguageService - rutas de Windows', () => {
    const code = 'const n: number = "no es número";\nexport { n };\n';

    it('detecta el error de tipos en un .vue con ruta C:\\...', () => {
        const result = validateTypesWithLanguageService(
            'C:\\proyecto\\src\\Modal.vue',
            code,
            { strict: true, noEmit: true },
        );
        expect(result.hasErrors).toBe(true);
    });

    it('y en un .ts virtual con ruta C:\\...', () => {
        const result = validateTypesWithLanguageService(
            'C:\\proyecto\\src\\servicio.ts',
            code,
            { strict: true, noEmit: true },
        );
        expect(result.hasErrors).toBe(true);
    });
});
