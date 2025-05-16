import fs from 'fs';
import path from 'path';
import { transformModuleWithAcorn } from './transformWithAcorn.js';

// Ejemplo: analizar un archivo JS/TS real usando la función basada en Acorn
// Puedes cambiar esta ruta por cualquier archivo fuente que quieras analizar
async function runAcornExample() {
    // Ruta de ejemplo: dashboard.ts de tu proyecto
    const examplePath = path.resolve('./src/js/examples/InjectKeys.js');
    const code = fs.readFileSync(examplePath, 'utf-8');
    console.log('Analizando archivo:', examplePath);
    const nuevoCodigo = transformModuleWithAcorn(code);
    console.log('--- Código transformado ---\n');
    console.log(nuevoCodigo);
    // Guardar el resultado en un archivo nuevo
    const outPath = path.resolve('./dist/utils/dashboard.transformed.js');
    fs.writeFileSync(outPath, nuevoCodigo, 'utf-8');
    console.log(`\nArchivo transformado guardado en: ${outPath}`);
}

runAcornExample();
