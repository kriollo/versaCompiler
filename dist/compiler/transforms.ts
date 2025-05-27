import { createRequire } from 'module';
import path from 'node:path';
import { env } from 'node:process';
import { walk } from 'oxc-walker';
import { logger } from '../servicios/logger.ts';
import { parser } from './parser.ts';

export async function resolvePath(moduleRequest: string) {
    const require = createRequire(import.meta.url);
    try {
        const pathModule = require.resolve(moduleRequest, {
            paths: [import.meta.url],
        });
        return (
            '/' + path.relative(process.cwd(), pathModule).replace(/\\/g, '/')
        );
    } catch (error) {
        logger.error(`Error resolving path for ${moduleRequest}:`);
        logger.error(error.message);
        logger.error(`Stack trace: ${error.stack}`);
        return null;
    }
}

async function replaceAliasImportStatic(
    code: string,
    imports,
    ast,
): Promise<string> {
    const escapeRegExp = string =>
        string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!env.PATH_ALIAS) {
        return code;
    }
    const pathAlias = JSON.parse(env.PATH_ALIAS);

    // Obtener todas las declaraciones de import del AST con sus posiciones completas
    const importDeclarations: Array<{
        start: number;
        end: number;
        source: string;
        sourceStart: number;
        sourceEnd: number;
        fullDeclaration: any;
    }> = [];

    // Función para recorrer el AST
    function walkAST(node: any) {
        if (node.type === 'ImportDeclaration') {
            if (
                node.source &&
                node.start !== undefined &&
                node.end !== undefined &&
                node.source.start !== undefined &&
                node.source.end !== undefined
            ) {
                importDeclarations.push({
                    start: node.start,
                    end: node.end,
                    source: node.source.value,
                    sourceStart: node.source.start,
                    sourceEnd: node.source.end,
                    fullDeclaration: node,
                });
            }
        }

        // Recorrer hijos
        for (const key in node) {
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(item => {
                    if (item && typeof item === 'object' && item.type) {
                        walkAST(item);
                    }
                });
            } else if (child && typeof child === 'object' && child.type) {
                walkAST(child);
            }
        }
    }

    if (ast.program) {
        walkAST(ast.program);
    }

    // Procesar en orden inverso para mantener las posiciones correctas
    const sortedDeclarations = [...importDeclarations].sort(
        (a, b) => b.start - a.start,
    );

    for (const declaration of sortedDeclarations) {
        for (const key in pathAlias) {
            const pathAliasEntry =
                '/' + String(env.PATH_DIST).replace(/^\/|\/$/g, '') + '/';

            const escapedKey = key.replace('/*', '/');

            if (declaration.source.startsWith(escapedKey)) {
                let newImport = declaration.source.replace(
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

                // Reemplazar usando las posiciones exactas del AST
                // Ajustar las posiciones para excluir las comillas
                const beforeSource = code.slice(0, declaration.sourceStart + 1); // incluye la comilla de apertura
                const afterSource = code.slice(declaration.sourceEnd - 1); // incluye la comilla de cierre

                code = beforeSource + newImport + afterSource;
            } else if (
                !declaration.source.includes('/') &&
                !declaration.source.startsWith('.') &&
                !declaration.source.includes('.')
            ) {
                // Si el import es una libreria de node
                const resolvedPath = await resolvePath(declaration.source);
                if (resolvedPath) {
                    const beforeSource = code.slice(
                        0,
                        declaration.sourceStart + 1,
                    );
                    const afterSource = code.slice(declaration.sourceEnd - 1);

                    code = beforeSource + resolvedPath + afterSource;
                }
            }
        }
    }

    return code;
}

