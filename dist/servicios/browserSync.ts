import browserSync from 'browser-sync';
import chalk from 'chalk';
import { html } from 'code-tag';
import getPort from 'get-port';
import { env } from 'node:process';
import { logger } from './pino.ts';

export async function browserSyncServer() {
    try {
        let bs: any = null;
        const AssetsOmit = env.AssetsOmit === 'true' ? true : false;
        let proxy: {
            proxy?: string;
            server?: string;
        } = {
            server: './',
        };
        if (env.proxyUrl) {
            proxy = {
                proxy: env.proxyUrl,
            };
        }

        bs = browserSync.create();
        const port = await getPort({ port: 3000 });
        const uiPort = await getPort({ port: 4000 });

        bs.init({
            ...proxy,
            files: ['./public/**/*.css'], // Observa cambios en archivos CSS
            injectChanges: true, // Inyecta CSS sin recargar la página
            open: false, // No abre automáticamente el navegador
            port, // Puerto aleatorio para BrowserSync
            ui: {
                port: uiPort, // Puerto aleatorio para la interfaz de usuario
            },
            socket: {
                path: '/browser-sync/socket.io', // Ruta correcta para socket.io
            },
            snippetOptions: {
                rule: {
                    match: /<\/body>/i,
                    fn: (snippet, match) => {
                        return html`
                            ${snippet}${match}
                            <script
                                type="module"
                                src="/__versa/vueLoader.js"></script>
                        `;
                    },
                },
            },
            logLevel: 'info',
            logPrefix: 'BS',
            logConnections: true,
            logFileChanges: true,
            watchEvents: ['change', 'add', 'unlink', 'addDir', 'unlinkDir'],
            reloadDelay: 500,
            reloadDebounce: 500,
            reloadOnRestart: true,
            notify: true,
            watchOptions: {
                ignoreInitial: true,
                ignored: ['node_modules', '.git'],
            },
            middleware: [
                async function (req, res, next) {
                    //para evitar el error de CORS
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', '*');
                    res.setHeader('Access-Control-Allow-Headers', '*');
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.setHeader('Access-Control-Max-Age', '3600');
                    res.setHeader(
                        'Cache-Control',
                        'no-cache, no-store, must-revalidate',
                    );
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');

                    // //para redigir a la ubicación correcta
                    // if (req.url === '/__versa/vueLoader.js') {
                    //     // Busca vueLoader.js en la carpeta de salida configurada
                    //     const vueLoaderPath = path.join(
                    //         __dirname,
                    //         'services/vueLoader.js',
                    //     );
                    //     res.setHeader('Content-Type', 'application/javascript');
                    //     try {
                    //         const fileContent = await readFile(
                    //             vueLoaderPath,
                    //             'utf-8',
                    //         );
                    //         res.end(fileContent);
                    //     } catch (error) {
                    //         console.error(
                    //             chalk.red(
                    //                 `🚩 :Error al leer el archivo ${vueLoaderPath}: ${error.message}`,
                    //             ),
                    //         );
                    //         res.statusCode = 404;
                    //         res.end('// vueLoader.js not found');
                    //     }
                    //     return;
                    // }
                    // // Si la URL comienza con /__versa/hrm/, sirve los archivos de dist/hrm
                    // if (req.url.startsWith('/__versa/hrm/')) {
                    //     // Sirve archivos de dist/hrm como /__versa/hrm/*
                    //     const filePath = path.join(
                    //         __dirname,
                    //         req.url.replace('/__versa/', ''),
                    //     );
                    //     res.setHeader('Content-Type', 'application/javascript');
                    //     try {
                    //         const fileContent = await readFile(filePath, 'utf-8');
                    //         res.end(fileContent);
                    //     } catch (error) {
                    //         console.error(
                    //             chalk.red(
                    //                 `🚩 :Error al leer el archivo ${filePath}: ${error.message}`,
                    //             ),
                    //         );
                    //         res.statusCode = 404;
                    //         res.end('// Not found');
                    //     }
                    //     return;
                    // }

                    // detectar si es un archivo estático, puede que contenga un . y alguna extensión o dashUsers.js?v=1746559083866
                    const isAssets = req.url.match(
                        /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|json|html|xml|txt|pdf|zip|mp4|mp3|wav|ogg)(\?.*)?$/i,
                    );
                    if (req.method === 'GET') {
                        // omitir archivos estáticos sólo si AssetsOmit es true
                        if (isAssets && !AssetsOmit) {
                            logger.info(chalk.white(`GET: ${req.url}`));
                        } else if (!isAssets) {
                            logger.info(chalk.cyan(`GET: ${req.url}`));
                        }
                    } else if (req.method === 'POST') {
                        logger.info(chalk.blue(`POST: ${req.url}`));
                    } else if (req.method === 'PUT') {
                        logger.info(chalk.yellow(`PUT: ${req.url}`));
                    } else if (req.method === 'DELETE') {
                        logger.info(chalk.red(`DELETE: ${req.url}`));
                    } else {
                        logger.info(chalk.gray(`${req.method}: ${req.url}`));
                    }

                    // Aquí podrías, por ejemplo, escribir estos logs en un archivo o base de datos
                    next();
                },
                // async function (req, res, next) {
                //     const requestedPath = path.join(
                //         PATH_DIST,
                //         req.url.split('?')[0],
                //     ); // Eliminar query params para la búsqueda
                //     let originalVuePath = null;
                //     for (const vuePath of serverComponentCache.keys()) {
                //         const distJsPathString = await mapRuta(
                //             vuePath,
                //             PATH_DIST,
                //             PATH_SOURCE,
                //         );
                //         const distJsPath = distJsPathString.replace('.vue', '.js');
                //         if (
                //             path.normalize(requestedPath) ===
                //             path.normalize(distJsPath)
                //         ) {
                //             originalVuePath = vuePath;
                //             break;
                //         }
                //     }

                //     if (
                //         originalVuePath &&
                //         serverComponentCache.has(originalVuePath)
                //     ) {
                //         const cachedEntry =
                //             serverComponentCache.get(originalVuePath);
                //         console.log(
                //             chalk.greenBright(
                //                 `📦 Sirviendo desde caché HMR: ${req.url}`,
                //             ),
                //         );
                //         res.setHeader('Content-Type', 'application/javascript');
                //         res.end(cachedEntry.jsWithPlaceholders); // Servir el JS con timestamps actualizados
                //         return;
                //     }
                //     next();
                // },
            ],
        });

        return bs;
    } catch (error) {
        logger.error(`🚩 :Error al iniciar BrowserSync: ${error.message}`);
        process.exit(1);
    }
}
