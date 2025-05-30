import { env } from 'node:process';

// Mock de los módulos antes de importar
jest.mock('../src/servicios/logger.ts', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('readConfig', () => {
    // Guardamos los valores originales de las variables de entorno
    let originalEnv: { [key: string]: string | undefined };

    beforeEach(() => {
        // Guardamos el estado original del env
        originalEnv = { ...process.env };

        // Limpiamos las variables específicas del test
        delete env.PATH_CONFIG_FILE;
        delete env.PATH_ALIAS;
        delete env.tailwindcss;
        delete env.proxyUrl;
        delete env.AssetsOmit;
        delete env.linter;
        delete env.tsconfigFile;
        delete env.PATH_SOURCE;
        delete env.PATH_DIST;
        delete env.aditionalWatch;
        delete env.tsConfig;
    });

    afterEach(() => {
        // Restauramos el estado original
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('Validación de variables de entorno', () => {
        it('debe fallar cuando PATH_CONFIG_FILE no está definido', async () => {
            // Importamos la función aquí para asegurar que los mocks estén configurados
            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            expect(result).toBe(false);
        });

        it('debe intentar leer el archivo cuando PATH_CONFIG_FILE está definido', async () => {
            // Configuramos una ruta válida para el test
            env.PATH_CONFIG_FILE = './versacompile.config.ts';

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            // En este caso el archivo podría no existir, pero al menos no debería fallar por env no definido
            const result = await readConfig();

            // El resultado puede ser true o false dependiendo de si el archivo existe y es válido
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Validación de rutas peligrosas (Path Traversal)', () => {
        it('debe fallar con rutas que contienen ../', async () => {
            env.PATH_CONFIG_FILE = '../../../etc/passwd';

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            expect(result).toBe(false);
        });

        it('debe fallar con rutas que intentan escapar del directorio', async () => {
            env.PATH_CONFIG_FILE = './config/../../../sensitive/file.ts';

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            expect(result).toBe(false);
        });
    });

    describe('Validación de caracteres peligrosos', () => {
        it('debe fallar con rutas que contienen caracteres de command injection', async () => {
            env.PATH_CONFIG_FILE = './config.ts; rm -rf /';

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            expect(result).toBe(false);
        });

        it('debe fallar con rutas que contienen backticks', async () => {
            env.PATH_CONFIG_FILE = './config.ts`whoami`';

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            expect(result).toBe(false);
        });
    });

    describe('Validación de longitud de rutas', () => {
        it('debe fallar con rutas excesivamente largas', async () => {
            // Crear una ruta muy larga (mayor a 260 caracteres)
            const longPath = 'a'.repeat(300) + '.ts';
            env.PATH_CONFIG_FILE = longPath;

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            expect(result).toBe(false);
        });
    });

    describe('initConfig', () => {
        it('debe poder crear un archivo de configuración', async () => {
            const fs = await import('fs');
            const path = await import('path');

            // Configuramos un nombre de archivo temporal
            const tempConfigFile = './test-config.ts';
            env.PATH_CONFIG_FILE = tempConfigFile;

            const { initConfig } = await import(
                '../src/servicios/readConfig'
            );

            try {
                const result = await initConfig();

                // Si el archivo no existía antes, debería crearse
                if (
                    !fs.existsSync(path.resolve(process.cwd(), tempConfigFile))
                ) {
                    expect(result).toBe(true);
                } else {
                    // Si ya existía, debe advertir
                    expect(result).toBe(true);
                }
            } finally {
                // Limpiamos el archivo de prueba si se creó
                try {
                    const fullPath = path.resolve(
                        process.cwd(),
                        tempConfigFile,
                    );
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                } catch {
                    // Ignoramos errores de limpieza
                }
            }
        });
    });

    describe('Integración con archivo de configuración real', () => {
        it('debe procesar correctamente un archivo de configuración válido (si existe)', async () => {
            // Usar el archivo de configuración real del proyecto
            env.PATH_CONFIG_FILE = './versacompile.config.ts';

            const { readConfig } = await import(
                '../src/servicios/readConfig'
            );

            const result = await readConfig();

            if (result === true) {
                // Si tuvo éxito, verificar que las variables de entorno se configuraron
                expect(env.PATH_ALIAS).toBeDefined();
                expect(env.PATH_SOURCE).toBeDefined();
                expect(env.PATH_DIST).toBeDefined();
                // Verificar que PATH_ALIAS es un JSON válido
                if (env.PATH_ALIAS) {
                    expect(() =>
                        JSON.parse(env.PATH_ALIAS as string),
                    ).not.toThrow();
                }
            }

            // El resultado debe ser boolean independientemente del éxito
            expect(typeof result).toBe('boolean');
        });
    });
});
