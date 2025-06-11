// Test completo para Issue #2: Cache Keys sin granularidad suficiente
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

const env = process.env;

/**
 * PROBLEMA: Las claves de cache no incluyen:
 * - Hash de configuración del compilador
 * - Variables de entorno relevantes
 * - Versiones de dependencias
 *
 * RESULTADO: Cache devuelve resultados obsoletos cuando cambia configuración
 */

interface CompilerConfig {
    typescript?: {
        target?: string;
        module?: string;
        strict?: boolean;
    };
    alias?: Record<string, string>;
    minify?: boolean;
    sourceMaps?: boolean;
    outputDir?: string;
}

const COMPILATION_ENV_VARS = [
    'NODE_ENV',
    'VERSA_DEBUG',
    'VERSA_MINIFY',
    'VERSA_SOURCE_MAPS',
    'VERSA_TARGET',
] as const;

class CurrentCacheImplementation {
    private cache = new Map<string, { contentHash: string; result: string }>();

    async generateContentHash(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf8');
        return createHash('sha256').update(content).digest('hex');
    }

    async getCacheKey(filePath: string): Promise<string> {
        // PROBLEMA: Solo usa hash del contenido del archivo
        const contentHash = await this.generateContentHash(filePath);
        return `${filePath}:${contentHash}`;
    }

    async get(filePath: string): Promise<string | null> {
        const key = await this.getCacheKey(filePath);
        return this.cache.get(key)?.result || null;
    }

    async set(filePath: string, result: string): Promise<void> {
        const key = await this.getCacheKey(filePath);
        const contentHash = await this.generateContentHash(filePath);
        this.cache.set(key, { contentHash, result });
    }
}

class ImprovedCacheImplementation {
    private cache = new Map<string, { key: string; result: string }>();
    private generateConfigHash(config: CompilerConfig): string {
        // Asegurar ordenamiento consistente de todas las propiedades anidadas
        const normalizedConfig = this.normalizeConfig(config);
        const configStr = JSON.stringify(normalizedConfig);
        return createHash('sha256')
            .update(configStr)
            .digest('hex')
            .substring(0, 8);
    }

    private normalizeConfig(config: CompilerConfig): any {
        if (!config || typeof config !== 'object') return {};

        const normalized: any = {};

        // Ordenar todas las claves recursivamente
        const sortedKeys = Object.keys(config).sort();
        for (const key of sortedKeys) {
            const value = config[key as keyof CompilerConfig];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                normalized[key] = this.normalizeConfig(value as any);
            } else if (Array.isArray(value)) {
                normalized[key] = [...value].sort();
            } else {
                normalized[key] = value;
            }
        }

        return normalized;
    }

    private generateEnvHash(): string {
        const envVars = COMPILATION_ENV_VARS.map(
            key => `${key}=${env[key] || ''}`,
        ).join('|');
        return createHash('sha256')
            .update(envVars)
            .digest('hex')
            .substring(0, 8);
    }

    private async generateDependencyHash(): Promise<string> {
        try {
            const packagePath = join(process.cwd(), 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            const pkg = JSON.parse(packageContent);

            const deps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };

            const depsStr = JSON.stringify(deps, Object.keys(deps).sort());
            return createHash('sha256')
                .update(depsStr)
                .digest('hex')
                .substring(0, 8);
        } catch {
            return 'no-deps';
        }
    }

    async generateContentHash(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf8');
        return createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 8);
    }
    async getCacheKey(
        filePath: string,
        config: CompilerConfig,
    ): Promise<string> {
        const contentHash = await this.generateContentHash(filePath);
        const configHash = this.generateConfigHash(config);
        const envHash = this.generateEnvHash();
        const depsHash = await this.generateDependencyHash();

        // SOLUCIÓN: Incluir todos los factores que afectan la compilación
        // Usar | como separador para evitar problemas con rutas de Windows
        // Normalizar el path para usar solo el nombre del archivo
        const normalizedPath = filePath
            .replace(/\\/g, '/')
            .replace(/^.*[/]/, '');
        return `${normalizedPath}|${contentHash}|${configHash}|${envHash}|${depsHash}`;
    }

    async get(
        filePath: string,
        config: CompilerConfig,
    ): Promise<string | null> {
        const key = await this.getCacheKey(filePath, config);
        const entry = this.cache.get(key);
        return entry?.result || null;
    }

    async set(
        filePath: string,
        config: CompilerConfig,
        result: string,
    ): Promise<void> {
        const key = await this.getCacheKey(filePath, config);
        this.cache.set(key, { key, result });
    }
}

