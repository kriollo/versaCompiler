import { getOptimizedModulePath } from '../src/compiler/module-resolution-optimizer';

describe('Vue Resolution Optimization', () => {
    test('debe priorizar versiones browser sobre runtime para Vue', async () => {
        const result = await getOptimizedModulePath('vue');

        if (result) {
            console.log('Vue resuelto a:', result);

            // Verificar que no está usando versión runtime si hay alternativas browser
            if (result.includes('runtime')) {
                console.log('⚠️ Aún usando versión runtime:', result);

                // En modo desarrollo, debería priorizar browser sobre runtime
                expect(result).not.toMatch(/runtime.*(?!.*browser)/);
            } else {
                console.log('✅ Usando versión no-runtime:', result);
            }

            // En desarrollo, no debería usar versiones minificadas
            if (process.env.isProd !== 'true') {
                expect(result).not.toMatch(/\.min\./);
                expect(result).not.toMatch(/\.prod\./);
            }
        } else {
            console.log('Vue no está instalado o está excluido');
        }
    });

    test('debe aplicar validación de desarrollo en archivos minificados', async () => {
        // Simular resolución de un módulo hipotético con versión minificada
        const testCases = [
            'lodash', // Si existe, probar con lodash
            'chalk',  // Si existe, probar con chalk
        ];

        for (const moduleName of testCases) {
            const result = await getOptimizedModulePath(moduleName);

            if (result) {
                console.log(`${moduleName} resuelto a:`, result);

                // En desarrollo, evitar versiones minificadas
                if (process.env.isProd !== 'true') {
                    expect(result).not.toMatch(/\.min\./);
                    expect(result).not.toMatch(/\.prod\./);
                    console.log(`✅ ${moduleName} usa versión de desarrollo`);
                }
            }
        }
    });

    test('debe mostrar información de debugging para Vue específicamente', async () => {
        // Activar modo verbose temporalmente
        const originalVerbose = process.env.VERBOSE;
        process.env.VERBOSE = 'true';

        try {
            const result = await getOptimizedModulePath('vue');

            if (result) {
                console.log('Vue path final:', result);

                // Verificar que es una versión apropiada para desarrollo
                const isGoodForDev = result.includes('browser') ||
                                   result.includes('esm') ||
                                   (!result.includes('min') && !result.includes('prod'));

                expect(isGoodForDev).toBe(true);
                console.log('✅ Vue configurado correctamente para desarrollo');
            }
        } finally {
            // Restaurar configuración original
            process.env.VERBOSE = originalVerbose;
        }
    });
});
