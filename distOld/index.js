import browserSync from 'browser-sync';
import chalk from 'chalk';
import { exec } from 'child_process';
import chokidar from 'chokidar';
import getPort from 'get-port';

import {
    glob,
    mkdir,
    readdir,
    readFile,
    rmdir,
    stat,
    unlink,
    writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { checkSintaxysAcorn } from './services/acorn.js';
import { linter } from './services/linter.js';
import { minifyJS } from './services/minify.js';
import { preCompileTS } from './services/typescript.js';
import { preCompileVue } from './services/vuejs.js';

import { transformModuleWithAcorn } from './transform/transformWithAcorn.js';

import { addImportEndJs, mapRuta, showTimingForHumans } from './utils/utils.js';

const log = console.log.bind(console);
const error = console.error.bind(console);

let bs = null;
let proxyUrl = '';
let AssetsOmit = false;

let PATH_SOURCE = '';
let PATH_DIST = '';
const PATH_CONFIG_FILE = './tsconfig.json';
const PATH_SOURCE_DEFAULT = './src'; // Valor por defecto para PATH_SOURCE
const PATH_DIST_DEFAULT = './dist'; // Valor por defecto para PATH_DIST

let watchJS = `${PATH_SOURCE}/**/*.js`;
let watchVue = `${PATH_SOURCE}/**/*.vue`;
let watchTS = `${PATH_SOURCE}/**/*.ts`;
const excludeFile = `!${PATH_SOURCE}/**/*.ts`;

let pathAlias = null;
let tsConfig = null;

let tailwindcss = null;

// obtener parametro de entrada
let isAll = false;
let isProd = false;
if (process.argv.length > 1) {
    const args = process.argv.slice(2);
    isAll = args.includes('--all');
    isProd = args.includes('--prod');

    console.log(chalk.green(`isAll: ${isAll}`));
    console.log(chalk.green(`isProd: ${isProd}`));
}

let vueFiles = 0;
let tsFiles = 0;
let acornFiles = 0;
let successfulFiles = 0;
let errorFiles = 0;
const errorList = [];

// Cache para componentes Vue compilados (para HMR de dependencias JS)
const serverComponentCache = new Map();

/**
 * Obtiene los alias de ruta desde el archivo tsconfig.json.
 * @returns {Promise<Object>} - Un objeto con los alias de ruta.
 */
const getPathAlias = async () => {
    try {
        const data = await readFile(PATH_CONFIG_FILE, { encoding: 'utf-8' });
        if (!data) {
            error(chalk.red('🚩 :Error al leer el archivo tsconfig.json'));
            process.exit(1);
        }

        tsConfig = JSON.parse(data);

        // Verificar si compilerOptions y compilerOptions.paths existen
        if (!tsConfig.compilerOptions || !tsConfig.compilerOptions.paths) {
            console.error(
                chalk.red(
                    `❌ Error: El archivo '${PATH_CONFIG_FILE}' existe, pero no contiene la sección 'compilerOptions.paths' necesaria para los alias de ruta.`,
                ),
            );
            process.exit(1); // Detener ejecución
        } else {
            pathAlias = tsConfig.compilerOptions.paths;
        }

        // Asegurarse que pathAlias sea un objeto
        pathAlias = pathAlias || {};

        // Eliminar /* de las rutas de alias
        for (const key in pathAlias) {
            const values = pathAlias[key];
            for (let i = 0; i < values.length; i++) {
                values[i] = values[i].replace('/*', '');
            }
        }

        tailwindcss = tsConfig.tailwindcss || false;
        proxyUrl = tsConfig.versaCompile?.proxyConfig?.proxyUrl || '';
        AssetsOmit = tsConfig.versaCompile?.proxyConfig?.assetsOmit || false;

        const sourceRoot =
            tsConfig.compilerOptions.sourceRoot || PATH_SOURCE_DEFAULT;
        PATH_SOURCE = sourceRoot.endsWith('/')
            ? sourceRoot.slice(0, -1)
            : sourceRoot;

        const outDir = tsConfig.compilerOptions.outDir || PATH_DIST_DEFAULT;
        PATH_DIST = outDir.endsWith('/') ? outDir.slice(0, -1) : outDir;

        console.log(chalk.green(`PATH_SOURCE: ${PATH_SOURCE}`));
        console.log(chalk.green(`PATH_DIST: ${PATH_DIST}\n`));

        watchJS = `${PATH_SOURCE}/**/*.js`;
        watchVue = `${PATH_SOURCE}/**/*.vue`;
        watchTS = `${PATH_SOURCE}/**/*.ts`;

        return pathAlias;
    } catch (error) {
        // Verificar si el error es porque el archivo no existe
        if (error.code === 'ENOENT') {
            console.error(
                chalk.red(
                    `❌ Error: No se encontró el archivo de configuración '${PATH_CONFIG_FILE}'. Este archivo es necesario y debe contener la sección 'compilerOptions.paths'.`,
                ),
            );
        } else {
            // Mostrar otros errores de lectura/parseo
            console.error(
                chalk.red(
                    `❌ Error al leer o parsear '${PATH_CONFIG_FILE}': ${error.message}`,
                ),
            );
        }
        process.exit(1); // Detener ejecución en cualquier caso de error del catch
    }
};

/**
 * Elimina un archivo o directorio en la ruta especificada.
 * @param {string} ruta - La ruta del archivo o directorio a eliminar.
 */
const deleteFile = async ruta => {
    const newPath = (
        await mapRuta(
            path
                .normalize(ruta)
                .replace(/\\/g, '/')
                .replace('.vue', '.js')
                .replace('.ts', '.js'),
            PATH_DIST,
            PATH_SOURCE,
        )
    ).toString();
    try {
        log(chalk.yellow(`🗑️ :Intentando eliminar ${newPath}`));

        const stats = await stat(newPath).catch(() => null);

        if (!stats) {
            log(
                chalk.yellow(
                    `⚠️ :El archivo o directorio no existe: ${newPath}`,
                ),
            );
            return { extension: null, normalizedPath: null, fileName: null };
        }

        if (stats.isDirectory()) {
            await rmdir(newPath, { recursive: true });
        } else if (stats.isFile()) {
            await unlink(newPath);
        }

        const dir = path.dirname(newPath);
        const files = await readdir(dir);
        if (files.length === 0) {
            await rmdir(dir);
        }

        return {
            extension: path.extname(newPath).replace('.', ''),
            normalizedPath: path.normalize(newPath),
            fileName: path.basename(newPath).replace('.js', ''),
        };

        log(chalk.gray(`✅ :Eliminación exitosa: ${newPath} \n`));
    } catch (errora) {
        error(
            chalk.red(
                `🚩 :Error al eliminar el archivo/directorio ${newPath}: ${errora.message}\n`,
            ),
        );
        return { extension: null, normalizedPath: null, fileName: null }; // Asegurar que se devuelve un objeto en caso de otros errores
    }
};

/**
 * Elimina la etiqueta "html" de una cadena de plantilla.
 * @param {string} data - La cadena de plantilla de la cual eliminar la etiqueta "html".
 * @returns {Promise<string>} - La cadena de plantilla modificada sin la etiqueta "html".
 */
const removehtmlOfTemplateString = async data => {
    const htmlRegExp = /html\s*`/g;

    data = data.replace(htmlRegExp, '`');

    //remove ""
    const htmlGetterRegExp = /,\s*get\s+html\(\)\s*{\s*return\s*html\s*}/g;
    data = data.replace(htmlGetterRegExp, '');

    return data;
};

/**
 * Reemplaza los alias de ruta en la cadena de datos proporcionada con sus valores correspondientes.
 * @param {string} data - La cadena de entrada que contiene el código con alias de ruta.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada con los alias de ruta reemplazados.
 */
const replaceAlias = async data => {
    const escapeRegExp = string =>
        string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const key in pathAlias) {
        const values = pathAlias[key];
        const escapedKey = escapeRegExp(key.replace('/*', ''));

        // Combinar patrones en una sola expresión regular (más eficiente)
        const aliasPattern = new RegExp(
            `import\\(\\s*['"]${escapedKey}|from\\s*['"]${escapedKey}|['"]${escapedKey}|import\\(\`\\${escapedKey}`,
            'g',
        );

        for (const value of values) {
            let replacement = value.replace('/*', '').replace('./', '/');
            replacement = replacement
                .replace(replacement, PATH_DIST)
                .replace('./', '/');

            data = data.replace(aliasPattern, match => {
                if (match.startsWith('import(`')) {
                    return `import(\`${replacement}`;
                } else if (match.startsWith('import(')) {
                    return `import('${replacement}`;
                } else if (match.startsWith('from ')) {
                    return `from '${replacement}`;
                } else {
                    return `'${replacement}`;
                }
            });
        }

        // Reemplazar './' con '/' (simplificado)
        data = data
            .replace(/import ['"]\.\//g, "import '/")
            .replace(/from ['"]\.\//g, "from '/");
    }

    return data;
};

/**
 * Reemplaza los alias de importación en la cadena de datos proporcionada con sus valores correspondientes.
 * @param {string} data - La cadena de entrada que contiene el código con alias de importación.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada con los alias de importación reemplazados.
 */
const replaceAliasImportsAsync = async data => {
    const importRegExp = /import\(['"](.*)['"]\)/g;
    const importList = data.match(importRegExp);

    if (importList) {
        for (const item of importList) {
            const importRegExp2 = /import\(['"](.*)['"]\)/;
            const result = item.match(importRegExp2);

            if (result) {
                const ruta = result[1];
                const newRuta = ruta.replace('@', PATH_DIST);
                const newImport = item
                    .replace(ruta, newRuta)
                    .replace('.vue', '.js')
                    .replace('.ts', '.js');
                data = data.replace(item, newImport);
            }
        }
    }
    return data;
};

/**
 * Elimina la declaración de importación para 'code-tag' de la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada sin la importación de 'code-tag'.
 */
const removeCodeTagImport = async data => {
    // remove import if exist code-tag
    const codeTagRegExp = /import\s+{.*}\s+from\s+['"].*code-tag.*['"];/g;
    data = data.replace(codeTagRegExp, '');
    return data;
};

/**
 * Elimina los comentarios con la etiqueta @preserve de la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada sin los comentarios @preserve.
 */
const removePreserverComent = async data => {
    const preserverRegExp =
        /\/\*[\s\S]*?@preserve[\s\S]*?\*\/|\/\/.*?@preserve.*?(?=\n|$)/g;
    data = data.replace(preserverRegExp, match =>
        match.replace(/@preserve/g, ''),
    );
    return data;
};

/**
 * Estandariza la cadena de datos proporcionada aplicando varias transformaciones.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @param {boolean} isVueComponent - Indica si el archivo es un componente Vue.
 * @returns {Promise<string|Object>} - Una promesa que se resuelve con la cadena estandarizada o un objeto con código y hmrDepsInfo.
 */
const estandarizaData = async (data, isVueComponent = false) => {
    let originalCodeForHmr = data;
    let hmrDepsInfo = null;
    let codeToProcess = originalCodeForHmr;

    // 1. Transformar con Acorn ANTES de modificar los imports a rutas de /dist
    // Esto es para que hmrDepsInfo se genere con las rutas de importación originales (fuente).
    if (!isProd) {
        const transformResult =
            await transformModuleWithAcorn(originalCodeForHmr);
        if (typeof transformResult === 'object' && transformResult.code) {
            codeToProcess = transformResult.code; // Código con placeholders, imports aún son rutas fuente/alias
            if (isVueComponent) {
                hmrDepsInfo = transformResult.hmrDepsInfo; // Capturar hmrDepsInfo solo si es un componente Vue
            }
        } else {
            codeToProcess = transformResult; // Caso antiguo o si no devuelve objeto
        }
    }

    // 2. Aplicar el resto de las transformaciones (incluyendo reemplazo de alias a /dist)
    // Si es producción y Acorn no corrió, codeToProcess sigue siendo originalCodeForHmr (igual a data).
    // Si es desarrollo, codeToProcess es el resultado de Acorn.
    if (isProd) {
        // En producción, Acorn no se ejecuta arriba, así que partimos de `data` original para estas transformaciones.
        // No necesitamos `removePreserverComent` si Acorn no corrió, ya que no se habrán añadido comentarios HMR.
        // Sin embargo, si `data` original tiene comentarios @preserve, deben quitarse.
        let prodCode = data; // Empezar con data original para producción
        prodCode = await removePreserverComent(prodCode);
        prodCode = await removehtmlOfTemplateString(prodCode);
        prodCode = await removeCodeTagImport(prodCode);
        prodCode = await replaceAlias(prodCode);
        prodCode = await replaceAliasImportsAsync(prodCode);
        prodCode = await addImportEndJs(prodCode);
        codeToProcess = prodCode;
    } else {
        // En desarrollo, codeToProcess ya es el resultado de Acorn (o el original si Acorn no hizo nada útil)
        // No aplicar removePreserverComent aquí si Acorn ya lo manejó o si no es relevante para HMR.
        codeToProcess = await removehtmlOfTemplateString(codeToProcess);
        codeToProcess = await removeCodeTagImport(codeToProcess);
        codeToProcess = await replaceAlias(codeToProcess);
        codeToProcess = await replaceAliasImportsAsync(codeToProcess);
        codeToProcess = await addImportEndJs(codeToProcess);
    }

    // Devolver el código final y hmrDepsInfo si es un componente Vue en desarrollo
    if (isVueComponent && hmrDepsInfo) {
        return { code: codeToProcess, hmrDepsInfo };
    }
    return codeToProcess;
};

/**
 * Compila un archivo JavaScript.
 * @param {string} source - La ruta del archivo fuente.
 * @param {string} destination - La ruta del archivo de destino.
 *
 * @returns {Promise<Object>} - Un objeto con información sobre la compilación.
 */
const compileJS = async (source, destination) => {
    try {
        const startTime = Date.now();
        const originalExtension = source.split('.').pop();
        const baseName = path.basename(destination, path.extname(destination));
        const finalFileName = baseName.endsWith('.js')
            ? baseName.slice(0, -3)
            : baseName;

        await log(chalk.blue(`🪄  :Iniciando compilación de ${source}`));

        let data = await readFile(source, 'utf-8');
        if (!data || data.trim().length === 0) {
            await error(
                chalk.yellow(
                    `⚠️ :Archivo fuente ${source} está vacío. No se procesará.`,
                ),
            );
            return {
                contentWasWritten: false,
                extension: originalExtension,
                normalizedPath: destination,
                fileName: finalFileName,
            };
        }

        let resultVue = null;
        if (originalExtension === 'vue') {
            vueFiles++;
            await log(chalk.green(`💚 :Precompilando VUE: ${source}`));
            resultVue = await preCompileVue(data, source, isProd);
            data = resultVue.data;
            if (resultVue.error !== null) {
                errorFiles++;
                errorList.push({
                    file: source,
                    error: resultVue.error.message,
                    proceso: 'Compilación Vue',
                });
                await error(
                    chalk.red(
                        `🚩 :Error durante la compilación Vue para ${source} :${resultVue.error}\n`,
                    ),
                );
                return {
                    contentWasWritten: false,
                    extension: originalExtension,
                    normalizedPath: destination,
                    fileName: finalFileName,
                };
            }
            destination = destination.replace('.vue', '.js');
        }

        if (originalExtension === 'ts' || resultVue?.lang === 'ts') {
            tsFiles++;
            await log(chalk.blue(`🔄️ :Precompilando TS: ${source}`));
            const Resultdata = await preCompileTS(
                data,
                path.basename(source),
                PATH_CONFIG_FILE,
            );
            if (Resultdata.error !== null) {
                errorFiles++;
                errorList.push({
                    file: source,
                    error: Resultdata.error.message,
                    proceso: 'Compilación TS',
                });
                await error(
                    chalk.red(
                        `🚩 :Error durante la compilación TS para ${source}: ${Resultdata.error}\n`,
                    ),
                );
                return {
                    contentWasWritten: false,
                    extension: originalExtension,
                    normalizedPath: destination,
                    fileName: finalFileName,
                };
            }
            destination = destination.replace('.ts', '.js');
            data = Resultdata.data;
        }

        let estandarizaResult = await estandarizaData(
            data,
            originalExtension === 'vue',
        );
        let hmrDepsInfo = null;

        if (typeof estandarizaResult === 'object' && estandarizaResult.code) {
            data = estandarizaResult.code;
            hmrDepsInfo = estandarizaResult.hmrDepsInfo; // Capturamos hmrDepsInfo
        } else {
            data = estandarizaResult; // Mantener compatibilidad si estandarizaData no devuelve objeto
        }

        // Si es un componente Vue y tenemos hmrDepsInfo, lo almacenamos en caché
        if (
            originalExtension === 'vue' &&
            hmrDepsInfo &&
            Object.keys(hmrDepsInfo).length > 0
        ) {
            serverComponentCache.set(source, {
                // Usamos la ruta original del .vue como clave
                jsWithPlaceholders: data, // Este es el JS del componente con los placeholders
                hmrDepsInfo: hmrDepsInfo,
            });
            console.log(
                chalk.cyan(
                    `📦 Componente Vue ${source} cacheado con información HMR de dependencias.`,
                ),
            );
        }

        await log(chalk.green(`🔍 :Validando Sintaxis para ${source}`));
        const resultAcorn = await checkSintaxysAcorn(data);
        if (resultAcorn.error !== null) {
            errorFiles++;
            errorList.push({
                file: source,
                error: resultAcorn.error.message,
                proceso: 'Validación Sintaxis',
            });
            await error(
                chalk.red(
                    `🚩 :Error de sintaxis Acorn para ${source}: ${resultAcorn.error.message}\n`,
                ),
            );
            return {
                contentWasWritten: false,
                extension: originalExtension,
                normalizedPath: destination,
                fileName: finalFileName,
            };
        }
        acornFiles++;

        let result = null;
        if (isProd) {
            await log(chalk.blue(`🤖 :Minificando ${source}`));
            result = await minifyJS(data, path.basename(source), isProd);
        } else {
            result = { code: data };
        }
        await log(chalk.green(`📝 :Intentando escribir ${destination}`));

        if (!result.code || result.code.trim().length === 0) {
            await error(
                chalk.yellow(
                    `⚠️ :Advertencia al compilar JS para ${source}: El archivo resultante está vacío. No se escribirá en disco.\n`,
                ),
            );
            return {
                contentWasWritten: false,
                extension: originalExtension,
                normalizedPath: destination,
                fileName: finalFileName,
            };
        } else {
            if (!isProd) {
                result.code = result.code.replaceAll('*/export', '*/\nexport');
            }
            const destinationDir = path.dirname(destination);
            await mkdir(destinationDir, { recursive: true });
            await writeFile(destination, result.code, 'utf-8');

            const endTime = Date.now();
            const elapsedTime = showTimingForHumans(endTime - startTime);
            await log(
                chalk.gray(
                    `✅ :Compilación exitosa para ${finalFileName} (${elapsedTime}) \n`,
                ),
            );
            successfulFiles++;
            return {
                contentWasWritten: true,
                extension: originalExtension,
                normalizedPath: destination,
                fileName: finalFileName,
            };
        }
    } catch (errora) {
        errorFiles++;
        const ext = source.split('.').pop() || 'unknown';
        const fName = path.basename(source, path.extname(source));
        errorList.push({
            file: source,
            error: errora.message,
            proceso: 'Compilación JS (Catch General)',
        });
        await error(
            chalk.red(
                `🚩 :Error catastrófico durante la compilación JS para ${source}: ${errora.message}\n`,
            ),
            errora.stack,
        );
        return {
            contentWasWritten: false,
            extension: ext,
            normalizedPath: destination || source,
            fileName: fName,
        };
    }
};

/**
 * Compila un archivo dado su ruta.
 * @param {string} path - La ruta del archivo a compilar.
 * @returns {Promise<Object>} - Un objeto con información sobre la compilación.
 */
const compile = async filePath => {
    if (!filePath || typeof filePath !== 'string') {
        console.error(
            chalk.red('⚠️ :Ruta inválida proporcionada a compile():', filePath),
        );
        return {
            contentWasWritten: false,
            extension: null,
            normalizedPath: filePath,
            fileName: null,
        };
    }
    if (filePath.includes('.d.ts')) {
        return {
            contentWasWritten: false,
            extension: 'd.ts',
            normalizedPath: filePath,
            fileName: path.basename(filePath),
        };
    }

    const normalizedPathSource = path.normalize(filePath).replace(/\\/g, '/');
    const sourceForDist = normalizedPathSource.startsWith('./')
        ? normalizedPathSource
        : `./${normalizedPathSource}`;
    const outputPath = sourceForDist.replace(PATH_SOURCE, PATH_DIST);
    const finalOutputJsPath = outputPath.replace(/\.(vue|ts)$/, '.js');

    console.log(
        chalk.green(`🔜 :Fuente para compilar: ${normalizedPathSource}`),
    );
    console.log(chalk.green(`🔚 :Destino potencial: ${finalOutputJsPath}`));

    if (outputPath) {
        return await compileJS(normalizedPathSource, finalOutputJsPath);
    } else {
        const ext = normalizedPathSource.split('.').pop() || null;
        const fName = path.basename(
            normalizedPathSource,
            path.extname(normalizedPathSource),
        );
        await log(
            chalk.yellow(
                `⚠️ :Tipo de archivo no reconocido o ruta de salida no determinada para: ${normalizedPathSource}, extensión: ${ext}`,
            ),
        );
        return {
            contentWasWritten: false,
            extension: ext,
            normalizedPath: finalOutputJsPath,
            fileName: fName,
        };
    }
};

/**
 * Emite cambios a través de BrowserSync.
 * @param {Object} bs - Instancia de BrowserSync.
 * @param {string} extension - Extensión del archivo.
 * @param {string} ruta - Ruta del archivo.
 * @param {string} fileName - Nombre del archivo.
 * @param {string} type - Tipo de cambio (add, change, delete).
 */
const emitirCambios = async (bs, extension, ruta, fileName, type) => {
    const serverRelativePath = path
        .normalize(ruta) // ruta es la ruta de SALIDA
        .replace(/^\\|^\//, '')
        .replace(/\\/g, '/');

    // Notificación original para vue:update (puede ser genérica o específica del componente)
    bs.sockets.emit('vue:update', {
        component: fileName, // Nombre del archivo que cambió (sin extensión si es de compileJS)
        timestamp: Date.now(),
        relativePath: serverRelativePath, // Ruta de salida relativa al servidor
        extension, // Extensión original del archivo fuente
        type,
    });
    console.log(
        `📡 : Emitiendo evento 'vue:update' para ${fileName} (${type}) -> ${serverRelativePath} \n`,
    );

    // Lógica para actualizar componentes Vue cacheados si una de sus dependencias JS cambia
    // ruta es la ruta de SALIDA del archivo que cambió (ej: public/js/helpers/util.js)
    if (serverComponentCache.size > 0 && ruta.endsWith('.js')) {
        const changedOutputFileNormalized = path.normalize(ruta);
        console.log(
            chalk.blueBright(
                `[HMR DEBUG] Archivo JS/TS modificado (salida): ${changedOutputFileNormalized}, extensión original del fuente: ${extension}`,
            ),
        );

        console.log(serverComponentCache);

        for (const [
            vueComponentPath,
            cachedData,
        ] of serverComponentCache.entries()) {
            // vueComponentPath es la ruta FUENTE del .vue
            console.log(
                chalk.blueBright(
                    `[HMR DEBUG] Verificando componente cacheado: ${vueComponentPath}`,
                ),
            );
            if (cachedData.hmrDepsInfo) {
                for (const depImportString in cachedData.hmrDepsInfo) {
                    // depImportString es como '@js/helper.js' o './util.js'
                    console.log(
                        chalk.blueBright(
                            `[HMR DEBUG]   Dependencia registrada en caché para ${vueComponentPath}: "${depImportString}"`,
                        ),
                    );

                    let resolvedSourcePath;
                    const depIsRelative = depImportString.startsWith('.');

                    if (depIsRelative) {
                        const vueComponentDirPath =
                            path.dirname(vueComponentPath);
                        resolvedSourcePath = path.resolve(
                            vueComponentDirPath,
                            depImportString,
                        );
                        console.log(
                            chalk.blueBright(
                                `[HMR DEBUG]     Ruta relativa. Resuelta a (ruta fuente): ${resolvedSourcePath}`,
                            ),
                        );
                    } else {
                        let pathAfterAlias = depImportString;
                        if (pathAlias) {
                            for (const aliasKey in pathAlias) {
                                const prefixToMatch = aliasKey.replace(
                                    '/*',
                                    '',
                                );
                                if (depImportString.startsWith(prefixToMatch)) {
                                    const aliasTargetBase = pathAlias[
                                        aliasKey
                                    ][0].replace('/*', '');
                                    // Asegurarse de que aliasTargetBase es un directorio completo desde la raíz del proyecto si es necesario
                                    // o relativo a PATH_SOURCE.
                                    // pathAlias normalmente define rutas relativas a baseUrl (que es PATH_SOURCE)
                                    const resolvedAliasTarget = path.resolve(
                                        PATH_SOURCE,
                                        aliasTargetBase,
                                    );
                                    pathAfterAlias = depImportString.replace(
                                        prefixToMatch,
                                        resolvedAliasTarget,
                                    );
                                    console.log(
                                        chalk.blueBright(
                                            `[HMR DEBUG]     Alias "${aliasKey}" (${prefixToMatch} -> ${resolvedAliasTarget}) aplicado. Ruta post-alias (base para resolver fuente): "${pathAfterAlias}"`,
                                        ),
                                    );
                                    break;
                                }
                            }
                        }
                        // Si después de los alias, la ruta no es absoluta, resolverla desde PATH_SOURCE
                        if (!path.isAbsolute(pathAfterAlias)) {
                            resolvedSourcePath = path.resolve(
                                PATH_SOURCE,
                                pathAfterAlias,
                            );
                        } else {
                            resolvedSourcePath = path.resolve(pathAfterAlias); // path.resolve normaliza la ruta si ya es absoluta
                        }
                        console.log(
                            chalk.blueBright(
                                `[HMR DEBUG]     Ruta con alias o absoluta. Resuelta a (ruta fuente): ${resolvedSourcePath}`,
                            ),
                        );
                    }

                    const absolutePathSourceDir = path.resolve(PATH_SOURCE);
                    if (!resolvedSourcePath.startsWith(absolutePathSourceDir)) {
                        console.log(
                            chalk.yellow(
                                `[HMR DEBUG]     Dependencia resuelta ${resolvedSourcePath} no está dentro de ${absolutePathSourceDir}. Saltando.`,
                            ),
                        );
                        continue;
                    }

                    const relativePathFromSourceDir = path.relative(
                        absolutePathSourceDir,
                        resolvedSourcePath,
                    );
                    const finalRelativePathForOutput =
                        relativePathFromSourceDir.replace(
                            /\.(ts|vue)$/i,
                            '.js',
                        );
                    const expectedOutputDepPath = path.join(
                        PATH_DIST,
                        finalRelativePathForOutput,
                    );
                    const normalizedExpectedOutputDepPath = path.normalize(
                        expectedOutputDepPath,
                    );

                    console.log(
                        chalk.blueBright(
                            `[HMR DEBUG]     Ruta de SALIDA ESPERADA para esta dependencia: ${normalizedExpectedOutputDepPath}`,
                        ),
                    );

                    if (
                        normalizedExpectedOutputDepPath ===
                        changedOutputFileNormalized
                    ) {
                        console.log(
                            chalk.magenta(
                                `[HMR] ¡COINCIDENCIA! Componente "${vueComponentPath}" depende del archivo modificado "${depImportString}".`,
                            ),
                        );

                        const placeholder =
                            cachedData.hmrDepsInfo[depImportString];
                        let newTimestampedJs = cachedData.jsWithPlaceholders;
                        newTimestampedJs = newTimestampedJs.replace(
                            placeholder,
                            `t=${Date.now()}`,
                        );

                        serverComponentCache.set(vueComponentPath, {
                            ...cachedData,
                            jsWithPlaceholders: newTimestampedJs,
                        });
                        console.log(
                            chalk.magenta(
                                `   Actualizado placeholder en caché para "${vueComponentPath}".`,
                            ),
                        );

                        const vueComponentDistPath = (
                            await mapRuta(
                                vueComponentPath,
                                PATH_DIST,
                                PATH_SOURCE,
                            )
                        ).replace(/\.vue$/i, '.js');
                        console.log(
                            chalk.blue(
                                `📢 Notificando HMR para componente Vue afectado: ${vueComponentDistPath} (debido a cambio en ${depImportString})`,
                            ),
                        );
                        bs.sockets.emit('hmr:versaVueComponentUpdate', {
                            path: vueComponentDistPath,
                        });
                    } else {
                        // console.log(chalk.gray(`[HMR DEBUG]     No hay coincidencia: ${normalizedExpectedOutputDepPath} !== ${changedOutputFileNormalized}`));
                    }
                }
            }
        }
    }

    // Lógica HMR existente para otros archivos JS o Vue directamente modificados
    if (bs) {
        if (path.extname(ruta) === '.css') {
            // ruta es la ruta de SALIDA
            bs.reload('*css');
        } else {
            // Esta notificación es para el archivo que cambió directamente.
            // Si el archivo que cambió era una dependencia JS de un componente Vue,
            // el componente Vue ya habrá sido notificado para recargarse (con el nuevo timestamp para la dep).
            console.log(
                chalk.blue(
                    `📢 Notificando HMR genérico para: ${serverRelativePath}`,
                ),
            );
            bs.sockets.emit('hmr:versa', { path: serverRelativePath }); // Usar serverRelativePath para consistencia con cliente
        }
    }
};

async function generateTailwindCSS(_filePath = null) {
    if (!tailwindcss) {
        return;
    }
    return new Promise((resolve, reject) => {
        console.log('Compilando TailwindCSS...');
        exec(
            `npx tailwindcss -i ${tailwindcss.inputCSS} -o ${tailwindcss.outputCSS}`,
            (err, stdout, stderr) => {
                if (err) {
                    console.error('Error al compilar Tailwind:', stderr);
                    return reject(err);
                }
                console.log('Tailwind actualizado:', stdout);
                resolve();
            },
        );
    });
}

/**
 * Compila todos los archivos en los directorios de origen.
 */
const compileAll = async () => {
    try {
        pathAlias = await getPathAlias();
        const beginTime = Date.now();

        console.log(chalk.green('🔄️ :Compilando todos los archivos...'));
        await generateTailwindCSS();

        console.log(chalk.blue('🔍 :Validando Linting'));
        const resultLinter = await linter(PATH_SOURCE);
        if (resultLinter.error) {
            errorFiles = resultLinter.errorFiles;
            errorList.push(...resultLinter.errorList);
        }

        for await (const file of glob([
            watchJS,
            watchVue,
            watchTS,
            excludeFile,
        ])) {
            await compile(file.startsWith('./') ? file : `./${file}`);
        }

        const endTime = Date.now();

        console.log(chalk.green('🔄️ :Resumen de compilación:'));
        console.log(chalk.green(`isAll: ${isAll}`));
        console.log(chalk.green(`isProd: ${isProd}`));

        console.log(
            chalk.green(
                `Tiempo total: ${showTimingForHumans(endTime - beginTime)}`,
            ),
        );
        console.table([
            {
                Tipo: 'Archivos Vue',
                Exitosos: vueFiles,
                'Con Error': errorList.filter(e => e.file.endsWith('.vue'))
                    .length,
            },
            {
                Tipo: 'Archivos TypeScript',
                Exitosos: tsFiles,
                'Con Error': errorList.filter(e => e.file.endsWith('.ts'))
                    .length,
            },
            {
                Tipo: 'Validación Sintaxis',
                Exitosos: acornFiles,
                'Con Error': errorList.filter(e => e.error.includes('Acorn'))
                    .length,
            },
            {
                Tipo: '-------------------',
                Exitosos: '-------------------',
                'Con Error': '-------------------',
            },
            {
                Tipo: 'Total',
                Exitosos: successfulFiles,
                'Con Error': errorFiles,
            },
        ]);

        if (errorFiles > 0) {
            console.log(chalk.red('🔄️ :Lista de archivos con errores:'));
            console.table(
                errorList.map(({ file, error, proceso }) => ({
                    Archivo: file,
                    Error: error,
                    Proceso: proceso,
                })),
            );
        }
    } catch (errora) {
        error(chalk.red('🚩 :Error durante la compilación inicial:'), errora);
    }
};

/**
 * Inicializa el proceso de compilación y observación de archivos.
 */
const initChokidar = async () => {
    try {
        pathAlias = await getPathAlias();
        log(
            chalk.green(
                `👀 :Observando ${[watchJS, watchVue, watchTS].join(', ')}\n`,
            ),
        );

        // Compilación inicial de componentes Vue para HMR en modo desarrollo
        (async () => {
            if (!isProd && !isAll) {
                log(
                    chalk.cyanBright(
                        '⚙️  Compilando componentes Vue iniciales para HMR...',
                    ),
                );
                try {
                    const vueFilePattern = `${PATH_SOURCE}/**/*.vue`;
                    const vueFiles = await glob(vueFilePattern);

                    if (vueFiles && vueFiles.length > 0) {
                        await Promise.all(
                            vueFiles.map(filePath => compile(filePath)),
                        );
                        log(
                            chalk.greenBright(
                                '✅ Componentes Vue iniciales compilados y HMR deps cacheados.',
                            ),
                        );
                    } else {
                        log(
                            chalk.yellow(
                                'ℹ️ No se encontraron archivos Vue para la compilación HMR inicial.',
                            ),
                        );
                    }
                } catch (error) {
                    log(
                        chalk.red(
                            '❌ Error durante la compilación HMR inicial de componentes Vue:',
                        ),
                        error,
                    );
                }
            }
        })();

        // Inicializar chokidar
        const watcher = chokidar.watch(PATH_SOURCE, {
            persistent: true,
            ignoreInitial: true,
            recursive: true,
            ignored: /\.(?!js$|vue$|ts$).+$/,
        });

        console.log(watcher.getWatched());

        // Evento cuando se añade un archivo
        watcher.on('add', async filePath => {
            await generateTailwindCSS(filePath);
            const result = await compile(
                path.normalize(filePath).replace(/\\/g, '/'),
            );
            if (result && result.contentWasWritten) {
                emitirCambios(
                    bs,
                    result.extension,
                    result.normalizedPath,
                    result.fileName,
                    'add',
                );
            } else {
                console.log(
                    chalk.yellow(
                        `[HMR] No se emite evento para archivo nuevo no escrito o vacío: ${filePath}. Razón: contentWasWritten es false o resultado inválido.`,
                    ),
                );
            }
        });

        // Evento cuando se modifica un archivo
        watcher.on('change', async ruta => {
            console.log(chalk.yellow(`\n🔄 Archivo modificado: ${ruta}`));
            // Invalidar caché si el archivo .vue original cambia
            if (ruta.endsWith('.vue')) {
                const normalizedVuePath = path.normalize(ruta);
                if (serverComponentCache.has(normalizedVuePath)) {
                    serverComponentCache.delete(normalizedVuePath);
                    console.log(
                        chalk.magenta(
                            `🗑️ Caché invalidada para ${normalizedVuePath} debido a modificación directa.`,
                        ),
                    );
                }
            }
            // Recompilar el archivo modificado
            const normalizedRuta = path.normalize(ruta).replace(/\\/g, '/');
            const result = await compile(normalizedRuta);

            if (result && result.contentWasWritten) {
                // Emitir cambios si la compilación fue exitosa y se escribió contenido
                emitirCambios(
                    bs,
                    result.extension,
                    result.normalizedPath, // Ruta al archivo en /dist
                    result.fileName,
                    'change', // Tipo de evento
                );
            } else {
                console.log(
                    chalk.yellow(
                        `[HMR] No se emite evento para archivo modificado no escrito o vacío: ${ruta}. Razón: contentWasWritten es false o resultado inválido.`,
                    ),
                );
            }
        });

        // Evento cuando se elimina un archivo
        watcher.on('unlink', async ruta => {
            console.log(chalk.red(`\n🗑️ Archivo eliminado: ${ruta}`));
            // Invalidar caché si el archivo .vue original se elimina
            if (ruta.endsWith('.vue')) {
                const normalizedVuePath = path.normalize(ruta);
                if (serverComponentCache.has(normalizedVuePath)) {
                    serverComponentCache.delete(normalizedVuePath);
                    console.log(
                        chalk.magenta(
                            `🗑️ Caché invalidada para ${normalizedVuePath} debido a eliminación.`,
                        ),
                    );
                }
            }
            const { extension, normalizedPath, fileName } = await deleteFile(
                path.normalize(ruta).replace(/\\/g, '/'),
            );
            emitirCambios(bs, extension, normalizedPath, fileName, 'delete');
        });

        // Manejar la señal de interrupción (Ctrl+C)
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('🛑 :Proceso interrumpido.'));

            //detener el servidor de desarrollo
            bs.exit();

            await watcher.close();
            log(chalk.yellow('👋 :Watcher cerrado.'));

            process.exit(0);
        });

        bs = browserSync.create();
        const port = await getPort({ port: 3000 });
        const uiPort = await getPort({ port: 4000 });

        let proxy = {
            server: './',
        };
        if (proxyUrl !== '') {
            proxy = {
                proxy: proxyUrl,
            };
        }

        bs.init({
            ...proxy,
            files: ['./public/**/*.css'], // Observa cambios en archivos CSS
            injectChanges: true, // Inyecta CSS sin recargar la página
            open: false, // No abre automáticamente el navegador
            port, // Puerto aleatorio para BrowserSync
            ui: {
                port: uiPort, // Puerto aleatorio para la interfaz de usuario
            },
            socket: {
                // domain: `localhost:${port}`, // Dominio para la conexión de socket
                path: '/browser-sync/socket.io', // Ruta correcta para socket.io
            },
            snippetOptions: {
                rule: {
                    match: /<\/body>/i,
                    fn: (snippet, match) => {
                        console.log(
                            '🟢 Inyectando snippet de BrowserSync y vueLoader.js en el HTML',
                        );
                        return `${snippet}${match}
                        <script type="module" src="/__versa/vueLoader.js"></script>
                        `;
                    },
                },
            },
            logLevel: 'debug',
            logPrefix: 'BS',
            logConnections: true,
            logFileChanges: true,
            watchEvents: ['change', 'add', 'unlink', 'addDir', 'unlinkDir'],
            reloadDelay: 500,
            reloadDebounce: 500,
            reloadOnRestart: true,
            notify: true,
            watchOptions: {
                ignoreInitial: true,
                ignored: ['node_modules', '.git'],
            },
            middleware: [
                async function (req, res, next) {
                    // para evitar el error de CORS
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', '*');
                    res.setHeader('Access-Control-Allow-Headers', '*');
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.setHeader('Access-Control-Max-Age', '3600');

                    if (req.url.endsWith('.js')) {
                        res.setHeader(
                            'Cache-Control',
                            'no-cache, no-store, must-revalidate',
                        );
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                    }

                    //para redigir a la ubicación correcta
                    if (req.url === '/__versa/vueLoader.js') {
                        // Busca vueLoader.js en la carpeta de salida configurada
                        const vueLoaderPath = path.join(
                            __dirname,
                            'services/vueLoader.js',
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await readFile(
                                vueLoaderPath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `🚩 :Error al leer el archivo ${vueLoaderPath}: ${error.message}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// vueLoader.js not found');
                        }
                        return;
                    }
                    // Si la URL comienza con /__versa/hrm/, sirve los archivos de dist/hrm
                    if (req.url.startsWith('/__versa/hrm/')) {
                        // Sirve archivos de dist/hrm como /__versa/hrm/*
                        const filePath = path.join(
                            __dirname,
                            req.url.replace('/__versa/', ''),
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await readFile(
                                filePath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `🚩 :Error al leer el archivo ${filePath}: ${error.message}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// Not found');
                        }
                        return;
                    }

                    // detectar si es un archivo estático, puede que contenga un . y alguna extensión o dashUsers.js?v=1746559083866
                    const isAssets = req.url.match(
                        /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|json|html|xml|txt|pdf|zip|mp4|mp3|wav|ogg)(\?.*)?$/i,
                    );
                    if (req.method === 'GET') {
                        // omitir archivos estáticos sólo si AssetsOmit es true
                        if (isAssets && !AssetsOmit) {
                            console.log(
                                chalk.white(
                                    `${new Date().toLocaleString()} :GET: ${req.url}`,
                                ),
                            );
                        } else if (!isAssets) {
                            console.log(
                                chalk.cyan(
                                    `${new Date().toLocaleString()} :GET: ${req.url}`,
                                ),
                            );
                        }
                    } else if (req.method === 'POST') {
                        console.log(
                            chalk.blue(
                                `${new Date().toLocaleString()} :POST: ${req.url}`,
                            ),
                        );
                    } else if (req.method === 'PUT') {
                        console.log(
                            chalk.yellow(
                                `${new Date().toLocaleString()} :PUT: ${req.url}`,
                            ),
                        );
                    } else if (req.method === 'DELETE') {
                        console.log(
                            chalk.red(
                                `${new Date().toLocaleString()} :DELETE: ${req.url}`,
                            ),
                        );
                    } else {
                        console.log(
                            chalk.gray(
                                `${new Date().toLocaleString()} :${req.method}: ${req.url}`,
                            ),
                        );
                    }

                    res.setHeader(
                        'Cache-Control',
                        'no-cache, no-store, must-revalidate',
                    );
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');

                    // Aquí podrías, por ejemplo, escribir estos logs en un archivo o base de datos
                    next();
                },
                async function (req, res, next) {
                    const requestedPath = path.join(
                        PATH_DIST,
                        req.url.split('?')[0],
                    ); // Eliminar query params para la búsqueda
                    let originalVuePath = null;
                    for (const vuePath of serverComponentCache.keys()) {
                        const distJsPathString = await mapRuta(
                            vuePath,
                            PATH_DIST,
                            PATH_SOURCE,
                        );
                        const distJsPath = distJsPathString.replace(
                            '.vue',
                            '.js',
                        );
                        if (
                            path.normalize(requestedPath) ===
                            path.normalize(distJsPath)
                        ) {
                            originalVuePath = vuePath;
                            break;
                        }
                    }

                    if (
                        originalVuePath &&
                        serverComponentCache.has(originalVuePath)
                    ) {
                        const cachedEntry =
                            serverComponentCache.get(originalVuePath);
                        console.log(
                            chalk.greenBright(
                                `📦 Sirviendo desde caché HMR: ${req.url}`,
                            ),
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        res.end(cachedEntry.jsWithPlaceholders); // Servir el JS con timestamps actualizados
                        return;
                    }
                    next();
                },
            ],
        });
        console.log(
            '🟢 BrowserSync inicializado. Esperando conexiones de socket...',
        );
    } catch (error) {
        console.error(
            chalk.red('🚩 :Error al iniciar:'),
            error,
            error.fileName,
            error.lineNumber,
            error.stack,
        );
    }
};

if (isAll) {
    console.log(chalk.green('🔄️ :Compilando todos los archivos...'));
    compileAll();
} else initChokidar();
