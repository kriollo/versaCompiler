import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';

import {
    createUnifiedErrorMessage,
    parseTypeScriptErrors,
} from './typescript-error-parser';

interface CompileResult {
    error: Error | null;
    data: string | null;
    lang?: string;
}

interface TypeCheckResult {
    diagnostics: ts.Diagnostic[];
    hasErrors: boolean;
}

/**
 * Crea un Language Service Host para validación de tipos eficiente.
 */
class TypeScriptLanguageServiceHost implements ts.LanguageServiceHost {
    private files: Map<string, { version: number; content: string }> =
        new Map();
    private compilerOptions: ts.CompilerOptions;

    constructor(compilerOptions: ts.CompilerOptions) {
        this.compilerOptions = compilerOptions;
    }

    addFile(fileName: string, content: string): void {
        const existing = this.files.get(fileName);
        this.files.set(fileName, {
            version: existing ? existing.version + 1 : 1,
            content,
        });
    }

    getCompilationSettings(): ts.CompilerOptions {
        return this.compilerOptions;
    }

    getScriptFileNames(): string[] {
        return Array.from(this.files.keys());
    }

    getScriptVersion(fileName: string): string {
        const file = this.files.get(fileName);
        return file ? file.version.toString() : '0';
    }

    getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
        const file = this.files.get(fileName);
        if (file) {
            return ts.ScriptSnapshot.fromString(file.content);
        }

        // Intentar leer el archivo del sistema de archivos para dependencias
        if (fs.existsSync(fileName)) {
            try {
                const content = fs.readFileSync(fileName, 'utf-8');
                return ts.ScriptSnapshot.fromString(content);
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    getCurrentDirectory(): string {
        return process.cwd();
    }

    getDefaultLibFileName(options: ts.CompilerOptions): string {
        return ts.getDefaultLibFilePath(options);
    }

    fileExists(path: string): boolean {
        return this.files.has(path) || fs.existsSync(path);
    }

    readFile(path: string): string | undefined {
        const file = this.files.get(path);
        if (file) {
            return file.content;
        }

        if (fs.existsSync(path)) {
            try {
                return fs.readFileSync(path, 'utf-8');
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    getNewLine(): string {
        return ts.sys.newLine;
    }
}

/**
 * Realiza validación de tipos usando TypeScript Language Service.
 * @param fileName - Nombre del archivo
 * @param content - Contenido del archivo
 * @param compilerOptions - Opciones del compilador
 * @returns Resultado de la validación de tipos
 */
const validateTypesWithLanguageService = (
    fileName: string,
    content: string,
    compilerOptions: ts.CompilerOptions,
): TypeCheckResult => {
    try {
        // Crear Language Service Host
        const host = new TypeScriptLanguageServiceHost(compilerOptions);
        host.addFile(fileName, content);

        // Crear Language Service
        const languageService = ts.createLanguageService(host);

        // Obtener diagnósticos de tipos
        const syntacticDiagnostics =
            languageService.getSyntacticDiagnostics(fileName);
        const semanticDiagnostics =
            languageService.getSemanticDiagnostics(fileName);

        // Combinar todos los diagnósticos
        const allDiagnostics = [
            ...syntacticDiagnostics,
            ...semanticDiagnostics,
        ];

        // Filtrar diagnósticos relevantes
        const filteredDiagnostics = allDiagnostics.filter(diag => {
            const messageText = ts.flattenDiagnosticMessageText(
                diag.messageText,
                '\n',
            );
            // Ignorar algunos errores comunes que no son críticos para transpilación
            return (
                !messageText.includes('Cannot find module') &&
                !messageText.includes('Cannot find name') &&
                diag.category === ts.DiagnosticCategory.Error
            );
        });

        return {
            diagnostics: filteredDiagnostics,
            hasErrors: filteredDiagnostics.length > 0,
        };
    } catch (error) {
        // En caso de error, devolver diagnóstico de error
        const errorDiagnostic: ts.Diagnostic = {
            file: undefined,
            start: undefined,
            length: undefined,
            messageText: `Error en validación de tipos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            category: ts.DiagnosticCategory.Error,
            code: 0,
        };

        return {
            diagnostics: [errorDiagnostic],
            hasErrors: true,
        };
    }
};

/**
 * Precompila el código TypeScript proporcionado con validación de tipos mejorada.
 * @param {string} data - El código TypeScript a precompilar.
 * @param {string} fileName - El nombre del archivo que contiene el código TypeScript.
 *
 * @returns {Promise<CompileResult>} - Un objeto con el código precompilado o un error.
 */
export const preCompileTS = async (
    data: string,
    fileName: string,
): Promise<CompileResult> => {
    try {
        // Si el código está vacío, devolver cadena vacía
        if (!data.trim()) {
            return { error: null, data: '', lang: 'ts' };
        }

        // Buscar tsconfig.json en el directorio del archivo o sus padres
        const fileDir = path.dirname(fileName);
        const configPath =
            ts.findConfigFile(fileDir, ts.sys.fileExists, 'tsconfig.json') ||
            path.resolve(process.cwd(), 'tsconfig.json');

        if (!configPath) {
            throw new Error('No se pudo encontrar tsconfig.json');
        }

        // Cargar y parsear tsconfig.json
        const { config, error: configError } = ts.readConfigFile(
            configPath,
            ts.sys.readFile,
        );
        if (configError) {
            throw new Error(
                `Error al leer tsconfig.json: ${configError.messageText}`,
            );
        }

        // Parsear la configuración
        const parsedConfig = ts.parseJsonConfigFileContent(
            config,
            ts.sys,
            path.dirname(configPath),
        );

        // Configurar opciones del compilador
        const compilerOptions: ts.CompilerOptions = {
            ...parsedConfig.options,
            // Opciones para validación de tipos mejorada
            strict: true,
            noImplicitAny: true,
            noImplicitReturns: true,
            noUnusedLocals: false, // Evitar errores por variables no usadas en snippets
            noUnusedParameters: false, // Evitar errores por parámetros no usados en snippets
            // Opciones para transpilación
            noEmit: false,
            noEmitOnError: false,
        };

        // 1. Primero, validar tipos usando Language Service para validación completa
        const typeCheckResult = validateTypesWithLanguageService(
            fileName,
            data,
            compilerOptions,
        );
        if (typeCheckResult.hasErrors) {
            // Usar el parser limpio para generar mensajes de error más legibles
            const cleanErrors = parseTypeScriptErrors(
                typeCheckResult.diagnostics,
                fileName,
            );
            const errorMessage = createUnifiedErrorMessage(cleanErrors);
            return { error: new Error(errorMessage), data: null, lang: 'ts' };
        }

        // 2. Si la validación de tipos pasa, usar transpileModule para generación de código
        const transpileResult = ts.transpileModule(data, {
            compilerOptions,
            fileName,
            reportDiagnostics: false, // Ya validamos con Language Service
            transformers: undefined,
            moduleName: path.basename(fileName, path.extname(fileName)),
        });

        const output = transpileResult.outputText;

        // Remover "export {};" si es la única línea
        if (output.trim() === 'export {};') {
            return { error: null, data: '', lang: 'ts' };
        }

        return { error: null, data: output, lang: 'ts' };
    } catch (error) {
        return {
            error:
                error instanceof Error ? error : new Error('Error desconocido'),
            data: null,
            lang: 'ts',
        };
    }
};
