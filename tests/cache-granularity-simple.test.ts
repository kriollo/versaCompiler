// Test simple para verificar granularidad de cache
import { createHash } from 'crypto';

/**
 * Test básico para demostrar Issue #2: Cache Keys sin granularidad suficiente
 */

describe('Issue #2: Cache Granularity - Test Simple', () => {
    test('básico: debe funcionar', () => {
        expect(true).toBe(true);
    });

    test('crear hash de configuración', () => {
        const config1 = { target: 'ES5', minify: false };
        const config2 = { target: 'ES2020', minify: true };
        const hash1 = createHash('sha256')
            .update(JSON.stringify(config1))
            .digest('hex');
        const hash2 = createHash('sha256')
            .update(JSON.stringify(config2))
            .digest('hex');

        expect(hash1).not.toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
        expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    });

    test('demostrar problema: cache key solo con contenido', () => {
        const filePath = '/test/file.ts';
        const content = 'export const test = "hello";';

        // Cache key actual - solo contenido
        const contentHash = createHash('sha256').update(content).digest('hex');
        const currentKey = `${filePath}:${contentHash}`;

        // Cache key mejorado - incluye configuración
        const config = { target: 'ES5', minify: true };
        const configHash = createHash('sha256')
            .update(JSON.stringify(config))
            .digest('hex');
        const improvedKey = `${filePath}:${contentHash}:${configHash}`;

        expect(currentKey).not.toBe(improvedKey);
        expect(improvedKey).toContain(currentKey);
    });
});
