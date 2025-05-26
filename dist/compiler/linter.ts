import { env } from 'node:process';
import {
    ESLintNode,
    type ESLintMultiFormatResult,
    type ESLintResult,
} from './../wrappers/eslint-node.ts';
import { OxlintNode } from './../wrappers/oxlint-node.ts';

// Tipos para el servicio de linting
export interface LinterResult {
    success: boolean;
    eslintResult?: ESLintMultiFormatResult | ESLintResult;
    oxlintResult?: any;
    message: string;
    errorCount: number;
    warningCount: number;
    duration: number;
}

export interface LinterConfig {
   bin?: string;
   configFile?: string;
   fix?: boolean;
   format?: 'json' | 'stylish' | 'compact';
   eslintConfig?: any;
   oxlintConfig?: any;
   paths?: string[];
}

export async function OxLint(oxlintConfig: LinterConfig = {}) {
    try {
        if (!oxlintConfig || !oxlintConfig.bin || !oxlintConfig.configFile) {
            return false;
        }

        const oxlintRunner = new OxlintNode({
            fix: oxlintConfig?.fix || false, // Intentar arreglar problemas
            configFile: oxlintConfig.configFile, // Usar un archivo de configuración específico
            binPath: oxlintConfig.bin, // Ruta al binario de OxLint
            formats: ['json'], // Formatos de salida
            tsconfigPath: env.tsconfigFile || './tsconfig.json', // Ruta al archivo tsconfig.json
        });

        return await oxlintRunner.run([env.PATH_SOURCE || './src']);
    } catch (err) {
        console.error('❌ :Error al compilar OxLint:', err);
        throw err;
    }
}

/**
 * Ejecuta ESLint en el proyecto con estructura compatible con Oxlint
 */
export async function ESLint(
    config: LinterConfig = {},
): Promise<ESLintMultiFormatResult> {
    try {
        // Configuración por defecto para el proyecto
        const eslintRunner = new ESLintNode({
            fix: config.fix || false,
            extensions: ['.vue', '.ts', '.js'],
            formats: config.format ? [config.format] : ['stylish', 'json'],
            cache: true,
            maxWarnings: 100,
            ...config.eslintConfig,
        });

        const targetPaths = config.paths || ['src/'];
        const result = await eslintRunner.run(targetPaths);

        return result;
    } catch (err) {
        console.error('❌ Error al ejecutar ESLint:', err);
        throw err;
    }
}
