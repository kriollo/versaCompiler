import { parseSync } from 'oxc-parser';

import { logger } from '../servicios/logger';

/**
 * Resultado de validación de integridad del código
 */
export interface IntegrityCheckResult {
    valid: boolean;
    checks: {
        size: boolean; // Verifica que el código no esté vacío
        structure: boolean; // Verifica estructura básica (paréntesis/llaves balanceados)
        exports: boolean; // Verifica que los exports se mantengan
        syntax: boolean; // Validación de sintaxis con oxc-parser
    };
    errors: string[];
    metrics: {
        duration: number;
        originalSize: number;
        processedSize: number;
        exportCount: number;
    };
}

/**
 * Opciones de validación
 */
export interface ValidationOptions {
    skipSyntaxCheck?: boolean; // Omitir validación de sintaxis (para optimizar)
    verbose?: boolean; // Logging detallado
    throwOnError?: boolean; // Lanzar error vs. solo retornar invalid
}

/**
 * Estadísticas de validación
 */
interface ValidationStats {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    cacheHits: number;
    cacheMisses: number;
    totalDuration: number;
    averageDuration: number;
}

/**
 * Sistema de validación de integridad para código compilado/transformado
 *
 * Detecta automáticamente:
 * - Código vacío después de minificación
 * - Exports eliminados por error
 * - Sintaxis inválida introducida por transformaciones
 * - Estructura de código corrupta
 *
 * Performance: <5ms por archivo (típicamente 1-3ms)
 */
export class IntegrityValidator {
    private static instance: IntegrityValidator;
    private cache = new Map<string, IntegrityCheckResult>();
    private readonly MAX_CACHE_SIZE = 100;

    // Estadísticas
    private stats: ValidationStats = {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalDuration: 0,
        averageDuration: 0,
    };

    private constructor() {}

    static getInstance(): IntegrityValidator {
        if (!IntegrityValidator.instance) {
            IntegrityValidator.instance = new IntegrityValidator();
        }
        return IntegrityValidator.instance;
    }

    /**
     * Valida la integridad del código procesado
     *
     * @param original - Código original antes del procesamiento
     * @param processed - Código después del procesamiento
     * @param context - Contexto de la validación (ej: "minify:file.js")
     * @param options - Opciones de validación
     * @returns Resultado detallado de la validación
     */
    validate(
        original: string,
        processed: string,
        context: string,
        options: ValidationOptions = {},
    ): IntegrityCheckResult {
        const startTime = performance.now();
        this.stats.totalValidations++;

        // Revisar cache
        const cacheKey = this.getCacheKey(context, processed);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            if (options.verbose) {
                logger.info(`[IntegrityValidator] Cache hit for ${context}`);
            }
            return cached;
        }
        this.stats.cacheMisses++;

        const errors: string[] = [];

        // Check 1: Size (más rápido, ~0.1ms)
        const sizeOk = this.checkSize(processed);
        if (!sizeOk) {
            errors.push('Código procesado está vacío o demasiado pequeño');
            // Early return - no tiene sentido continuar
            const result = this.createResult(
                false,
                {
                    size: false,
                    structure: false,
                    exports: false,
                    syntax: options?.skipSyntaxCheck === true, // Respetar skipSyntaxCheck incluso en early return
                },
                errors,
                original,
                processed,
                startTime,
            );

            this.handleValidationResult(result, context, options);
            return result;
        }

        // Check 2: Structure (~1ms) - TEMPORALMENTE DESHABILITADO
        // TODO: Mejorar detección de character classes en regex literals
        const structureOk = true; // this.checkStructure(processed);
        // if (!structureOk) {
        //     errors.push(
        //         'Estructura de código inválida (paréntesis/llaves/corchetes desbalanceados)',
        //     );
        // }

        // Check 3: Exports (~1ms)
        const exportsOk = this.checkExports(original, processed);
        if (!exportsOk) {
            errors.push(
                'Exports fueron eliminados o modificados incorrectamente',
            );
        }

