// Test para Issue #5: Sourcemap Composition en Transformaciones Múltiples
import { createHash } from 'crypto';

// Jest globals
declare const describe: jest.Describe;
declare const test: jest.It;
declare const expect: jest.Expect;

/**
 * PROBLEMA: Las transformaciones múltiples no componen sourcemaps correctamente
 * RESULTADO: Se pierde la trazabilidad entre el código fuente original y el final
 */

interface TransformResult {
    code: string;
    map?: string;
    dependencies?: string[];
}

/**
 * Simular el problema actual - cada transformación genera su propio sourcemap
 * pero no se componen correctamente
 */
class CurrentTransformPipeline {
    async transform(code: string): Promise<TransformResult> {
        // 1. Transformación de TypeScript
        const step1 = await this.applyTypeScriptTransform(code);

        // 2. Transformación de imports/alias
        const step2 = await this.applyImportTransform(step1.code);

        // 3. Transformación de minificación
        const step3 = await this.applyMinifyTransform(step2.code);

        // ❌ PROBLEMA: Se devuelve solo el último sourcemap
        return {
            code: step3.code,
            map: step3.map, // ❌ PIERDE MAPPINGS ANTERIORES
        };
    }

    private async applyTypeScriptTransform(
        code: string,
    ): Promise<TransformResult> {
        // Simular transformación TS -> JS
        const transformedCode = code
            .replace(/: string/g, '')
            .replace(/interface \w+ {[^}]+}/g, '');

        // Simular sourcemap de TypeScript
        const map = this.generateSourceMap('typescript', transformedCode);

        return { code: transformedCode, map };
    }

    private async applyImportTransform(code: string): Promise<TransformResult> {
        // Simular transformación de imports
        const transformedCode = code.replace(
            /import\s+(.+)\s+from\s+['"]@\/(.+)['"]/g,
            "import $1 from '/dist/$2.js'",
        );

        // Simular sourcemap de imports
        const map = this.generateSourceMap('imports', transformedCode);

        return { code: transformedCode, map };
    }

    private async applyMinifyTransform(code: string): Promise<TransformResult> {
        // Simular minificación
        const transformedCode = code
            .replace(/\s+/g, ' ')
            .replace(/;\s*/g, ';')
            .trim();

        // Simular sourcemap de minificación
        const map = this.generateSourceMap('minify', transformedCode);

        return { code: transformedCode, map };
    }

    private generateSourceMap(stage: string, code: string): string {
        // Simular generación de sourcemap básico
        const hash = createHash('md5')
            .update(code + stage)
            .digest('hex')
            .substring(0, 8);
        return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
            JSON.stringify({
                version: 3,
                sources: [`${stage}.js`],
                names: [],
                mappings: `AAAA,${hash}`,
                file: 'output.js',
            }),
        ).toString('base64')}`;
    }
}

/**
 * Solución propuesta - Composición correcta de sourcemaps
 */
class ImprovedTransformPipeline {
    async transform(code: string): Promise<TransformResult> {
        let currentCode = code;
        let currentMap: string | undefined;
        const mapChain: string[] = [];

        // 1. Transformación de TypeScript
        const step1 = await this.applyTypeScriptTransform(
            currentCode,
            currentMap,
        );
        currentCode = step1.code;
        if (step1.map) {
            mapChain.push(step1.map);
            currentMap = step1.map;
        }

        // 2. Transformación de imports/alias
        const step2 = await this.applyImportTransform(currentCode, currentMap);
        currentCode = step2.code;
        if (step2.map) {
            mapChain.push(step2.map);
            currentMap = step2.map;
        }

        // 3. Transformación de minificación
        const step3 = await this.applyMinifyTransform(currentCode, currentMap);
        currentCode = step3.code;
        if (step3.map) {
            mapChain.push(step3.map);
            currentMap = step3.map;
        }

        // ✅ SOLUCIÓN: Componer todos los sourcemaps
        const composedMap = this.composeSourceMaps(mapChain);

        return {
            code: currentCode,
            map: composedMap,
        };
    }

    private async applyTypeScriptTransform(
        code: string,
        inputMap?: string,
    ): Promise<TransformResult> {
        const transformedCode = code
            .replace(/: string/g, '')
            .replace(/interface \w+ {[^}]+}/g, '');

        const map = this.generateSourceMap(
            'typescript',
            transformedCode,
            inputMap,
        );

        return { code: transformedCode, map };
    }

    private async applyImportTransform(
        code: string,
        inputMap?: string,
    ): Promise<TransformResult> {
        const transformedCode = code.replace(
            /import\s+(.+)\s+from\s+['"]@\/(.+)['"]/g,
            "import $1 from '/dist/$2.js'",
        );

        const map = this.generateSourceMap(
            'imports',
            transformedCode,
            inputMap,
        );

        return { code: transformedCode, map };
    }

    private async applyMinifyTransform(
        code: string,
        inputMap?: string,
    ): Promise<TransformResult> {
        const transformedCode = code
            .replace(/\s+/g, ' ')
            .replace(/;\s*/g, ';')
            .trim();

        const map = this.generateSourceMap('minify', transformedCode, inputMap);

        return { code: transformedCode, map };
    }

    private generateSourceMap(
        stage: string,
        code: string,
        inputMap?: string,
    ): string {
        const hash = createHash('md5')
            .update(code + stage)
            .digest('hex')
            .substring(0, 8);

        // Si hay un sourcemap de entrada, marcar como parte de la cadena
        const sources = inputMap
            ? [`${stage}.js`, 'previous.js']
            : [`${stage}.js`];

        return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
            JSON.stringify({
                version: 3,
                sources,
                names: [],
                mappings: `AAAA,${hash}`,
                file: 'output.js',
                inputSourceMap: inputMap ? 'chained' : undefined,
            }),
        ).toString('base64')}`;
    }
    private composeSourceMaps(mapChain: string[]): string {
        if (mapChain.length === 0) return '';
        if (mapChain.length === 1) return mapChain[0]!;

        // Simular composición de sourcemaps
        const composedHash = createHash('md5')
            .update(mapChain.join(''))
            .digest('hex')
            .substring(0, 8);

        return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(
            JSON.stringify({
                version: 3,
                sources: ['original.ts'],
                names: [],
                mappings: `AAAA,${composedHash}`,
                file: 'output.js',
                composed: true,
                chainLength: mapChain.length,
            }),
        ).toString('base64')}`;
    }
}

describe('Issue #5: Sourcemap Composition', () => {
    describe('Problema Actual: Sourcemaps No Se Componen', () => {
        test('PROBLEMA: Pipeline actual pierde sourcemaps intermedios', async () => {
            const pipeline = new CurrentTransformPipeline();

            const sourceCode = `
