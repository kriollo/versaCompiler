import { env } from 'node:process';
import { pathToFileURL } from 'node:url'; // Importar pathToFileURL
import { logger } from './pino.ts';

export type typeLinter = {
    name: string;
    bin: string;
    configFile: string;
    fix?: boolean;
};

export async function readConfig() {
    try {
        if (!env.PATH_CONFIG_FILE) {
            throw new Error(
                'La variable de entorno PATH_CONFIG_FILE no está definida.',
            );
        }
        // Convertir la ruta del archivo a una URL file://
        const configFileUrl = pathToFileURL(env.PATH_CONFIG_FILE).href;
        const data = await import(configFileUrl); // Usar la URL convertida
        if (!data) {
            throw new Error('No se pudo leer el archivo de configuración.');
        }
        const tsConfig = data.default || data;

        if (!tsConfig.compilerOptions || !tsConfig.compilerOptions.pathsAlias) {
            throw new Error(
                "El archivo de configuración no contiene 'compilerOptions' o 'pathsAlias'.",
            );
        }

        const pathAlias = tsConfig.compilerOptions?.pathsAlias || {};

        // Eliminar /* de las rutas de alias
        for (const key in pathAlias) {
            const values = pathAlias[key];
            for (let i = 0; i < values.length; i++) {
                values[i] = values[i].replace('/*', '');
            }
        }
        env.PATH_ALIAS = JSON.stringify(pathAlias);

        env.tailwindcss = JSON.stringify(tsConfig?.tailwindConfig) || 'false';
        env.proxyUrl = tsConfig?.proxyConfig?.proxyUrl || '';
        env.AssetsOmit = tsConfig?.proxyConfig?.assetsOmit || false;
        env.linter = JSON.stringify(tsConfig?.linter || false);
        env.tsconfigFile = tsConfig?.tsconfig || './tsconfig.json';

        env.PATH_SOURCE = tsConfig?.compilerOptions.sourceRoot || './src';
        env.PATH_SOURCE = (env.PATH_SOURCE || '').endsWith('/')
            ? (env.PATH_SOURCE || '').slice(0, -1)
            : env.PATH_SOURCE || '';

        const outDir = tsConfig?.compilerOptions.outDir || './dist';
        env.PATH_DIST = outDir.endsWith('/') ? outDir.slice(0, -1) : outDir;

        env.aditionalWatch = JSON.stringify(tsConfig?.aditionalWatch || []);

        if (!tsConfig.compilerOptions.sourceRoot) env.tsConfig = tsConfig;
        return true;
    } catch (error) {
        logger.error(
            `🚩 :Error al leer el archivo ${env.PATH_CONFIG_FILE}: ${error}`,
            error,
        );
        return false;
    }
}

export async function initConfig() {
    try {
        const fs = await import('fs');
        const path = await import('path');

        const configPath = path.resolve(
            process.cwd(),
            env.PATH_CONFIG_FILE || 'versacompile.config.ts',
        );

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
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
        },
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
