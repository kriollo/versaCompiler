import path from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { logger } from '../servicios/logger.ts';
import { parser } from './parser.ts';

export async function resolveAliasPath(
    moduleRequest: string,
): Promise<string | null> {
    try {
        const resolvedUrl = import.meta.resolve(moduleRequest);
        const resolvedPath = fileURLToPath(resolvedUrl);
        return (
            '/' + path.relative(process.cwd(), resolvedPath).replace(/\\/g, '/')
        );
    } catch (error) {
        console.error(`Error resolving path for ${moduleRequest}:`);
        console.error(error.message);
        console.error(`Stack trace: ${error.stack}`);
        return null;
    }
}

// async function replaceAliasImportStatic(
//     code: string,
//     imports,
// ): Promise<string> {
//     const escapeRegExp = string =>
//         string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     if (!env.PATH_ALIAS) {
//         return code;
//     }
//     const pathAlias = JSON.parse(env.PATH_ALIAS);
//     for (const item of imports) {
//         for (const key in pathAlias) {
//             const pathAliasEntry =
//                 '/' + String(env.PATH_DIST).replace(/^\/|\/$/g, '') + '/';

//             const escapedKey = escapeRegExp(key.replace('/*', '/'));
//             if (item.moduleRequest.value.startsWith(escapedKey)) {
//                 let newImport = item.moduleRequest.value.replace(
//                     escapedKey,
//                     pathAliasEntry,
//                 );

//                 if (newImport.endsWith('.ts') || newImport.endsWith('.vue')) {
//                     newImport = newImport.replace(/\.ts$|\.vue$/, '.js');
//                 } else if (
//                     !newImport.match(/\/.*\.(js|mjs|css)$/) &&
//                     newImport.includes('/')
//                 ) {
//                     newImport = newImport + '.js';
//                 }
//                 code = code.replace(item.moduleRequest.value, newImport);
//             } else if (
//                 !item.moduleRequest.value.includes('/') &&
//                 !item.moduleRequest.value.includes('.')
//             ) {
//                 // Si no contiene una barra o un punto, es un módulo local
//                 // y se debe reemplazar por el resolvePath
//                 console.log(item);
//                 const resolvedPath = await resolvePath(
//                     item.moduleRequest.value,
//                 );
//                 if (resolvedPath) {
//                     const regExModule = new RegExp(
//                         `\'`${item.moduleRequest.value}\`'`,
//                         'g',
//                     );
//                     code = code.replace(regExModule, resolvedPath);
//                 }
//             }
//         }
//     }

//     return code;
// }

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
    resultCode = resultCode.replace(importRegex, (match, moduleRequest) => {
        for (const [alias, target] of Object.entries(pathAlias)) {
            const aliasPattern = alias.replace('/*', '');
            if (moduleRequest.startsWith(aliasPattern)) {
                // Solo reemplazar el alias con la ruta relativa, no incluir el target
                const relativePath = moduleRequest.replace(aliasPattern, '');
                let newImportPath = path.join(
                    '/',
                    env.PATH_DIST!,
                    relativePath,
                );

                if (
                    newImportPath.endsWith('.ts') ||
                    newImportPath.endsWith('.vue')
                ) {
                    newImportPath = newImportPath.replace(/\.(ts|vue)$/, '.js');
                } else if (!/\.(js|mjs|css)$/.test(newImportPath)) {
                    newImportPath += '.js';
                }

                const finalPath = newImportPath.replace(/\\/g, '/');
                return match.replace(moduleRequest, finalPath);
            }
        }

        return match;
    });

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

    // Regex para imports dinámicos normales con string
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    // Regex para template literals 
    const templateLiteralRegex = /import\s*\(\s*`([^`]+)`\s*\)/g;

    // Manejar imports dinámicos normales con string
    resultCode = resultCode.replace(
        dynamicImportRegex,
        (match, moduleRequest) => {
            for (const [alias, _target] of Object.entries(pathAlias)) {
                const aliasPattern = alias.replace('/*', '');
                if (moduleRequest.startsWith(aliasPattern)) {
                    // Solo reemplazar el alias con la ruta relativa, no incluir el target
                    const relativePath = moduleRequest.replace(
                        aliasPattern,
                        '',
                    );
                    let newImportPath = path.join(
                        '/',
                        pathDist,
                        relativePath,
                    );

                    if (
                        newImportPath.endsWith('.ts') ||
                        newImportPath.endsWith('.vue')
                    ) {
                        newImportPath = newImportPath.replace(
                            /\.(ts|vue)$/,
                            '.js',
                        );
                    } else if (!/\.(js|mjs|css)$/.test(newImportPath)) {
                        newImportPath += '.js';
                    }

                    const finalPath = newImportPath.replace(/\\/g, '/');
                    return match.replace(moduleRequest, finalPath);
                }
            }
            return match;
        },
    );

    // Manejar template literals (transformar solo la parte del alias)
    resultCode = resultCode.replace(
        templateLiteralRegex,
        (match, moduleRequest) => {
            for (const [alias, _target] of Object.entries(pathAlias)) {
                const aliasPattern = alias.replace('/*', '');
                if (moduleRequest.includes(aliasPattern)) {
                    // Solo reemplazar el alias con pathDist
                    const newModuleRequest = moduleRequest.replace(
                        aliasPattern,
                        `/${pathDist}`,
                    );
                    return match.replace(
                        moduleRequest,
                        newModuleRequest,
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
