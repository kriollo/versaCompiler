import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

const env = process.env;

/**
 * Test para demostrar y resolver Issue #2: Cache Keys sin granularidad suficiente
 *
 * PROBLEMA: Las claves de cache no incluyen:
 * - Hash de configuración del compilador
 * - Variables de entorno relevantes
 * - Versiones de dependencias
 *
 * RESULTADO: Cache devuelve resultados obsoletos cuando cambia configuración
 */

// Mock de configuración del compilador
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

// Variables de entorno relevantes para compilación
const COMPILATION_ENV_VARS = [
    'NODE_ENV',
    'VERSA_DEBUG',
    'VERSA_MINIFY',
    'VERSA_SOURCE_MAPS',
    'VERSA_TARGET',
] as const;

/**
 * Implementación mejorada de cache con granularidad completa
 */
class BasicImprovedCacheImplementation {
    private cache = new Map<string, any>();

    async getCacheKey(
        filePath: string,
        config: CompilerConfig | undefined | null,
    ): Promise<string> {
        const fileHash = await this.getFileHash(filePath);
        const configHash = this.getConfigHash(config || {});
        const envHash = this.getEnvHash();
        const depsHash = this.getDependenciesHash();

        return createHash('sha256')
            .update(`${fileHash}:${configHash}:${envHash}:${depsHash}`)
            .digest('hex');
    }
    private async getFileHash(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return createHash('sha256').update(content).digest('hex');
        } catch (_error) {
            return createHash('sha256').update(filePath).digest('hex');
        }
    }

    private getConfigHash(config: CompilerConfig): string {
        const normalizedConfig = this.normalizeConfig(config);
        return createHash('sha256')
            .update(JSON.stringify(normalizedConfig))
            .digest('hex');
    }

    private getEnvHash(): string {
        const relevantEnv: Record<string, string> = {};
        for (const envVar of COMPILATION_ENV_VARS) {
            relevantEnv[envVar] = process.env[envVar] || '';
        }
        return createHash('sha256')
            .update(JSON.stringify(relevantEnv))
            .digest('hex');
    }

    private getDependenciesHash(): string {
        // Simulación simple de hash de dependencias
        return createHash('sha256')
            .update('package-version-hash')
            .digest('hex');
    }

    private normalizeConfig(config: CompilerConfig): CompilerConfig {
        const normalized = { ...config };
        if (normalized.typescript) {
            normalized.typescript = { ...normalized.typescript };
        }
        if (normalized.alias) {
            normalized.alias = { ...normalized.alias };
        }
        return normalized;
    }
}

/**
 * Implementación mejorada que incluye configuración en cache key
 */
class ImprovedCacheImplementation {
    private cache = new Map<string, { key: string; result: string }>();
    private generateConfigHash(config: CompilerConfig): string {
        // Normalizar configuración para asegurar consistencia
        const normalizedConfig = this.normalizeConfigForHashing(config);
        const configStr = JSON.stringify(normalizedConfig);
        return createHash('sha256')
            .update(configStr)
            .digest('hex')
            .substring(0, 8);
    }
    private normalizeConfigForHashing(config: CompilerConfig): any {
        // Normalizar configuración de forma determinística
        return this.deepNormalize(config);
    }
    private deepNormalize(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            // Normalizar elementos del array
            const normalized = obj.map(item => this.deepNormalize(item));
            // Solo ordenar arrays de primitivos (strings, numbers, booleans)
            if (
                obj.every(
                    item =>
                        typeof item === 'string' ||
                        typeof item === 'number' ||
                        typeof item === 'boolean' ||
                        item === null ||
                        item === undefined,
                )
            ) {
                return normalized.sort((a, b) => {
                    // Convertir a string para comparación consistente
                    const strA = String(a);
                    const strB = String(b);
                    return strA.localeCompare(strB);
                });
            }
            return normalized;
        }

