import chalk from 'chalk';
import chokidar from 'chokidar';
import { env } from 'node:process';
import { logger } from './pino.ts';

export async function initChokidar() {
    try {
        if (!env.PATH_SOURCE) {
            logger.error(
                'Error: La variable de entorno PATH_SOURCE no está definida.',
            );
            process.exit(1);
        }
        //todo: agregar watch adicional sólo para recarga completa
        const watchJS = `${env.PATH_SOURCE}/**/*.js`;
        const watchVue = `${env.PATH_SOURCE}/**/*.vue`;
        const watchTS = `${env.PATH_SOURCE}/**/*.ts`;

        const watchAditional = JSON.parse(env.aditionalWatch || '[]');
        let fileWatch = [watchJS, watchVue, watchTS, ...watchAditional];
        if (fileWatch.length > 0) {
            logger.info(
                chalk.green(
                    `Observando ${fileWatch
                        .map((item: string) => `${item}`)
                        .join(', ')}\n`,
                ),
            );
        }

        //extraer sólo las extesniones  de fileWatch
        const extendsionWatch = fileWatch.map(item => {
            const ext = item.split('.').pop();
            if (ext) {
                return ext;
            }
            return '';
        });
        const regExtExtension = new RegExp(
            `\\.(?!${extendsionWatch.join('$|')}).+$`,
        );

        fileWatch = fileWatch.map(item => item.replace(/\/\*\*\//g, '/'));
        const directories = new Map<string, string[]>();
        fileWatch.forEach(item => {
            const dir = item.substring(0, item.lastIndexOf('/'));
            if (!directories.has(dir)) {
                directories.set(dir, []);
            }
            directories.get(dir)!.push(item);
        });
        const DirWatch = Array.from(directories.keys());

        const watcher = chokidar.watch(DirWatch, {
            persistent: true,
            ignoreInitial: true,
            ignored: regExtExtension,
        });

        // Evento cuando se añade un archivo
        watcher.on('add', async ruta => {
            logger.info(ruta);
            // await generateTailwindCSS(ruta);
            // const result = await compile(
            //     path.normalize(filePath).replace(/\\/g, '/'),
            // );
            // if (result && result.contentWasWritten) {
            //     emitirCambios(
            //         bs,
            //         result.extension,
            //         result.normalizedPath,
            //         result.fileName,
            //         'add',
            //     );
            // } else {
            //     console.log(
            //         chalk.yellow(
            //             `[HMR] No se emite evento para archivo nuevo no escrito o vacío: ${filePath}. Razón: contentWasWritten es false o resultado inválido.`,
            //         ),
            //     );
            // }
        });

        // Evento cuando se modifica un archivo
        watcher.on('change', async ruta => {
            logger.info(ruta);
            // console.log(chalk.yellow(`\n🔄 Archivo modificado: ${ruta}`));
            // // Invalidar caché si el archivo .vue original cambia
            // if (ruta.endsWith('.vue')) {
            //     const normalizedVuePath = path.normalize(ruta);
            //     if (serverComponentCache.has(normalizedVuePath)) {
            //         serverComponentCache.delete(normalizedVuePath);
            //         console.log(
            //             chalk.magenta(
            //                 `🗑️ Caché invalidada para ${normalizedVuePath} debido a modificación directa.`,
            //             ),
            //         );
            //     }
            // }
            // // Recompilar el archivo modificado
            // const normalizedRuta = path.normalize(ruta).replace(/\\/g, '/');
            // const result = await compile(normalizedRuta);

            // if (result && result.contentWasWritten) {
            //     // Emitir cambios si la compilación fue exitosa y se escribió contenido
            //     emitirCambios(
            //         bs,
            //         result.extension,
            //         result.normalizedPath, // Ruta al archivo en /dist
            //         result.fileName,
            //         'change', // Tipo de evento
            //     );
            // } else {
            //     console.log(
            //         chalk.yellow(
            //             `[HMR] No se emite evento para archivo modificado no escrito o vacío: ${ruta}. Razón: contentWasWritten es false o resultado inválido.`,
            //         ),
            //     );
            // }
        });

        // Evento cuando se elimina un archivo
        watcher.on('unlink', async ruta => {
            logger.info(ruta);
            // console.log(chalk.red(`\n🗑️ Archivo eliminado: ${ruta}`));
            // // Invalidar caché si el archivo .vue original se elimina
            // if (ruta.endsWith('.vue')) {
            //     const normalizedVuePath = path.normalize(ruta);
            //     if (serverComponentCache.has(normalizedVuePath)) {
            //         serverComponentCache.delete(normalizedVuePath);
            //         console.log(
            //             chalk.magenta(
            //                 `🗑️ Caché invalidada para ${normalizedVuePath} debido a eliminación.`,
            //             ),
            //         );
            //     }
            // }
            // const { extension, normalizedPath, fileName } = await deleteFile(
            //     path.normalize(ruta).replace(/\\/g, '/'),
            // );
            // emitirCambios(bs, extension, normalizedPath, fileName, 'delete');
        });
        return watcher;
    } catch (error) {
        logger.error(`🚩 :Error al iniciar watch: ${error.message}`);
        process.exit(1);
    }
}
