import { createHash } from 'node:crypto';
import path from 'node:path';

import * as vCompiler from 'vue/compiler-sfc';

// Type casting para evitar problemas de tipos con Vue SFC
const vueCompiler = vCompiler as any;

import { logger } from '../servicios/logger';

import { parser } from './parser';

// Lazy loading para chalk
let chalk: any;
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

// ✨ NUEVA OPTIMIZACIÓN: Sistema de cache para inyecciones HMR
interface HMRInjectionCacheEntry {
    contentHash: string;
    injectedCode: string;
    hasRefImport: boolean;
    timestamp: number;
}

class VueHMRInjectionCache {
    private static instance: VueHMRInjectionCache;
    private cache = new Map<string, HMRInjectionCacheEntry>();
    private readonly MAX_CACHE_SIZE = 100;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    static getInstance(): VueHMRInjectionCache {
        if (!VueHMRInjectionCache.instance) {
            VueHMRInjectionCache.instance = new VueHMRInjectionCache();
        }
        return VueHMRInjectionCache.instance;
    }

    /**
     * Genera un hash del contenido original para detectar cambios
     */
    private generateContentHash(data: string): string {
        return createHash('md5').update(data).digest('hex');
    }

    /**
     * Obtiene código HMR inyectado desde cache o lo genera
     */
    getOrGenerateHMRInjection(
        originalData: string,
        fileName: string,
    ): {
        injectedData: string;
        cached: boolean;
    } {
        const contentHash = this.generateContentHash(originalData);
        const cacheKey = `${fileName}:${contentHash}`;

        // Verificar cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return {
                injectedData: cached.injectedCode,
                cached: true,
            };
        }

        // Generar nueva inyección HMR
        const vueImportPattern =
            /import\s*\{[^}]*\bref\b[^}]*\}\s*from\s*['"]vue['"]/;
        const hasRefImport = vueImportPattern.test(originalData);

        // ✨ FIX: Construir el import dinámicamente para evitar que el compilador lo transforme
        const vueRefImport =
            ['import', '{ ref }', 'from', '"vue"'].join(' ') + ';';
        const varContent = `
            ${hasRefImport ? '' : vueRefImport}
            const versaComponentKey = ref(0);
            `;

        let injectedData: string;
        const ifExistScript = originalData.includes('<script');

        if (!ifExistScript) {
            injectedData =
                `<script setup lang="ts">${varContent}</script>/n` +
                originalData;
        } else {
            injectedData = originalData.replace(
                /(<script.*?>)/,
                `$1${varContent}`,
            );
        }

        // Inyectar :key en el template
        injectedData = injectedData.replace(
            /(<template[^>]*>[\s\S]*?)(<(\w+)([^>]*?))(\/?>)/,
            (match, p1, p2, p3, p4, p5) => {
                if (p4.includes(':key=') || p4.includes('key=')) {
                    return match;
                }

                const isSelfClosing = p5 === '/>';
                if (isSelfClosing) {
                    return `${p1}<${p3}${p4} :key="versaComponentKey" />`;
                } else {
                    return `${p1}<${p3}${p4} :key="versaComponentKey">`;
                }
            },
        );

        // Cachear resultado
        this.cache.set(cacheKey, {
            contentHash,
            injectedCode: injectedData,
            hasRefImport,
            timestamp: Date.now(),
        });

        // Limpiar cache si es necesario
        this.evictIfNeeded();

        return {
            injectedData,
            cached: false,
        };
    }

    /**
     * Limpia entradas de cache cuando se excede el límite
     */
    private evictIfNeeded(): void {
        if (this.cache.size <= this.MAX_CACHE_SIZE) return;

        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Eliminar las entradas más antiguas
        const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
        toDelete.forEach(([key]) => this.cache.delete(key));
    }

    /**
     * Limpia entradas expiradas
     */
    cleanExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_TTL) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            ttl: this.CACHE_TTL,
        };
    }

    /**
     * Limpia todo el cache
     */
    clear(): void {
        this.cache.clear();
    }
}

