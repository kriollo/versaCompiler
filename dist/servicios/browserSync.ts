import browserSync from 'browser-sync';
import chalk from 'chalk';
import getPort from 'get-port';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from 'node:process';
import {
    createBrowserInitScript,
    detectProjectConfiguration,
} from './auto-config.ts';
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
            // **IMPORTANTE**: Deshabilitar servido estático para forzar que todo pase por middleware
            serveStatic: false,
            // **DESHABILITADO TEMPORALMENTE**: snippetOptions para debug
            /*snippetOptions: {
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
            },*/
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
                // **MIDDLEWARE DE AUTO-INYECCIÓN**: Automáticamente inyecta module-resolver en respuestas HTML
                async function (req, res, next) {
                    console.log(
                        `🔍 [AUTO-INJECTION MIDDLEWARE] Processing: ${req.method} ${req.url}`,
                    );

                    // SALTAR APIs, assets y rutas especiales - NO interceptar
                    if (
                        req.url?.startsWith('/api/') ||
                        req.url?.startsWith('/__versa/') ||
                        req.url?.match(
                            /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|json|xml|txt|pdf|zip|mp4|mp3|wav|ogg)(\?.*)?$/i,
                        )
                    ) {
                        return next();
                    }

                    // Pre-calcular configuración del proyecto para evitar async en res.end
                    const projectConfig = await detectProjectConfiguration(
                        env.PATH_PROY || process.cwd(),
                    );
                    console.log(
                        `🤖 [AUTO-INJECTION] Project config loaded: ${projectConfig.framework}, optimized: ${projectConfig.recommendOptimized}`,
                    );

                    // Solo interceptar respuestas HTML
                    const originalEnd = res.end;
                    const originalWrite = res.write;
                    let body = '';

                    // Interceptar datos de respuesta
                    res.write = function (chunk) {
                        if (chunk) {
                            body += chunk;
                        }
                        return originalWrite.call(this, chunk);
                    };
                    res.end = function (chunk) {
                        if (chunk) {
                            body += chunk;
                        }

                        // Detectar si es HTML y necesita auto-inyección
                        const isHtml =
                            (res.getHeader('content-type') || '').includes(
                                'text/html',
                            ) ||
                            body.includes('<html') ||
                            body.includes('<!DOCTYPE html') ||
                            (req.url &&
                                !req.url.startsWith('/__versa/') &&
                                !req.url.startsWith('/api/') &&
                                (!req.url.includes('.') ||
                                    req.url.endsWith('.html')));

                        console.log(`🔍 Response analysis for ${req.url}:`, {
                            contentType: res.getHeader('content-type'),
                            bodyLength: body.length,
                            isHtml,
                            hasBodyTag: body.includes('</body>'),
                            bodyPreview: body.substring(0, 200) + '...',
                        });

                        if (isHtml && body.includes('</body>')) {
                            console.log(
                                `🔧 Auto-inyectando Module Resolver (${projectConfig.framework}, ${projectConfig.packageManager}) en ${req.url}`,
                            );
                            if (projectConfig.recommendOptimized) {
                                console.log(
                                    `🎯 Modo optimizado recomendado: ${projectConfig.totalDependencies} dependencias detectadas`,
                                );
                            } // Inyectar el script del module-resolver automáticamente
                            const injectionScript = `
                            <script type="module">
                                // Auto-inyección del Dynamic Module Resolver v2.0 (Portable)
                                (async function() {
                                    const projectConfig = {
                                        framework: '${projectConfig.framework}',
                                        packageManager: '${projectConfig.packageManager}',
                                        recommendOptimized: ${projectConfig.recommendOptimized},
                                        totalDependencies: ${projectConfig.totalDependencies}
                                    };

                                    console.log('🤖 Configuración automática detectada:', projectConfig);

                                    try {
                                        // Cargar el module-resolver corregido dinámicamente
                                        const module = await import('/__versa/module-resolver-fixed.js');

                                        // Auto-configurar según el contexto detectado usando la API simplificada
                                        console.log('🎯 Iniciando Module Resolver corregido automáticamente');
                                        window.moduleResolver = await window.initResolver({
                                            optimizedMode: projectConfig.recommendOptimized,
                                            framework: projectConfig.framework
                                        });

                                        console.log(\`✅ Module Resolver auto-inyectado para proyecto \${projectConfig.framework} (\${projectConfig.packageManager})\`);

                                        // Mostrar estadísticas útiles
                                        setTimeout(() => {
                                            if (window.moduleResolver && window.moduleResolver.resolvedModules) {
                                                const resolvedCount = window.moduleResolver.resolvedModules.size;
                                                console.log(\`📊 \${resolvedCount} módulos resueltos automáticamente\`);
                                            }
                                        }, 2000);

                                    } catch (error) {
                                        console.warn('⚠️ Error al auto-inyectar Module Resolver:', error);
                                        console.log('🔄 Intentando fallback a inicialización manual...');

                                        // Fallback si hay problemas
                                        if (window.createAutoConfiguredResolver) {
                                            window.moduleResolver = window.createAutoConfiguredResolver();
                                        }
                                    }
                                })();
                            </script>`;

                            body = body.replace(
                                '</body>',
                                `${injectionScript}\n</body>`,
                            );
                        }

                        return originalEnd.call(this, body);
                    };

                    next();
                },
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

                    // Pre-cargar configuración del proyecto para uso en este middleware
                    const projectConfig = await detectProjectConfiguration(
                        env.PATH_PROY || process.cwd(),
                    );

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
                    if (req.url === '/__versa/module-resolver-fixed.js') {
                        // Busca module-resolver-fixed.js en la carpeta public/js
                        const moduleResolverPath = path.join(
                            env.PATH_PROY || '',
                            'public/js/module-resolver-fixed.js',
                        );
                        res.setHeader('Content-Type', 'application/javascript');
                        try {
                            const fileContent = await fs.readFile(
                                moduleResolverPath,
                                'utf-8',
                            );
                            res.end(fileContent);
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `🚩 :Error al leer el archivo ${moduleResolverPath}: ${error.message}/n ${error.stack}`,
                                ),
                            );
                            res.statusCode = 404;
                            res.end('// module-resolver-fixed.js not found');
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
                    } // **NUEVO**: Servir archivos HTML con auto-inyección
                    if (
                        req.url &&
                        !req.url.startsWith('/api/') &&
                        !req.url.startsWith('/__versa/') &&
                        (req.url.endsWith('.html') ||
                            req.url === '/' ||
                            !req.url.includes('.'))
                    ) {
                        let filePath;
                        if (req.url === '/') {
                            filePath = path.join(
                                env.PATH_PROY || process.cwd(),
                                'index.html',
                            );
                        } else {
                            filePath = path.join(
                                env.PATH_PROY || process.cwd(),
                                req.url,
                            );
                        }

                        try {
                            const htmlContent = await fs.readFile(
                                filePath,
                                'utf-8',
                            );
                            res.setHeader(
                                'Content-Type',
                                'text/html; charset=utf-8',
                            );

                            console.log(
                                `📄 Sirviendo HTML con auto-inyección: ${req.url}`,
                            ); // Aplicar auto-inyección
                            if (htmlContent.includes('</body>')) {
                                const injectionScript = `
                            <script type="module">
                                // Auto-inyección del Dynamic Module Resolver v2.0 (Portable)
                                (async function() {
                                    const projectConfig = {
                                        framework: '${projectConfig.framework}',
                                        packageManager: '${projectConfig.packageManager}',
                                        recommendOptimized: ${projectConfig.recommendOptimized},
                                        totalDependencies: ${projectConfig.totalDependencies}
                                    };

                                    console.log('🤖 Configuración automática detectada:', projectConfig);

                                    try {
                                        // Cargar el module-resolver corregido dinámicamente
                                        const module = await import('/__versa/module-resolver-fixed.js');

                                        // Auto-configurar según el contexto detectado usando la API simplificada
                                        console.log('🎯 Iniciando Module Resolver corregido automáticamente');
                                        window.moduleResolver = await window.initResolver({
                                            optimizedMode: projectConfig.recommendOptimized,
                                            framework: projectConfig.framework
                                        });

                                        console.log(\`✅ Module Resolver auto-inyectado para proyecto \${projectConfig.framework} (\${projectConfig.packageManager})\`);

                                        // Mostrar estadísticas útiles
                                        setTimeout(() => {
                                            if (window.moduleResolver && window.moduleResolver.resolvedModules) {
                                                const resolvedCount = window.moduleResolver.resolvedModules.size;
                                                console.log(\`📊 \${resolvedCount} módulos resueltos automáticamente\`);
                                            }
                                        }, 2000);

                                    } catch (error) {
                                        console.warn('⚠️ Error al auto-inyectar Module Resolver:', error);
                                        console.log('🔄 Intentando fallback a inicialización manual...');

                                        // Fallback si hay problemas
                                        if (window.createAutoConfiguredResolver) {
                                            window.moduleResolver = window.createAutoConfiguredResolver();
                                        }
                                    }
                                })();
                            </script>`;

                                const modifiedContent = htmlContent.replace(
                                    '</body>',
                                    `${injectionScript}\n</body>`,
                                );
                                res.end(modifiedContent);
                                console.log(
                                    `✅ Auto-inyección aplicada a ${req.url}`,
                                );
                            } else {
                                res.end(htmlContent);
                                console.log(
                                    `📄 HTML servido sin modificaciones: ${req.url}`,
                                );
                            }
                        } catch (error) {
                            console.error(
                                `❌ Error sirviendo HTML ${req.url}:`,
                                error.message,
                            );
                            res.statusCode = 404;
                            res.end('File not found');
                        }
                        return;
                    }

                    // detectar si es un archivo estático, puede que contenga un . y alguna extensión o dashUsers.js?v=1746559083866
                    const isAssets = req.url.match(
                        /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|json|html|xml|txt|pdf|zip|mp4|mp3|wav|ogg)(\?.*)?$/i,
                    );

                    // **NUEVO ENDPOINT**: API para obtener configuración automática del proyecto
                    if (req.url === '/api/project-config') {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');

                        try {
                            const projectConfig =
                                await detectProjectConfiguration(
                                    env.PATH_PROY || process.cwd(),
                                );
                            const initScript =
                                createBrowserInitScript(projectConfig);

                            res.end(
                                JSON.stringify({
                                    success: true,
                                    config: projectConfig,
                                    initScript,
                                    timestamp: new Date().toISOString(),
                                }),
                            );

                            logger.info(
                                chalk.green(
                                    `🤖 API: Configuración automática servida (${projectConfig.framework}, ${projectConfig.packageManager})`,
                                ),
                            );
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `❌ Error al obtener configuración automática: ${(error as Error).message}`,
                                ),
                            );
                            res.statusCode = 500;
                            res.end(
                                JSON.stringify({
                                    success: false,
                                    error: (error as Error).message,
                                }),
                            );
                        }
                        return;
                    }

                    // **NUEVO ENDPOINT**: API para obtener dependencias dinámicamente
                    if (req.url === '/api/dependencies') {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');

                        try {
                            const packageJsonPath = path.join(
                                env.PATH_PROY || '',
                                'package.json',
                            );
                            const packageJsonContent = await fs.readFile(
                                packageJsonPath,
                                'utf-8',
                            );
                            const packageJson = JSON.parse(packageJsonContent); // Combinar dependencies y devDependencies
                            const allDeps = {
                                ...packageJson.dependencies,
                                ...packageJson.devDependencies,
                            };

                            res.end(
                                JSON.stringify({
                                    success: true,
                                    dependencies: allDeps,
                                    count: Object.keys(allDeps).length,
                                }),
                            );

                            logger.info(
                                chalk.green(
                                    `📦 API: Dependencias servidas (${Object.keys(allDeps).length} módulos)`,
                                ),
                            );
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `❌ Error al leer package.json: ${error.message}`,
                                ),
                            );
                            res.statusCode = 500;
                            res.end(
                                JSON.stringify({
                                    success: false,
                                    error: error.message,
                                }),
                            );
                        }
                        return;
                    }

                    // **NUEVO ENDPOINT**: API para obtener dependencias usadas en src
                    if (req.url === '/api/dependencies/used') {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');

                        try {
                            const usedDependencies =
                                await analyzeUsedDependencies();

                            res.end(
                                JSON.stringify({
                                    success: true,
                                    usedDependencies,
                                    count: usedDependencies.length,
                                    analyzedFiles: usedDependencies
                                        .filter(dep => dep.files)
                                        .reduce(
                                            (total, dep) =>
                                                total + dep.files.length,
                                            0,
                                        ),
                                }),
                            );

                            logger.info(
                                chalk.green(
                                    `📦 API: Dependencias usadas en src servidas (${usedDependencies.length} módulos)`,
                                ),
                            );
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `❌ Error al analizar dependencias usadas: ${error.message}`,
                                ),
                            );
                            res.statusCode = 500;
                            res.end(
                                JSON.stringify({
                                    success: false,
                                    error: error.message,
                                }),
                            );
                        }
                        return;
                    }

                    // **NUEVO ENDPOINT**: API para resolver módulos dinámicamente
                    if (req.url.startsWith('/api/resolve/')) {
                        const moduleName = req.url
                            .replace('/api/resolve/', '')
                            .split('?')[0];
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');

                        try {
                            // Usar import.meta.resolve para resolver el módulo
                            const nodeModulesPath = path.join(
                                env.PATH_PROY || '',
                                'node_modules',
                                moduleName,
                            );

                            // Verificar si el módulo existe
                            const moduleExists = await fs
                                .access(nodeModulesPath)
                                .then(() => true)
                                .catch(() => false);

                            if (!moduleExists) {
                                res.statusCode = 404;
                                res.end(
                                    JSON.stringify({
                                        success: false,
                                        error: `Módulo ${moduleName} no encontrado`,
                                    }),
                                );
                                return;
                            }

                            // Buscar el archivo principal del módulo
                            const packageJsonPath = path.join(
                                nodeModulesPath,
                                'package.json',
                            );
                            let mainFile = 'index.js';

                            try {
                                const modulePackageJson = JSON.parse(
                                    await fs.readFile(packageJsonPath, 'utf-8'),
                                );
                                // Priorizar module, luego main
                                mainFile =
                                    modulePackageJson.module ||
                                    modulePackageJson.main ||
                                    'index.js';
                            } catch (error: unknown) {
                                // Si no hay package.json, usar index.js por defecto
                                console.warn(
                                    `⚠️ No se pudo leer package.json para ${moduleName}, usando index.js`,
                                    error instanceof Error
                                        ? error.message
                                        : 'Error desconocido',
                                );
                            }

                            // Rutas posibles para módulos ESM
                            const possiblePaths = [
                                // Para Vue específicamente
                                moduleName === 'vue'
                                    ? 'vue/dist/vue.esm-browser.js'
                                    : null,
                                // Ruta basada en package.json
                                `${moduleName}/${mainFile}`,
                                // Rutas alternativas comunes
                                `${moduleName}/dist/index.esm.js`,
                                `${moduleName}/dist/index.mjs`,
                                `${moduleName}/index.mjs`,
                                `${moduleName}/src/index.js`,
                            ].filter(Boolean) as string[]; // Encontrar la primera ruta que funcione
                            let resolvedPath: string | null = null;
                            for (const testPath of possiblePaths) {
                                const fullPath = path.join(
                                    env.PATH_PROY || '',
                                    'node_modules',
                                    testPath,
                                );
                                const exists = await fs
                                    .access(fullPath)
                                    .then(() => true)
                                    .catch(() => false);
                                if (exists) {
                                    resolvedPath = `/node_modules/${testPath}`;
                                    break;
                                }
                            }

                            if (!resolvedPath) {
                                res.statusCode = 404;
                                res.end(
                                    JSON.stringify({
                                        success: false,
                                        error: `No se pudo resolver el punto de entrada para ${moduleName}`,
                                    }),
                                );
                                return;
                            }

                            res.end(
                                JSON.stringify({
                                    success: true,
                                    module: moduleName,
                                    path: resolvedPath,
                                }),
                            );

                            logger.info(
                                chalk.blue(
                                    `🔍 API: Módulo ${moduleName} resuelto -> ${resolvedPath}`,
                                ),
                            );
                        } catch (error) {
                            console.error(
                                chalk.red(
                                    `❌ Error al resolver módulo ${moduleName}: ${error.message}`,
                                ),
                            );
                            res.statusCode = 500;
                            res.end(
                                JSON.stringify({
                                    success: false,
                                    error: error.message,
                                }),
                            );
                        }
                        return;
                    }

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
