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

import { checkSintaxysAcorn } from './services/acorn.js';
import { linter } from './services/linter.js';
import { minifyJS } from './services/minify.js';
import { preCompileTS } from './services/typescript.js';
import { preCompileVue } from './services/vuejs.js';

import { mapRuta, showTimingForHumans } from './utils/utils.js';

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
        log(chalk.yellow(`🗑️ :Eliminando ${newPath}`));

        const stats = await stat(newPath);
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
                `🚩 :Error al eliminar el archivo/directorio ${newPath}: ${errora}\n`,
            ),
        );
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
 * Agrega la extensión .js a las importaciones en la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada con las importaciones actualizadas.
 */
const addImportEndJs = async data => {
    const importRegExp = /import\s+[\s\S]*?\s+from\s+['"].*['"];/g;

    return data.replace(importRegExp, match => {
        const ruta = match.match(/from\s+['"](.*)['"];/)[1];

        if (ruta.endsWith('.vue')) {
            const resultVue = match.match(/from\s+['"](.+\/(\w+))\.vue['"];/);
            if (resultVue) {
                const fullPath = resultVue[1].replace('.vue', '');
                const fileName = resultVue[2];
                return `import ${fileName} from '${fullPath}.js';`;
            }
        } else if (
            !ruta.endsWith('.js') &&
            !ruta.endsWith('.mjs') &&
            !ruta.endsWith('.css') &&
            ruta.includes('/')
        ) {
            return match.replace(ruta, `${ruta}.js`);
        }

        return match; // Devolver el match original si no se cumple ninguna condición
    });
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
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena estandarizada.
 */
const estandarizaData = async data => {
    if (isProd) {
        data = await removePreserverComent(data);
    }
    data = await removehtmlOfTemplateString(data);
    data = await removeCodeTagImport(data);
    data = await replaceAlias(data);
    data = await replaceAliasImportsAsync(data);
    data = await addImportEndJs(data);

    return data;
};

/**
 * Compila un archivo JavaScript.
 * @param {string} source - La ruta del archivo fuente.
 * @param {string} destination - La ruta del archivo de destino.
 *
 * @returns {Promise<void>} - Una promesa que se resuelve después de la compilación.
 */
const compileJS = async (source, destination) => {
    try {
        const startTime = Date.now(); // optener la hora actual

        const filename = path.basename(source);
        await log(chalk.blue(`🪄  :start compilation`));

        let data = await readFile(source, 'utf-8');
        if (!data) {
            await error(chalk.yellow('⚠️ :Archivo vacío\n'));
            return;
        }

        const extension = source.split('.').pop();
        let resultVue = null;
        if (extension === 'vue') {
            vueFiles++;
            await log(chalk.green(`💚 :Pre Compile VUE`));
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
                        `🚩 :Error durante la compilación Vue :${resultVue.error}\n`,
                    ),
                );
                return;
            }
            destination = destination.replace('.vue', '.js');
        }

        if (extension === 'ts' || resultVue?.lang === 'ts') {
            tsFiles++;
            await log(chalk.blue(`🔄️ :Pre Compilando TS`));
            const Resultdata = await preCompileTS(
                data,
                filename,
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
                        `🚩 :Error durante la compilación TS: ${Resultdata.error}\n`,
                    ),
                );
                return;
            }
            destination = destination.replace('.ts', '.js');
            data = Resultdata.data;
        }

        data = await estandarizaData(data);

        // await writeFile(`${destination}-temp.js`, data, 'utf-8');

        await log(chalk.green(`🔍 :Validando Sintaxis`));
        const resultAcorn = await checkSintaxysAcorn(data);
        if (resultAcorn.error !== null) {
            errorFiles++;
            errorList.push({
                file: source,
                error: resultAcorn.error.message,
                proceso: 'Validación Sintaxis',
            });
            return;
        }
        acornFiles++;

        let result = null;
        if (isProd) {
            await log(chalk.blue(`🤖 :minifying`));
            result = await minifyJS(data, filename, isProd);
        } else {
            result = { code: data };
        }
        await log(chalk.green(`📝 :Escribiendo ${destination}`));

        if (result.code.length === 0) {
            await error(
                chalk.yellow(
                    '⚠️ :Warning al compilar JS: El archivo está vacío\n',
                ),
            );
            await unlink(destination);
        } else {
            if (!isProd) {
                result.code = result.code.replaceAll('*/export', '*/\nexport');
                result.code = result.code.replaceAll('*/export', '*/\nexport');
            }
            const destinationDir = path.dirname(destination);
            await mkdir(destinationDir, { recursive: true });
            await writeFile(destination, result.code, 'utf-8');

            const endTime = Date.now();
            const elapsedTime = showTimingForHumans(endTime - startTime);
            await log(
                chalk.gray(`✅ :Compilación exitosa (${elapsedTime}) \n`),
            );
            successfulFiles++;
        }
    } catch (errora) {
        errorFiles++;
        errorList.push({
            file: source,
            error: errora.message,
            proceso: 'Compilación JS',
        });
        await error(
            chalk.red(`🚩 :Error durante la compilación JS: ${errora}\n`),
            errora,
        );
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
 * Compila un archivo dado su ruta.
 * @param {string} path - La ruta del archivo a compilar.
 */
const compile = async filePath => {
    if (!filePath || typeof filePath !== 'string') {
        console.error(chalk.red('⚠️ :Ruta inválida:', filePath));
        return;
    }
    if (filePath.includes('.d.ts')) {
        return;
    }
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/'); // Normalizar la ruta para que use barras inclinadas hacia adelante
    const filePathForReplate = `./${normalizedPath}`;
    const outputPath = filePathForReplate.replace(PATH_SOURCE, PATH_DIST);
    const outFileJs = outputPath.replace('.ts', '.js').replace('.vue', '.js');

    console.log(chalk.green(`🔜 :Source ${filePathForReplate}`));
    console.log(chalk.green(`🔚 :destination ${outFileJs}`));

    const extension = normalizedPath.split('.').pop();
    //sólo el filename sin extesion
    const fileName = path
        .basename(normalizedPath)
        .replace('.vue', '')
        .replace('.ts', '')
        .replace('.js', '');

    if (outputPath) {
        await compileJS(normalizedPath, outputPath);
    } else {
        await log(chalk.yellow(`⚠️ :Tipo no reconocido: ${extension}`));
    }
    return { extension, normalizedPath: path.normalize(outFileJs), fileName };
};

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

const emitirCambios = async (bs, extension, normalizedPath, fileName, type) => {
    bs.sockets.emit('vue:update', {
        component: fileName,
        timestamp: Date.now(),
        relativePath: normalizedPath,
        extension,
        type,
    });
    console.log(`📡 : Emitiendo evento 'vue:update' para ${fileName} \n`);
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
            const { extension, normalizedPath, fileName } = await compile(
                path.normalize(filePath).replace(/\\/g, '/'),
            );
            emitirCambios(bs, extension, normalizedPath, fileName, 'add');
        });

        // Evento cuando se modifica un archivo
        watcher.on('change', async filePath => {
            await generateTailwindCSS(filePath);
            const { extension, normalizedPath, fileName } = await compile(
                path.normalize(filePath).replace(/\\/g, '/'),
            );
            emitirCambios(bs, extension, normalizedPath, fileName, 'change');
        });

        // Evento cuando se elimina un archivo
        watcher.on('unlink', async filePath => {
            await generateTailwindCSS();
            const { extension, normalizedPath, fileName } = await deleteFile(
                path.normalize(filePath).replace(/\\/g, '/'),
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
                domain: `localhost:${port}`, // Mismo puerto que arriba
                path: '/browser-sync/socket.io', // Ruta correcta para socket.io
            },
            snippetOptions: {
                rule: {
                    match: /<\/body>/i,
                    fn: (snippet, match) => `${snippet}${match}`,
                },
            },
            logLevel: 'debug',
            logPrefix: 'BS',
            logConnections: true,
            logFileChanges: true,
            watchEvents: ['change', 'add', 'unlink', 'addDir', 'unlinkDir'],
            reloadDelay: 500,
            reloadDebounce: 500,
            notify: true,
            watchOptions: {
                ignoreInitial: true,
                ignored: ['node_modules', '.git'],
            },
            middleware: function (req, res, next) {
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
        });
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
