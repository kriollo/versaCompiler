import chalk from 'chalk';
import { watch } from 'gulp';
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

let PATH_SOURCE = '';
let PATH_DIST = '';
const PATH_CONFIG_FILE = './tsconfig.json';

let watchJS = `${PATH_SOURCE}/**/*.js`;
let watchVue = `${PATH_SOURCE}/**/*.vue`;
let watchTS = `${PATH_SOURCE}/**/*.ts`;

let pathAlias = null;

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

const getPathAlias = async () => {
    const data = await readFile(PATH_CONFIG_FILE, { encoding: 'utf-8' });
    if (!data) {
        error(chalk.red('🚩 :Error al leer el archivo tsconfig.json'));
        return;
    }

    const tsConfig = JSON.parse(data);
    pathAlias = tsConfig.compilerOptions.paths;
    log(chalk.green(`pathAlias: ${JSON.stringify(pathAlias)}`));

    const sourceRoot = tsConfig.compilerOptions.sourceRoot;
    if (sourceRoot) {
        PATH_SOURCE = sourceRoot.endsWith('/')
            ? sourceRoot.slice(0, -1)
            : sourceRoot;
    }

    const outDir = tsConfig.compilerOptions.outDir;
    if (outDir) {
        PATH_DIST = outDir.endsWith('/') ? outDir.slice(0, -1) : outDir;
    }

    console.log(chalk.green(`PATH_SOURCE: ${PATH_SOURCE}`));
    console.log(chalk.green(`PATH_DIST: ${PATH_DIST}\n`));

    watchJS = `${PATH_SOURCE}/**/*.js`;
    watchVue = `${PATH_SOURCE}/**/*.vue`;
    watchTS = `${PATH_SOURCE}/**/*.ts`;

    return pathAlias;
};

const mapRuta = async ruta =>
    path.join(PATH_DIST, path.relative(PATH_SOURCE, ruta));