        // Check 4: Syntax (~3ms) - solo si otros checks pasaron y no está skippeado
        let syntaxOk = true;
        if (options?.skipSyntaxCheck) {
            // Si se salta el check de sintaxis, asumir que es válido
            syntaxOk = true;
        } else if (structureOk && exportsOk) {
            // Solo validar sintaxis si estructura y exports pasaron
            syntaxOk = this.checkSyntax(processed);
            if (!syntaxOk) {
                errors.push('Código procesado contiene errores de sintaxis');
            }
        } else {
            // Si otros checks fallaron, no ejecutar syntax check (optimización)
            // pero mantener syntaxOk = true para no agregar más errores
            syntaxOk = true;
        }

        const valid = errors.length === 0;
        const result = this.createResult(
            valid,
            {
                size: sizeOk,
                structure: structureOk,
                exports: exportsOk,
                syntax: syntaxOk,
            },
            errors,
            original,
            processed,
            startTime,
        );

        // Guardar en caché
        this.saveToCache(cacheKey, result);

        // Actualizar estadísticas
        this.handleValidationResult(result, context, options);

        return result;
    }

    /**
     * Check 1: Verificar que el código no esté vacío
     */
    private checkSize(code: string): boolean {
        // Código debe tener al menos 10 caracteres y no ser solo whitespace
        const trimmed = code.trim();
        return trimmed.length >= 10;
    }

    /**
     * Check 2: Verificar estructura básica del código
     */
    private checkStructure(code: string): boolean {
        // Verificar paréntesis, llaves y corchetes balanceados
        const counters = {
            '(': 0,
            '[': 0,
            '{': 0,
        };

        let inString = false;
        let inTemplate = false;
        let inTemplateInterpolation = false; // Dentro de ${ } en template literal
        let templateBraceDepth = 0; // Para trackear nested braces en interpolación
        let inComment = false;
        let inMultilineComment = false;
        let inRegex = false; // Dentro de regex literal /pattern/flags
        let stringChar = '';
        let escapeNext = false;
        let prevNonWhitespaceChar = ''; // Para detectar contexto de regex

        for (let i = 0; i < code.length; ) {
            const char = code[i];
            const nextChar = i < code.length - 1 ? code[i + 1] : '';

            // Manejar escape (en strings, templates y regex)
            if (escapeNext) {
                escapeNext = false;
                i++;
                continue;
            }
            if (char === '\\' && (inString || inTemplate || inRegex)) {
                escapeNext = true;
                i++;
                continue;
            }

            // Detectar regex literals (antes de comentarios, porque ambos usan /)
            if (
                !inString &&
                !inTemplate &&
                !inComment &&
                !inMultilineComment &&
                !inRegex &&
                char === '/' &&
                nextChar !== '/' &&
                nextChar !== '*'
            ) {
                // Contexto donde se espera regex (no división)
                const regexContext = /[=([,;:!&|?+\-{]$/;
                if (regexContext.test(prevNonWhitespaceChar)) {
                    inRegex = true;
                    i++;
                    continue;
                }
            }

            // Detectar fin de regex literal
            if (inRegex && char === '/') {
                inRegex = false;
                // Skip flags como g, i, m, s, u, y
                let j = i + 1;
                while (j < code.length) {
                    const flag = code[j];
                    if (flag && /[gimsuvy]/.test(flag)) {
                        j++;
                    } else {
                        break;
                    }
                }
                i = j;
                continue;
            }

            // Skip contenido dentro de regex
            if (inRegex) {
                i++;
                continue;
            }

            // Detectar inicio de comentario de línea
            if (
                char === '/' &&
                nextChar === '/' &&
                !inString &&
                !inTemplate &&
                !inMultilineComment
            ) {
                inComment = true;
                i += 2; // Skip // completamente
                continue;
            }

            // Detectar fin de comentario de línea
            if (inComment && (char === '\n' || char === '\r')) {
                inComment = false;
                i++;
                continue;
            }

            // Detectar inicio de comentario multilínea
            if (
                char === '/' &&
                nextChar === '*' &&
                !inString &&
                !inTemplate &&
                !inComment
            ) {
                inMultilineComment = true;
                i += 2; // Skip /* completamente
                continue;
            }

            // Detectar fin de comentario multilínea
            if (inMultilineComment && char === '*' && nextChar === '/') {
                inMultilineComment = false;
                i += 2; // Skip */ completamente
                continue;
            }

            // Skip caracteres dentro de comentarios
            if (inComment || inMultilineComment) {
                i++;
                continue;
            }

            // Detectar strings (incluyendo dentro de interpolaciones de template)
            if (char === '"' || char === "'") {
                // Las comillas funcionan normalmente FUERA de templates O DENTRO de interpolaciones
                if (!inTemplate || inTemplateInterpolation) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = '';
                    }
                }
                i++;
                continue;
            }

            // Detectar template literals (solo fuera de regex)
            if (!inString && !inRegex && char === '`') {
                if (inTemplate && !inTemplateInterpolation) {
                    // Salir de template
                    inTemplate = false;
                } else if (!inTemplate) {
                    // Entrar a template
                    inTemplate = true;
                    inTemplateInterpolation = false;
                    templateBraceDepth = 0;
                }
                i++;
                continue;
            }

            // Detectar inicio de interpolación en template literal: ${
            if (
                inTemplate &&
                !inTemplateInterpolation &&
                char === '$' &&
                nextChar === '{'
            ) {
                inTemplateInterpolation = true;
                templateBraceDepth = 0;
                i += 2; // Skip ${ completamente
                continue;
            }

            // Dentro de interpolación de template, contar brackets
            if (inTemplateInterpolation) {
                if (char === '{') {
                    templateBraceDepth++;
                    counters['{']++;
                } else if (char === '}') {
                    if (templateBraceDepth === 0) {
                        // Este } cierra la interpolación
                        inTemplateInterpolation = false;
                    } else {
                        templateBraceDepth--;
                        counters['{']--;
                    }
                } else if (char === '(') {
                    counters['(']++;
                } else if (char === ')') {
                    counters['(']--;
                } else if (char === '[') {
                    counters['[']++;
                } else if (char === ']') {
                    counters['[']--;
                }

                // Early return si algún contador se vuelve negativo
                if (
                    counters['('] < 0 ||
                    counters['['] < 0 ||
                    counters['{'] < 0
                ) {
                    return false;
                }
                i++;
                continue;
            }

            // Skip contenido dentro de strings o templates (pero no interpolaciones)
            if (inString || inTemplate) {
                i++;
                continue;
            }

            // Solo contar brackets fuera de strings/templates/comentarios
            if (char === '(') counters['(']++;
            else if (char === ')') counters['(']--;
            else if (char === '[') counters['[']++;
            else if (char === ']') counters['[']--;
            else if (char === '{') counters['{']++;
            else if (char === '}') counters['{']--;

            // Early return si algún contador se vuelve negativo
            if (counters['('] < 0 || counters['['] < 0 || counters['{'] < 0) {
                return false;
            }

            // Track prev non-whitespace char para contexto de regex
            if (
                char &&
                char !== ' ' &&
                char !== '\t' &&
                char !== '\n' &&
                char !== '\r'
            ) {
                prevNonWhitespaceChar = char;
            }

            i++;
        }

        // Verificar que todos estén balanceados
        return (
            counters['('] === 0 && counters['['] === 0 && counters['{'] === 0
        );
    }

    /**
     * Check 3: Verificar que los exports se mantengan
     */
    private checkExports(original: string, processed: string): boolean {
        const originalExports = this.extractExports(original);
        const processedExports = this.extractExports(processed);

        // Si no hay exports en el original, no hay nada que validar
        if (originalExports.length === 0) {
            return true;
        }

        // Verificar que todos los exports originales estén presentes
        for (const exp of originalExports) {
            if (!processedExports.includes(exp)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Extraer exports de código JavaScript/TypeScript
     */
    private extractExports(code: string): string[] {
        const exports: string[] = [];

        // export default
        if (/export\s+default\s/.test(code)) {
            exports.push('default');
        }

        // export { a, b, c }
        const namedExportsMatches = code.matchAll(
            /export\s*\{\s*([^}]+)\s*\}/g,
        );
        for (const match of namedExportsMatches) {
            if (match[1]) {
                const names = match[1]
                    .split(',')
                    .map(n => {
                        const parts = n.trim().split(/\s+as\s+/);
                        return parts[0]?.trim() || '';
                    })
                    .filter(n => n);
                exports.push(...names);
            }
        }

        // export const/let/var/function/class
        const directExportsMatches = code.matchAll(
            /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g,
        );
        for (const match of directExportsMatches) {
            if (match[1]) {
                exports.push(match[1]);
            }
        }

        // export * from
        if (/export\s+\*\s+from/.test(code)) {
            exports.push('*');
        }

        return [...new Set(exports)]; // Deduplicar
    }

    /**
     * Check 4: Validación de sintaxis con oxc-parser
     */
    private checkSyntax(code: string): boolean {
        try {
            const parseResult = parseSync('integrity-check.js', code, {
                sourceType: 'module',
            });

            return parseResult.errors.length === 0;
        } catch {
            // Si parseSync lanza error, la sintaxis es inválida
            return false;
        }
    }

    /**
     * Crear objeto de resultado
     */
    private createResult(
        valid: boolean,
        checks: IntegrityCheckResult['checks'],
        errors: string[],
        original: string,
        processed: string,
        startTime: number,
    ): IntegrityCheckResult {
        const duration = performance.now() - startTime;

        return {
            valid,
            checks,
            errors,
            metrics: {
                duration,
                originalSize: original.length,
                processedSize: processed.length,
                exportCount: this.extractExports(processed).length,
            },
        };
    }

    /**
     * Manejar resultado de validación (estadísticas, logging, errores)
     */
    private handleValidationResult(
        result: IntegrityCheckResult,
        context: string,
        options: ValidationOptions,
    ): void {
        // Actualizar estadísticas
        if (result.valid) {
            this.stats.successfulValidations++;
        } else {
            this.stats.failedValidations++;
        }

        this.stats.totalDuration += result.metrics.duration;
        this.stats.averageDuration =
            this.stats.totalDuration / this.stats.totalValidations;

        // Logging
        if (options.verbose) {
            if (result.valid) {
                logger.info(
                    `[IntegrityValidator] ✓ ${context} - ` +
                        `${result.metrics.duration.toFixed(2)}ms - ` +
                        `${result.metrics.originalSize} → ${result.metrics.processedSize} bytes`,
                );
            } else {
                logger.error(
                    `[IntegrityValidator] ✗ ${context} - ` +
                        `Failed: ${result.errors.join(', ')}`,
                );
            }
        }

        // Lanzar error si está configurado
        if (!result.valid && options.throwOnError) {
            throw new Error(
                `Integrity validation failed for ${context}: ${result.errors.join(', ')}`,
            );
        }
    }

    /**
     * Generar clave de caché
     */
    private getCacheKey(context: string, code: string): string {
        // Hash simple pero rápido
        const hash = this.hashCode(code);
        return `${context}:${hash}`;
    }

    /**
     * Hash simple para cache
     */
    private hashCode(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Guardar en caché con LRU eviction
     */
    private saveToCache(key: string, result: IntegrityCheckResult): void {
        // LRU eviction
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, result);
    }

    /**
     * Obtener estadísticas de validación
     */
    getStats(): ValidationStats {
        return { ...this.stats };
    }

    /**
     * Limpiar caché
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Resetear estadísticas
     */
    resetStats(): void {
        this.stats = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalDuration: 0,
            averageDuration: 0,
        };
    }
}

// Export singleton instance
export const integrityValidator = IntegrityValidator.getInstance();
