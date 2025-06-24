import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { promises as fs, Stats } from 'node:fs';
import path from 'node:path';
import process, { env } from 'node:process';

import browserSync from 'browser-sync';
import { html } from 'code-tag';
import getPort from 'get-port';

import { promptUser } from '../utils/promptUser';
import {
    getProxyInfo,
    validateProxyAvailability,
} from '../utils/proxyValidator';

import { logger } from './logger';

// ✨ NUEVA OPTIMIZACIÓN: Sistema de cache para archivos estáticos en BrowserSync
interface FileCache {
    content: string | Buffer;
    contentType: string;
    lastModified: number;
    etag: string;
    size: number;
}

class BrowserSyncFileCache {
    private static instance: BrowserSyncFileCache;
    private cache = new Map<string, FileCache>();
    private readonly MAX_CACHE_SIZE = 200; // Máximo archivos en cache
    private readonly MAX_CACHE_MEMORY = 50 * 1024 * 1024; // 50MB límite
    private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutos para archivos estáticos
    private currentMemoryUsage = 0;

    // Métricas
    private cacheHits = 0;
    private cacheMisses = 0;
    private totalRequests = 0;

    static getInstance(): BrowserSyncFileCache {
        if (!BrowserSyncFileCache.instance) {
            BrowserSyncFileCache.instance = new BrowserSyncFileCache();
        }
        return BrowserSyncFileCache.instance;
    }

    /**
     * Genera ETag para el archivo basado en contenido y timestamp
     */
    private generateETag(filePath: string, stats: Stats): string {
        const hash = createHash('md5')
            .update(`${filePath}:${stats.mtime.getTime()}:${stats.size}`)
            .digest('hex');
        return `"${hash}"`;
    }

    /**
     * Determina el Content-Type basado en la extensión del archivo
     */
    private getContentType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.ts': 'application/javascript', // Se transpila a JS
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.webp': 'image/webp',
            '.avif': 'image/avif',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.map': 'application/json',
            '.xml': 'application/xml',
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.zip': 'application/zip',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Verifica si el archivo debe ser cacheado
     */
    private shouldCache(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const cacheableExtensions = [
            '.js',
            '.mjs',
            '.css',
            '.json',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.svg',
            '.ico',
            '.webp',
            '.avif',
            '.woff',
            '.woff2',
            '.ttf',
            '.eot',
            '.map',
        ];
        return cacheableExtensions.includes(ext);
    }

    /**
     * Obtiene archivo desde cache o lo lee del disco
     */
    async getOrReadFile(filePath: string): Promise<{
        content: string | Buffer;
        contentType: string;
        etag: string;
        cached: boolean;
        notModified?: boolean;
    } | null> {
        this.totalRequests++;

        try {
            // Verificar si el archivo existe y obtener stats
            const stats = await fs.stat(filePath);
            const lastModified = stats.mtime.getTime();
            const etag = this.generateETag(filePath, stats);

            // Si no debe ser cacheado, leer directamente
            if (!this.shouldCache(filePath)) {
                const content = await fs.readFile(filePath, 'utf-8');
                return {
                    content,
                    contentType: this.getContentType(filePath),
                    etag,
                    cached: false,
                };
            }

            // Verificar cache
            const cached = this.cache.get(filePath);
            if (cached && cached.lastModified === lastModified) {
                this.cacheHits++;
                return {
                    content: cached.content,
                    contentType: cached.contentType,
                    etag: cached.etag,
                    cached: true,
                };
            }

            // Cache miss - leer archivo
            this.cacheMisses++;
            const isBinary = this.isBinaryFile(filePath);
            const content = await fs.readFile(
                filePath,
                isBinary ? undefined : 'utf-8',
            );
            const contentType = this.getContentType(filePath);

            // Cachear resultado
            this.addToCache(filePath, {
                content,
                contentType,
                lastModified,
                etag,
                size: stats.size,
            });

            return {
                content,
                contentType,
                etag,
                cached: false,
            };
        } catch {
            return null;
        }
    }