const deleteFile = async ruta => {
    const newPath = (
        await mapRuta(
            ruta
                .replace('\\', '/')
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
 * Removes the "html" tag from a template string.
 *
 * @param {string} data - The template string to remove the "html" tag from.
 * @returns {Promise<string>} - The modified template string without the "html" tag.
 */
const removehtmlOfTemplateString = async data => {
    const htmlRegExp = /html\s*`/g;

    data = data.replace(htmlRegExp, '`');

    //remove ", get html() { return html }"
    const htmlGetterRegExp = /,\s*get\s+html\(\)\s*{\s*return\s*html\s*}/g;
    data = data.replace(htmlGetterRegExp, '');

    return data;
};

/**
 * Replaces path aliases in the provided data string with their corresponding values.
 *
 * @param {string} data - The input string containing the code with path aliases.
 * @returns {Promise<string>} - A promise that resolves to the modified string with path aliases replaced.
 *
 * @example
 * const data = "import something from '@alias/someModule';";
 * replaceAlias(data).then(result => {
 *     console.log(result); // Output will have '@alias' replaced with the actual path.
 * });
 */
const replaceAlias = async data => {
    // Función para escapar los caracteres especiales en una expresión regular
    const escapeRegExp = string =>
        string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const key in pathAlias) {
        const values = pathAlias[key];

        // Escapa el alias para usarlo en una expresión regular
        const escapedKey = escapeRegExp(key.replace('/*', ''));

        // Genera las posibles variaciones del alias en formato de expresión regular
        const aliasPatterns = [
            new RegExp(`import\\(\\s*['"]${escapedKey}`, 'g'),
            new RegExp(`from\\s*['"]${escapedKey}`, 'g'),
            new RegExp(`['"]${escapedKey}`, 'g'),
            new RegExp(`import\\(\`\\${escapedKey}`, 'g'), // Maneja el caso de backticks
        ];

        for (const value of values) {
            let replacement = value.replace('/*', '').replace('./', '/');

            replacement = replacement
                .replace(replacement, PATH_DIST)
                .replace('./', '/');

            // Aplica todos los reemplazos
            for (const pattern of aliasPatterns) {
                data = data.replace(pattern, match => {
                    // Ajuste específico según el patrón encontrado
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
        }

        // Reemplaza los patrones específicos './' por '/'
        data = data.replace(/import ['"]\.\//g, "import '/");
        data = data.replace(/from ['"]\.\//g, "from '/");
    }

    return data;
};

const replaceAliasImportsAsync = async data => {
    //debemos buscar en data si hay algun import con esta sintaxis import('P@/appLoader.js')
    //y reemplazarlo por import('/public/appLoader.js')
    const importRegExp = /import\(['"](.*)['"]\)/g;
    const importList = data.match(importRegExp);

    if (importList) {
        for (const item of importList) {
            const importRegExp2 = /import\(['"](.*)['"]\)/;
            const result = item.match(importRegExp2);
            if (result) {
                const ruta = result[1];
                const newRuta = ruta.replace('@', PATH_DIST);
                const newImport = item.replace(ruta, newRuta);
                data = data.replace(item, newImport);
            }
        }
    }

    return data;
};

/**
 * Asynchronously removes the import statement for 'code-tag' from the given data string.
 *
 * @param {string} data - The input string containing JavaScript code.
 * @returns {Promise<string>} A promise that resolves to the modified string with the 'code-tag' import removed.
 */
const removeCodeTagImport = async data => {
    // remove import if exist code-tag
    const codeTagRegExp = /import\s+{.*}\s+from\s+['"].*code-tag.*['"];/g;
    data = data.replace(codeTagRegExp, '');
    return data;
};

const addImportEndJs = async data => {
    const importRegExp = /import\s+[\s\S]*?\s+from\s+['"].*['"];/g;
    const importList = data.match(importRegExp);
    if (importList) {
        for (const item of importList) {
            const importRegExp2 = /from\s+['"](.*)['"];/;
            const result = item.match(importRegExp2);
            if (result) {
                const ruta = result[1];

                if (ruta.endsWith('.vue')) {
                    const importRegExp3 = /from\s+['"](.+\/(\w+))\.vue['"];/;
                    const resultVue = item.match(importRegExp3);

                    if (resultVue) {
                        const fullPath = resultVue[1].replace('.vue', '');
                        const fileName = resultVue[2];

                        const newImport = item.replace(
                            /import\s+(\w+)\s+from\s+['"](.+\/(\w+))\.vue['"];/,
                            `import {${fileName}} from '${fullPath}.js';`,
                        );

                        data = data.replace(item, newImport);
                    }
                } else if (!ruta.endsWith('.js')) {
                    if (
                        ruta.endsWith('.mjs') ||
                        ruta.endsWith('.css') ||
                        !ruta.includes('/')
                    )
                        continue;
                    const newRuta = `${ruta}.js`;
                    const newImport = item.replace(ruta, newRuta);
                    data = data.replace(item, newImport);
                }
            }
        }
    }

    return data;
};

const removePreserverComent = async data => {
    const preserverRegExp =
        /\/\*[\s\S]*?@preserve[\s\S]*?\*\/|\/\/.*?@preserve.*?(?=\n|$)/g;
    data = data.replace(preserverRegExp, match =>
        match.replace(/@preserve/g, ''),
    );
    return data;
};

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

const compileCustomBlock = async (block, source) => {};

const preCompileTS = async data => {
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
        const { compilerOptions, ...restOfConfig } = tsConfig;

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
        });
        if (result.diagnostics && result.diagnostics.length > 0) {
            const errors = result.diagnostics.map(diagnostic => {
                if (diagnostic.file) {
                    const { line, character } =
                        diagnostic.file.getLineAndCharacterOfPosition(
                            diagnostic.start,
                        );
                    return `Error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')} - ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
                } else {
                    return `Error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
                }
            });

            throw new Error(
                `Error en la compilación de TypeScript:\n${errors.join('\n')}`,
            );
        }

        return { error: null, data: result.outputText };
    } catch (error) {
        console.error(error.message); // Consider a more generic error logging mechanism
        return { error: error.message, data: null };
    }
};

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
            ? vCompiler.compileTemplate(templateOptions)
            : { code: '' }; // Manejar caso sin template

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
        const appImport = `import { app } from '@/vue-instancia';`;
        output = `${appImport}${output}`;

        let exportComponent = '';
        let componentName = '';

        componentName = `${fileName}_component`;
        exportComponent = `
                ${componentName}.render = render;
                ${componentName}.__file = '${fileName}';
                ${scopeId ? `${componentName}.__scopeId = '${scopeId}';` : ''}
                ${customBlocks}
                export const ${fileName} = app.component('${fileName}', ${componentName});
            `;

        // quitamos export default y añadimos el nombre del archivo
        if (output.includes('export default {')) {
            output = output.replace(
                'export default {',
                `const ${componentName} = {
                        __name: '${fileName}',
                    `,
            );
        } else {
            output = output.replace(
                'export default /*@__PURE__*/_defineComponent({',
                `const ${componentName} = /*@__PURE__*/_defineComponent({
                    __name: '${fileName}',
                `,
            );
        }

        // reemplazamos cuando usamos script setup
        if (descriptor.scriptSetup) {
            output = output.replaceAll(/_ctx\.(?!\$)/g, '$setup.');
            output = output.replace(
                'export function render(_ctx, _cache) {',
                'function render(_ctx, _cache, $props, $setup, $data, $options) {',
            );
        } else {
            output = output.replace(
                'export function render(_ctx, _cache) {',
                'function render(_ctx, _cache, $props, $setup, $data, $options) {',
            );
        }

        output = `${output}\n${exportComponent}`;

        // await writeFile(
        //     `./public/dashboard/js/${fileName}-temp.js`,
        //     output,
        //     'utf-8',
        // );

        return {
            lang: compiledScript.lang,
            error: null,
            data: output,
        };
    } catch (error) {
        return { lang: null, error, data: null }; // Devolver error en objeto
    }
};

const compileJS = async (source, destination) => {
    try {
        const startTime = Date.now(); // optener la hora actual

        const filename = path.basename(source);
        await log(chalk.blue(`🪄  :start transformation`));

        let data = await readFile(source, 'utf-8');
        if (!data) {
            await error(chalk.yellow('⚠️ :Archivo vacío\n'));
            return;
        }

        const extension = source.split('.').pop();
        let resultVue = null;
        if (extension === 'vue') {
            await log(chalk.green(`💚 :Pre Compile VUE`));
            resultVue = await preCompileVue(data, source);
            data = resultVue.data;
            if (resultVue.error !== null) {
                await error(
                    chalk.red(
                        `🚩 :Error durante la compilación Vue :${resultVue?.error}\n`,
                    ),
                );
                return;
            }
            destination = destination.replace('.vue', '.js');
        }

        if (extension === 'ts' || resultVue?.lang === 'ts') {
            await log(chalk.blue(`🔄️ :Pre Compilando TS`));
            const Resultdata = await preCompileTS(data);
            if (Resultdata.error !== null) {
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

        let result = null;
        if (isProd) {
            await log(chalk.blue(`🤖 :minifying`));
            result = await minify(
                { [filename]: data },
                {
                    compress: {
                        passes: 3,
                        unsafe: true, // Asegúrate de probar exhaustivamente
                        unsafe_comps: true, // Asegúrate de probar exhaustivamente
                        unsafe_Function: true, // Asegúrate de probar exhaustivamente
                        unsafe_math: true, // Asegúrate de probar exhaustivamente
                        unsafe_proto: true, // Asegúrate de probar exhaustivamente
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
                result.code = result.code.replaceAll('*/;export', '*/\nexport');
                result.code = result.code.replaceAll('*/export', '*/\nexport');
            }
            const destinationDir = path.dirname(destination);
            await mkdir(destinationDir, { recursive: true });
            await writeFile(destination, result.code, 'utf-8');

            const endTime = Date.now();
            const elapsedTime = endTime - startTime;
            await log(
                chalk.gray(`✅ :Compilación exitosa (${elapsedTime} ms) \n`),
            );
        }
    } catch (errora) {
        error(
            chalk.red(`🚩 :Error durante la compilación JS: ${errora}\n`),
            errora,
        );
    }
};
const compile = async path => {
    if (path.includes('.d.ts')) {
        return;
    }
    console.log(chalk.green(`🔜 :Source ${path}`));

    const outputPath = path.replace(PATH_SOURCE, PATH_DIST);
    const outFileJs = outputPath.replace('.ts', '.js').replace('.vue', '.js');

    console.log(chalk.green(`🔚 :destination ${outFileJs}`));

    const extension = path.split('.').pop();

    if (outputPath) {
        await compileJS(path, outputPath);
    } else {
        await log(chalk.yellow(`⚠️ :Tipo no reconocido: ${extension}`));
    }
};

const compileAll = async () => {
    try {
        pathAlias = await getPathAlias();

        for await (const file of glob([watchJS, watchVue, watchTS])) {
            await compile(file.startsWith('./') ? file : `./${file}`);
        }
    } catch (errora) {
        error(chalk.red('🚩 :Error durante la compilación inicial:'), errora);
    }
};

const init = async () => {
    try {
        pathAlias = await getPathAlias();
        log(
            chalk.green(
                `👀 :Watching ${[watchJS, watchVue, watchTS].join(', ')}\n`,
            ),
        );
        watch([watchJS, watchVue, watchTS])
            .on('add', path =>
                compile(path.startsWith('./') ? path : `./${path}`),
            )
            .on('change', path =>
                compile(path.startsWith('./') ? path : `./${path}`),
            )
            .on('unlink', path =>
                deleteFile(path.startsWith('./') ? path : `./${path}`),
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
} else init();
