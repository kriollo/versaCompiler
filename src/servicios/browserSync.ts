import { promises as fs } from 'node:fs';
import path from 'node:path';
import process, { env } from 'node:process';

import browserSync from 'browser-sync';
import { html } from 'code-tag';
import getPort from 'get-port';

import { logger } from './logger';

// Lazy loading para chalk
const loadChalk = async () => {
    const { default: chalk } = await import('chalk');
    return chalk;
};

export async function browserSyncServer(): Promise<any> {
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

        const hrmDir = path.join(env.PATH_PROY || process.cwd(), 'hrm');
        const projectRoot = process.cwd();
        const relativeHrmPath = path.relative(projectRoot, hrmDir);

        bs = browserSync.create();
        const port = await getPort({ port: 3000 });
        const uiPort = await getPort({ port: 4000 });
        bs.init({
            ...proxy,
            files: [`${env.PATH_DIST}/**/*.css`], // Observa cambios en archivos CSS
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
                    fn: (snippet: any, match: any) => {
                        return html`
                            ${snippet}${match}
                            <script
                                type="module"
                                src="/__versa/initHRM.js"></script>
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
                async function (req: any, res: any, next: any) {
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

                    //para redigir a la ubicación correcta
                    if (req.url === '/__versa/initHRM.js') {
                        // Busca vueLoader.js en la carpeta de salida configurada
                        const vueLoaderPath = path.join(
                            relativeHrmPath,
                            '/initHRM.js',
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await fs.readFile(
                                vueLoaderPath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            const chalkInstance = await loadChalk();
                            logger.error(
                                chalkInstance.red(
                                    `🚩 :Error al leer el archivo ${vueLoaderPath}: ${error instanceof Error ? error.message : String(error)}/n ${error instanceof Error ? error.stack : ''}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// vueLoader.js not found');
                        }
                        return;
                    }

                    // Si la URL comienza con /__versa/hrm/, sirve los archivos de dist/hrm
                    if (req.url.startsWith('/__versa/')) {
                        // Sirve archivos de dist/hrm como /__versa/hrm/*
                        const filePath = path.join(
                            relativeHrmPath,
                            req.url.replace('/__versa/', ''),
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await fs.readFile(
                                filePath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            const chalkInstance = await loadChalk();
                            logger.error(
                                chalkInstance.red(
                                    `🚩 :Error al leer el archivo ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// Not found');
                        }
                        return;
                    }

                    // Si la URL comienza con /node_modules/, sirve los archivos de node_modules
                    if (req.url.startsWith('/node_modules/')) {
                        const modulePath = path.join(process.cwd(), req.url);
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await fs.readFile(
                                modulePath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            const chalkInstance = await loadChalk();
                            logger.error(
                                chalkInstance.red(
                                    `🚩 Error al leer el módulo ${modulePath}: ${error instanceof Error ? error.message : String(error)}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// Module not found');
                        }
                        return;
                    }

                    // detectar si es un archivo estático, puede que contenga un . y alguna extensión o dashUsers.js?v=1746559083866
                    const isAssets = req.url.match(
                        /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|json|html|xml|txt|pdf|zip|mp4|mp3|wav|ogg)(\?.*)?$/i,
                    );

                    if (req.method === 'GET') {
                        const chalkInstance = await loadChalk();
                        // omitir archivos estáticos sólo si AssetsOmit es true
                        if (isAssets && !AssetsOmit) {
                            logger.info(chalkInstance.white(`GET: ${req.url}`));
                        } else if (!isAssets) {
                            logger.info(chalkInstance.cyan(`GET: ${req.url}`));
                        }
                    } else if (req.method === 'POST') {
                        const chalkInstance = await loadChalk();
                        logger.info(chalkInstance.blue(`POST: ${req.url}`));
                    } else if (req.method === 'PUT') {
                        const chalkInstance = await loadChalk();
                        logger.info(chalkInstance.yellow(`PUT: ${req.url}`));
                    } else if (req.method === 'DELETE') {
                        const chalkInstance = await loadChalk();
                        logger.info(chalkInstance.red(`DELETE: ${req.url}`));
                    } else {
                        const chalkInstance = await loadChalk();
                        logger.info(
                            chalkInstance.gray(`${req.method}: ${req.url}`),
                        );
                    }

                    // Aquí podrías, por ejemplo, escribir estos logs en un archivo o base de datos
                    next();
                },
            ],
        });

        return bs;
    } catch (error) {
        logger.error(
            `🚩 :Error al iniciar BrowserSync: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
}

export async function emitirCambios(bs: any, action: string, filePath: string) {
    const chalkInstance = await loadChalk();
    logger.info(
        chalkInstance.green(`[HMR] Emitiendo cambios: ${action} ${filePath}\n`),
    );
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    const nameFile = path.basename(
        normalizedPath,
        path.extname(normalizedPath),
    );
    bs.sockets.emit(action, { action, filePath, normalizedPath, nameFile });
}
