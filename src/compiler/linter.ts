import { env } from 'node:process';
import { logger } from '../servicios/logger';
import {
    ESLintNode,
    type ESLintMultiFormatResult,
} from './../wrappers/eslint-node';
import { OxlintNode } from './../wrappers/oxlint-node';

// Tipos para el servicio de linting
export interface LinterResult {
    success: boolean;
    eslintResult?: ESLintMultiFormatResult | null;
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
        if (!oxlintConfig || !oxlintConfig.bin) {
            // configFile es opcional si Oxlint lo encuentra por defecto
            logger.warn(
                '⚠️ Oxlint no se ejecutará: falta la propiedad "bin" en la configuración.',
            );
            return false; // O un resultado que indique fallo/no ejecución
        }

        const oxlintRunner = new OxlintNode({
            binPath: oxlintConfig.bin, // Usar bin de LinterConfig
            configFile: oxlintConfig.configFile, // Usar configFile de LinterConfig
            fix: oxlintConfig.fix || false,
            formats: ['json'], // Mantener json para parseo consistente si es necesario
            tsconfigPath: env.tsconfigFile || './tsconfig.json', // Esto es específico de OxlintNode
            // ... cualquier otra opción específica de oxlintConfig.oxlintConfig
            ...oxlintConfig.oxlintConfig,
        });

        const targetPaths = oxlintConfig.paths || [env.PATH_SOURCE || './src']; // Usar paths de LinterConfig
        return await oxlintRunner.run(targetPaths);
    } catch (err) {
        logger.error('❌ :Error al compilar OxLint:', err);
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
        if (!config || !config.bin) {
            // configFile es opcional si ESLint lo encuentra por defecto
            logger.warn(
                '⚠️ ESLint no se ejecutará: falta la propiedad "bin" en la configuración.',
            );
            // Devolver un ESLintMultiFormatResult vacío o que indique error
            return {
                json: {
                    results: [],
                    errorCount: 0,
                    warningCount: 0,
                    fixableErrorCount: 0,
                    fixableWarningCount: 0,
                    fatalErrorCount: 0,
                },
            };
        }
        // Configuración por defecto para el proyecto
        const eslintRunner = new ESLintNode({
            binPath: config.bin, // Usar bin de LinterConfig
            configFile: config.configFile, // Usar configFile de LinterConfig
            fix: config.fix || false,
            // Las siguientes son opciones más específicas de ESLintNode,
            // podrían moverse a config.eslintConfig si se prefiere mayor anidación.
            extensions: ['.vue', '.ts', '.js'], // Ejemplo, podría venir de eslintConfig
            formats: config.format ? [config.format] : ['stylish', 'json'], // Usar format de LinterConfig
            cache: true, // Ejemplo, podría venir de eslintConfig
            maxWarnings: 100, // Ejemplo, podría venir de eslintConfig
            // Sobrescribir o añadir con configuraciones específicas de eslintConfig
            ...config.eslintConfig,
        });

        const targetPaths = config.paths || ['src/']; // Usar paths de LinterConfig
        const result = await eslintRunner.run(targetPaths);

        return result;
    } catch (err) {
        logger.error('❌ Error al ejecutar ESLint:', err);
        throw err;
    }
}

