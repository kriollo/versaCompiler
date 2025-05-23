import chalk from 'chalk';
import path from 'node:path'; // Importar el módulo path
import { env } from 'node:process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { browserSyncServer } from './servicios/browserSync.ts';
import { initChokidar } from './servicios/chokidar.ts';
import { logger } from './servicios/pino.ts';

import { initCompileAll } from './compiler/compile.ts';
import { initConfig, readConfig } from './servicios/readConfig.ts';

// Obtener el directorio del archivo actual (dist/)
env.PATH_PROY = process.cwd();

env.PATH_CONFIG_FILE = path.resolve(process.cwd(), 'versacompile.config.ts');

function stopCompile() {
    logger.info('VersaCompiler cerrado correctamente');
}

async function main() {
    if (!(await readConfig())) {
        process.exit(1);
    }

    let yargInstance = yargs(hideBin(process.argv))
        .scriptName('versa')
        .usage(
            chalk.blue('VersaCompiler') + ' - Compilador de archivos Vue/TS/JS',
        )
        .option('all', {
            type: 'boolean',
            description: 'Compilar todos los archivos',
        })
        .option('prod', {
            type: 'boolean',
            description: 'Modo producción',
        })
        .option('init', {
            type: 'boolean',
            description: 'Inicializar la configuración',
        });

    // Definir la opción tailwind dinámicamente
    // Asumiendo que env.TAILWIND es una cadena que podría ser 'true', 'false', o undefined
    if (env.tailwindcss !== 'false') {
        yargInstance = yargInstance.option('tailwind', {
            type: 'boolean',
            description:
                'Habilitar/Deshabilitar compilación de Tailwind CSS. Por defecto --tailwind=true',
            // No se establece un 'default' aquí para que argv.tailwind sea undefined si no se usa el flag,
            // permitiendo que la lógica posterior decida basada en la configuración global.
        });
    }

    const argv = await yargInstance.help().parse();

    try {
        console.log(
            `\n\n` +
                chalk.blue('VersaCompiler') +
                ' - Servidor de Desarrollo HRM y compilador de archivos Vue/ts/js\n\n',
        );

        if (argv.init) {
            logger.info('Iniciando la configuración...');
            await initConfig();
            process.exit(0);
        }
        env.isPROD = argv.prod ? 'true' : 'false';
        env.isALL = argv.all ? 'true' : 'false';
        env.TAILWIND = argv.tailwind === undefined ? 'true' : argv.tailwind;
        logger.info(chalk.green(`isAll: ${env.isALL}`));
        logger.info(chalk.green(`isProd: ${env.isPROD}`));
        logger.info(chalk.green(`isTailwind: ${env.TAILWIND}`));

        if (argv.all) {
            logger.info(chalk.green('Compilando todos los archivos...'));
            await initCompileAll();
            process.exit(0);
        }

        const bs = await browserSyncServer();
        if (!bs) {
            process.exit(1);
        }
        const watch = await initChokidar(bs);
        if (!watch) {
            process.exit(1);
        }
        process.on('SIGINT', async () => {
            bs.exit();
            watch.close();
            stopCompile();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            stopCompile();
            process.exit(0);
        });
    } catch (error) {
        logger.error('Error en la aplicación:', error);
        stopCompile();
        process.exit(1);
    }
}

main();
