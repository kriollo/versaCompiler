import path from 'node:path';
import { env } from 'node:process';
import { logger } from '../servicios/logger.ts';
import { parser } from './parser.ts';

export async function replaceAliasImportStatic(
    file: string,
    code: string,
): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }
    const pathAlias = JSON.parse(env.PATH_ALIAS);
    let resultCode = code;

    // Usar regex para transformar imports estáticos
    const importRegex =
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;

    // Crear un array para procesar transformaciones async
    const matches = Array.from(resultCode.matchAll(importRegex));

    for (const match of matches) {
        const [fullMatch, moduleRequest] = match;
        let newMatch = fullMatch;

        // Verificar si es un alias conocido
        for (const [alias, _target] of Object.entries(pathAlias)) {
            const aliasPattern = alias.replace('/*', '');
            if (moduleRequest.startsWith(aliasPattern)) {
                // Solo reemplazar el alias con la ruta relativa, no incluir el target
                const relativePath = moduleRequest.replace(aliasPattern, '');
                let newImportPath = path.join(
                    '/',
                    env.PATH_DIST!,
                    relativePath,
                );

                // Normalizar la ruta para eliminar ./ extra
                newImportPath = newImportPath.replace(/\/\.\//g, '/');

                if (
                    newImportPath.endsWith('.ts') ||
                    newImportPath.endsWith('.vue')
                ) {
                    newImportPath = newImportPath.replace(/\.(ts|vue)$/, '.js');
                } else if (!/\.(js|mjs|css)$/.test(newImportPath)) {
                    newImportPath += '.js';
                }

                const finalPath = newImportPath.replace(/\\/g, '/');
                newMatch = fullMatch.replace(moduleRequest, finalPath);
                break;
            }
        }

        resultCode = resultCode.replace(fullMatch, newMatch);
    }

    return resultCode;
}

async function replaceAliasImportDynamic(
    code: string,
    _imports,
): Promise<string> {
    if (!env.PATH_ALIAS || !env.PATH_DIST) {
        return code;
    }

    const pathAlias = JSON.parse(env.PATH_ALIAS);
    const pathDist = env.PATH_DIST;
    let resultCode = code;

    // Regex para imports dinámicos normales con string (solo comillas simples y dobles)
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    // Regex para template literals (solo backticks)
    const templateLiteralRegex = /import\s*\(\s*`([^`]+)`\s*\)/g;

    // Manejar imports dinámicos normales con string
    const dynamicMatches = Array.from(resultCode.matchAll(dynamicImportRegex));
    for (const match of dynamicMatches) {
        const [fullMatch, moduleRequest] = match;
        let newMatch = fullMatch;

        // Verificar si es un alias conocido
        for (const [alias, _target] of Object.entries(pathAlias)) {
            const aliasPattern = alias.replace('/*', '');
            if (moduleRequest.startsWith(aliasPattern)) {
                // Solo reemplazar el alias con la ruta relativa, no incluir el target
                const relativePath = moduleRequest.replace(aliasPattern, '');
                let newImportPath = path.join('/', pathDist, relativePath);

                // Normalizar la ruta para eliminar ./ extra
                newImportPath = newImportPath.replace(/\/\.\//g, '/');

                if (
                    newImportPath.endsWith('.ts') ||
                    newImportPath.endsWith('.vue')
                ) {
                    newImportPath = newImportPath.replace(/\.(ts|vue)$/, '.js');
                } else if (!/\.(js|mjs|css)$/.test(newImportPath)) {
                    newImportPath += '.js';
                }

                const finalPath = newImportPath.replace(/\\/g, '/');
                newMatch = fullMatch.replace(moduleRequest, finalPath);
                break;
            }
        }

        resultCode = resultCode.replace(fullMatch, newMatch);
    }

    resultCode = resultCode.replace(
        templateLiteralRegex,
        (match, moduleRequest) => {
            for (const [alias, _target] of Object.entries(pathAlias)) {
                const aliasPattern = alias.replace('/*', '');
                if (moduleRequest.includes(aliasPattern)) {
                    const newModuleRequest = moduleRequest.replace(
                        aliasPattern,
                        `/${pathDist}`,
                    );
                    // Normalizar la ruta para eliminar ./ extra
                    const normalizedModuleRequest = newModuleRequest.replace(
                        /\/\.\//g,
                        '/',
                    );
                    return match.replace(
                        moduleRequest,
                        normalizedModuleRequest,
                    );
                }
            }
            return match;
        },
    );

    return resultCode;
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
    const preserverRegExp =
        /\/\*[\s\S]*?@preserve[\s\S]*?\*\/|\/\/.*?@preserve.*?(?=\n|$)/g;
    data = data.replace(preserverRegExp, match =>
        match.replace(/@preserve/g, ''),
    );
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
        const ast = await parser(file, code);
        if (ast && ast.errors && ast.errors.length > 0) {
            logger.warn(ast.errors[0].codeframe || 'Error sin codeframe');
            throw new Error(ast.errors[0].message || 'Error sin mensaje');
        }
        code = await replaceAliasImportStatic(file, code);
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
        return { code: '', error: error?.message || 'Unknown error' };
    }
}
