import browserSync from 'browser-sync';
import chalk from 'chalk';
import { html } from 'code-tag';
import getPort from 'get-port';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from 'node:process';
import { logger } from './logger.ts';

// Función para analizar las dependencias utilizadas en src
async function analyzeUsedDependencies() {
    const projectPath = env.PATH_PROY || process.cwd();
    const srcPath = path.join(projectPath, 'src');
    const usedModules = new Set<string>();
    const fileAnalysis: Array<{ file: string; imports: string[] }> = [];

    try {
        // Leer recursivamente todos los archivos en src
        async function scanDirectory(dirPath: string): Promise<void> {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (entry.name.match(/\.(ts|js|vue)$/)) {
                    await analyzeFile(fullPath);
                }
            }
        }

        // Analizar un archivo individual para encontrar imports
        async function analyzeFile(filePath: string): Promise<void> {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const imports = extractImports(content);
                const relativePath = path.relative(srcPath, filePath);

                if (imports.length > 0) {
                    fileAnalysis.push({
                        file: relativePath,
                        imports: imports,
                    });

                    imports.forEach(imp => usedModules.add(imp));
                }
            } catch (error: unknown) {
                console.warn(
                    `⚠️ No se pudo analizar ${filePath}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                );
            }
        }

        // Extraer imports de node_modules del contenido del archivo
        function extractImports(content: string): string[] {
            const imports: string[] = [];

            // Regex para diferentes tipos de imports
            const importPatterns = [
                // import { something } from 'module'
                /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"`]([^'"`@./][^'"`]*)['"`]/g,
                // import 'module'
                /import\s+['"`]([^'"`@./][^'"`]*)['"`]/g,
                // const something = require('module')
                /require\s*\(\s*['"`]([^'"`@./][^'"`]*)['"`]\s*\)/g,
                // import() dinámico
                /import\s*\(\s*['"`]([^'"`@./][^'"`]*)['"`]\s*\)/g,
            ];

            for (const pattern of importPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const moduleName = match[1];
                    // Filtrar módulos que no empiecen con @ o ./ o / (node_modules)
                    if (
                        moduleName &&
                        !moduleName.startsWith('@') &&
                        !moduleName.startsWith('.') &&
                        !moduleName.startsWith('/')
                    ) {
                        // Si es un módulo con scope (@vue/something), tomar solo la parte base
                        const baseModule = moduleName.split('/')[0];
                        imports.push(baseModule);
                    }
                }
            }

            return [...new Set(imports)]; // Eliminar duplicados
        }

        await scanDirectory(srcPath); // Obtener información de package.json para validar
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, 'utf-8'),
        );
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        // Crear resultado con información detallada
        const result = Array.from(usedModules)
            .filter(module => allDeps[module]) // Solo incluir módulos que están en package.json
            .map(module => ({
                name: module,
                version: allDeps[module],
                files: fileAnalysis
                    .filter(analysis => analysis.imports.includes(module))
                    .map(analysis => analysis.file),
            }));

        return result;
    } catch (error) {
        console.error(`Error al analizar dependencias: ${error.message}`);
        return [];
    }
}

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
                    fn: (snippet, match) => {
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

                    //para redigir a la ubicación correcta
                    if (req.url === '/__versa/initHRM.js') {
                        // Busca vueLoader.js en la carpeta de salida configurada
                        const vueLoaderPath = path.join(
                            env.PATH_PROY || '',
                            'dist/hrm/initHRM.js',
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await fs.readFile(
                                vueLoaderPath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `🚩 :Error al leer el archivo ${vueLoaderPath}: ${error.message}/n ${error.stack}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// vueLoader.js not found');
                        }
                        return;
                    }

                    // Si la URL comienza con /__versa/hrm/, sirve los archivos de dist/hrm
                    if (req.url.startsWith('/__versa/hrm/')) {
                        // Sirve archivos de dist/hrm como /__versa/hrm/*
                        const filePath = path.join(
                            env.PATH_PROY || '',
                            'dist',
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
                            console.error(
                                chalk.red(
                                    `🚩 :Error al leer el archivo ${filePath}: ${error.message}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// Not found');
                        }
                        return;
                    }

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
            ],
        });

        return bs;
    } catch (error) {
        logger.error(`🚩 :Error al iniciar BrowserSync: ${error.message}`);
        process.exit(1);
    }
}

export function emitirCambios(bs: any, action: string, filePath: string) {
    logger.info(
        chalk.green(`[HMR] Emitiendo cambios: ${action} ${filePath}\n`),
    );
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    const nameFile = path.basename(
        normalizedPath,
        path.extname(normalizedPath),
    );
    bs.sockets.emit(action, { action, filePath, normalizedPath, nameFile });
}
