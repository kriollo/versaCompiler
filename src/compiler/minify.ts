import { minify } from 'oxc-minify';

/**
 * Minifica el codigo JavaScript usando opciones especificas.
 *
 * @param {string} data - The JavaScript code to be minified.
 * @param {string} filename - The name of the file containing the JavaScript code.
 * @param {boolean} isProd - Indica si está en modo producción.
 * @returns {Promise<Object>} The result of the minification process.
 */
export const minifyJS = async (
    data: string,
    filename: string,
    isProd = true,
) => {
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

        // Si el código de entrada no estaba vacío pero el resultado sí,
        // probablemente hay un error de sintaxis
        if (data.trim() && !result.code.trim()) {
            return {
                error: new Error(
                    `Minification failed: likely syntax error in ${filename}`,
                ),
                code: '',
            };
        }

        return { code: result.code, error: null };
    } catch (error) {
        return { error, code: '' };
    }
};

