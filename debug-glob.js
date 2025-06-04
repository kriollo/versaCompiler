import fs, { glob } from 'node:fs/promises';
import path from 'path';

async function debugGlob() {
    const testDir = path.join(process.cwd(), 'tests', 'temp-debug');
    const srcDir = path.join(testDir, 'src');

    // Crear directorio de prueba
    await fs.mkdir(srcDir, { recursive: true });

    // Crear archivos de prueba
    await fs.writeFile(path.join(srcDir, 'test.js'), 'console.log("test");');
    await fs.writeFile(
        path.join(srcDir, 'test.ts'),
        'const x: string = "test";',
    );

    console.log('🔍 Directorio creado:', srcDir);
    console.log('📁 Archivos creados:');
    const files = await fs.readdir(srcDir);
    files.forEach(file => console.log(`  - ${file}`));

    // Probar diferentes patterns de glob
    const patterns = [
        `${srcDir}/**/*.js`,
        `${srcDir}/**/*.ts`,
        `${srcDir.replace(/\\/g, '/')}/**/*.js`,
        `${srcDir.replace(/\\/g, '/')}/**/*.ts`,
    ];

    console.log('\n🔍 Probando patterns de glob:');
    for (const pattern of patterns) {
        console.log(`\nPattern: ${pattern}`);
        try {
            const results = [];
            for await (const file of glob(pattern)) {
                results.push(file);
            }
            console.log(`  Resultados (${results.length}):`, results);
        } catch (error) {
            console.log(`  Error:`, error.message);
        }
    }

    // Limpiar
    await fs.rm(testDir, { recursive: true, force: true });
}

debugGlob().catch(console.error);