    /**
     * Determina si un archivo es binario
     */
    private isBinaryFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const binaryExtensions = [
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.ico',
            '.webp',
            '.avif',
            '.woff',
            '.woff2',
            '.ttf',
            '.eot',
            '.pdf',
            '.zip',
            '.mp4',
            '.mp3',
            '.wav',
            '.ogg',
        ];
        return binaryExtensions.includes(ext);
    }

    /**
     * Añade archivo al cache con gestión de memoria
     */
    private addToCache(
        filePath: string,
        fileData: {
            content: string | Buffer;
            contentType: string;
            lastModified: number;
            etag: string;
            size: number;
        },
    ): void {
        try {
            // Aplicar políticas de eviction si es necesario
            this.evictIfNeeded(fileData.size);

            const cacheEntry: FileCache = {
                content: fileData.content,
                contentType: fileData.contentType,
                lastModified: fileData.lastModified,
                etag: fileData.etag,
                size: fileData.size,
            };

            this.cache.set(filePath, cacheEntry);
            this.currentMemoryUsage += fileData.size;
        } catch (error) {
            console.warn(
                '[BrowserSyncFileCache] Error cacheando archivo:',
                error,
            );
        }
    }

    /**
     * Aplica políticas de eviction LRU si es necesario
     */
    private evictIfNeeded(newFileSize: number): void {
        // Verificar límite de archivos
        while (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictOldest();
        }

        // Verificar límite de memoria
        while (
            this.currentMemoryUsage + newFileSize > this.MAX_CACHE_MEMORY &&
            this.cache.size > 0
        ) {
            this.evictOldest();
        }
    }

    /**
     * Elimina el archivo más antiguo del cache
     */
    private evictOldest(): void {
        let oldestPath = '';
        let oldestTime = Infinity;

        for (const [filePath, entry] of this.cache) {
            if (entry.lastModified < oldestTime) {
                oldestTime = entry.lastModified;
                oldestPath = filePath;
            }
        }

        if (oldestPath) {
            const entry = this.cache.get(oldestPath);
            if (entry) {
                this.currentMemoryUsage -= entry.size;
                this.cache.delete(oldestPath);
            }
        }
    }

    /**
     * Invalidar cache para un archivo específico
     */
    invalidateFile(filePath: string): void {
        const entry = this.cache.get(filePath);
        if (entry) {
            this.currentMemoryUsage -= entry.size;
            this.cache.delete(filePath);
        }
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const hitRate =
            this.totalRequests > 0
                ? Math.round((this.cacheHits / this.totalRequests) * 100)
                : 0;

        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate,
            totalRequests: this.totalRequests,
            cacheSize: this.cache.size,
            maxCacheSize: this.MAX_CACHE_SIZE,
            memoryUsage: this.currentMemoryUsage,
            maxMemoryUsage: this.MAX_CACHE_MEMORY,
        };
    }

    /**
     * Limpia todo el cache
     */
    clear(): void {
        this.cache.clear();
        this.currentMemoryUsage = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalRequests = 0;
    }
}

// Instancia global del cache de archivos
const fileCache = BrowserSyncFileCache.getInstance();

// Lazy loading para chalk
const loadChalk = async () => {
    const { default: chalk } = await import('chalk');
    return chalk;
};