async function replaceAliasImportDynamic(
    code: string,
    imports,
    ast,
): Promise<string> {
    console.log('\n=== DEBUG: replaceAliasImportDynamic INICIO ===');
    console.log(`Code length: ${code.length}`);
    console.log(`Imports length: ${imports ? imports.length : 'undefined'}`);
    console.log(`AST defined: ${!!ast}`);

    if (!env.PATH_ALIAS) {
        console.log('No PATH_ALIAS defined, returning early');
        return code;
    }
    const pathAlias = JSON.parse(env.PATH_ALIAS);
    console.log('PATH_ALIAS:', pathAlias);

    // Para imports dinámicos, necesitamos recorrer el AST buscando ImportExpressions
    const dynamicImports: Array<{
        start: number;
        end: number;
        source: string;
        type: 'literal' | 'template';
        originalStart?: number;
        originalEnd?: number;
    }> = [];

    // Usar oxc-walker para recorrer el AST de manera segura
    walk(ast.program, {
        enter(node) {
            if (node.type === 'ImportExpression' && node.source) {
                const source = node.source;

                // Manejar imports con Literal (strings simples)
                if (
                    source.type === 'Literal' &&
                    source.start !== undefined &&
                    source.end !== undefined &&
                    source.value
                ) {
                    dynamicImports.push({
                        start: source.start,
                        end: source.end,
                        source: source.value,
                        type: 'literal',
                    });
                }

                // Manejar imports con TemplateLiteral
                if (
                    source.type === 'TemplateLiteral' &&
                    source.start !== undefined &&
                    source.end !== undefined &&
                    source.quasis &&
                    source.quasis.length > 0
                ) {
                    // Para template literals, necesitamos verificar si el primer quasi (parte estática)
                    // comienza con uno de nuestros aliases
                    const firstQuasi = source.quasis[0];
                    if (
                        firstQuasi &&
                        firstQuasi.value &&
                        firstQuasi.value.cooked
                    ) {
                        const staticStart = firstQuasi.value.cooked;

                        // Verificar si comienza con algún alias
                        for (const key in pathAlias) {
                            const escapedKey = key.replace('/*', '/');
                            if (staticStart.startsWith(escapedKey)) {
                                // Para template literals, almacenamos información especial
                                dynamicImports.push({
                                    start: firstQuasi.start,
                                    end: firstQuasi.end,
                                    source: staticStart,
                                    type: 'template',
                                    originalStart: source.start,
                                    originalEnd: source.end,
                                });
                                break;
                            }
                        }
                    }
                }
            }
        },
    });

    // Procesar en orden inverso
    const sortedImports = [...dynamicImports].sort((a, b) => b.start - a.start);

    for (const dynamicImport of sortedImports) {
        for (const key in pathAlias) {
            const pathAliasEntry =
                '/' + String(env.PATH_DIST).replace(/^\/|\/$/g, '') + '/';

            const escapedKey = key.replace('/*', '/');
            if (dynamicImport.source.startsWith(escapedKey)) {
                if (dynamicImport.type === 'literal') {
                    // Para literales simples, aplicar todas las transformaciones
                    let newImport = dynamicImport.source.replace(
                        escapedKey,
                        pathAliasEntry,
                    );

                    if (
                        newImport.endsWith('.ts') ||
                        newImport.endsWith('.vue')
                    ) {
                        newImport = newImport.replace(/\.ts$|\.vue$/, '.js');
                    } else if (
                        !newImport.match(/\/.*\.(js|mjs|css)$/) &&
                        newImport.includes('/')
                    ) {
                        newImport = newImport + '.js';
                    }

                    const before = code.slice(0, dynamicImport.start + 1); // incluye comilla de apertura
                    const after = code.slice(dynamicImport.end - 1); // incluye comilla de cierre
                    code = before + newImport + after;
                } else if (dynamicImport.type === 'template') {
                    // Para template literals, solo reemplazar la parte del alias
                    let newStaticPart = dynamicImport.source.replace(
                        escapedKey,
                        pathAliasEntry,
                    );

                    console.log('\n=== DEBUG TEMPLATE LITERAL REPLACEMENT ===');
                    console.log(`Original source: "${dynamicImport.source}"`);
                    console.log(`EscapedKey: "${escapedKey}"`);
                    console.log(`PathAliasEntry: "${pathAliasEntry}"`);
                    console.log(`NewStaticPart: "${newStaticPart}"`);
                    console.log(
                        `Position: start=${dynamicImport.start}, end=${dynamicImport.end}`,
                    );

                    const beforeReplacement = code.slice(
                        0,
                        dynamicImport.start,
                    );
                    const afterReplacement = code.slice(dynamicImport.end);

                    console.log(
                        `Before (last 50): "${beforeReplacement.slice(-50)}"`,
                    );
                    console.log(
                        `After (first 50): "${afterReplacement.slice(0, 50)}"`,
                    );

                    const before = code.slice(0, dynamicImport.start);
                    const after = code.slice(dynamicImport.end);
                    code = before + newStaticPart + after;

                    console.log(`Code after replacement (around position):`);
                    const newPos = dynamicImport.start + newStaticPart.length;
                    console.log(`"${code.slice(newPos - 50, newPos + 50)}"`);
                }
            } else if (
                !dynamicImport.source.includes('/') &&
                !dynamicImport.source.startsWith('.') &&
                !dynamicImport.source.includes('.')
            ) {
                const resolvedPath = await resolvePath(dynamicImport.source);
                if (resolvedPath) {
                    if (dynamicImport.type === 'literal') {
                        const before = code.slice(0, dynamicImport.start + 1);
                        const after = code.slice(dynamicImport.end - 1);
                        code = before + resolvedPath + after;
                    } else if (dynamicImport.type === 'template') {
                        const before = code.slice(0, dynamicImport.start);
                        const after = code.slice(dynamicImport.end);
                        code = before + resolvedPath + after;
                    }
                }
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
        console.log(`\n=== estandarizaCode called for: ${file} ===`);
        const ast = await parser(file, code);
        if (ast && ast.errors && ast.errors.length > 0) {
            logger.warn(ast?.errors[0].codeframe);
            throw new Error(ast?.errors[0].message);
        }

        console.log(
            `AST parsed successfully. Static imports: ${ast?.module?.staticImports?.length}, Dynamic imports: ${ast?.module?.dynamicImports?.length}`,
        );

        // Pasar el AST completo a las funciones
        code = await replaceAliasImportStatic(
            code,
            ast?.module.staticImports,
            ast,
        );

        console.log('About to call replaceAliasImportDynamic...');
        code = await replaceAliasImportDynamic(
            code,
            ast?.module.dynamicImports,
            ast,
        );
        console.log('replaceAliasImportDynamic completed');
        code = await removehtmlOfTemplateString(code);
        code = await removeCodeTagImport(code);

        if (env.isProd === 'true') {
            code = await removePreserverComent(code);
        }

        return { code, error: null };
    } catch (error) {
        return { code: '', error: error.message };
    }
}
