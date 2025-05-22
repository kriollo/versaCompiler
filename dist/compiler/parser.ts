import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import oxc from 'oxc-parser';
import { logger } from '../servicios/pino.ts';

// import { simple as walk } from 'acorn-walk';

/**
 * Parses the given JavaScript code using Acorn and returns the Abstract Syntax Tree (AST).
 *
 * @param {string} data - The JavaScript code to be parsed.
 * @returns {Promise<Object|null>} The parsed AST object if successful, or null if an error occurs.
 * @throws {Error} If there is an error during parsing, it logs the error details and stack trace.
 */
export const parser = async (filename, code) => {
    try {
        const ast = await oxc.parseSync(filename, code);

        return { ast, error: null };
    } catch (error) {
        logger.error(
            chalk.red(
                `🚩 :Error durante la compilación JS:${error.loc.line}:${error.loc.column}: ${error.message}\n`,
            ),
        );
        logger.error(error.stack); // Imprime la pila de llamadas para depuración
        return { ast: null, error };
    }
};

export const getCodeFile = async filename => {
    try {
        logger.info(chalk.blue(`🚩 :Leyendo el archivo ${filename}...\n`));
        const code = await readFile(filename, 'utf-8');
        return { code, error: null, filename };
    } catch (error) {
        logger.error(
            chalk.red(
                `🚩 :Error al leer el archivo ${filename}: ${error.message}\n`,
            ),
        );
        return { code: null, error };
    }
};
