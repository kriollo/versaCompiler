import { minifyHTMLLiterals } from 'minify-html-literals';

import { logger } from '../servicios/logger';

const defaultMinifyOptions = {
    // Opciones esenciales para componentes Vue
    caseSensitive: true, // Preserva mayúsculas/minúsculas en nombres de componentes
    keepClosingSlash: true, // ✅ MANTIENE el slash de cierre <component />
    collapseWhitespace: true, // Elimina espacios en blanco
    removeComments: true, // Elimina comentarios HTML
    minifyCSS: true, // ✅ Minifica CSS inline (importante para estilos Vue)
    minifyJS: true, // Minifica JS inline en atributos

    // Configuración para frameworks (Vue/React)
    conservativeCollapse: false, // Colapso más agresivo de espacios
    preserveLineBreaks: false, // No preservar saltos de línea

    // Importante: NO remover atributos necesarios de Vue
    removeAttributeQuotes: false, // NO quitar comillas (Vue las necesita en :prop y @event)
    removeEmptyAttributes: false, // NO quitar atributos vacíos (Vue los usa)
    removeRedundantAttributes: false, // NO quitar atributos redundantes

    // Optimizaciones seguras
    removeScriptTypeAttributes: true, // Quitar type="text/javascript"
    removeStyleLinkTypeAttributes: true, // Quitar type="text/css"
    useShortDoctype: true, // Usar <!DOCTYPE html> corto
};

// Marcadores únicos para identificar tags temporales
const TEMP_TAG_MARKER = '__VERSA_TEMP__';
const TEMP_HTML_TAG = `${TEMP_TAG_MARKER}html`;
const TEMP_CSS_TAG = `${TEMP_TAG_MARKER}css`;

/**
 * Detecta el tipo de contenido dentro de un template string
 * @param content - Contenido del template string
 * @returns 'css' | 'html' | 'mixed' | 'unknown'
 */
const detectContentType = (content: string): string => {
    // Remover template expressions ${...} para análisis más preciso
    const cleanContent = content.replace(/\$\{[^}]+\}/g, '');

    // Detectar CSS: Buscar selectores y propiedades CSS
    const hasCSSBraces =
        cleanContent.includes('{') && cleanContent.includes('}');
    const hasCSSProperties = /[a-z-]+\s*:\s*[^;]+;/.test(cleanContent);
    const hasMediaQueries = /@media|@keyframes|@import/.test(cleanContent);
    const isCSSLike = hasCSSBraces && (hasCSSProperties || hasMediaQueries);

    // Detectar código TypeScript (para evitar falsos positivos)
    const hasTypeScriptSyntax =
        /\b(function|const|let|var|interface|type|declare|export|import)\b/.test(
            cleanContent,
        );
    const hasTypeScriptGenerics = /<[A-Z][^>]*>|<\{/.test(cleanContent); // <T>, <T extends Foo>, <{}>

    // Si parece código TypeScript, no intentar minificar
    if (hasTypeScriptSyntax && hasTypeScriptGenerics) {
        return 'unknown';
    }

    // Detectar HTML: Buscar tags HTML REALES (no genéricos TypeScript)
    // Tags HTML comunes para evitar falsos positivos
    const hasHTMLElements =
        /<(div|span|p|a|button|input|form|table|ul|ol|li|h[1-6]|section|article|nav|header|footer|main|aside|style|script)[^>]*>/i.test(
            cleanContent,
        );
    const hasHTMLClosingTags =
        /<\/(div|span|p|a|button|input|form|table|ul|ol|li|h[1-6]|section|article|nav|header|footer|main|aside|style|script)>/i.test(
            cleanContent,
        );
    const isHTMLLike = hasHTMLElements || hasHTMLClosingTags;

    // Detectar contenido mixto (CSS + HTML juntos)
    if (isCSSLike && isHTMLLike) {
        return 'mixed';
    }

    if (isCSSLike) {
        return 'css';
    }

    if (isHTMLLike) {
        return 'html';
    }

    return 'unknown';
};

