import chalk from 'chalk';
import path from 'node:path';
import * as vCompiler from 'vue/compiler-sfc';
import { logger } from '../servicios/logger.ts';
import { parser } from './parser.ts';

// const getComponentsVue = async (data: string) => {
//     let components: string[] = [];

//     const importRegExp = /import\s+[\s\S]*?\s+from\s+['"].*['"];/g;

//     const _a = data.replace(importRegExp, match => {
//         const ruta = match.match(/from\s+['"](.*)['"];/)[1];

//         if (ruta.endsWith('.vue')) {
//             const resultVue = match.match(/from\s+['"](.+\/(\w+))\.vue['"];/);
//             if (resultVue) {
//                 const fullPath = resultVue[1].replace('.vue', '');
//                 const fileName = resultVue[2];
//                 components.push(fileName);
//                 return `import ${fileName} from '${fullPath}.js';`;
//             }
//         }
//         return match; // Devolver el match original si no se cumple ninguna condición
//     });

//     return components;
// };

const getComponentsVueMap = async ast => {
    let components: string[] = [];
    const importsStatic = ast?.module?.staticImports;
    if (importsStatic) {
        const vueImports = importsStatic.filter(item =>
            item.moduleRequest.value.endsWith('.vue'),
        );
        components = vueImports.map(item => {
            return item.entries.map(entry => entry.localName.value);
        });
        components = components.flat();
    }

    components = components.map(item => {
        return item.replace(/['"]/g, '');
    });
    return components;
};

/**
 * Compila un bloque personalizado.
 * @param {Object} block - El bloque personalizado a compilar.
 * @param {string} source - La fuente del bloque.
 */
const _compileCustomBlock = async (_block, _source) => {};

/**
 * Precompila un componente Vue.
 * @param {string} data - El código del componente Vue.
 * @param {string} source - La fuente del componente Vue.
 * @returns {Promise<Object>} - Un objeto con el código precompilado o un error.
 */
export const preCompileVue = async (
    data: string,
    source: string,
    isProd = false,
): Promise<{
    error: Error | null;
    data: string | null;
    lang: 'ts' | 'js' | null;
}> => {
    try {
        const fileName = path.basename(source).replace('.vue', '');

        if (!isProd) {
            const ifExistsref = data.includes('ref(');

            // esto es para HMR re re forzado
            const varContent = `
            ${ifExistsref ? '' : 'import { ref } from "vue";'};
            const versaComponentKey = ref(0);
            `;
            const ifExistScript = data.includes('<script');
            if (!ifExistScript) {
                data =
                    `<script setup lang="ts">${varContent}</script>/n` + data;
            } else {
                data = data.replace(/(<script.*?>)/, `$1${varContent}`);
            }

            data = data.replace(
                /(<template>[\s\S]*?)(<\w+)([^>]*)(\/?>)/,
                (match, p1, p2, p3, p4) => {
                    // Si es self-closing (termina con '/>'), no agregar key
                    const existeSlash = p3.trim().slice(-1) === '/';

                    return `${p1} ${p2} ${existeSlash ? p3.trim().slice(0, -1) : p3} :key="versaComponentKey" ${existeSlash ? '/' : ''}${p4}`;
                },
            );
        }

        const { descriptor, errors } = vCompiler.parse(data, {
            filename: fileName,
            sourceMap: !isProd, // Generalmente querrás sourcemaps en desarrollo
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

        // --- 1. Compilación del Script ---
        let scriptContent: string;
        let scriptLang: 'ts' | 'js' = 'js'; // Default a js
        let scriptBindings: vCompiler.BindingMetadata | undefined;
        let scriptType: 'script' | 'scriptSetup' | undefined;

        if (descriptor.script || descriptor.scriptSetup) {
            scriptType = descriptor.script ? 'script' : 'scriptSetup';
            const scriptToCompile =
                descriptor.script || descriptor.scriptSetup!;

            const scriptCompileOptions: vCompiler.SFCScriptCompileOptions = {
                id,
                isProd,
                sourceMap: !isProd,
                inlineTemplate: false,
                propsDestructure: true,
                templateOptions: descriptor.scriptSetup
                    ? {
                          compilerOptions: {
                              scopeId,
                          },
                      }
                    : undefined,
            };

            const compiledScriptResult = vCompiler.compileScript(
                descriptor,
                scriptCompileOptions,
            );

            scriptContent = compiledScriptResult.content;
            scriptLang =
                scriptToCompile.lang?.toLowerCase() === 'ts' ||
                scriptToCompile.lang?.toLowerCase() === 'typescript'
                    ? 'ts'
                    : 'js';
            scriptBindings = compiledScriptResult.bindings;
        } else {
            scriptContent = 'export default {};';
            scriptLang = 'js';
        }

        // --- 2. Compilación de la Plantilla ---
        let templateCode = '';
        if (descriptor.template) {
            const templateCompileOptions: vCompiler.SFCTemplateCompileOptions =
                {
                    source: descriptor.template.content,
                    filename: `${fileName}.vue`,
                    id,
                    scoped: !!scopeId,
                    slotted: descriptor.slotted,
                    isProd,
                    // sourceMap: !isProd,
                    // comments: isProd ? false : 'all',
                    compilerOptions: {
                        scopeId,
                        mode: 'module',
                        bindingMetadata: scriptBindings,
                        prefixIdentifiers: true,
                        hoistStatic: isProd,
                        cacheHandlers: isProd,
                        runtimeGlobalName: 'Vue',
                        runtimeModuleName: 'vue',
                        // optimizeBindings: true,
                        //runtimeContextBuiltins: true,
                        // runtimeDirectives: true,
                        // runtimeVNode: true,
                        // runtimeProps: true,
                        // runtimeSlots: true,
                        // runtimeComponents: true,
                        // runtimeCompiledRender: true,
                        whitespace: 'condense',
                        // ssrCssExternal: true,
                        ssr: false,
                        nodeTransforms: [],
                        directiveTransforms: {},
                    },
                };
            const compiledTemplateResult = vCompiler.compileTemplate(
                templateCompileOptions,
            );
            templateCode = compiledTemplateResult.code;
        } else {
            logger.warn(
                chalk.yellow(
                    `Advertencia: El componente Vue ${source} no tiene una sección de plantilla.`,
                ),
            );
        }

        const finalCompiledScript = {
            content: scriptContent,
            lang: scriptLang,
            type: scriptType,
        };

        const finalCompiledTemplate = {
            code: templateCode,
        };

        let customBlocks = '';
        if (descriptor.customBlocks.length > 0) {
            // eliminar el ultimo caracter que es un punto y coma
            customBlocks =
                descriptor?.customBlocks[0].content.slice(0, -1) ?? '';
        }

        // Compile styles Y obtener el contenido de los estilos
        const compiledStyles = descriptor.styles.map(style => {
            const lang = style.lang?.toLowerCase();
            let currentPreprocessLang:
                | 'less'
                | 'sass'
                | 'scss'
                | 'styl'
                | 'stylus'
                | undefined = undefined;

            if (
                lang === 'scss' ||
                lang === 'sass' ||
                lang === 'less' ||
                lang === 'styl' ||
                lang === 'stylus'
            ) {
                currentPreprocessLang = lang;
            }

            return vCompiler.compileStyle({
                id,
                source: style.content,
                scoped: style.scoped, // Esto maneja si el estilo es scoped o global
                preprocessLang: currentPreprocessLang,
                isProd,
                trim: true,
                filename: `${fileName}.vue`,
            });
        });

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
            ${finalCompiledScript.content}
            ${finalCompiledTemplate.code}
        `;

        const ast = await parser(`temp.${scriptLang}`, output, scriptLang);
        if (ast?.errors.length > 0) {
            throw new Error(
                `Error al analizar el script del componente Vue ${source}:\n${ast.errors
                    .map(e => e.message)
                    .join('\n')}`,
            );
        }

        const componentName = `${fileName}_component`;
        const components = await getComponentsVueMap(ast);
        const exportComponent = `
                __file: '${source}',
                __name: '${fileName}',
                name: '${fileName}',
                components: {
                    ${components}
                },
            `;

        // quitamos export default y añadimos el nombre del archivo
        if (output.includes('export default {')) {
            output = output.replace(
                'export default {',
                `const ${componentName} = {
                \n${exportComponent}
                `,
            );
        } else if (output.includes('export default defineComponent({')) {
            output = output.replace(
                'export default defineComponent({',
                `const ${componentName} = defineComponent({
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

        // buscar setup( y reemplazar por async setup(
        if (output.includes('setup(')) {
            output = output.replace('setup(', 'async setup(');
        }

        const finishComponent = `
            ${componentName}.render = render;
            ${scopeId ? `${componentName}.__scopeId = '${scopeId}';` : ''}
            ${customBlocks}

            export default ${componentName};
        `;

        output = `${output}\n${finishComponent}`;
        // console.log(output);

        return {
            lang: finalCompiledScript.lang,
            error: null,
            data: output,
        };
    } catch (error) {
        return { lang: null, error, data: null }; // Devolver error en objeto
    }
};
