import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { Config, readConfig } from '../src/js/servicios/readConfig';

jest.mock('fs-extra');

describe('ReadConfig Service', () => {
    const mockConfig: Config = {
        tsconfig: './tsconfig.json',
        compilerOptions: {
            sourceRoot: './src',
            outDir: './public',
            pathsAlias: {
                '@/*': ['src/*'],
                'P@/*': ['public/*'],
            },
        },
        proxyConfig: {
            proxyUrl: '',
            assetsOmit: true,
        },
        aditionalWatch: [
            './app/templates/**/*.twig',
            './app/templates/**/*.html',
        ],
        tailwindConfig: {
            bin: './node_modules/.bin/tailwindcss',
            input: './src/css/input.css',
            output: './public/css/output.css',
        },
        linter: [
            {
                name: 'eslint',
                bin: './node_modules/.bin/eslint',
                configFile: './eslint.config.js',
                fix: false,
                paths: ['src/'],
            },
            {
                name: 'oxlint',
                bin: './node_modules/.bin/oxlint',
                configFile: './.oxlintrc.json',
                fix: false,
                paths: ['src/'],
            },
        ],
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test('debe leer la configuración del archivo versacompile.config.ts', async () => {
        const mockContent = `export default ${JSON.stringify(mockConfig, null, 2)}`;
        (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

        const config = await readConfig();

        expect(config).toBeDefined();
        expect(config).toEqual(mockConfig);
        expect(fs.readFile).toHaveBeenCalledWith(
            expect.stringContaining('versacompile.config.ts'),
            'utf-8',
        );
    });

    test('debe manejar archivo de configuración faltante', async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

        const config = await readConfig();

        expect(config).toEqual({
            tsconfig: './tsconfig.json',
            compilerOptions: {
                sourceRoot: './src',
                outDir: './public',
                pathsAlias: {},
            },
            proxyConfig: {
                proxyUrl: '',
                assetsOmit: false,
            },
        });
    });

    test('debe manejar errores de sintaxis en el archivo de configuración', async () => {
        const invalidContent = 'export default { invalid: json: content }';
        (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

        const config = await readConfig();

        expect(config).toEqual({
            tsconfig: './tsconfig.json',
            compilerOptions: {
                sourceRoot: './src',
                outDir: './public',
                pathsAlias: {},
            },
            proxyConfig: {
                proxyUrl: '',
                assetsOmit: false,
            },
        });
    });

    test('debe validar configuración personalizada', async () => {
        const customConfig = {
            tsconfig: './custom/tsconfig.json',
            compilerOptions: {
                sourceRoot: './custom/src',
                outDir: './custom/dist',
                pathsAlias: {
                    '@custom/*': ['custom/*'],
                },
            },
            proxyConfig: {
                proxyUrl: 'http://localhost:8080',
                assetsOmit: true,
            },
            aditionalWatch: ['./custom/**/*.html'],
        };

        const mockContent = `export default ${JSON.stringify(customConfig, null, 2)}`;
        (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

        const config = await readConfig();

        expect(config).toEqual(customConfig);
        expect(config.tsconfig).toBe('./custom/tsconfig.json');
        expect(config.compilerOptions.sourceRoot).toBe('./custom/src');
        expect(config.compilerOptions.outDir).toBe('./custom/dist');
        expect(config.compilerOptions.pathsAlias['@custom/*']).toEqual([
            'custom/*',
        ]);
        expect(config.proxyConfig.proxyUrl).toBe('http://localhost:8080');
    });

    test('debe manejar rutas relativas y absolutas', async () => {
        const configWithPaths = {
            ...mockConfig,
            compilerOptions: {
                ...mockConfig.compilerOptions,
                sourceRoot: path.resolve('./src'),
                outDir: path.resolve('./dist'),
            },
        };

        const mockContent = `export default ${JSON.stringify(configWithPaths, null, 2)}`;
        (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

        const config = await readConfig();

        expect(config.compilerOptions.sourceRoot).toBe(path.resolve('./src'));
        expect(config.compilerOptions.outDir).toBe(path.resolve('./dist'));
    });

    test('debe fusionar configuración parcial con valores por defecto', async () => {
        const partialConfig = {
            tsconfig: './custom/tsconfig.json',
            compilerOptions: {
                sourceRoot: './custom/src',
            },
        };

        const mockContent = `export default ${JSON.stringify(partialConfig, null, 2)}`;
        (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

        const config = await readConfig();

        expect(config.tsconfig).toBe('./custom/tsconfig.json');
        expect(config.compilerOptions.sourceRoot).toBe('./custom/src');
        expect(config.compilerOptions.outDir).toBe('./public');
        expect(config.proxyConfig).toBeDefined();
        expect(config.proxyConfig.assetsOmit).toBe(false);
    });
});