export async function browserSyncServer(): Promise<any> {
    try {
        let bs: any = null;
        const AssetsOmit = env.AssetsOmit === 'true';
        let proxy: {
            proxy?: string;
            server?: string;
        } = {
            server: './',
        };

        // ✨ VALIDACIÓN DE PROXY: Verificar disponibilidad antes de inicializar BrowserSync
        if (env.proxyUrl) {
            logger.info(
                `🔍 Validando disponibilidad del servidor proxy: ${env.proxyUrl}`,
            );

            const isProxyAvailable = await validateProxyAvailability(
                env.proxyUrl,
                5000,
            );

            if (!isProxyAvailable) {
                const proxyInfo = getProxyInfo(env.proxyUrl);
                logger.warn(`⚠️  El servidor proxy no está disponible:`);
                logger.warn(`   Host: ${proxyInfo.host}`);
                logger.warn(`   Puerto: ${proxyInfo.port}`);
                logger.warn(`   Protocolo: ${proxyInfo.protocol}`);

                const response = await promptUser(
                    '\n¿Desea continuar de todos modos? El modo proxy podría no funcionar correctamente. (s/n): ',
                    30000,
                );

                if (
                    response.toLowerCase().trim() !== 's' &&
                    response.toLowerCase().trim() !== 'si'
                ) {
                    logger.info('🛑 Operación cancelada por el usuario.');
                    process.exit(0);
                }

                logger.warn(
                    '⚠️  Continuando con el servidor proxy no disponible...',
                );
            } else {
                logger.info('✅ Servidor proxy disponible');
            }

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
                        // ✨ OPTIMIZADO: Usar cache para archivos HRM
                        const vueLoaderPath = path.join(
                            relativeHrmPath,
                            '/initHRM.js',
                        );

                        const cachedFile =
                            await fileCache.getOrReadFile(vueLoaderPath);
                        if (cachedFile) {
                            res.setHeader(
                                'Content-Type',
                                cachedFile.contentType,
                            );
                            res.setHeader('ETag', cachedFile.etag);

                            if (
                                process.env.VERBOSE === 'true' &&
                                cachedFile.cached
                            ) {
                                logger.info(
                                    `🚀 File cache hit para ${vueLoaderPath}`,
                                );
                            }

                            res.end(cachedFile.content);
                        } else {
                            const chalkInstance = await loadChalk();
                            logger.error(
                                chalkInstance.red(
                                    `🚩 :Error al leer el archivo ${vueLoaderPath}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// vueLoader.js not found');
                        }
                        return;
                    }

                    // Si la URL comienza con /__versa/hrm/, sirve los archivos de dist/hrm
                    if (req.url.startsWith('/__versa/')) {
                        // ✨ OPTIMIZADO: Usar cache para archivos Versa
                        const filePath = path.join(
                            relativeHrmPath,
                            req.url.replace('/__versa/', ''),
                        );

                        const cachedFile =
                            await fileCache.getOrReadFile(filePath);
                        if (cachedFile) {
                            res.setHeader(
                                'Content-Type',
                                cachedFile.contentType,
                            );
                            res.setHeader('ETag', cachedFile.etag);

                            if (
                                process.env.VERBOSE === 'true' &&
                                cachedFile.cached
                            ) {
                                logger.info(
                                    `🚀 File cache hit para ${filePath}`,
                                );
                            }

                            res.end(cachedFile.content);
                        } else {
                            const chalkInstance = await loadChalk();
                            logger.error(
                                chalkInstance.red(
                                    `🚩 :Error al leer el archivo ${filePath}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// Not found');
                        }
                        return;
                    }

                    // Si la URL comienza con /node_modules/, sirve los archivos de node_modules
                    if (req.url.startsWith('/node_modules/')) {
                        // ✨ OPTIMIZADO: Usar cache para módulos de node_modules
                        const modulePath = path.join(process.cwd(), req.url);

                        const cachedFile =
                            await fileCache.getOrReadFile(modulePath);
                        if (cachedFile) {
                            res.setHeader(
                                'Content-Type',
                                cachedFile.contentType,
                            );
                            res.setHeader('ETag', cachedFile.etag);

                            if (
                                process.env.VERBOSE === 'true' &&
                                cachedFile.cached
                            ) {
                                logger.info(
                                    `🚀 Module cache hit para ${modulePath}`,
                                );
                            }

                            res.end(cachedFile.content);
                        } else {
                            const chalkInstance = await loadChalk();
                            logger.error(
                                chalkInstance.red(
                                    `🚩 Error al leer el módulo ${modulePath}`,
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

// ✨ NUEVAS FUNCIONES: Exportar funcionalidades del cache de archivos para uso externo
export const getBrowserSyncCacheStats = () => {
    return fileCache.getStats();
};

export const clearBrowserSyncCache = () => {
    fileCache.clear();
};

export const invalidateBrowserSyncFile = (filePath: string) => {
    fileCache.invalidateFile(filePath);
};
