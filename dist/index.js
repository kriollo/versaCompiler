import * as Parser from 'acorn';
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
import { minify } from 'terser';
import * as ts from 'typescript';
import * as vCompiler from 'vue/compiler-sfc';

const log = console.log.bind(console);
const error = console.error.bind(console);

let bs = null;

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

let tailwindcss = null;
let proxyUrl = '';

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

let totalFiles = 0;
let vueFiles = 0;
let tsFiles = 0;
let acornFiles = 0;
let successfulFiles = 0;
let errorFiles = 0;
const errorList = [];

/**
 * Converts a 24-hour time string to a 12-hour time string with AM/PM.
 *
 * @param {number} timing - The value of the timing en miliseconds.
 * @returns {string} the timing in ms, seconds, minutes or hours.
 */
export const showTimingForHumans = timing => {
    if (timing < 1000) {
        return `${timing} ms`;
    } else if (timing < 60000) {
        return `${timing / 1000} s`;
    } else if (timing < 3600000) {
        return `${timing / 60000} min`;
    } else {
        return `${timing / 3600000} h`;
    }
};

/**
 * Obtiene los alias de ruta desde el archivo tsconfig.json.
 * @returns {Promise<Object>} - Un objeto con los alias de ruta.
 */
const getPathAlias = async () => {
    try {
        const data = await readFile(PATH_CONFIG_FILE, { encoding: 'utf-8' });
        if (!data) {
            error(chalk.red('🚩 :Error al leer el archivo tsconfig.json'));
            return;
        }

        const tsConfig = JSON.parse(data);
        pathAlias = tsConfig.compilerOptions.paths || {};
        log(chalk.green(`pathAlias: ${JSON.stringify(pathAlias)}`));

        tailwindcss = tsConfig.tailwindcss || false;

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
        console.error(chalk.red(`Error en getPathAlias: ${error.message}`));
        // Puedes decidir si quieres lanzar el error o retornar un valor por defecto
        // throw error;
        return {}; // Retornar objeto vacío para evitar errores posteriores
    }
};

/**
 * Mapea una ruta de origen a una ruta de destino en el directorio de distribución.
 * @param {string} ruta - La ruta de origen.
 * @returns {Promise<string>} - La ruta mapeada en el directorio de distribución.
 */
const mapRuta = async ruta =>
    path.join(PATH_DIST, path.relative(PATH_SOURCE, ruta));

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
 * Compila un bloque personalizado.
 * @param {Object} block - El bloque personalizado a compilar.
 * @param {string} source - La fuente del bloque.
 */
const compileCustomBlock = async (block, source) => {};

/**
 * Precompila el código TypeScript proporcionado.
 * @param {string} data - El código TypeScript a precompilar.
 * @param {string} fileName - El nombre del archivo que contiene el código TypeScript.
 *
 * @returns {Promise<Object>} - Un objeto con el código precompilado o un error.
 */
const preCompileTS = async (data, fileName) => {
    try {
        // Leer tsconfig.json
        const tsConfigContent = await readFile(PATH_CONFIG_FILE, 'utf-8');
        if (!tsConfigContent) {
            throw new Error(
                `No se pudo leer el archivo tsconfig.json en: ${PATH_CONFIG_FILE}`,
            );
        }

        const tsConfig = JSON.parse(tsConfigContent);

        // Obtener las opciones del compilador
        const { compilerOptions } = tsConfig;

        if (!compilerOptions) {
            throw new Error(
                'No se encontraron compilerOptions en tsconfig.json',
            );
        }

        // Crear host de configuración de parseo
        const parseConfigHost = {
            useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
            readDirectory: ts.sys.readDirectory,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            onUnRecoverableConfigFileDiagnostic: diagnostic => {
                throw new Error(
                    ts.flattenDiagnosticMessageText(
                        diagnostic.messageText,
                        '\n',
                    ),
                );
            },
        };

        // Parsear la configuración para que TS la entienda
        const parsedConfig = ts.parseJsonConfigFileContent(
            tsConfig,
            parseConfigHost,
            path.dirname(PATH_CONFIG_FILE),
        );
        if (parsedConfig.errors.length) {
            const errors = parsedConfig.errors.map(diagnostic =>
                ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
            );
            throw new Error(
                `Error al parsear tsconfig.json:\n${errors.join('\n')}`,
            );
        }

        // Transpilar el código
        const result = ts.transpileModule(data, {
            compilerOptions: parsedConfig.options,
            reportDiagnostics: true,
            fileName,
        });
        if (result.diagnostics && result.diagnostics.length > 0) {
            const errors = result.diagnostics.map(diagnostic => {
                if (diagnostic.file) {
                    const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(
                            diagnostic.start,
                        );
                    return `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')} - ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
                } else {
                    return `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
                }
            });

            throw new Error(`${errors.join('\n')}`);
        }

        return { error: null, data: result.outputText };
    } catch (error) {
        return { error, data: null };
    }
};

