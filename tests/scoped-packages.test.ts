/**
 * Tests for scoped package (@scope/pkg) resolution
 * Covers parseModuleSpecifier, resolveExportValue, and end-to-end resolution
 */

import { describe, expect, it } from 'vitest';

import {
    parseModuleSpecifier,
    resolveExportValue,
} from '../src/utils/module-resolver';

describe('parseModuleSpecifier', () => {
    it('parses a plain package', () => {
        expect(parseModuleSpecifier('vue')).toEqual({
            packageName: 'vue',
            subPath: '',
        });
    });

    it('parses a plain package with subpath', () => {
        expect(parseModuleSpecifier('vue/dist/vue.esm-bundler')).toEqual({
            packageName: 'vue',
            subPath: 'dist/vue.esm-bundler',
        });
    });

    it('parses a scoped package with no subpath', () => {
        expect(parseModuleSpecifier('@vueuse/core')).toEqual({
            packageName: '@vueuse/core',
            subPath: '',
        });
    });

    it('parses a scoped package with a subpath', () => {
        expect(parseModuleSpecifier('@vueuse/core/sub/path')).toEqual({
            packageName: '@vueuse/core',
            subPath: 'sub/path',
        });
    });

    it('parses another scoped package', () => {
        expect(parseModuleSpecifier('@fix-webm-duration/fix')).toEqual({
            packageName: '@fix-webm-duration/fix',
            subPath: '',
        });
    });

    it('parses a scoped package with single-segment subpath', () => {
        expect(parseModuleSpecifier('@scope/pkg/helper')).toEqual({
            packageName: '@scope/pkg',
            subPath: 'helper',
        });
    });
});

describe('resolveExportValue', () => {
    it('returns a string directly', () => {
        expect(resolveExportValue('./index.mjs')).toBe('./index.mjs');
    });

    it('resolves { import: string }', () => {
        expect(resolveExportValue({ import: './index.mjs' })).toBe(
            './index.mjs',
        );
    });

    it('resolves nested { import: { default: string } }', () => {
        expect(
            resolveExportValue({
                import: { types: './index.d.ts', default: './index.mjs' },
            }),
        ).toBe('./index.mjs');
    });

    it('falls back to browser when import is absent', () => {
        expect(
            resolveExportValue({
                browser: './browser.mjs',
                default: './index.mjs',
            }),
        ).toBe('./browser.mjs');
    });

    it('falls back to module', () => {
        expect(
            resolveExportValue({ module: './esm.js', default: './cjs.js' }),
        ).toBe('./esm.js');
    });

    it('falls back to default when nothing else matches', () => {
        expect(resolveExportValue({ default: './index.cjs' })).toBe(
            './index.cjs',
        );
    });

    it('returns null for deeply nested object exceeding depth limit', () => {
        const deep = {
            import: {
                import: {
                    import: {
                        import: { import: { import: { import: './x' } } },
                    },
                },
            },
        };
        // depth limit is 5, so this should return null
        expect(resolveExportValue(deep)).toBeNull();
    });

    it('returns null for null input', () => {
        expect(resolveExportValue(null)).toBeNull();
    });

    it('returns null for empty object', () => {
        expect(resolveExportValue({})).toBeNull();
    });

    it('resolves CJS-only { require: string }', () => {
        expect(resolveExportValue({ require: './dist/index.cjs' })).toBe(
            './dist/index.cjs',
        );
    });

    it('resolves CJS-only with types field { types, require }', () => {
        expect(
            resolveExportValue({
                types: './index.d.ts',
                require: './dist/index.cjs',
            }),
        ).toBe('./dist/index.cjs');
    });
});
