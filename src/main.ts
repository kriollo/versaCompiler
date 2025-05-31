#!/usr/bin/env node
import path from 'node:path'; // Importar el módulo path
import { env } from 'node:process';

import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { initCompileAll, runLinter, compileFile } from './compiler/compile';
import { browserSyncServer } from './servicios/browserSync';
import { cleanOutputDir, initChokidar } from './servicios/chokidar';
import { logger } from './servicios/logger';
import { initConfig, readConfig } from './servicios/readConfig';

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
        .option('init', {
            type: 'boolean',
            description: 'Inicializar la configuración',
        })
        .option('watch', {
            type: 'boolean',
            description: 'Habilitar el modo de observación (watch)',
            default: false, // Por defecto, el modo watch está habilitado
        })
        .alias('w', 'watch')        .option('all', {
            type: 'boolean',
            description: 'Compilar todos los archivos',
        })
        .option('file', {
            type: 'string',
            description: 'Compilar un archivo específico',
            alias: 'f',
        })
        .option('prod', {
            type: 'boolean',
            description: 'Modo producción',
        })
        .alias('p', 'prod')
        .option('verbose', {
            type: 'boolean',
            description: 'Habilitar salida detallada (verbose)',
            default: false, // Por defecto, verbose está deshabilitado
        })
        .alias('v', 'verbose')
        .option('clean', {
            type: 'boolean',
            description: 'Limpiar la salida antes de compilar',
            default: false, // Por defecto, clean está deshabilitado
        })
        .option('lint-only', {
            type: 'boolean',
            description: 'Ejecutar solo el linter, sin compilar',
            default: false,
        });

    // Definir la opción tailwind dinámicamente
    // Asumiendo que env.TAILWIND es una cadena que podría ser 'true', 'false', o undefined
    if (env.tailwindcss !== 'false') {
        yargInstance = yargInstance.option('tailwind', {
            type: 'boolean',
            description:
                'Habilitar/Deshabilitar compilación de Tailwind CSS. Por defecto --tailwind=true',
            default: false,
        });
    }

    if (env.linter !== 'false') {
        yargInstance = yargInstance.option('linter', {
            type: 'boolean',
            description:
                'Habilitar/Deshabilitar el linter. Por defecto --linter=true',
            default: false,
        });
    }    const argv = await yargInstance
        .help()
        .alias('h', 'help')
        .command(
            '* [files...]',
            'Compilar archivos específicos',
            (yargs) => {
                return yargs.positional('files', {
                    describe: 'Archivos para compilar',
                    type: 'string',
                    array: true,
                });
            }
        )
        .parse() as any; // Usar any temporalmente para evitar problemas de tipos

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
        env.TAILWIND =
            argv.tailwind === undefined ? 'true' : String(argv.tailwind);
        env.ENABLE_LINTER =
            argv.linter === undefined ? 'true' : String(argv.linter);
        env.VERBOSE = argv.verbose ? 'true' : 'false';        logger.info(chalk.green('Configuración de VersaCompiler:'));
        logger.info(chalk.green(`Watch: ${argv.watch}`));
        logger.info(chalk.green(`All: ${env.isALL}`));
        logger.info(chalk.green(`File: ${argv.file || 'N/A'}`));
        logger.info(chalk.green(`Lint-only: ${argv['lint-only']}`));
        logger.info(chalk.green(`Prod: ${env.isPROD}`));
        logger.info(chalk.green(`Tailwind: ${env.TAILWIND}`));
        logger.info(chalk.green(`Minification: ${env.isPROD}`));
        logger.info(chalk.green(`Linter: ${env.ENABLE_LINTER}\n`));
        logger.info(chalk.green(`Verbose: ${env.VERBOSE}`));
        logger.info(chalk.green(`Clean: ${argv.clean}`));

        if (argv.clean) {
            await cleanOutputDir(env.PATH_OUTPUT || './dist');
        }

        if (argv['lint-only']) {
            logger.info(chalk.yellow('🔍 Ejecutando solo linting...'));
            const lintResult = await runLinter(true);
            if (lintResult) {
                logger.info(
                    chalk.green('✅ Linting completado sin errores críticos.'),
                );
                process.exit(0);
            } else {
                logger.error(chalk.red('❌ Linting falló o fue cancelado.'));
                process.exit(1);
            }
        }        // Manejar archivos pasados como argumentos posicionales
        if (argv.files && argv.files.length > 0) {
            logger.info(chalk.yellow(`📄 Compilando ${argv.files.length} archivo(s)...`));
            
            const fs = await import('node:fs/promises');
            let hasErrors = false;

            for (const file of argv.files) {
                try {
                    // Verificar si el archivo existe
                    await fs.access(file);
                    
                    logger.info(chalk.blue(`🔄 Compilando: ${file}`));
                    const result = await compileFile(file);
                    
                    if (result.success) {
                        logger.info(chalk.green(`✅ ${file} → ${result.output}`));
                    } else {
                        logger.error(chalk.red(`❌ Error al compilar: ${file}`));
                        hasErrors = true;
                    }
                } catch {
                    logger.error(chalk.red(`❌ El archivo '${file}' no existe.`));
                    hasErrors = true;
                }
            }

            process.exit(hasErrors ? 1 : 0);
        }

        if (argv.file) {
            // Compilar archivo individual
            logger.info(chalk.yellow(`📄 Compilando archivo: ${argv.file}`));
            
            // Verificar si el archivo existe
            const fs = await import('node:fs/promises');
            try {
                await fs.access(argv.file);
            } catch {
                logger.error(chalk.red(`❌ Error: El archivo '${argv.file}' no existe.`));
                process.exit(1);
            }

            // Compilar el archivo
            const result = await compileFile(argv.file);
            
            if (result.success) {
                logger.info(chalk.green(`✅ Archivo compilado exitosamente: ${result.output}`));
                process.exit(0);
            } else {
                logger.error(chalk.red(`❌ Error al compilar el archivo: ${argv.file}`));
                process.exit(1);
            }
        }

        if (argv.all) {
            await initCompileAll();
            process.exit(0);
        }

        let bs: any;
        let watch: any;
        if (argv.watch) {
            bs = await browserSyncServer();
            if (!bs) {
                process.exit(1);
            }
            watch = await initChokidar(bs);
            if (!watch) {
                process.exit(1);
            }
        }
        process.on('SIGINT', async () => {
            if (bs) {
                bs.exit();
            }

            if (watch) {
                watch.close();
            }
            stopCompile();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            stopCompile();
            process.exit(0);
        });
        if (!argv.watch) {
            if (env.ENABLE_LINTER === 'true') {
                await runLinter(true);
                process.exit(1);
            }
        }
    } catch (error) {
        logger.error('Error en la aplicación:', error);
        stopCompile();
        process.exit(1);
    }
}

main();
