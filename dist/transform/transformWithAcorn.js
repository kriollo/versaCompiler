import * as acorn from 'acorn';
import { transformModuleDefault } from './transformModuleDefault.js';
import { transformModuleWithDynamicImports } from './transformModuleWithDynamicImports.js';
import { transformModuleWithStaticImportsOnly } from './transformModuleWithStaticImportsOnly.js';
import { transformVueComponentWithDynamicImports } from './transformVueComponentWithDynamicImports.js';

// Función auxiliar para obtener nombres de _resolveComponent
const getResolvedComponents = codeString => {
    const resolved = new Set();
    const resolveComponentRegex =
        /_resolveComponent\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match;
    while ((match = resolveComponentRegex.exec(codeString)) !== null) {
        resolved.add(match[1]);
    }
    return resolved;
};

/**
 * Transforma código fuente JS/TS usando Acorn AST.
 * Reconstruye el código separando imports, exports, funciones y bloques ejecutables.
 * - Convierte imports estáticos en dinámicos
 * - Preserva exports y estructura
 * - Inserta bloque HMR solo si hay defineComponent y imports dinámicos
 *
 * @param {string} code - El código fuente a analizar.
 * @returns {string} - El nuevo código transformado.
 *
 * Ejemplo de uso:
 *   const nuevoCodigo = transformModuleWithAcorn(codigoFuente);
 */
