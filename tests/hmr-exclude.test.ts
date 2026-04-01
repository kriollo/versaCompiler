import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isHmrExcluded } from '../src/compiler/transforms';

describe('isHmrExcluded', () => {
    const originalHMR_EXCLUDE = process.env['HMR_EXCLUDE'];
    const originalVERBOSE = process.env['VERBOSE'];

    beforeEach(() => {
        process.env['VERBOSE'] = 'false';
    });

    afterEach(() => {
        process.env['HMR_EXCLUDE'] = originalHMR_EXCLUDE;
        process.env['VERBOSE'] = originalVERBOSE;
    });

    it('retorna false cuando HMR_EXCLUDE no está definido', () => {
        delete process.env['HMR_EXCLUDE'];
        expect(isHmrExcluded('/dist/js/early-init.js')).toBe(false);
    });

    it('retorna false cuando HMR_EXCLUDE es array vacío', () => {
        process.env['HMR_EXCLUDE'] = '[]';
        expect(isHmrExcluded('/dist/js/early-init.js')).toBe(false);
    });

    it('excluye por nombre de archivo exacto', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['early-init.js']);
        expect(
            isHmrExcluded('/home/user/project/public/js/early-init.js'),
        ).toBe(true);
    });

    it('NO excluye archivo cuyo nombre no coincide', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['early-init.js']);
        expect(isHmrExcluded('/public/js/app.js')).toBe(false);
    });

    it('excluye por sufijo de ruta', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['js/early-init.js']);
        expect(
            isHmrExcluded('/home/user/project/public/js/early-init.js'),
        ).toBe(true);
    });

    it('NO excluye cuando el sufijo no coincide exactamente', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['js/early-init.js']);
        expect(isHmrExcluded('/public/other/early-init.js')).toBe(false);
    });

    it('excluye con glob simple *.legacy.js', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['*.legacy.js']);
        expect(isHmrExcluded('/public/js/vendor.legacy.js')).toBe(true);
    });

    it('NO excluye cuando el glob no coincide', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['*.legacy.js']);
        expect(isHmrExcluded('/public/js/vendor.modern.js')).toBe(false);
    });

    it('excluye con múltiples patrones (primero que coincide)', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify([
            'other.js',
            'early-init.js',
        ]);
        expect(isHmrExcluded('/public/js/early-init.js')).toBe(true);
    });

    it('maneja rutas con barras invertidas (Windows)', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['early-init.js']);
        expect(isHmrExcluded('C:\\project\\public\\js\\early-init.js')).toBe(
            true,
        );
    });

    it('excluye ruta absoluta real de proyecto consumer', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['early-init.js']);
        expect(
            isHmrExcluded(
                '/home/kriollo/proyectos/versaSTORE/public/js/early-init.js',
            ),
        ).toBe(true);
    });

    it('excluye con glob * al inicio del nombre', () => {
        process.env['HMR_EXCLUDE'] = JSON.stringify(['*-init.js']);
        expect(isHmrExcluded('/public/js/early-init.js')).toBe(true);
        expect(isHmrExcluded('/public/js/late-init.js')).toBe(true);
        expect(isHmrExcluded('/public/js/app.js')).toBe(false);
    });
});
