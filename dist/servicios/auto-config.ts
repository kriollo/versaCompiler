/**
 * CONFIGURACIÓN AUTOMÁTICA PORTABLE DEL MODULE RESOLVER
 *
 * Este script detecta automáticamente la configuración del proyecto
 * y configura el module resolver sin requerir intervención manual.
 * Funciona con cualquier gestor de paquetes (npm, pnpm, yarn)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ProjectConfig {
    packageManager: 'npm' | 'pnpm' | 'yarn';
    framework:
        | 'vue'
        | 'react'
        | 'angular'
        | 'svelte'
        | 'nextjs'
        | 'nuxt'
        | 'vite'
        | 'vanilla';
    hasModernStructure: boolean;
    recommendOptimized: boolean;
    totalDependencies: number;
    srcPath?: string;
}

/**
 * Detecta automáticamente la configuración del proyecto
 */
export async function detectProjectConfiguration(
    projectPath: string = process.cwd(),
): Promise<ProjectConfig> {
    try {
        // Detectar gestor de paquetes
        const packageManager = await detectPackageManager(projectPath);

        // Leer package.json para detectar framework
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, 'utf-8'),
        );

        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        // Detectar framework principal
        const framework = detectFramework(allDeps);

        // Detectar si tiene estructura moderna (src/, components/, etc.)
        const hasModernStructure = await detectModernStructure(projectPath);

        // Detectar ruta de src
        const srcPath = await detectSrcPath(projectPath);

        // Recomendación automática de modo
        const recommendOptimized =
            hasModernStructure ||
            framework !== 'vanilla' ||
            Object.keys(allDeps).length > 10 ||
            !!srcPath;

        const config: ProjectConfig = {
            packageManager,
            framework,
            hasModernStructure,
            recommendOptimized,
            totalDependencies: Object.keys(allDeps).length,
            srcPath,
        };

        console.log('🔍 Configuración del proyecto detectada automáticamente:');
        console.log(`  📦 Gestor de paquetes: ${config.packageManager}`);
        console.log(`  🚀 Framework: ${config.framework}`);
        console.log(
            `  📁 Estructura moderna: ${config.hasModernStructure ? 'Sí' : 'No'}`,
        );
        console.log(`  📂 Directorio src: ${config.srcPath || 'No detectado'}`);
        console.log(
            `  🎯 Modo recomendado: ${config.recommendOptimized ? 'Optimizado' : 'Completo'}`,
        );
        console.log(`  📋 Total dependencias: ${config.totalDependencies}`);

        return config;
    } catch (error) {
        console.warn(
            `⚠️ Error detectando configuración del proyecto: ${(error as Error).message}`,
        );
        return {
            packageManager: 'npm',
            framework: 'vanilla',
            hasModernStructure: false,
            recommendOptimized: false,
            totalDependencies: 0,
        };
    }
}

/**
 * Detecta el gestor de paquetes utilizado
 */
async function detectPackageManager(
    projectPath: string,
): Promise<'npm' | 'pnpm' | 'yarn'> {
    const managers = [
        { file: 'pnpm-lock.yaml', name: 'pnpm' as const },
        { file: 'yarn.lock', name: 'yarn' as const },
        { file: 'package-lock.json', name: 'npm' as const },
    ];

    for (const manager of managers) {
        try {
            await fs.access(path.join(projectPath, manager.file));
            return manager.name;
        } catch {
            continue;
        }
    }
    return 'npm'; // default
}

/**
 * Detecta el framework principal basado en dependencias
 */
function detectFramework(
    dependencies: Record<string, string>,
): ProjectConfig['framework'] {
    if (
        dependencies.vue ||
        dependencies['@vue/cli'] ||
        dependencies['@vue/core']
    )
        return 'vue';
    if (dependencies.react || dependencies['react-dom']) return 'react';
    if (dependencies['@angular/core'] || dependencies['@angular/cli'])
        return 'angular';
    if (dependencies.svelte || dependencies['@sveltejs/kit']) return 'svelte';
    if (dependencies.next || dependencies['next.js']) return 'nextjs';
    if (dependencies.nuxt || dependencies['@nuxt/kit']) return 'nuxt';
    if (
        dependencies.vite ||
        dependencies['@vitejs/plugin-vue'] ||
        dependencies['@vitejs/plugin-react']
    )
        return 'vite';
    return 'vanilla';
}

/**
 * Detecta si el proyecto tiene estructura moderna
 */
async function detectModernStructure(projectPath: string): Promise<boolean> {
    const modernFolders = [
        'src',
        'components',
        'composables',
        'stores',
        'views',
        'pages',
        'lib',
        'utils',
    ];

    for (const folder of modernFolders) {
        try {
            const stat = await fs.stat(path.join(projectPath, folder));
            if (stat.isDirectory()) return true;
        } catch {
            continue;
        }
    }
    return false;
}

/**
 * Detecta la ruta del directorio src
 */