export function transformModuleWithAcorn(code) {
    const ast = acorn.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
        onComment: [],
    });
    const getCode = node => code.slice(node.start, node.end);
    const resolvedComponents = getResolvedComponents(code);
    const isFileAComponent =
        code.includes('defineComponent') || code.includes('_defineComponent');
    console.log('isFileAComponent', isFileAComponent);
    const isVueInitializationFile =
        code.includes('createApp') && code.includes('.mount(');

    let isCoreDefinitionFile = false;
    try {
        if (!isFileAComponent && !isVueInitializationFile) {
            let importExportNodeCount = 0;
            let hasLocalJsImport = false;
            let totalTopLevelNodes = 0;

            if (ast.body && ast.body.length > 0) {
                totalTopLevelNodes = ast.body.length;
                for (const node of ast.body) {
                    if (node.type === 'ImportDeclaration') {
                        importExportNodeCount++;
                        const sourceValue = node.source.value;
                        const isExternal =
                            !/^[./]/.test(sourceValue) &&
                            !sourceValue.includes(':');
                        if (sourceValue.endsWith('.js') && !isExternal) {
                            hasLocalJsImport = true;
                        }
                    } else if (
                        node.type === 'ExportNamedDeclaration' ||
                        node.type === 'ExportDefaultDeclaration'
                    ) {
                        importExportNodeCount++;
                    }
                }

                if (hasLocalJsImport && totalTopLevelNodes >= 2) {
                    const ratio = importExportNodeCount / totalTopLevelNodes;
                    if (ratio >= 0.7) {
                        isCoreDefinitionFile = true;
                    }
                }
            }
        }
    } catch (e) {
        console.error(
            'Error during isCoreDefinitionFile (ratio-based) check:',
            e,
        );
    }

    let nonDynamicImportStatements = [];
    let hmrImports = { default: [], namespace: [], named: [] };
    let importVarDecls = new Set();
    let dynamicImportInitialLoadLines = [];
    let exportStatements = [];

    ast.body.forEach(node => {
        if (node.type === 'ImportDeclaration') {
            const sourceValue = node.source.value;
            const importedLocalNames = node.specifiers.map(
                spec => spec.local.name,
            );

            let isResolvedCompImport = false;
            for (const localName of importedLocalNames) {
                if (resolvedComponents.has(localName)) {
                    isResolvedCompImport = true;
                    break;
                }
            }
            const isExternal =
                (!/^[./]/.test(sourceValue) &&
                    !/^[a-zA-Z\/].*$/.test(sourceValue)) ||
                sourceValue.includes(':');

            if (
                isVueInitializationFile ||
                isCoreDefinitionFile ||
                isExternal ||
                isResolvedCompImport
            ) {
                nonDynamicImportStatements.push(getCode(node));
            } else {
                node.specifiers.forEach(spec => {
                    const localName = spec.local.name;
                    importVarDecls.add(`let ${localName};`);

                    if (spec.type === 'ImportDefaultSpecifier') {
                        hmrImports.default.push({
                            varName: localName,
                            filePath: sourceValue,
                        });
                        if (!isFileAComponent) {
                            dynamicImportInitialLoadLines.push(
                                `${localName} = (await import('${sourceValue}')).default;`,
                            );
                        }
                    } else if (spec.type === 'ImportNamespaceSpecifier') {
                        hmrImports.namespace.push({
                            varName: localName,
                            filePath: sourceValue,
                        });
                        if (!isFileAComponent) {
                            dynamicImportInitialLoadLines.push(
                                `${localName} = await import('${sourceValue}');`,
                            );
                        }
                    } else if (spec.type === 'ImportSpecifier') {
                        let namedEntry = hmrImports.named.find(
                            e => e.filePath === sourceValue,
                        );
                        if (!namedEntry) {
                            namedEntry = {
                                filePath: sourceValue,
                                namedExports: [],
                                variables: [],
                            };
                            hmrImports.named.push(namedEntry);
                        }
                        const exportString =
                            spec.imported.name === localName
                                ? localName
                                : `${spec.imported.name} as ${localName}`;
                        if (!namedEntry.namedExports.includes(exportString)) {
                            namedEntry.namedExports.push(exportString);
                        }
                        if (!namedEntry.variables.includes(localName)) {
                            namedEntry.variables.push(localName);
                        }
                    }
                });
                if (!isFileAComponent) {
                    const namedImportEntry = hmrImports.named.find(
                        e => e.filePath === sourceValue,
                    );
                    if (
                        namedImportEntry &&
                        namedImportEntry.variables.length > 0
                    ) {
                        const varString = namedImportEntry.variables.join(', ');
                        if (
                            !dynamicImportInitialLoadLines.some(
                                line =>
                                    line.includes(
                                        `await import('${sourceValue}')`,
                                    ) &&
                                    line.includes(
                                        namedImportEntry.variables[0],
                                    ),
                            )
                        ) {
                            dynamicImportInitialLoadLines.push(
                                `({ ${varString} } = await import('${sourceValue}'));`,
                            );
                        }
                    }
                }
            }
        } else if (node.type === 'ExportDeclaration') {
            exportStatements.push(getCode(node));
        }
    });

    const hasDynamicImports =
        hmrImports.default.length > 0 ||
        hmrImports.namespace.length > 0 ||
        hmrImports.named.some(imp => imp.variables && imp.variables.length > 0);

    const bodyNodes = ast.body.filter(
        node =>
            node.type !== 'ImportDeclaration' &&
            node.type !== 'ExportDeclaration',
    );

    let bodyNodesCode = bodyNodes.map(getCode).join('\n');

    // Check for the specific case: only local static imports, no exports, no Vue entry points
    const hasOnlyLocalStaticImports =
        !isFileAComponent &&
        !isVueInitializationFile &&
        exportStatements.length === 0 &&
        !hasDynamicImports;

    if (isFileAComponent) {
        if (hasDynamicImports) {
            return transformVueComponentWithDynamicImports({
                code,
                ast,
                bodyNodesCode,
                hmrImports,
                importVarDecls,
                exportStatements,
                nonDynamicImportStatements,
            });
        } else if (isFileAComponent) {
            return code;
        }
    } else if (hasDynamicImports) {
        return transformModuleWithDynamicImports({
            code,
            ast,
            bodyNodesCode,
            hmrImports,
            importVarDecls,
            dynamicImportInitialLoadLines,
            nonDynamicImportStatements,
            exportStatements,
        });
    } else if (hasOnlyLocalStaticImports) {
        return transformModuleWithStaticImportsOnly({
            code,
            ast,
            bodyNodesCode,
            nonDynamicImportStatements,
            importVarDecls,
        });
    } else {
        return transformModuleDefault({
            code,
            ast,
            bodyNodesCode,
            hmrImports,
            importVarDecls,
            dynamicImportInitialLoadLines,
            nonDynamicImportStatements,
            exportStatements,
            isFileAComponent,
            isVueInitializationFile,
            isCoreDefinitionFile,
        });
    }
}