/**
 * Detecta template strings sin tags y les agrega tags temporales según su contenido
 * @param code - Código fuente a procesar
 * @returns Código con tags temporales agregados
 */
const detectAndTagTemplateStrings = (code: string): string => {
    try {
        // Patrón para detectar template strings sin tag html`` o css``
        // Busca: = ` ... ` o : ` ... ` pero NO html` o css`
        // Negative lookbehind: (?<!html|css|TEMP_TAG_MARKER)
        const templateStringPattern = new RegExp(
            `(?<!html|css|${TEMP_TAG_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\\`([^\`]+?)\\\``,
            'gs',
        );

        return code.replace(templateStringPattern, (match, content) => {
            // No procesar si ya tiene un tag (doble verificación)
            if (
                match.includes('html`') ||
                match.includes('css`') ||
                match.includes(TEMP_TAG_MARKER)
            ) {
                return match;
            }

            // No procesar template strings vacíos o muy cortos (probablemente strings simples)
            if (content.trim().length < 10) {
                return match;
            }

            // Detectar tipo de contenido
            const contentType = detectContentType(content);

            // Solo agregar tag si es CSS o HTML (contenido minificable)
            if (contentType === 'css') {
                return `${TEMP_CSS_TAG}\`${content}\``;
            } else if (contentType === 'html' || contentType === 'mixed') {
                return `${TEMP_HTML_TAG}\`${content}\``;
            }

            // Si es unknown o JavaScript, no agregar tag
            return match;
        });
    } catch (error) {
        logger.warn(
            '[MinifyTemplate] Error detectando template strings:',
            error,
        );
        return code;
    }
};

/**
 * Remueve los tags temporales agregados por detectAndTagTemplateStrings
 * @param code - Código con tags temporales
 * @returns Código limpio sin tags temporales
 */
const removeTemporaryTags = (code: string): string => {
    try {
        // Remover tags temporales: __VERSA_TEMP__html` -> `
        const tempHtmlPattern = new RegExp(`${TEMP_HTML_TAG}\\\``, 'g');
        const tempCssPattern = new RegExp(`${TEMP_CSS_TAG}\\\``, 'g');

        return code.replace(tempHtmlPattern, '`').replace(tempCssPattern, '`');
    } catch (error) {
        logger.warn(
            '[MinifyTemplate] Error removiendo tags temporales:',
            error,
        );
        return code;
    }
};

/**
 * Minifica CSS dentro de tagged templates
 * Ahora soporta múltiples formatos: =html`...`, :html`...`, =css`...`, etc.
 */
const minifyCSS = (code: string): string => {
    try {
        // Patrón expandido para detectar diferentes contextos:
        // - Asignaciones: =html` o =css`
        // - Propiedades de objeto: : html` o : css`
        // - Template strings standalone: html` o css`
        // - Tags temporales: __VERSA_TEMP__css` o __VERSA_TEMP__html`
        const cssPattern =
            /(?:=|:|\s)(html|css|__VERSA_TEMP__html|__VERSA_TEMP__css)?`([^`]+)`/g;

        return code.replace(cssPattern, (match, tag, content) => {
            const looksLikeCSS =
                content.includes('{') &&
                content.includes('}') &&
                /[a-z-]+\s*:\s*[^;]+;/.test(content);
            // Si no tiene tag, no procesar aquí (se procesará en detectAndTagTemplateStrings)
            if (!tag && !looksLikeCSS) {
                return match;
            }

            // Solo minificar si parece ser CSS (contiene { y })
            if (content.includes('{') && content.includes('}')) {
                // Minificar CSS: remover espacios innecesarios
                const minified = content
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios CSS
                    .replace(/\s+/g, ' ') // Normalizar múltiples espacios a uno
                    .replace(/\s*{\s*/g, '{') // Remover espacios alrededor de {
                    .replace(/\s*}\s*/g, '}') // Remover espacios alrededor de }
                    .replace(/\s*:\s*/g, ':') // Remover espacios alrededor de :
                    .replace(/\s*;\s*/g, ';') // Remover espacios alrededor de ;
                    .replace(/;\s*}/g, '}') // Remover ; antes de }
                    .replace(/,\s*/g, ',') // Remover espacios después de ,
                    .replace(/\s*>\s*/g, '>') // Remover espacios en selectores >
                    .replace(/\s*\+\s*/g, '+') // Remover espacios en selectores +
                    .replace(/\s*~\s*/g, '~') // Remover espacios en selectores ~
                    .trim();

                // Preservar el prefijo original (=, :, espacio)
                const prefix = match.charAt(0);
                const tagPart = tag || ''; // Si no hay tag, usar string vacío
                return `${prefix}${tagPart}\`${minified}\``;
            }

            // Si no es CSS, devolver sin cambios
            return match;
        });
    } catch (error) {
        logger.warn('[MinifyTemplate] Error minificando CSS:', error);
        return code;
    }
};