const getComponentsVue = async data => {
    let components = [];

    const importRegExp = /import\s+[\s\S]*?\s+from\s+['"].*['"];/g;

    const a = data.replace(importRegExp, match => {
        const ruta = match.match(/from\s+['"](.*)['"];/)[1];

        if (ruta.endsWith('.vue')) {
            const resultVue = match.match(/from\s+['"](.+\/(\w+))\.vue['"];/);
            if (resultVue) {
                const fullPath = resultVue[1].replace('.vue', '');
                const fileName = resultVue[2];
                components.push(fileName);
                return `import ${fileName} from '${fullPath}.js';`;
            }
        }
        return match; // Devolver el match original si no se cumple ninguna condición
    });

    return components;
};

/**
 * Precompila un componente Vue.
 * @param {string} data - El código del componente Vue.
 * @param {string} source - La fuente del componente Vue.
 * @returns {Promise<Object>} - Un objeto con el código precompilado o un error.
 */
const preCompileVue = async (data, source) => {
    try {
        const fileName = path.basename(source).replace('.vue', '');
        const { descriptor, errors } = vCompiler.parse(data, {
            filename: fileName,
            sourceMap: false,
            sourceRoot: path.dirname(source),
        });

        if (errors.length) {
            throw new Error(
                `Error al analizar el componente Vue ${source}:\n${errors.map(e => e.message).join('\n')}`,
            );
        }

        const id = Math.random().toString(36).slice(2, 12);
        const scopeId = descriptor.styles.some(s => s.scoped)
            ? `data-v-${id}`
            : null;
        const templateOptions = {
            sourceMap: false,
            filename: `${fileName}.vue`,
            id,
            scoped: !!scopeId,
            slotted: descriptor.slotted,
            source: descriptor.template?.content,
            comments: isProd ? false : 'all',
            isProd,
            compilerOptions: {
                scopeId,
                mode: 'module',
                isProd,
                inlineTemplate: true,
                prefixIdentifiers: true,
                hoistStatic: true,
                cacheHandlers: true,
                runtimeGlobalName: 'Vue',
                runtimeModuleName: 'vue',
                optimizeBindings: true,
                runtimeContextBuiltins: true,
                runtimeDirectives: true,
                runtimeVNode: true,
                runtimeProps: true,
                runtimeSlots: true,
                runtimeComponents: true,
                runtimeCompiledRender: true,
                whitespace: 'condense',
                ssrCssExternal: true,
                ssr: false,
                nodeTransforms: [],
                directiveTransforms: {},
            },
        };

        // Compile script
        let compiledScript;
        if (descriptor.script || descriptor.scriptSetup) {
            const scriptDescriptor =
                descriptor.script || descriptor.scriptSetup;

            compiledScript = {
                content: descriptor.script
                    ? scriptDescriptor.content
                    : vCompiler.compileScript(descriptor, {
                          id,
                          templateOptions,
                      }).content,
                lang:
                    scriptDescriptor.lang === 'ts' ||
                    scriptDescriptor.lang === 'typescript'
                        ? 'ts'
                        : 'js',
            };
        } else {
            compiledScript = { content: `export default {}`, lang: 'js' };
        }

        // Compile template y obtener el contenido del template
        const compiledTemplate = descriptor.template?.content // Usar optional chaining
            ? vCompiler.compileTemplate({
                  ...templateOptions,
              })
            : { code: '' }; // Manejar caso sin template
        if (!descriptor.template?.content) {
            console.warn(
                chalk.yellow(
                    `Advertencia: El componente Vue ${source} no tiene una sección de plantilla.`,
                ),
            );
        }

        let customBlocks = '';
        if (descriptor.customBlocks.length > 0) {
            // eliminar el ultimo caracter que es un punto y coma
            customBlocks =
                descriptor?.customBlocks[0].content.slice(0, -1) ?? '';
        }

        // Compile styles Y obtener el contenido de los estilos
        const compiledStyles = descriptor.styles.map(style =>
            vCompiler.compileStyle({
                id,
                source: style.content,
                scoped: style.scoped,
                preprocessLang: style.lang,
                isProd,
                trim: true,
                filename: `${fileName}.vue`,
            }),
        );

        const insertStyles = compiledStyles.length
            ? `(function(){
                    let styleTag = document.createElement('style');
                    styleTag.setAttribute('data-v-${id}', '');
                    styleTag.innerHTML = \`${compiledStyles.map(s => s.code).join('\n')}\`;
                    document.head.appendChild(styleTag);
                })();`
            : '';

        // Combine all parts into a single module
        let output = `
            ${insertStyles}
            ${compiledScript.content}
            ${compiledTemplate.code}
        `;
        //añardir instancia de app
        const appImport = `import { app } from '@/dashboard/js/vue-instancia.js';`;
        // output = `${appImport}${output}`;

        const componentName = `${fileName}_component`;
        const components = await getComponentsVue(data);
        const exportComponent = `
                __file: '${source}',
                __name: '${fileName}',
                name: '${fileName}',
                components: { ${components.join(', ')} },
            `;

        // quitamos export default y añadimos el nombre del archivo
        if (output.includes('export default {')) {
            output = output.replace(
                'export default {',
                `const ${componentName} = {
                \n${exportComponent}
                `,
            );
        } else {
            output = output.replace(
                'export default /*@__PURE__*/_defineComponent({',
                `const ${componentName} = /*@__PURE__*/_defineComponent({
                \n${exportComponent}
                `,
            );
        }

        // reemplazamos cuando usamos script setup
        if (descriptor.scriptSetup) {
            output = output.replaceAll(/_ctx\.(?!\$)/g, '$setup.');
            output = output.replace(
                'export function render(_ctx, _cache) {',
                `function render(_ctx, _cache, $props, $setup, $data, $options) {`,
            );
        } else {
            output = output.replace(
                'export function render(_ctx, _cache) {',
                `function render(_ctx, _cache, $props, $setup, $data, $options) {`,
            );
        }

        const finishComponent = `
            ${componentName}.render = render;
            ${scopeId ? `${componentName}.__scopeId = '${scopeId}';` : ''}
            ${customBlocks}

            export default ${componentName};
        `;

        output = `${output}\n${finishComponent}`;

        // await writeFile(
        //     `./public/dashboard/js/${fileName}-temp.js`,
        //     output,
        //     'utf-8',
        // );
        // await unlink(`./public/dashboard/js/${fileName}-temp.js`);

        return {
            lang: compiledScript.lang,
            error: null,
            data: output,
        };
    } catch (error) {
        return { lang: null, error, data: null }; // Devolver error en objeto
    }
};

/**
 * Minifica el codigo JavaScript usando opciones especificas.
 *
 * @param {string} data - The JavaScript code to be minified.
 * @param {string} filename - The name of the file containing the JavaScript code.
 * @returns {Promise<Object>} The result of the minification process.
 */
const minifyJS = async (data, filename) => {
    try {
        const result = await minify(
            { [filename]: data },
            {
                compress: {
                    passes: 3,
                    unsafe: true,
                    unsafe_comps: true,
                    unsafe_Function: true,
                    unsafe_math: true,
                    unsafe_proto: true,
                    drop_debugger: true, // Eliminar debugger;
                    pure_getters: true, // Permitir optimizar getters puros
                    sequences: true, // Unir sentencias secuenciales
                    booleans: true, // Simplificar expresiones booleanas
                    conditionals: true, // Simplificar condicionales
                    dead_code: true, // Eliminar código muerto
                    if_return: true, // Optimizar if/return
                    join_vars: true, // Unir declaraciones de variables
                    reduce_vars: true, // Reducir variables
                    collapse_vars: true, // Colapsar variables
                },
                mangle: {
                    toplevel: true, // Minificar nombres de variables globales
                },
                ecma: 5,
                module: true, // Indicar que es un módulo ES
                toplevel: true, // Aplicar optimizaciones a nivel superior
                format: {
                    preamble: '/* WYS Soluciones Informatica - VersaWYS */',
                    comments: isProd ? false : 'all', // Eliminar comentarios
                },
            },
        );
        return { code: result.code };
    } catch (error) {
        return { error, code: '' };
    }
};

/**
 * Parses the given JavaScript code using Acorn and returns the Abstract Syntax Tree (AST).
 *
 * @param {string} data - The JavaScript code to be parsed.
 * @returns {Promise<Object|null>} The parsed AST object if successful, or null if an error occurs.
 * @throws {Error} If there is an error during parsing, it logs the error details and stack trace.
 */
const checkSintaxysAcorn = async data => {
    try {
        const ast = Parser.parse(data, {
            ecmaVersion: 2020,
            sourceType: 'module',
            locations: true,
            ranges: true,
        });

        return { ast, error: null };
    } catch (error) {
        console.log(
            chalk.red(
                `🚩 :Error durante la compilación JS:${error.loc.line}:${error.loc.column}: ${error.message}\n`,
            ),
        );
        console.error(error.stack); // Imprime la pila de llamadas para depuración
        return { ast: null, error };
    }
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
        totalFiles++;
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
            resultVue = await preCompileVue(data, source);
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
            const Resultdata = await preCompileTS(data, filename);
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
            result = await minifyJS(data, filename);
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

async function generateTailwindCSS(filePath = null) {
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
            // await generateTailwindCSS(filePath);
            const { extension, normalizedPath, fileName } = await compile(
                path.normalize(filePath).replace(/\\/g, '/'),
            );
            emitirCambios(bs, extension, normalizedPath, fileName, 'change');
        });

        // Evento cuando se elimina un archivo
        watcher.on('unlink', async filePath => {
            await generateTailwindCSS();
            const { extension, normalizedPath, fileName } = deleteFile(
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

        bs.init({
            server: './',
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
