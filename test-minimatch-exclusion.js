/**
 * Prueba simple para verificar que minimatch se excluye correctamente
 */
const { transformImports } = require('./src/compiler/transforms.ts');
const { getOptimizedModulePath } = require('./src/compiler/module-resolution-optimizer.ts');

async function testMinimatchExclusion() {
    console.log('🔍 Testing minimatch exclusion...\n');

    // 1. Test en transforms.ts
    console.log('1. Testing transforms.ts:');
    const code = `import minimatch from 'minimatch';
import { ref } from 'vue';
import * as fs from 'fs-extra';`;

    try {
        const result = await transformImports(code, {});
        console.log('   Resultado de transformación:');
        console.log('   ' + result.replace(/\n/g, '\n   '));
        
        // Verificar que minimatch no se transformó (debe quedar igual)
        const hasOriginalMinimatch = result.includes("import minimatch from 'minimatch'");
        console.log(`   ✅ minimatch no transformado: ${hasOriginalMinimatch ? 'SÍ' : 'NO'}`);
    } catch (error) {
        console.log(`   ❌ Error en transforms: ${error.message}`);
    }

    console.log('\n2. Testing module-resolution-optimizer.ts:');
    try {
        const result = await getOptimizedModulePath('minimatch');
        console.log(`   getOptimizedModulePath('minimatch'): ${result}`);
        console.log(`   ✅ minimatch excluido: ${result === null ? 'SÍ' : 'NO'}`);
    } catch (error) {
        console.log(`   ❌ Error en optimizer: ${error.message}`);
    }

    console.log('\n✅ Prueba de exclusión de minimatch completada');
}

testMinimatchExclusion().catch(console.error);
