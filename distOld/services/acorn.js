import * as Parser from 'acorn';
import chalk from 'chalk';
/**
 * Parses the given JavaScript code using Acorn and returns the Abstract Syntax Tree (AST).
 *
 * @param {string} data - The JavaScript code to be parsed.
 * @returns {Promise<Object|null>} The parsed AST object if successful, or null if an error occurs.
 * @throws {Error} If there is an error during parsing, it logs the error details and stack trace.
 */
export const checkSintaxysAcorn = async data => {
    try {
        const ast = await Parser.parse(data, {
            ecmaVersion: 2020,
            sourceType: 'module',
            locations: true,
            ranges: true,
        });

        return { ast, error: null };
    } catch (error) {
        console.log(
            chalk.red(
                `🚩 :Error durante la compilación JS:${error.loc.line}:${error.loc.column}: ${error.message}\n`,
            ),
        );
        console.error(error.stack); // Imprime la pila de llamadas para depuración
        return { ast: null, error };
    }
};
