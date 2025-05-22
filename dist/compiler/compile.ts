import path from 'node:path';
import { env } from 'node:process';
import { getCodeFile, parser } from './parser.ts';
import { generateTailwindCSS } from './tailwindcss.ts';

export function normalizeRuta(ruta: string) {
    const file = path
        .normalize(!ruta.startsWith('.') ? './' + ruta : ruta)
        .replace(/\\/g, '/');
    const sourceForDist = file.startsWith('./') ? file : `./${file}`;

    return sourceForDist;
}

export function getOutputPath(ruta: string) {
    const pathSource = env.PATH_SOURCE ?? '';
    const pathDist = env.PATH_DIST ?? '';
    return ruta.replace(pathSource, pathDist).replace(/\.(vue|ts)$/, '.js');
}

export const initLoadCacheVueMap = async (ruta: string) => {
    const { code, filename, error } = await getCodeFile(
        getOutputPath(normalizeRuta(ruta)),
    );
    if (error) {
        throw new Error('Error al leer el archivo');
    }
    const { ast } = await parser(filename, code);
    console.log('AST:', ast?.module?.staticImports);

    // extraer los imports estaticos
    const imports = ast?.module.staticImports.map(item => {
        return {
            name: item.moduleRequest.value,
            source: item.entries.map(entry => {
                return {
                    name: entry.importName.name,
                    type: entry.localName.value,
                };
            }),
        };
    });

    return imports;
};

export async function compile(ruta: string) {
    await generateTailwindCSS();
    let file = normalizeRuta(ruta);
}