        // Para objetos, ordenar las claves y normalizar recursivamente
        const normalized: any = {};
        const keys = Object.keys(obj).sort();

        for (const key of keys) {
            normalized[key] = this.deepNormalize(obj[key]);
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
            // Simular hash de package.json para versiones de dependencias
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

        // SOLUCIÓN: Usar separador que no conflicte con paths de Windows
        return `${this.normalizeFilePath(filePath)}|${contentHash}|${configHash}|${envHash}|${depsHash}`;
    }
    private normalizeFilePath(filePath: string): string {
        // Convertir path absoluto a relativo y normalizar separadores
        return filePath.replace(/\\/g, '/').replace(/^.*[/]/, '');
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

describe('Issue #2: Cache Keys Granularidad', () => {
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
            await fs.rmdir(join(__dirname, '../temp'));
        } catch {
            // Ignorar errores de cleanup
        }
    });

    describe('Problema Actual: Cache Keys Insuficientes', () => {
        /**
         * Simula el comportamiento actual de SmartCompilationCache
         */
        class CurrentCacheImplementation {
            private cache = new Map<
                string,
                { contentHash: string; result: string }
            >();

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

        test('PROBLEMA: Cache no se invalida cuando cambia configuración', async () => {
            const cache = new CurrentCacheImplementation();

            // Compilación inicial con configuración A
            const configA: CompilerConfig = {
                typescript: { target: 'ES5', strict: false },
                minify: false,
            };

            const resultA = `// Compilado con target ES5, sin minify\nvar greeting = "Hello World";`;
            await cache.set(testFile, resultA);

            // Verificar que está en cache
            const cachedA = await cache.get(testFile);
            expect(cachedA).toBe(resultA);

            // PROBLEMA: Cambiar configuración pero mantener mismo archivo
            const configB: CompilerConfig = {
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

            const prodResult = `// Producción sin debug\nvar greeting="Hello World";`;

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
            // El cache key debería contener el nombre del archivo normalizado, no el path completo
            expect(keyA).toContain('cache-test.ts');
            expect(keyB).toContain('cache-test.ts');
        });
        test('VERIFICAR: Cache keys incluyen todos los componentes', async () => {
            const cache = new ImprovedCacheImplementation();
            const config: CompilerConfig = { minify: true };

            const key = await cache.getCacheKey(testFile, config);
            const parts = key.split('|'); // Usando separador pipe en lugar de ':'

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
            const cache = new BasicImprovedCacheImplementation() as any;
            const config: CompilerConfig = { minify: true };

            const start = Date.now();
            for (let i = 0; i < 100; i++) {
                await cache.getCacheKey(testFile, config);
            }
            const duration = Date.now() - start;

            // Generación de cache key debería ser < 50ms promedio (más realista)
            expect(duration / 100).toBeLessThan(50);
        });
        test('Edge Case: Configuración undefined/null', async () => {
            const cache = new BasicImprovedCacheImplementation() as any;

            const keyA = await cache.getCacheKey(testFile, {});
            const keyB = await cache.getCacheKey(testFile, undefined);
            const keyC = await cache.getCacheKey(testFile, null);

            expect(keyA).toBeDefined();
            expect(keyB).toBeDefined();
            expect(keyC).toBeDefined();
        });
        test('Edge Case: Configuración con propiedades anidadas', async () => {
            const cache = new ImprovedCacheImplementation() as any;

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

            // Debug logs
            console.log('DEBUG: keyA =', keyA);
            console.log('DEBUG: keyB =', keyB);
            console.log(
                'DEBUG: configA normalized =',
                JSON.stringify(cache.normalizeConfigForHashing(configA)),
            );
            console.log(
                'DEBUG: configB normalized =',
                JSON.stringify(cache.normalizeConfigForHashing(configB)),
            );

            // Deberían ser iguales porque el contenido es el mismo
            expect(keyA).toBe(keyB);
        });
    });
});
