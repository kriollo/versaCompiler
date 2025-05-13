import path from 'node:path';
import * as vCompiler from 'vue/compiler-sfc';

const getComponentsVue = async data => {
    let components = [];

    const importRegExp = /import\s+[\s\S]*?\s+from\s+['"].*['"];/g;

    const _a = data.replace(importRegExp, match => {
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
export const preCompileVue = async (data, source, isProd = false) => {
    try {
        const fileName = path.basename(source).replace('.vue', '');

        const ifExistsref = data.includes('ref(');

        // esto es para HMR re re forzado
        const varContent = `
            ${ifExistsref ? '' : 'import { ref } from "vue";'};
            const versaComponentKey = ref(0);
        `;
        const ifExistScript = data.includes('<script');
        if (!ifExistScript) {
            data = `<script>${varContent}</script>` + data;
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
        // console.log(data);
        //

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

        const componentName = `${fileName}_component`;
        const components = await getComponentsVue(data);
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
                `
                function render(_ctx, _cache, $props, $setup, $data, $options) {
                `,
            );
        } else {
            output = output.replace(
                'export function render(_ctx, _cache) {',
                `
                function render(_ctx, _cache, $props, $setup, $data, $options) {
                `,
            );
        }

        const finishComponent = `
            ${componentName}.render = render;
            ${scopeId ? `${componentName}.__scopeId = '${scopeId}';` : ''}
            ${customBlocks}

            export default ${componentName};
        `;

        output = `${output}\n${finishComponent}`;

        return {
            lang: compiledScript.lang,
            error: null,
            data: output,
        };
    } catch (error) {
        return { lang: null, error, data: null }; // Devolver error en objeto
    }
};
