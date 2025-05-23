import { minify } from 'oxc-minify';

/**
 * Minifica el codigo JavaScript usando opciones especificas.
 *
 * @param {string} data - The JavaScript code to be minified.
 * @param {string} filename - The name of the file containing the JavaScript code.
 * @param {boolean} isProd - Indica si está en modo producción.
 * @returns {Promise<Object>} The result of the minification process.
 */
export const minifyJS = async (data, filename, isProd = true) => {
    try {
        const options = {
            compress: {
                target: 'es2020' as const,
            },
            mangle: {
                toplevel: true,
                debug: !isProd,
            },
            codegen: {
                removeWhitespace: true,
            },
            sourcemap: !isProd,
        };
        const result = await minify(filename, data, options);
        return { code: result.code, error: null };
    } catch (error) {
        return { error, code: '' };
    }
};
