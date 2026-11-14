import { describe, expect, it } from 'vitest';

import { shiftInlineSourceMap } from '../src/compiler/compile';

const withMap = (mappings: string) =>
    // El comentario se arma por partes: si aparece literal en este archivo,
    // Vitest intenta leerlo como el source map del propio test (falla en Windows)
    `const a = 1;\n//# ${'sourceMappingURL'}=data:application/json;base64,${Buffer.from(
        JSON.stringify({ version: 3, sources: ['a.ts'], mappings }),
    ).toString('base64')}`;

const readMap = (code: string) =>
    JSON.parse(
        Buffer.from(code.split('base64,')[1]!, 'base64').toString('utf8'),
    );

describe('shiftInlineSourceMap', () => {
    it('antepone una línea vacía al mapping por cada línea del shim', () => {
        const shifted = shiftInlineSourceMap(withMap('AAAA;AACA'), 3);
        expect(readMap(shifted).mappings).toBe(';;;AAAA;AACA');
    });

    it('deja el código intacto si no hay source map inline', () => {
        expect(shiftInlineSourceMap('const a = 1;\n', 3)).toBe(
            'const a = 1;\n',
        );
    });
});
