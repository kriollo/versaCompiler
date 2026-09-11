import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getOutputPath } from '../src/compiler/compile';

describe('getOutputPath', () => {
    const originalSource = process.env.PATH_SOURCE;
    const originalDist = process.env.PATH_DIST;

    beforeEach(() => {
        process.env.PATH_SOURCE = './src';
        process.env.PATH_DIST = './dist';
    });

    afterEach(() => {
        if (originalSource === undefined) delete process.env.PATH_SOURCE;
        else process.env.PATH_SOURCE = originalSource;
        if (originalDist === undefined) delete process.env.PATH_DIST;
        else process.env.PATH_DIST = originalDist;
    });

    it('preserva la subestructura de directorios dentro de PATH_SOURCE', () => {
        const ruta = join(process.cwd(), 'src', 'components', 'Foo.vue');
        expect(getOutputPath(ruta)).toBe('dist/components/Foo.js');
    });

    it('reescribe .ts a .js', () => {
        const ruta = join(process.cwd(), 'src', 'utils', 'helper.ts');
        expect(getOutputPath(ruta)).toBe('dist/utils/helper.js');
    });

    it('NO confunde un directorio hermano cuyo nombre contiene "src" como substring (bug real)', () => {
        // Antes: normalizedRuta.includes(normalizedSource) hacía match por
        // substring puro, así que "my-src-app" (que contiene "src") se
        // trataba como si estuviera dentro de PATH_SOURCE, produciendo una
        // ruta de salida en el subdirectorio equivocado.
        const ruta = join(
            process.cwd(),
            'my-src-app',
            'other',
            'Foo.vue',
        );
        // Al no estar realmente bajo PATH_SOURCE, cae al fallback de solo
        // basename (mismo comportamiento que un archivo fuera del proyecto).
        expect(getOutputPath(ruta)).toBe('dist/Foo.js');
    });

    it('usa solo el basename para archivos fuera de PATH_SOURCE', () => {
        const ruta = '/some/completely/unrelated/place/Foo.vue';
        expect(getOutputPath(ruta)).toBe('dist/Foo.js');
    });

    it('sin PATH_SOURCE/PATH_DIST configurados, solo reescribe la extensión', () => {
        delete process.env.PATH_SOURCE;
        delete process.env.PATH_DIST;
        expect(getOutputPath('/anywhere/Foo.vue')).toBe('/anywhere/Foo.js');
    });
});
