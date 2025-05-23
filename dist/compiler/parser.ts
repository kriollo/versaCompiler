import { readFile } from 'node:fs/promises';
import oxc from 'oxc-parser';

// import { simple as walk } from 'acorn-walk';

/**
 * Parses the given JavaScript code using Acorn and returns the Abstract Syntax Tree (AST).
 *
 * @param {string} data - The JavaScript code to be parsed.
 * @returns {Promise<Object|null>} The parsed AST object if successful, or null if an error occurs.
 * @throws {Error} If there is an error during parsing, it logs the error details and stack trace.
 */
export const parser = async (
    filename: string,
    code: string,
    astType: 'js' | 'ts' = 'js',
) => {
    const ast = oxc.parseSync(filename, code, {
        sourceType: 'module',
        showSemanticErrors: true,
        astType,
    });
    return ast;
};

export const getCodeFile = async (filename: string) => {
    try {
        const code = await readFile(filename, 'utf-8');
        return { code, error: null };
    } catch (error) {
        return { code: null, error };
    }
};
