#!/usr/bin/env node
import path from 'node:path'; // Importar el módulo path
import { env } from 'node:process';
// Lazy loading optimizations - Only import lightweight modules synchronously
import { fileURLToPath } from 'node:url';

import { logger } from './servicios/logger';
import { readConfig } from './servicios/readConfig';

// Heavy dependencies will be loaded dynamically when needed
let chalk: any;
let yargs: any;
let hideBin: any;

// Obtener el directorio del archivo actual (src/)
env.PATH_PROY = path.dirname(fileURLToPath(import.meta.url));
env.PATH_CONFIG_FILE = path.resolve(process.cwd(), 'versacompile.config.ts');

// Lazy loading helper functions
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

async function loadYargs() {
    if (!yargs) {
        const yargsModule = await import('yargs');
        const helpersModule = await import('yargs/helpers');
        yargs = yargsModule.default;
        hideBin = helpersModule.hideBin;
    }
    return { yargs, hideBin };
}

async function loadCompilerModule() {
    return await import('./compiler/compile');
}

async function loadBrowserSyncModule() {
    return await import('./servicios/browserSync');
}

async function loadChokidarModule() {
    return await import('./servicios/chokidar');
}

async function loadConfigModule() {
    return await import('./servicios/readConfig');
}

function stopCompile() {
    logger.info('VersaCompiler cerrado correctamente');
}

async function main() {
    if (!(await readConfig())) {
        process.exit(1);
    }

    // Load yargs dynamically
    const { yargs: yargsInstance, hideBin: hideBinFn } = await loadYargs();
    const chalk = await loadChalk();

    let yargInstance = yargsInstance(hideBinFn(process.argv))
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
        .alias('w', 'watch')
        .option('all', {
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
        .option('y', {
            type: 'boolean',
            description: 'Usar Yarn en lugar de npm',
            default: false,
        })
        .option('typeCheck', {
            type: 'boolean',
            description:
                'Habilitar/Deshabilitar la verificación de tipos. Por defecto --typeCheck=true',
            default: false,
        })
        .alias('t', 'typeCheck');

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
                'Habilitar/Deshabilitar el linter. Por defecto --linter=false',
            default: false,
        });
    }
    interface CompileArgs {
        init?: boolean;
        watch?: boolean;
        all?: boolean;
        file?: string;
        prod?: boolean;
        verbose?: boolean;
        clean?: boolean;
        y?: boolean;
        typeCheck?: boolean;
        tailwind?: boolean;
        linter?: boolean;
        files?: string[];
        _: (string | number)[];
        $0: string;
    }

    interface YargsCommandBuilder {
        positional(
            key: string,
            options: {
                describe: string;
                type: string;
                array: boolean;
            },
        ): YargsCommandBuilder;
    }

    const argv = (await yargInstance
        .help()
        .alias('h', 'help')
        .command(
            '* [files...]',
            'Compilar archivos específicos',
            (yargs: YargsCommandBuilder) => {
                return yargs.positional('files', {
                    describe: 'Archivos para compilar',
                    type: 'string',
                    array: true,
                });
            },
        )
        .parse()) as CompileArgs;

    try {
        logger.log(
            `\n\n` +
                chalk.blue('VersaCompiler') +
                ' - Servidor de Desarrollo HRM y compilador de archivos Vue/ts/js\n\n',
        );

        if (argv.init) {
            logger.info('Iniciando la configuración...');
            const { initConfig } = await loadConfigModule();
            await initConfig();
            process.exit(0);
        }

        env.isPROD = argv.prod ? 'true' : 'false';
        env.isALL = argv.all ? 'true' : 'false';
        env.TAILWIND =
            argv.tailwind === undefined ? 'true' : String(argv.tailwind);
        env.ENABLE_LINTER = String(argv.linter);
        env.VERBOSE = argv.verbose ? 'true' : 'false';
        logger.info(chalk.green('Configuración de VersaCompiler:'));
        logger.info(chalk.green(`Watch: ${argv.watch}`));
        logger.info(chalk.green(`All: ${env.isALL}`));
        logger.info(chalk.green(`File: ${argv.file || 'N/A'}`));
        logger.info(chalk.green(`Prod: ${env.isPROD}`));
        logger.info(chalk.green(`Tailwind: ${env.TAILWIND}`));
        logger.info(chalk.green(`Minification: ${env.isPROD}`));
        logger.info(chalk.green(`Linter: ${env.ENABLE_LINTER}`));
        logger.info(chalk.green(`Verbose: ${env.VERBOSE}`));
        logger.info(chalk.green(`Clean: ${argv.clean}`));
        logger.info(chalk.green(`Type Check: ${argv.typeCheck}`));
        logger.log(`\n`);
        env.typeCheck = argv.typeCheck ? 'true' : 'false';

        env.clean = 'false';
        env.yes = argv.y ? 'true' : 'false';
        if (argv.clean) {
            env.clean = 'true';
            const { cleanOutputDir } = await loadChokidarModule();
            await cleanOutputDir(env.PATH_DIST || './dist');
        }

        // Manejar archivos pasados como argumentos posicionales
        if (argv.files && argv.files.length > 0) {
            logger.info(
                chalk.yellow(
                    `📄 Compilando ${argv.files.length} archivo(s)...`,
                ),
            );

            const fs = await import('node:fs/promises');
            const { compileFile } = await loadCompilerModule();
            let hasErrors = false;

            for (const file of argv.files) {
                try {
                    // Verificar si el archivo existe
                    await fs.access(file);

                    logger.info(chalk.blue(`🔄 Compilando: ${file}`));
                    const result = await compileFile(file);

                    if (result.success) {
                        logger.info(
                            chalk.green(`✅ ${file} → ${result.output}`),
                        );
                    } else {
                        logger.error(
                            chalk.red(`❌ Error al compilar: ${file}`),
                        );
                        hasErrors = true;
                    }
                } catch {
                    logger.error(
                        chalk.red(`❌ El archivo '${file}' no existe.`),
                    );
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
            const { compileFile } = await loadCompilerModule();
            let absolutePathFile: string;
            try {
                await fs.access(argv.file);
                absolutePathFile = path.resolve(argv.file);
            } catch {
                logger.error(
                    chalk.red(`❌ Error: El archivo '${argv.file}' no existe.`),
                );
                process.exit(1);
            }

            // Compilar el archivo
            const result = await compileFile(absolutePathFile);

            if (result.success) {
                logger.info(
                    chalk.green(
                        `✅ Archivo compilado exitosamente: ${result.output}`,
                    ),
                );
                process.exit(0);
            } else {
                logger.error(
                    chalk.red(`❌ Error al compilar el archivo: ${argv.file}`),
                );
                process.exit(1);
            }
        }
        if (argv.all) {
            const { initCompileAll } = await loadCompilerModule();
            await initCompileAll();
            process.exit(0);
        }

        if (!argv.watch) {
            if (env.ENABLE_LINTER === 'true') {
                const { runLinter } = await loadCompilerModule();
                await runLinter(true);
                process.exit(1);
            }
        }

        let bs: any;
        let watch: any;
        if (argv.watch) {
            const { browserSyncServer } = await loadBrowserSyncModule();
            const { initChokidar } = await loadChokidarModule();

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
    } catch (error) {
        logger.error('Error en la aplicación:', error);
        stopCompile();
        process.exit(1);
    }
}

main();
