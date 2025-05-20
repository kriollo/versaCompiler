import { readFile } from 'node:fs/promises';
import { env } from 'node:process';
import { logger } from './pino.ts';

export async function readTsConfig() {
    try {
        const data = await readFile(env.PATH_CONFIG_FILE, {
            encoding: 'utf-8',
        });
        if (!data) {
            logger.error('🚩 :Error al leer el archivo tsconfig.json');
            return false;
        }
        const tsConfig = JSON.parse(data);

        if (!tsConfig.compilerOptions || !tsConfig.compilerOptions.paths) {
            logger.error(
                `❌ Error: El archivo '${env.PATH_CONFIG_FILE}' existe, pero no contiene la sección 'compilerOptions.paths' necesaria para los alias de ruta.`,
            );
            process.exit(1); // Detener ejecución
        }

        const pathAlias = tsConfig.compilerOptions.paths || {};

        // Eliminar /* de las rutas de alias
        for (const key in pathAlias) {
            const values = pathAlias[key];
            for (let i = 0; i < values.length; i++) {
                values[i] = values[i].replace('/*', '');
            }
        }
        env.PATH_ALIAS = JSON.stringify(pathAlias);

        env.tailwindcss = tsConfig.tailwindcss || false;
        env.proxyUrl = tsConfig.versaCompiler?.proxyConfig?.proxyUrl || '';
        env.AssetsOmit =
            tsConfig.versaCompiler?.proxyConfig?.assetsOmit || false;

        env.PATH_SOURCE = tsConfig.compilerOptions.sourceRoot || './src';
        env.PATH_SOURCE = (env.PATH_SOURCE || '').endsWith('/')
            ? (env.PATH_SOURCE || '').slice(0, -1)
            : env.PATH_SOURCE || '';

        const outDir = tsConfig.compilerOptions.outDir || './dist';
        env.PATH_DIST = outDir.endsWith('/') ? outDir.slice(0, -1) : outDir;

        env.aditionalWatch = JSON.stringify(
            tsConfig.versaCompiler?.aditionalWatch || [],
        );

        // logger.info(chalk.green(`PATH_SOURCE: ${env.PATH_SOURCE}`));
        // logger.info(chalk.green(`PATH_DIST: ${env.PATH_DIST}\n`));

        if (!tsConfig.compilerOptions.sourceRoot) env.tsConfig = tsConfig;
        return true;
    } catch (error) {
        logger.error('🚩 :Error al leer el archivo tsconfig.json', error);
        return false;
    }
}
