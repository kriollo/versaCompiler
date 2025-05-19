import fs from 'fs';
import path from 'path';
import { transformModuleWithAcorn } from '../dist/utils/transformWithAcorn.js';

// Ejemplo: analizar un archivo JS/TS real usando la función basada en Acorn
// Puedes cambiar esta ruta por cualquier archivo fuente que quieras analizar
async function runAcornExample() {
    // Ruta de ejemplo: dashboard.ts de tu proyecto
    const inputPath = path.resolve('./src/js/examples/dashboard.js');
    const code = fs.readFileSync(inputPath, 'utf-8');
    console.log('Analizando archivo:', inputPath);
    const nuevoCodigo = transformModuleWithAcorn(code);

    console.log(nuevoCodigo);
    // Guardar el resultado en un archivo nuevo
    const outPath = path.resolve('./public/js/examples/dashboard.js');
    fs.writeFileSync(outPath, nuevoCodigo, 'utf-8');
    console.log(`\nArchivo transformado guardado en: ${outPath}`);
}

runAcornExample();