// Instancia global del cache HMR
const hmrInjectionCache = VueHMRInjectionCache.getInstance();

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
    scriptInfo?: {
        startLine: number;
        content: string;
        originalData: string;
    };
}> => {
    try {
        const fileName = path.basename(source).replace('.vue', '');

        if (!data || data.trim().length === 0) {
            return {
                error: null,
                data: 'export default {};',
                lang: 'js',
                scriptInfo: undefined,
            };
        }

        // Guardar el código original antes de inyectar HMR
        const originalData = data;

        if (!isProd) {
            const { injectedData } =
                hmrInjectionCache.getOrGenerateHMRInjection(data, fileName);
            data = injectedData;
        }

        const { descriptor, errors } = vueCompiler.parse(data, {
            filename: fileName,
            sourceMap: !isProd,
            sourceRoot: path.dirname(source),
            templateParseOptions: {
                comments: !isProd, // ✨ Eliminar comentarios HTML del template
            },
        });

        if (errors.length) {
            throw new Error(
                `Error al analizar el componente Vue ${source}:\n${errors.map((e: any) => e.message).join('\n')}`,
            );
        }
        const id = Math.random().toString(36).slice(2, 12);
        const scopeId = descriptor.styles.some((s: any) => s.scoped)
            ? `data-v-${id}`
            : null;

        // --- 1. Compilación del Script ---
        let scriptContent: string;
        let scriptLang: 'ts' | 'js' = 'js';
        let scriptBindings: any | undefined;
        let scriptType: 'script' | 'scriptSetup' | undefined;
        if (descriptor.script || descriptor.scriptSetup) {
            scriptType = descriptor.script ? 'script' : 'scriptSetup';
            const scriptToCompile =
                descriptor.script || descriptor.scriptSetup!;

            const scriptCompileOptions: any = {
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
            const compiledScriptResult = vueCompiler.compileScript(
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
                    .map((e: any) => e.message)
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
        } // --- 2. Compilación de la Plantilla (CORREGIDA) ---
        let templateCode = '';
        if (descriptor.template) {
            const templateCompileOptions: any = {
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
                    comments: !isProd, // ✨ Eliminar comentarios HTML del template
                    nodeTransforms: [],
                    directiveTransforms: {},
                },
            };
            const compiledTemplateResult = vueCompiler.compileTemplate(
                templateCompileOptions,
            );

            if (compiledTemplateResult.errors?.length > 0) {
                logger.error(
                    'Template compilation errors:',
                    compiledTemplateResult.errors,
                );
            }
            templateCode = compiledTemplateResult.code;
        } else {
            const chalkInstance = await loadChalk();
            logger.warn(
                chalkInstance.yellow(
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
        const compiledStyles = descriptor.styles.map((style: any) => {
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

            return vueCompiler.compileStyle({
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
                    styleTag.innerHTML = \`${compiledStyles.map((s: any) => s.code).join('\n')}\`;
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

        // 🚀 OPTIMIZACIÓN CRÍTICA: Evitar crear scriptInfo si no hay script
        const result: {
            lang: 'ts' | 'js';
            error: null;
            data: string;
            scriptInfo?: {
                startLine: number;
                content: string;
                originalData: string;
            };
        } = {
            lang: finalCompiledScript.lang,
            error: null,
            data: output,
        };

        // Solo agregar scriptInfo cuando realmente hay script (evita overhead)
        if (descriptor.script || descriptor.scriptSetup) {
            result.scriptInfo = {
                startLine:
                    (descriptor.script || descriptor.scriptSetup)!.loc?.start
                        .line || 1,
                content: (descriptor.script || descriptor.scriptSetup)!.content,
                originalData: originalData, // String directa, no closure
            };
        }

        return result;
    } catch (error) {
        logger.error('Vue compilation error:', error);
        return {
            lang: null,
            error: error instanceof Error ? error : new Error(String(error)),
            data: null,
            scriptInfo: undefined,
        };
    }
};

// ✨ NUEVA FUNCIÓN: Exportar funcionalidades del cache HMR para uso externo
export const getVueHMRCacheStats = () => {
    return hmrInjectionCache.getStats();
};

export const clearVueHMRCache = () => {
    hmrInjectionCache.clear();
};

export const cleanExpiredVueHMRCache = () => {
    hmrInjectionCache.cleanExpired();
};