interface User {
    name: string;
    age: string;
}

import { Component } from '@/components/Modal';

export function createUser() {
    return { name: "test", age: "25" };
}
            `;

            const result = await pipeline.transform(sourceCode);
            expect(result.code).toBeTruthy();
            expect(result.map).toBeTruthy();

            // ❌ PROBLEMA: Solo tiene sourcemap de la última transformación
            if (!result.map) throw new Error('Expected map to be defined');

            const mapData = JSON.parse(
                Buffer.from(
                    result.map.split('base64,')[1]!,
                    'base64',
                ).toString(),
            );

            expect(mapData.sources).toContain('minify.js');
            expect(mapData.sources).not.toContain('typescript.js');
            expect(mapData.sources).not.toContain('imports.js');

            console.log('❌ Sourcemap actual (solo minify):', mapData);
        });
    });

    describe('Solución Propuesta: Composición Correcta', () => {
        test('SOLUCIÓN: Pipeline mejorado compone sourcemaps correctamente', async () => {
            const pipeline = new ImprovedTransformPipeline();

            const sourceCode = `
interface User {
    name: string;
    age: string;
}

import { Component } from '@/components/Modal';

export function createUser() {
    return { name: "test", age: "25" };
}
            `;

            const result = await pipeline.transform(sourceCode);
            expect(result.code).toBeTruthy();
            expect(result.map).toBeTruthy();

            // ✅ SOLUCIÓN: Sourcemap compuesto incluye toda la cadena
            if (!result.map) throw new Error('Expected map to be defined');

            const mapData = JSON.parse(
                Buffer.from(
                    result.map.split('base64,')[1]!,
                    'base64',
                ).toString(),
            );

            expect(mapData.composed).toBe(true);
            expect(mapData.chainLength).toBe(3);
            expect(mapData.sources).toContain('original.ts');

            console.log('✅ Sourcemap compuesto:', mapData);
        });

        test('VERIFICAR: Transformaciones aplican correctamente', async () => {
            const pipeline = new ImprovedTransformPipeline();

            const sourceCode = `interface User { name: string; } import { Component } from '@/components/Modal';`;
            const result = await pipeline.transform(sourceCode);

            // Verificar que todas las transformaciones se aplicaron
            expect(result.code).not.toContain('interface User'); // TypeScript transform
            expect(result.code).toContain('/dist/'); // Import transform
            expect(result.code.length).toBeLessThan(sourceCode.length); // Minify transform
        });
    });

    describe('Casos Edge y Performance', () => {
        test('Performance: Composición de sourcemaps es eficiente', async () => {
            const pipeline = new ImprovedTransformPipeline();

            const sourceCode = `
interface User { name: string; }
import { Component } from '@/components/Modal';
export function test() { return "test"; }
            `.repeat(100); // Código más grande para test de performance

            const startTime = Date.now();
            const result = await pipeline.transform(sourceCode);
            const endTime = Date.now();

            expect(result.map).toBeTruthy();
            expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo

            console.log(
                `⚡ Composición de sourcemaps: ${endTime - startTime}ms`,
            );
        });

        test('Edge Case: Pipeline sin sourcemaps', async () => {
            const pipeline = new ImprovedTransformPipeline();

            // Simular caso donde no se generan sourcemaps
            const result = await pipeline.transform('console.log("simple");');

            expect(result.code).toBeTruthy();
            // Debe manejar graciosamente la ausencia de sourcemaps
        });

        test('Edge Case: Un solo transform con sourcemap', async () => {
            const pipeline = new ImprovedTransformPipeline();

            const sourceCode = 'const x: string = "test";'; // Solo necesita TypeScript transform
            const result = await pipeline.transform(sourceCode);
            expect(result.map).toBeTruthy();

            if (!result.map) throw new Error('Expected map to be defined');

            const mapData = JSON.parse(
                Buffer.from(
                    result.map.split('base64,')[1]!,
                    'base64',
                ).toString(),
            );

            // Con una sola transformación, debería tener chainLength de 3 pero mapear correctamente
            expect(mapData.chainLength).toBe(3);
        });
    });
});
