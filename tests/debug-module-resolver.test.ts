import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getModuleSubPath } from '../src/utils/module-resolver';

describe('Debug Module Resolver', () => {
    it('should resolve Vue in production mode', () => {
        // Configurar modo producción
        process.env.isPROD = 'true';
        process.env.PATH_DIST = 'public/js';
        process.env.VERBOSE = 'true';

        const testFile = join(process.cwd(), 'temp', 'test.js');

        console.log('\n========================================');
        console.log('🔍 DEBUG: Resolviendo módulo Vue');
        console.log('========================================');
        console.log('isPROD:', process.env.isPROD);
        console.log('PATH_DIST:', process.env.PATH_DIST);
        console.log('Test file:', testFile);
        console.log('========================================\n');

        const result = getModuleSubPath('vue', testFile);

        console.log('\n========================================');
        console.log('📦 RESULTADO:');
        console.log('========================================');
        console.log('Result:', result);
        console.log('========================================\n');

        expect(result).not.toBeNull();

        if (result) {
            console.log('✅ Resolución exitosa');
            console.log('Ruta resultante:', result);

            // Verificar si contiene .prod.js
            const hasProdVersion = result.includes('.prod.js');
            console.log('Contiene .prod.js?:', hasProdVersion);

            if (!hasProdVersion) {
                console.warn(
                    '⚠️  ADVERTENCIA: No se seleccionó la versión .prod.js',
                );
                console.warn(
                    '   Se esperaba que en modo producción se seleccionara .prod.js',
                );
            }
        } else {
            console.error('❌ getModuleSubPath retornó null');
        }
    });

    it('should resolve Vue Router in production mode', () => {
        process.env.isPROD = 'true';
        process.env.PATH_DIST = 'public/js';
        process.env.VERBOSE = 'true';

        const testFile = join(process.cwd(), 'temp', 'test.js');
        const result = getModuleSubPath('vue-router', testFile);

        console.log('\n📦 Vue Router result:', result);

        expect(result).not.toBeNull();

        if (result && !result.includes('.prod.js')) {
            console.warn(
                '⚠️  Vue Router: No se seleccionó la versión .prod.js',
            );
        }
    });

    it('should resolve Pinia in production mode', () => {
        process.env.isPROD = 'true';
        process.env.PATH_DIST = 'public/js';
        process.env.VERBOSE = 'true';

        const testFile = join(process.cwd(), 'temp', 'test.js');
        const result = getModuleSubPath('pinia', testFile);

        console.log('\n📦 Pinia result:', result);

        expect(result).not.toBeNull();

        if (result && !result.includes('.prod.js')) {
            console.warn('⚠️  Pinia: No se seleccionó la versión .prod.js');
        }
    });
});
