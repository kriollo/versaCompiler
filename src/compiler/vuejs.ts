import path from 'node:path';

import chalk from 'chalk';
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
    console.log(
        `[DEBUG VUE] ENTRY POINT - preCompileVue called for: ${source}`,
    );
    console.log(
        `[DEBUG VUE] ENTRY POINT - data type: ${typeof data}, data length: ${data?.length || 'N/A'}`,
    );
    console.log(`[DEBUG VUE] ENTRY POINT - source type: ${typeof source}`);
    console.log(`[DEBUG VUE] ENTRY POINT - isProd: ${isProd}`);

    try {
        if (process.env.VERBOSE === 'true') {
            console.log(`[DEBUG VUE] Iniciando preCompileVue para: ${source}`);
        }

        const fileName = path.basename(source).replace('.vue', '');

        if (process.env.VERBOSE === 'true') {
            console.log(`[DEBUG VUE] Nombre de archivo extraído: ${fileName}`);
        }

        if (!data || data.trim().length === 0) {
            if (process.env.VERBOSE === 'true') {
                console.log(`[DEBUG VUE] Archivo vacío para: ${source}`);
            }
            return {
                error: null,
                data: 'export default {};',
                lang: 'js',
            };
        }

        if (process.env.VERBOSE === 'true') {
            console.log(
                `[DEBUG VUE] Procesando archivo con ${data.length} caracteres`,
            );
        }
        if (!isProd) {
            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] Modo desarrollo - agregando HMR content`,
                );
            }
            // Verificar si ya existe una importación de ref desde vue de manera más precisa
            const vueImportPattern =
                /import\s*\{[^}]*\bref\b[^}]*\}\s*from\s*['"]vue['"]/;
            const hasRefImport = vueImportPattern.test(data);

            // esto es para HMR re re forzado
            const varContent = `
            ${hasRefImport ? '' : 'import { ref } from "vue";'}
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

        if (process.env.VERBOSE === 'true') {
            console.log(`[DEBUG VUE] Iniciando parsing del componente Vue`);
        }

        const { descriptor, errors } = vCompiler.parse(data, {
            filename: fileName,
            sourceMap: !isProd,
            sourceRoot: path.dirname(source),
        });

        if (process.env.VERBOSE === 'true') {
            console.log(
                `[DEBUG VUE] Parse completado, errores: ${errors.length}`,
            );
        }
        if (errors.length) {
            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] Error en parsing: ${errors.map(e => e.message).join(', ')}`,
                );
            }
            throw new Error(
                `Error al analizar el componente Vue ${source}:\n${errors.map(e => e.message).join('\n')}`,
            );
        }
        const id = Math.random().toString(36).slice(2, 12);
        const scopeId = descriptor.styles.some(s => s.scoped)
            ? `data-v-${id}`
            : null;

        if (process.env.VERBOSE === 'true') {
            console.log(`[DEBUG VUE] ID generado: ${id}, scopeId: ${scopeId}`);
        }

        // --- 1. Compilación del Script ---
        let scriptContent: string;
        let scriptLang: 'ts' | 'js' = 'js';
        let scriptBindings: vCompiler.BindingMetadata | undefined;
        let scriptType: 'script' | 'scriptSetup' | undefined;
        if (descriptor.script || descriptor.scriptSetup) {
            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] Compilando script - tiene script: ${!!descriptor.script}, tiene scriptSetup: ${!!descriptor.scriptSetup}`,
                );
            }
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

            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] Script compilado exitosamente, content length: ${compiledScriptResult.content.length}`,
                );
            }

            scriptContent = compiledScriptResult.content;
            scriptLang =
                scriptToCompile.lang?.toLowerCase() === 'ts' ||
                scriptToCompile.lang?.toLowerCase() === 'typescript'
                    ? 'ts'
                    : 'js';
            scriptBindings = compiledScriptResult.bindings;
        } else {
            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] No hay script, usando export default vacío`,
                );
            }
            scriptContent = 'export default {};';
            scriptLang = 'js';
        }

        if (process.env.VERBOSE === 'true') {
            console.log(`[DEBUG VUE] Iniciando parsing del script con parser`);
        }

        const ast = await parser(
            `temp.${scriptLang}`,
            scriptContent,
            scriptLang,
        );
        if (process.env.VERBOSE === 'true') {
            console.log(
                `[DEBUG VUE] Parser completado, errores AST: ${ast?.errors?.length || 0}`,
            );
        }
        if (ast?.errors.length > 0) {
            throw new Error(
                `Error al analizar el script del componente Vue ${source}:\n${ast.errors
                    .map(e => e.message)
                    .join('\n')}`,
            );
        }
        const components = await getComponentsVueMap(ast);

        if (process.env.VERBOSE === 'true') {
            console.log(
                `[DEBUG VUE] Componentes encontrados: ${components.join(', ')}`,
            );
        }

        if (scriptBindings) {
            Object.keys(scriptBindings).forEach(key => {
                if (components.includes(key)) {
                    delete scriptBindings[key];
                }
            });
        } // --- 2. Compilación de la Plantilla (CORREGIDA) ---
        let templateCode = '';
        if (descriptor.template) {
            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] Compilando template, content length: ${descriptor.template.content.length}`,
                );
            }
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

            if (process.env.VERBOSE === 'true') {
                console.log(
                    `[DEBUG VUE] Template compilado, errores: ${compiledTemplateResult.errors?.length || 0}`,
                );
            }

            // DEBUGGING: Verificar errores en template
            if (compiledTemplateResult.errors?.length > 0) {
                logger.error(
                    'Template compilation errors:',
                    compiledTemplateResult.errors,
                );
            }
            templateCode = compiledTemplateResult.code;
        } else {
            if (process.env.VERBOSE === 'true') {
                console.log(`[DEBUG VUE] No hay template en el componente`);
            }
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
        `; // Sanitizar el nombre del archivo para crear un nombre de variable JavaScript válido
        const sanitizedFileName =
            fileName.replace(/[^a-zA-Z0-9_$]/g, '').replace(/^[0-9]/, '_$&') ||
            'component';
        const componentName = `${sanitizedFileName}_component`; // Verificar si ya existe una propiedad 'name' en el output
        const hasNameProperty = /name\s*:\s*['"`]/.test(output);

        // Verificar si ya existe una propiedad 'components' en el output
        const hasComponentsProperty = /components\s*:\s*\{/.test(output);

        const exportComponent = `
                __file: '${source}',
                __name: '${fileName}',
                ${hasNameProperty ? '' : `name: '${fileName}',`}
                ${
                    hasComponentsProperty
                        ? ''
                        : `components: {
                    ${components.map(comp => `${comp}`).join(',\n                    ')}
                },`
                }
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

            export default ${componentName};        `;
        output = `${output}\n${finishComponent}`;

        if (process.env.VERBOSE === 'true') {
            console.log(
                `[DEBUG VUE] Finalizando preCompileVue exitosamente para: ${source}, output length: ${output.length}`,
            );
        }

        return {
            lang: finalCompiledScript.lang,
            error: null,
            data: output,
        };
    } catch (error) {
        console.log(
            `[DEBUG VUE] EXCEPTION CAUGHT in preCompileVue for: ${source}`,
        );
        console.log(`[DEBUG VUE] EXCEPTION type: ${typeof error}`);
        console.log(
            `[DEBUG VUE] EXCEPTION message: ${error instanceof Error ? error.message : String(error)}`,
        );
        console.log(
            `[DEBUG VUE] EXCEPTION stack: ${error instanceof Error ? error.stack : 'N/A'}`,
        );

        if (process.env.VERBOSE === 'true') {
            console.log(
                `[DEBUG VUE] Error en preCompileVue para ${source}:`,
                error,
            );
        }
        logger.error('Vue compilation error:', error);
        return {
            lang: null,
            error: error instanceof Error ? error : new Error(String(error)),
            data: null,
        };
    }
};