async function detectSrcPath(projectPath: string): Promise<string | undefined> {
    const possibleSrcPaths = ['src', 'source', 'app', 'lib'];

    for (const srcDir of possibleSrcPaths) {
        try {
            const srcPath = path.join(projectPath, srcDir);
            const stat = await fs.stat(srcPath);
            if (stat.isDirectory()) {
                // Verificar que contenga archivos JS/TS/Vue
                const files = await fs.readdir(srcPath);
                const hasSourceFiles = files.some(file =>
                    /\.(js|ts|vue|jsx|tsx|svelte)$/i.test(file),
                );
                if (hasSourceFiles) {
                    return srcPath;
                }
            }
        } catch {
            continue;
        }
    }
    return undefined;
}

/**
 * Genera configuración de importmap optimizada
 */
export function generateOptimizedConfig(config: ProjectConfig): object {
    const baseConfig = {
        optimizedMode: config.recommendOptimized,
        framework: config.framework,
        packageManager: config.packageManager,
    };

    // Configuraciones específicas por framework
    switch (config.framework) {
        case 'vue':
            return {
                ...baseConfig,
                specialModules: {
                    vue: 'vue/dist/vue.esm-browser.js',
                    '@vue/reactivity':
                        '@vue/reactivity/dist/reactivity.esm-browser.js',
                    '@vue/shared': '@vue/shared/dist/shared.esm-browser.js',
                },
            };
        case 'react':
            return {
                ...baseConfig,
                specialModules: {
                    react: 'react/index.js',
                    'react-dom': 'react-dom/index.js',
                },
            };
        case 'vite':
            return {
                ...baseConfig,
                optimizedMode: true, // Vite siempre usa modo optimizado
                viteCompat: true,
            };
        default:
            return baseConfig;
    }
}

/**
 * Crea script de inicialización automática para el navegador
 */
export function createBrowserInitScript(config: ProjectConfig): string {
    const optimizedConfig = generateOptimizedConfig(config);

    return `
// Auto-inicialización del Module Resolver (Generado automáticamente)
(async function() {
    console.log('🤖 Iniciando Module Resolver con configuración automática...');

    const config = ${JSON.stringify(optimizedConfig, null, 2)};
    console.log('⚙️ Configuración detectada:', config);

    try {
        // Detectar si ya existe otro sistema de module resolution
        if (document.querySelector('script[type="importmap"]')) {
            console.log('📋 Import map existente detectado, saltando auto-configuración');
            return;
        }

        // Cargar el module resolver
        const resolver = new AbsolutelyDynamicModuleResolver(config);
        window.moduleResolver = resolver;

        console.log('✅ Module Resolver inicializado automáticamente');
        console.log(\`🎯 Modo: \${config.optimizedMode ? 'Optimizado' : 'Completo'}\`);
        console.log(\`🚀 Framework: \${config.framework}\`);

    } catch (error) {
        console.warn('⚠️ Error en auto-inicialización:', error);
        console.log('🔄 Usando configuración de fallback...');

        // Fallback a configuración básica
        if (window.createAutoConfiguredResolver) {
            window.moduleResolver = window.createAutoConfiguredResolver();
        }
    }
})();`;
}

/**
 * Valida que todas las dependencias necesarias estén disponibles
 */
export async function validateDependencies(
    projectPath: string,
): Promise<boolean> {
    try {
        const nodeModulesPath = path.join(projectPath, 'node_modules');
        await fs.access(nodeModulesPath);

        // Verificar que node_modules no esté vacío
        const contents = await fs.readdir(nodeModulesPath);
        return contents.length > 0;
    } catch {
        return false;
    }
}

/**
 * Función principal de configuración automática
 */
export async function autoConfigureProject(
    projectPath: string = process.cwd(),
): Promise<ProjectConfig> {
    console.log('🔧 Iniciando configuración automática del Module Resolver...');

    // Validar que las dependencias estén instaladas
    const hasValidDependencies = await validateDependencies(projectPath);
    if (!hasValidDependencies) {
        console.warn(
            '⚠️ No se encontraron dependencias instaladas. Ejecuta npm/pnpm/yarn install primero.',
        );
    }

    // Detectar configuración
    const config = await detectProjectConfiguration(projectPath);

    // Mostrar resumen
    console.log('\n📋 Resumen de configuración automática:');
    console.log('┌─────────────────────────────────────────┐');
    console.log(`│ Framework: ${config.framework.padEnd(28)} │`);
    console.log(`│ Gestor de paquetes: ${config.packageManager.padEnd(19)} │`);
    console.log(
        `│ Modo: ${(config.recommendOptimized ? 'Optimizado' : 'Completo').padEnd(32)} │`,
    );
    console.log(
        `│ Dependencias: ${config.totalDependencies.toString().padEnd(26)} │`,
    );
    console.log('└─────────────────────────────────────────┘');

    return config;
}
