#!/usr/bin/env node
import * as path from 'node:path';
import * as processModule from 'node:process';
const { env } = processModule;
// Usar el objeto process global para event listeners
const globalProcess = globalThis.process || processModule;
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
env.PATH_CONFIG_FILE = path.resolve(
    globalProcess.cwd(),
    'versacompile.config.ts',
);

// Lazy loading helper functions
async function loadChalk() {
    if (!chalk) {
        chalk = (await import('chalk')).default;
    }
    return chalk;
}

// Función para obtener la versión del package.json
async function getPackageVersion(): Promise<string> {
    try {
        const fs = await import('node:fs/promises');
        const packageJsonPath = path.resolve(
            env.PATH_PROY || path.dirname(fileURLToPath(import.meta.url)),
            '..',
            'package.json',
        );
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageData = JSON.parse(packageContent);
        return packageData.version || 'unknown';
    } catch {
        // Fallback si no se puede leer el package.json
        return 'unknown';
    }
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
    return await import('./servicios/file-watcher');
}

async function loadConfigModule() {
    return await import('./servicios/readConfig');
}

function stopCompile() {
    logger.info('VersaCompiler cerrado correctamente');
}

async function main() {
    // Load yargs dynamically
    const { yargs: yargsInstance, hideBin: hideBinFn } = await loadYargs();
    const chalkInstance = await loadChalk();

    let yargInstance = yargsInstance(hideBinFn(globalProcess.argv))
        .scriptName('versa')
        .usage(
            chalkInstance.blue('VersaCompiler') + ' - Compilador de archivos Vue/TS/JS',
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
        .alias('debug', 'verbose')
        .option('cleanOutput', {
            type: 'boolean',
            description: 'Limpiar el directorio de salida antes de compilar',
            default: false, // Por defecto, clean está deshabilitado
        })
        .alias('co', 'cleanOutput')
        .option('cleanCache', {
            type: 'boolean',
            description: 'Limpiar el cache de compilación antes de compilar',
            default: false, // Por defecto, clean está deshabilitado
        })
        .alias('cc', 'cleanCache')
        .option('yes', {
            type: 'boolean',
            description:
                'Confirmar automáticamente las acciones que requieren confirmación',
            default: false, // Por defecto, no se confirma automáticamente
        })
        .alias('y', 'yes')
        .option('typeCheck', {
            type: 'boolean',
            description:
                'Habilitar/Deshabilitar la verificación de tipos. Por defecto --typeCheck=false',
            default: false,
        })
        .alias('t', 'typeCheck')
        .option('checkIntegrity', {
            type: 'boolean',
            description:
                'Validar la integridad del código compilado (para builds de deploy). Por defecto --checkIntegrity=false',
            default: false,
        })
        .alias('ci', 'checkIntegrity');

    // Definir la opción tailwind dinámicamente
    // Asumiendo que env.TAILWIND es una cadena que podría ser 'true', 'false', o undefined
    if (env.tailwindcss !== 'false') {
        yargInstance = yargInstance.option('tailwind', {
            type: 'boolean',
            description:
                'Habilitar/Deshabilitar compilación de Tailwind CSS. Por defecto --tailwind=false',
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
        cleanOutput?: boolean;
        cleanCache?: boolean;
        y?: boolean;
        typeCheck?: boolean;
        checkIntegrity?: boolean;
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
            (yargsCmd: YargsCommandBuilder) => {
                return yargsCmd.positional('files', {
                    describe: 'Archivos para compilar',
                    type: 'string',
                    array: true,
                });
            },
        )
        .parse()) as CompileArgs;
    try {
        // 🎨 Header moderno y elegante
        const version = await getPackageVersion();
        const headerLine = '━'.repeat(60);
        logger.log(
            `\n` +
                chalk.cyan(headerLine) +
                `\n` +
                chalk.bold.cyan('  ⚡ VersaCompiler ') +
                chalk.gray(`v${version}`) +
                `\n` +
                chalk.gray('  Vue · TypeScript · JavaScript Compiler') +
                `\n` +
                chalk.cyan(headerLine) +
                `\n`,
        );

        if (argv.init) {
            logger.info('Iniciando la configuración...');
            const { initConfig } = await loadConfigModule();
            await initConfig();
            globalProcess.exit(0);
        }

        if (!(await readConfig())) {
            globalProcess.exit(1);
        }

        env.isPROD = argv.prod ? 'true' : 'false';
        env.isALL = argv.all ? 'true' : 'false';
        env.TAILWIND =
            argv.tailwind === undefined ? 'true' : String(argv.tailwind);
        env.ENABLE_LINTER = String(argv.linter);
        env.VERBOSE = argv.verbose ? 'true' : 'false';
        env.CHECK_INTEGRITY = argv.checkIntegrity ? 'true' : 'false'; // 🎯 Configuración moderna y organizada
        logger.info(chalk.bold.blue('⚙️  Configuración'));
        logger.info(chalk.gray('   ┌─ Modo de ejecución'));

        const modes = [
            { label: 'Observar', value: argv.watch, icon: '👀' },
            {
                label: 'Todos los archivos',
                value: env.isALL === 'true',
                icon: '📁',
            },
            { label: 'Archivo único', value: !!argv.file, icon: '📄' },
            { label: 'Producción', value: env.isPROD === 'true', icon: '🏭' },
        ];

        const features = [
            { label: 'Tailwind', value: env.TAILWIND === 'true', icon: '🎨' },
            { label: 'Minificación', value: env.isPROD === 'true', icon: '🗜️' },
            {
                label: 'Linter',
                value: env.ENABLE_LINTER === 'true',
                icon: '🔍',
            },
            { label: 'Verificar tipos', value: argv.typeCheck, icon: '📘' },
            {
                label: 'Validar integridad',
                value: argv.checkIntegrity,
                icon: '🛡️',
            },
            { label: 'Detallado', value: env.VERBOSE === 'true', icon: '📝' },
        ];

        modes.forEach(mode => {
            const status = mode.value ? chalk.green('●') : chalk.gray('○');
            const label = mode.value
                ? chalk.green(mode.label)
                : chalk.gray(mode.label);
            logger.info(
                chalk.gray('   │  ') + status + ` ${mode.icon} ${label}`,
            );
        });
        logger.info(chalk.gray('   ├─ Características'));
        features.forEach(feature => {
            const status = feature.value ? chalk.green('●') : chalk.gray('○');
            const label = feature.value
                ? chalk.green(feature.label)
                : chalk.gray(feature.label);
            logger.info(
                chalk.gray('   │  ') + status + ` ${feature.icon} ${label}`,
            );
        });

        if (argv.file) {
            logger.info(chalk.gray('   ├─ Objetivo'));
            logger.info(chalk.gray('   │  ') + chalk.blue('📄 ') + argv.file);
        }

        if (argv.cleanOutput) {
            logger.info(chalk.gray('   ├─ Limpieza'));
            logger.info(
                chalk.gray('   │  ') + chalk.yellow('🧹 Limpiar salida'),
            );
        }

        if (argv.cleanCache) {
            logger.info(
                chalk.gray('   │  ') + chalk.yellow('🗑️  Limpiar caché'),
            );
        }

        logger.info(chalk.gray('   └─ ¡Listo para compilar!'));
        logger.log('');
        env.typeCheck = argv.typeCheck ? 'true' : 'false';

        env.cleanCache = argv.cleanCache ? 'true' : 'false';
        env.yes = argv.y ? 'true' : 'false';
        if (argv.cleanOutput) {
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

            globalProcess.exit(hasErrors ? 1 : 0);
        }
        if (argv.file) {
            // Compilar archivo individual
            logger.info(chalk.yellow(`📄 Compilando archivo: ${argv.file}`)); // Verificar si el archivo existe
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
                globalProcess.exit(1);
            }

            // Compilar el archivo (absolutePathFile está garantizado aquí)
            const result = await compileFile(absolutePathFile!);

            if (result.success) {
                logger.info(
                    chalk.green(
                        `✅ Archivo compilado exitosamente: ${result.output}`,
                    ),
                );
                globalProcess.exit(0);
            } else {
                logger.error(
                    chalk.red(`❌ Error al compilar el archivo: ${argv.file}`),
                );
                globalProcess.exit(1);
            }
        }
        if (argv.all) {
            const { initCompileAll } = await loadCompilerModule();
            await initCompileAll();
            globalProcess.exit(0);
        }

        if (!argv.watch) {
            if (env.ENABLE_LINTER === 'true') {
                const { runLinter } = await loadCompilerModule();
                await runLinter(true);
                globalProcess.exit(1);
            }
        }
        if (env.TAILWIND === 'true') {
            const tailwindModule = await import('./compiler/tailwindcss');
            const resultTW = await tailwindModule.generateTailwindCSS();
            if (typeof resultTW !== 'boolean') {
                if (resultTW?.success) {
                    logger.info(
                        `\nTailwind CSS compilado🎨 ${resultTW.message}\n`,
                    );
                } else {
                    const errorMsg = `${resultTW.message}${resultTW.details ? '\n' + resultTW.details : ''}`;
                    logger.error(
                        `\n❌ Error al generar Tailwind CSS: ${errorMsg}\n`,
                    );
                }
            }
        }

        let bs: any;
        let watch: any;
        if (argv.watch) {
            const { browserSyncServer } = await loadBrowserSyncModule();
            const { initChokidar } = await loadChokidarModule();

            bs = await browserSyncServer();
            if (!bs) {
                globalProcess.exit(1);
            }
            watch = await initChokidar(bs);
            if (!watch) {
                globalProcess.exit(1);
            }
        }
        // ✨ FIX: Cleanup handler para evitar acumulación de listeners
        const cleanupHandler = async () => {
            if (bs) {
                bs.exit();
            }

            if (watch) {
                // ✨ FIX #3: Usar nuevo método cleanupWatcher
                const { cleanupWatcher } = await loadChokidarModule();
                await cleanupWatcher(watch);
            }
            stopCompile();
            globalProcess.exit(0);
        };

        const sigintHandler = () => cleanupHandler();
        const sigtermHandler = () => cleanupHandler();

        globalProcess.on('SIGINT', sigintHandler);
        globalProcess.on('SIGTERM', sigtermHandler);
    } catch (error) {
        logger.error('Error en la aplicación:', error);
        stopCompile();
        globalProcess.exit(1);
    }
}

main();
