import { env } from 'node:process';
import { logger } from './../servicios/pino.ts';
import { parser } from './parser.ts';

async function replaceAliasImportStatic(
    code: string,
    imports,
): Promise<string> {
    const escapeRegExp = string =>
        string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!env.PATH_ALIAS) {
        return code;
    }
    const pathAlias = JSON.parse(env.PATH_ALIAS);
    for (const item of imports) {
        for (const key in pathAlias) {
            const pathAliasEntry =
                '/' + String(pathAlias[key]).replace(/^\/|\/$/g, '') + '/';

            const escapedKey = escapeRegExp(key.replace('/*', '/'));
            if (item.moduleRequest.value.startsWith(escapedKey)) {
                let newImport = item.moduleRequest.value.replace(
                    escapedKey,
                    pathAliasEntry,
                );

                if (newImport.endsWith('.ts') || newImport.endsWith('.vue')) {
                    newImport = newImport.replace(/\.ts$|\.vue$/, '.js');
                } else if (
                    !newImport.match(/\/.*\.(js|mjs|css)$/) &&
                    newImport.includes('/')
                ) {
                    newImport = newImport + '.js';
                }
                code = code.replace(item.moduleRequest.value, newImport);
            }
        }
    }

    return code;
}

async function replaceAliasImportDynamic(
    code: string,
    imports,
): Promise<string> {
    const escapeRegExp = string =>
        string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!env.PATH_ALIAS) {
        return code;
    }
    const pathAlias = JSON.parse(env.PATH_ALIAS);
    for (const item of imports) {
        for (const key in pathAlias) {
            const pathAliasEntry =
                '/' + String(pathAlias[key]).replace(/^\/|\/$/g, '') + '/';

            const escapedKey = escapeRegExp(key.replace('/*', '/'));
            const importDynamic = code.slice(item.start, item.end);
            if (importDynamic.includes(escapedKey)) {
                let newImport = importDynamic.replace(
                    escapedKey,
                    pathAliasEntry,
                );
                code = code.replace(importDynamic, newImport);
            }
        }
    }

    return code;
}

/**
 * Elimina la etiqueta "html" de una cadena de plantilla.
 * @param {string} data - La cadena de plantilla de la cual eliminar la etiqueta "html".
 * @returns {Promise<string>} - La cadena de plantilla modificada sin la etiqueta "html".
 */
const removehtmlOfTemplateString = async data => {
    const htmlRegExp = /html\s*`/g;

    data = data.replace(htmlRegExp, '`');

    //remove ""
    const htmlGetterRegExp = /,\s*get\s+html\(\)\s*{\s*return\s*html\s*}/g;
    data = data.replace(htmlGetterRegExp, '');

    return data;
};

/**
 * Elimina los comentarios con la etiqueta @preserve de la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada sin los comentarios @preserve.
 */
const removePreserverComent = async data => {
    const preserverRegExp = /\/\*[\s\S]*?@preserve[\s\S]*?\*\/|\/\/.*?@preserve.*?(?=\n|$)/g;
    data = data.replace(preserverRegExp, match => match.replace(/@preserve/g, ''));
    return data;
};

/**
 * Elimina la declaración de importación para 'code-tag' de la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada sin la importación de 'code-tag'.
 */
const removeCodeTagImport = async data => {
    // remove import if exist code-tag
    const codeTagRegExp = /import\s+{.*}\s+from\s+['"].*code-tag.*['"];/g;
    data = data.replace(codeTagRegExp, '');
    return data;
};

export async function estandarizaCode(
    code: string,
    file: string,
): Promise<{ code: string; error: string | null }> {
    try {
        const { ast, errors } = await parser(file, code);
        if (errors) {
            logger.error(errors);
        }
        if (ast && ast.errors && ast.errors.length > 0) {
            throw new Error('Error de análisis: ' + ast.errors.join(', '));
        }
        code = await replaceAliasImportStatic(code, ast?.module.staticImports);
        code = await replaceAliasImportDynamic(
            code,
            ast?.module.dynamicImports,
        );
        code = await removehtmlOfTemplateString(code);
        code = await removeCodeTagImport(code);

        if (env.isProd === 'true') {
            code = await removePreserverComent(code);
        }

        return { code, error: null };
    } catch (error) {
        logger.error('Error al estandarizar el código:', error);
        return { code: '', error: error.message };
    }
}