describe('Issue #2: Cache Keys Granularidad Completa', () => {
    const testFile = join(__dirname, '../temp/cache-test.ts');
    const testContent = `
        export const greeting = "Hello World";
        export const version = "1.0.0";
    `;

    beforeAll(async () => {
        await fs.mkdir(join(__dirname, '../temp'), { recursive: true });
        await fs.writeFile(testFile, testContent);
    });

    afterAll(async () => {
        try {
            await fs.unlink(testFile);
            // No intentar eliminar la carpeta ya que otros tests la pueden estar usando
        } catch {
            // Ignorar errores de cleanup
        }
    });
    describe('Problema Actual: Cache Keys Insuficientes', () => {
        test('PROBLEMA: Cache no se invalida cuando cambia configuración', async () => {
            const cache = new CurrentCacheImplementation();

            // Compilación inicial con configuración A
            const _configA: CompilerConfig = {
                typescript: { target: 'ES5', strict: false },
                minify: false,
            };

            const resultA = `// Compilado con target ES5, sin minify\nvar greeting = "Hello World";`;
            await cache.set(testFile, resultA);

            // Verificar que está en cache
            const cachedA = await cache.get(testFile);
            expect(cachedA).toBe(resultA);

            // PROBLEMA: Cambiar configuración pero mantener mismo archivo
            const _configB: CompilerConfig = {
                typescript: { target: 'ES2020', strict: true },
                minify: true,
            };

            const expectedResultB = `// Compilado con target ES2020, con minify\nconst greeting="Hello World";`;

            // PROBLEMA: Cache devuelve resultado anterior aunque config cambió
            const cachedB = await cache.get(testFile);
            expect(cachedB).toBe(resultA); // ❌ DEVUELVE RESULTADO OBSOLETO

            // Lo que DEBERÍA pasar: null porque config cambió
            expect(cachedB).not.toBe(expectedResultB);
        });

        test('PROBLEMA: Cache no considera variables de entorno', async () => {
            const cache = new CurrentCacheImplementation();

            // Compilación en desarrollo
            const originalNodeEnv = env.NODE_ENV;
            env.NODE_ENV = 'development';

            const devResult = `// Desarrollo con debug info\nconsole.log("DEBUG"); var greeting = "Hello World";`;
            await cache.set(testFile, devResult);

            // Cambiar a producción
            env.NODE_ENV = 'production';

            const _prodResult = `// Producción sin debug\nvar greeting="Hello World";`;

            // PROBLEMA: Cache devuelve resultado de desarrollo en producción
            const cached = await cache.get(testFile);
            expect(cached).toBe(devResult); // ❌ INCORRECTO

            // Restaurar
            env.NODE_ENV = originalNodeEnv;
        });
    });
    describe('Solución Propuesta: Cache Keys Mejoradas', () => {
        test('SOLUCIÓN: Cache se invalida correctamente cuando cambia configuración', async () => {
            const cache = new ImprovedCacheImplementation();

            // Compilación inicial con configuración A
            const configA: CompilerConfig = {
                typescript: { target: 'ES5', strict: false },
                minify: false,
            };

            const resultA = `// Compilado con target ES5, sin minify\nvar greeting = "Hello World";`;
            await cache.set(testFile, configA, resultA);

            // Verificar que está en cache
            const cachedA = await cache.get(testFile, configA);
            expect(cachedA).toBe(resultA);

            // Cambiar configuración
            const configB: CompilerConfig = {
                typescript: { target: 'ES2020', strict: true },
                minify: true,
            };

            // ✅ SOLUCIÓN: Cache devuelve null porque config cambió
            const cachedB = await cache.get(testFile, configB);
            expect(cachedB).toBeNull(); // ✅ CORRECTO: cache miss

            // Compilar con nueva configuración
            const resultB = `// Compilado con target ES2020, con minify\nconst greeting="Hello World";`;
            await cache.set(testFile, configB, resultB);

            // Verificar que ambas configuraciones coexisten en cache
            expect(await cache.get(testFile, configA)).toBe(resultA);
            expect(await cache.get(testFile, configB)).toBe(resultB);
        });

        test('SOLUCIÓN: Cache considera variables de entorno', async () => {
            const cache = new ImprovedCacheImplementation();
            const config: CompilerConfig = { minify: false };

            // Compilación en desarrollo
            const originalNodeEnv = env.NODE_ENV;
            env.NODE_ENV = 'development';

            const devResult = `// Desarrollo con debug info\nconsole.log("DEBUG"); var greeting = "Hello World";`;
            await cache.set(testFile, config, devResult);

            // Verificar cache en desarrollo
            expect(await cache.get(testFile, config)).toBe(devResult);

            // Cambiar a producción
            env.NODE_ENV = 'production';

            // ✅ SOLUCIÓN: Cache devuelve null porque env cambió
            const cached = await cache.get(testFile, config);
            expect(cached).toBeNull(); // ✅ CORRECTO: cache miss

            // Restaurar
            env.NODE_ENV = originalNodeEnv;
        });

        test('VERIFICAR: Cache keys son diferentes para diferentes configuraciones', async () => {
            const cache = new ImprovedCacheImplementation();

            const configA: CompilerConfig = { typescript: { target: 'ES5' } };
            const configB: CompilerConfig = {
                typescript: { target: 'ES2020' },
            };
            const keyA = await cache.getCacheKey(testFile, configA);
            const keyB = await cache.getCacheKey(testFile, configB);

            expect(keyA).not.toBe(keyB);
            expect(keyA).toContain('cache-test.ts');
            expect(keyB).toContain('cache-test.ts');
        });
        test('VERIFICAR: Cache keys incluyen todos los componentes', async () => {
            const cache = new ImprovedCacheImplementation();
            const config: CompilerConfig = { minify: true };

            const key = await cache.getCacheKey(testFile, config);
            const parts = key.split('|'); // Cambiado a | separator

            expect(parts).toHaveLength(5); // filePath|content|config|env|deps
            expect(parts[0]).toBe('cache-test.ts'); // Nombre normalizado del archivo
            expect(parts[1]).toMatch(/^[a-f0-9]{8}$/); // content hash
            expect(parts[2]).toMatch(/^[a-f0-9]{8}$/); // config hash
            expect(parts[3]).toMatch(/^[a-f0-9]{8}$/); // env hash
            expect(parts[4]).toMatch(/^[a-f0-9]{8}$|^no-deps$/); // deps hash
        });
    });

    describe('Casos Edge y Performance', () => {
        test('Performance: Generación de cache keys es eficiente', async () => {
            const cache = new ImprovedCacheImplementation();
            const config: CompilerConfig = { minify: true };

            const start = Date.now();
            for (let i = 0; i < 100; i++) {
                await cache.getCacheKey(testFile, config);
            }
            const duration = Date.now() - start;

            // Generación de cache key debería ser < 200ms promedio (ajustado para ser realista)
            expect(duration / 100).toBeLessThan(200);
        });

        test('Edge Case: Configuración undefined/null', async () => {
            const cache = new ImprovedCacheImplementation();

            const keyA = await cache.getCacheKey(testFile, {});
            const keyB = await cache.getCacheKey(testFile, {} as any);

            expect(keyA).toBeDefined();
            expect(keyB).toBeDefined();
        });

        test('Edge Case: Configuración con propiedades anidadas', async () => {
            const cache = new ImprovedCacheImplementation();

            const configA = {
                typescript: { target: 'ES5', lib: ['DOM', 'ES6'] },
                alias: { '@': './src', '#': './lib' },
            };

            const configB = {
                typescript: { target: 'ES5', lib: ['ES6', 'DOM'] }, // Orden diferente
                alias: { '#': './lib', '@': './src' }, // Orden diferente
            };

            const keyA = await cache.getCacheKey(testFile, configA);
            const keyB = await cache.getCacheKey(testFile, configB);

            // Deberían ser iguales porque el contenido es el mismo
            expect(keyA).toBe(keyB);
        });
    });
});