const minifyTemplate = (data: string, fileName: string) => {
    try {
        // ⚠️ SKIP: Archivos de definiciones de tipos TypeScript
        // Estos archivos NO contienen template strings HTML/CSS para minificar
        if (
            fileName.endsWith('.d.ts') ||
            fileName.includes('types') ||
            fileName.includes('type-')
        ) {
            return { code: data, error: null };
        }

        // ⚠️ SKIP: Archivos sin backticks (no tienen template strings)
        if (!data.includes('`')) {
            return { code: data, error: null };
        }

        // ✨ NUEVO FLUJO DE TRES PASOS:

        // PASO 1: Detectar y etiquetar template strings sin tags
        // Esto agrega tags temporales (__VERSA_TEMP__html` o __VERSA_TEMP__css`)
        // a template strings que contienen HTML o CSS pero no tienen tag
        let code = detectAndTagTemplateStrings(data);

        // PASO 2: Minificar CSS en tagged templates (html`...` y css`...`)
        // Esto incluye los tags temporales agregados en el paso 1
        code = minifyCSS(code);

        // PASO 3: Minificar templates HTML con minify-html-literals
        // Esta librería procesa todos los template strings con tags html`` y css``
        // Solo procesar si realmente hay tags html`` o css`` en el código
        let minifiedCode = code;
        if (
            code.includes('html`') ||
            code.includes('css`') ||
            code.includes(TEMP_HTML_TAG) ||
            code.includes(TEMP_CSS_TAG)
        ) {
            try {
                const minified = minifyHTMLLiterals(code, {
                    fileName,
                    ...defaultMinifyOptions,
                });
                if (minified && minified.code) {
                    minifiedCode = minified.code;
                }
            } catch (parseError) {
                // Si minifyHTMLLiterals falla (ej: encuentra código TypeScript en vez de HTML),
                // devolver el código sin minificar en lugar de fallar completamente
                logger.warn(
                    `[MinifyTemplate] minifyHTMLLiterals falló para ${fileName}, usando código sin minificar:`,
                    parseError instanceof Error
                        ? parseError.message
                        : String(parseError),
                );
                // minifiedCode ya tiene el valor de code
            }
        }

        // PASO 4: Remover tags temporales agregados en el paso 1
        // Esto convierte __VERSA_TEMP__html` de vuelta a ` para que el código
        // final no contenga los marcadores temporales
        const finalCode = removeTemporaryTags(minifiedCode);

        return { code: finalCode, error: null };
    } catch (error) {
        logger.warn(
            `[MinifyTemplate] Error minificando plantilla ${fileName}:`,
            error,
        );
        return { code: data, error };
    }
};

// ✨ Exportar funciones y configuración
export {
    defaultMinifyOptions,
    detectAndTagTemplateStrings,
    detectContentType,
    minifyTemplate,
    removeTemporaryTags,
};
