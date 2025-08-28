import { normalize, relative, resolve } from 'node:path';
import * as process from 'node:process';
import { env } from 'node:process';
import { pathToFileURL } from 'node:url';

import { logger } from './logger';

export type typeLinter = {
    name: string;
    bin: string;
    configFile: string;
    fix?: boolean;
    paths?: string[];
};

export type BundlerEntry = {
    name: string;
    fileInput: string;
    fileOutput: string;
};

export type typeConfig = {
    tsconfig?: string;
    compilerOptions: {
        sourceRoot?: string;
        outDir?: string;
        pathsAlias: Record<string, string[]>;
    };
    proxyConfig?: {
        proxyUrl?: string;
        assetsOmit?: boolean;
    };
    aditionalWatch?: string[];
    tailwindConfig?:
        | {
              bin: string;
              input: string;
              output: string;
          }
        | false;
    linter?: typeLinter[] | false;
    bundlers?: BundlerEntry[] | false;
};

/**
 * Utilidades de seguridad para validar configuraciones
 */
const MAX_PATH_LENGTH = 260; // Windows MAX_PATH limit
const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB max config size
const ALLOWED_PATH_CHARS = /^[a-zA-Z0-9.\-_/\\:@ ()[\]]+$/;
const DANGEROUS_PATTERNS = [
    /\.\./, // Path traversal
    /[;&|`$]/, // Command injection characters
    /\$\(/, // Command substitution
    /`.*`/, // Backtick execution
    /\|\s*[a-zA-Z]/, // Pipe to commands
];

export function validatePath(pathStr: string): boolean {
    if (!pathStr || typeof pathStr !== 'string') {
        return false;
    }

    if (pathStr.length > MAX_PATH_LENGTH) {
        logger.warn(`Ruta demasiado larga: ${pathStr.length} caracteres`);
        return false;
    }

    // Normalizar la ruta para detectar path traversal
    const normalizedPath = normalize(pathStr);
    const resolvedPath = resolve(process.cwd(), normalizedPath);
    const relativePath = relative(process.cwd(), resolvedPath);

    // Verificar si la ruta trata de salir del directorio actual
    if (relativePath.startsWith('..') || normalizedPath.includes('..')) {
        logger.error(`Detectado intento de path traversal: ${pathStr}`);
        return false;
    }

    // Verificar caracteres permitidos
    if (!ALLOWED_PATH_CHARS.test(pathStr)) {
        logger.error(`Caracteres no permitidos en la ruta: ${pathStr}`);
        return false;
    }

    return true;
}

export function validateCommand(command: string): boolean {
    if (!command || typeof command !== 'string') {
        return false;
    }

    if (command.length > MAX_PATH_LENGTH) {
        logger.warn(`Comando demasiado largo: ${command.length} caracteres`);
        return false;
    }

    // Verificar patrones peligrosos
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
            logger.error(`Detectado patrón peligroso en comando: ${command}`);
            return false;
        }
    }

    // Solo permitir comandos que terminen en extensiones seguras
    const allowedExecutables = ['.exe', '.cmd', '.bat', '.sh', '.js', '.ts'];
    const hasAllowedExtension = allowedExecutables.some(
        ext =>
            command.toLowerCase().includes(ext) ||
            command.startsWith('./node_modules/.bin/') ||
            command.startsWith('npx '),
    );

    if (!hasAllowedExtension) {
        logger.error(`Comando no permitido: ${command}`);
        return false;
    }

    return true;
}

export function validateBundlers(bundlers: any): bundlers is BundlerEntry[] {
    if (!Array.isArray(bundlers)) {
        logger.error('bundlers debe ser un array');
        return false;
    }

    for (const entry of bundlers) {
        if (!entry || typeof entry !== 'object') {
            logger.error('Cada entrada de bundler debe ser un objeto');
            return false;
        }

        if (!entry.name || typeof entry.name !== 'string') {
            logger.error('Cada entrada de bundler debe tener un nombre válido');
            return false;
        }

        if (!entry.fileInput || typeof entry.fileInput !== 'string') {
            logger.error('Cada entrada de bundler debe tener un fileInput válido');
            return false;
        }

        if (!validatePath(entry.fileInput)) {
            logger.error(`Ruta de entrada no válida: ${entry.fileInput}`);
            return false;
        }

        if (!entry.fileOutput || typeof entry.fileOutput !== 'string') {
            logger.error('Cada entrada de bundler debe tener un fileOutput válido');
            return false;
        }

        if (!validatePath(entry.fileOutput)) {
            logger.error(`Ruta de salida no válida: ${entry.fileOutput}`);
            return false;
        }
    }

    return true;
}

export function validateConfigStructure(config: any): config is typeConfig {
    if (!config || typeof config !== 'object') {
        logger.error('La configuración debe ser un objeto');
        return false;
    }

    if (!config.compilerOptions || typeof config.compilerOptions !== 'object') {
        logger.error('compilerOptions es requerido y debe ser un objeto');
        return false;
    }

    if (!config.compilerOptions.pathsAlias || typeof config.compilerOptions.pathsAlias !== 'object') {
        logger.error('pathsAlias es requerido y debe ser un objeto');
        return false;
    }

    // Validar pathsAlias
    for (const [key, value] of Object.entries(config.compilerOptions.pathsAlias)) {
        if (!Array.isArray(value)) {
            logger.error(`pathsAlias["${key}"] debe ser un array`);
            return false;
        }

        for (const p of value) {
            if (typeof p !== 'string') {
                logger.error(`Todas las rutas en pathsAlias["${key}"] deben ser strings`);
                return false;
            }

            if (!validatePath(p.replace('/*', ''))) {
                logger.error(`Ruta no válida en pathsAlias["${key}"]: ${p}`);
                return false;
            }
        }
    }

    // Validar sourceRoot si existe
    if (config.compilerOptions.sourceRoot && !validatePath(config.compilerOptions.sourceRoot)) {
        return false;
    }

    // Validar outDir si existe
    if (config.compilerOptions.outDir && !validatePath(config.compilerOptions.outDir)) {
        return false;
    }

    // Validar linter si existe
    if (config.linter && config.linter !== false) {
        if (!Array.isArray(config.linter)) {
            logger.error('linter debe ser un array o false');
            return false;
        }

        for (const linter of config.linter) {
            if (!validateLinter(linter)) {
                return false;
            }
        }
    }

    return true;
}

export function validateLinter(linter: any): linter is typeLinter {
    if (!linter || typeof linter !== 'object') {
        logger.error('Cada linter debe ser un objeto');
        return false;
    }

    if (!linter.name || typeof linter.name !== 'string') {
        logger.error('Linter debe tener un nombre válido');
        return false;
    }

    if (!linter.bin || typeof linter.bin !== 'string') {
        logger.error('Linter debe tener un bin válido');
        return false;
    }

    if (!validateCommand(linter.bin)) {
        return false;
    }

    if (!linter.configFile || typeof linter.configFile !== 'string') {
        logger.error('Linter debe tener un configFile válido');
        return false;
    }

    if (!validatePath(linter.configFile)) {
        return false;
    }

    if (linter.paths && !Array.isArray(linter.paths)) {
        logger.error('linter.paths debe ser un array');
        return false;
    }

    if (linter.paths) {
        for (const p of linter.paths) {
            if (typeof p !== 'string' || !validatePath(p)) {
                logger.error(`Ruta de linter no válida: ${p}`);
                return false;
            }
        }
    }
    if (linter.fix !== undefined && typeof linter.fix !== 'boolean') {
        logger.error('Linter fix debe ser un booleano');
        return false;
    }
    return true;
}

export function validateConfigSize(config: any): boolean {
    try {
        const configString = JSON.stringify(config);
        if (configString.length > MAX_CONFIG_SIZE) {
            logger.error(`Configuración demasiado grande: ${configString.length} bytes`);
            return false;
        }
        return true;
    } catch (error) {
        logger.error('Error al serializar configuración (posible referencia circular):', error);
        return false;
    }
}

/**
 * Limpia y normaliza una ruta eliminando barras finales
 */
function cleanPath(path: string): string {
    if (!path || typeof path !== 'string') {
        return '';
    }
    return path.endsWith('/') || path.endsWith('\\') ? path.slice(0, -1) : path;
}

/**
 * Serializa de forma segura un objeto a JSON
 */
function safeJsonStringify(obj: any, fallback: string = 'false'): string {
    try {
        if (obj === null || obj === undefined) {
            return fallback;
        }
        return JSON.stringify(obj);
    } catch (error) {
        logger.warn(
            'Error al serializar objeto, usando valor por defecto:',
            error,
        );
        return fallback;
    }
}

/**
 * Wrapper para el import dinámico que permite mejor testing
 */
export async function dynamicImport(url: string): Promise<any> {
    return import(url);
}

/**
 * Timeout wrapper para promises
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
): Promise<T> {
    const timeoutPromise = new Promise<T>((resolve, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    );
    return Promise.race([promise, timeoutPromise]);
}

/**
 * Lee y valida el archivo de configuración de forma segura
 */
export async function readConfig(): Promise<boolean> {
    try {
        // Validar variable de entorno
        if (!env.PATH_CONFIG_FILE) {
            throw new Error(
                'La variable de entorno PATH_CONFIG_FILE no está definida.',
            );
        }

    // Validar la ruta del archivo de configuración
    if (!validatePath(env.PATH_CONFIG_FILE)) {
            throw new Error(
                `Ruta de configuración no válida: ${env.PATH_CONFIG_FILE}`,
            );
        }

        // Convertir la ruta del archivo a una URL file://
        const configFileUrl = pathToFileURL(env.PATH_CONFIG_FILE).href;

        // Importar con timeout para prevenir ataques DoS
        const importPromise = dynamicImport(configFileUrl);
        const data = await withTimeout(
            importPromise,
            10000,
            'Timeout al cargar configuración',
        );

        if (!data) {
            throw new Error('No se pudo leer el archivo de configuración.');
        }

        const tsConfig = data.default || data;

    // Validar tamaño de configuración
    if (!validateConfigSize(tsConfig)) {
            throw new Error(
                'Configuración demasiado grande o contiene referencias circulares.',
            );
        }

    // Validar estructura de configuración
    if (!validateConfigStructure(tsConfig)) {
            throw new Error(
                'El archivo de configuración no tiene una estructura válida.',
            );
        }

        // Procesar pathsAlias de forma segura
        const pathAlias = { ...tsConfig.compilerOptions.pathsAlias }; // Eliminar /* de las rutas de alias
        for (const key in pathAlias) {
            const values = pathAlias[key];
            if (values && Array.isArray(values)) {
                for (let i = 0; i < values.length; i++) {
                    if (
                        typeof values[i] === 'string' &&
                        values[i] !== undefined
                    ) {
                        values[i] = values[i]!.replace('/*', '');
                    }
                }
            }
        }

        // Establecer variables de entorno de forma segura
        env.PATH_ALIAS = safeJsonStringify(pathAlias, '{}');
        env.tailwindcss = safeJsonStringify(tsConfig?.tailwindConfig, 'false');
    env.proxyUrl = String(tsConfig?.proxyConfig?.proxyUrl || '');
    env.AssetsOmit = String(tsConfig?.proxyConfig?.assetsOmit || false);
        env.linter = safeJsonStringify(tsConfig?.linter, 'false');
        env.tsconfigFile = tsConfig?.tsconfig || './tsconfig.json';

        // Validar y limpiar rutas
        const sourceRoot = cleanPath(
            tsConfig?.compilerOptions?.sourceRoot || './src',
        );
        const outDir = cleanPath(tsConfig?.compilerOptions?.outDir || './dist');

    if (!validatePath(sourceRoot)) {
            throw new Error(`sourceRoot no válido: ${sourceRoot}`);
        }
    if (!validatePath(outDir)) {
            throw new Error(`outDir no válido: ${outDir}`);
        }

        env.PATH_SOURCE = sourceRoot;
        env.PATH_DIST = outDir;
        env.aditionalWatch = safeJsonStringify(tsConfig?.aditionalWatch, '[]');
        env.bundlers = safeJsonStringify(tsConfig?.bundlers, 'false');

        // Configuración adicional para compatibilidad
        if (!tsConfig.compilerOptions.sourceRoot) {
            env.tsConfig = safeJsonStringify(tsConfig, '{}');
        }

        logger.info('✅ Configuration loaded and validated successfully');
        return true;
    } catch (error) {
        logger.error(
            `🚩 Error al leer el archivo ${env.PATH_CONFIG_FILE}: ${error}`,
            error,
        );
        return false;
    }
}

/**
 * Inicializa un archivo de configuración seguro por defecto
 */
export async function initConfig(): Promise<boolean> {
    try {
        const fs = await dynamicImport('fs');
        const path = await dynamicImport('path');

        const configPath = path.resolve(
            process.cwd(),
            env.PATH_CONFIG_FILE || 'versacompile.config.ts',
        );

    // Validar que la ruta de destino sea segura
    if (!validatePath(configPath)) {
            throw new Error(`Ruta de configuración no válida: ${configPath}`);
        }

        if (fs.existsSync(configPath)) {
            logger.warn(
                `🚩 El archivo de configuración '${env.PATH_CONFIG_FILE}' ya existe.`,
            );
            return true;
        }

        const configContent = `// Archivo de configuración de VersaCompiler
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            'P@/*': ['public/*'],
        },
    },
    proxyConfig: {
        proxyUrl: '',
        assetsOmit: true,
    },
    aditionalWatch: ['./app/templates/**/*.twig', './app/templates/**/*.html'],
    // puede dejar en false o no agregarlo si no quiere que se ejecute el compilador de tailwind
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './.eslintrc.json',
            fix: false,
            paths: ['src/']
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/']
        },
    ],
    // Configuración de bundlers
    bundlers: [
        {
            name: 'appLoader',
            fileInput: './public/module/appLoader.js',
            fileOutput: './public/module/appLoader.prod.js',
        },
        {
            name: 'mainApp',
            fileInput: './src/main.ts',
            fileOutput: './dist/main.bundle.js',
        }
    ],
};
`;

        fs.writeFileSync(configPath, configContent, 'utf8');
        logger.info(
            `🚩 Archivo de configuración '${env.PATH_CONFIG_FILE}' creado correctamente.`,
        );
        return true;
    } catch (error) {
        logger.error(
            `🚩 Error al crear el archivo de configuración: ${error}`,
            error,
        );
        return false;
    }
}
