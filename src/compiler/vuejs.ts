import chalk from 'chalk';
import path from 'node:path';
import * as vCompiler from 'vue/compiler-sfc';
import { logger } from '../servicios/logger';
import { parser } from './parser';

const getComponentsVueMap = async (ast: any): Promise<string[]> => {
    let components: string[] = [];
    const importsStatic = ast?.module?.staticImports;
    if (importsStatic) {
        const vueImports = importsStatic.filter((item: any) =>
            item.moduleRequest.value.endsWith('.vue'),
        );
        components = vueImports.map((item: any) => {
            return item.entries.map((entry: any) => entry.localName.value);
        });
        components = components.flat();
    }
    return components;
};

/**
 * Compila un bloque personalizado.
 * @param {Object} block - El bloque personalizado a compilar.
 * @param {string} source - La fuente del bloque.
 */
const _compileCustomBlock = async (
    _block: any,
    _source: any,
): Promise<void> => {};

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
            // Verificar si ya existe una importación de ref desde vue
            const hasRefImport =
                (data.includes('import {') &&
                    data.includes('ref') &&
                    data.includes("from 'vue'")) ||
                data.includes('from "vue"');

            // esto es para HMR re re forzado
            const varContent = `
            ${hasRefImport ? '' : 'import { ref } from "vue";'};
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
                /(<template[^>]*>[\s\S]*?)(<(\w+)([^>]*?))(\/?>)/,
                (match, p1, p2, p3, p4, p5) => {
                    // Si ya tiene :key, no agregarlo de nuevo
                    if (p4.includes(':key=') || p4.includes('key=')) {
                        return match;
                    }

                    // Si es self-closing (termina con '/>'), manejar diferente
                    const isSelfClosing = p5 === '/>';

                    if (isSelfClosing) {
                        return `${p1}<${p3}${p4} :key="versaComponentKey" />`;
                    } else {
                        return `${p1}<${p3}${p4} :key="versaComponentKey">`;
                    }
                },
            );
        }

        const { descriptor, errors } = vCompiler.parse(data, {
            filename: fileName,
            sourceMap: !isProd,
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
        let scriptLang: 'ts' | 'js' = 'js';
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
                inlineTemplate: false, // Siempre compilar por separado para tener control
                propsDestructure: true,
                templateOptions: {
                    compilerOptions: {
                        mode: 'module',
                        scopeId,
                        prefixIdentifiers: true,
                        hoistStatic: isProd,
                        cacheHandlers: isProd,
                        nodeTransforms: [],
                        directiveTransforms: {},
                    },
                    transformAssetUrls: true,
                },
                customElement: false,
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

        const ast = await parser(
            `temp.${scriptLang}`,
            scriptContent,
            scriptLang,
        );
        if (ast?.errors.length > 0) {
            throw new Error(
                `Error al analizar el script del componente Vue ${source}:\n${ast.errors
                    .map(e => e.message)
                    .join('\n')}`,
            );
        }
        const components = await getComponentsVueMap(ast);

        if (scriptBindings) {
            Object.keys(scriptBindings).forEach(key => {
                if (components.includes(key)) {
                    delete scriptBindings[key];
                }
            });
        }

        // --- 2. Compilación de la Plantilla (CORREGIDA) ---
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
                    compilerOptions: {
                        scopeId,
                        mode: 'module',
                        bindingMetadata: scriptBindings,
                        prefixIdentifiers: true,
                        hoistStatic: isProd,
                        cacheHandlers: isProd,
                        runtimeGlobalName: 'Vue',
                        runtimeModuleName: 'vue',
                        whitespace: 'condense',
                        ssr: false,
                        nodeTransforms: [],
                        directiveTransforms: {},
                    },
                };

            const compiledTemplateResult = vCompiler.compileTemplate(
                templateCompileOptions,
            );

            // DEBUGGING: Verificar errores en template
            if (compiledTemplateResult.errors?.length > 0) {
                logger.error(
                    'Template compilation errors:',
                    compiledTemplateResult.errors,
                );
            }

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
            customBlocks =
                descriptor.customBlocks[0]?.content.slice(0, -1) ?? '';
        }

        // Compile styles
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
                scoped: style.scoped,
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

        let output = `
            ${insertStyles}
            ${finalCompiledScript.content}
            ${finalCompiledTemplate.code}
        `;

        const componentName = `${fileName}_component`;

        const exportComponent = `
                __file: '${source}',
                __name: '${fileName}',
                name: '${fileName}',
                components: {
                    ${components}
                },
            `;

        // MEJORAR: Manejo más robusto de export default
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
        } else if (
            output.includes('const default = /*@__PURE__*/_defineComponent({')
        ) {
            output = output.replace(
                'const default = /*@__PURE__*/_defineComponent({',
                `const ${componentName} = /*@__PURE__*/_defineComponent({
                \n${exportComponent}
                `,
            );
        } else if (
            output.includes('export default /*@__PURE__*/_defineComponent({')
        ) {
            output = output.replace(
                'export default /*@__PURE__*/_defineComponent({',
                `const ${componentName} = /*@__PURE__*/_defineComponent({
                \n${exportComponent}
                `,
            );
        }

        // MEJORAR: Manejo más robusto de render function
        if (output.includes('export function render')) {
            output = output.replace(
                'export function render',
                `function render_${componentName}`,
            );
        }

        // AÑADIR: Verificar si render fue generado correctamente
        const hasRenderFunction =
            output.includes(`render_${componentName}`) ||
            output.includes('function render(');

        if (!hasRenderFunction && descriptor.template) {
            logger.warn('Warning: No render function found in compiled output');
        }

        const finishComponent = `
            ${hasRenderFunction ? `${componentName}.render = render_${componentName};` : ''}
            ${scopeId ? `${componentName}.__scopeId = '${scopeId}';` : ''}
            ${customBlocks}

            export default ${componentName};
        `;

        output = `${output}\n${finishComponent}`;

        // DEBUGGING FINAL
        // console.log('Final compiled output:', output);

        return {
            lang: finalCompiledScript.lang,
            error: null,
            data: output,
        };
    } catch (error) {
        logger.error('Vue compilation error:', error);
        return {
            lang: null,
            error: error instanceof Error ? error : new Error(String(error)),
            data: null,
        };
    }
};
