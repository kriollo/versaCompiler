import * as acorn from 'acorn';

/**
 * Transforma código fuente JS/TS usando Acorn AST.
 * Extrae imports, exports, funciones y bloques ejecutables para manipulación avanzada.
 * Por ahora, solo imprime el tipo y nombre de cada declaración top-level.
 * @param {string} code - El código fuente a analizar.
 * @returns {void}
 */

/**
 * Genera el bloque HMR idéntico al de utils.js, pero parametrizado para ser reutilizable.
 * Este bloque permite recarga en caliente de módulos importados dinámicamente.
 * Solo debe ser insertado si el archivo contiene defineComponent y existen imports dinámicos.
 * @param {Object} imports - Objeto con arrays de imports dinámicos (default, namespace, named).
 * @returns {string} - Bloque de código HMR listo para insertar en el IIFE.
 *
 * Ejemplo de uso:
 *   const hmrBlock = generateHMRBlock(hmrImports);
 *   // Insertar hmrBlock dentro del cuerpo del IIFE si corresponde
 */
function generateHMRBlock(imports) {
    let moduleRegistrationBlocks = [];

    imports.default.forEach(imp => {
        moduleRegistrationBlocks.push(
            `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n` +
                `        try {\n` +
                `            ${imp.varName} = (await importWithTimestamp('${imp.filePath}')).default;\n` +
                `            console.log('[HMR] Módulo ${imp.filePath} (default) recargado');\n` +
                `            return true;\n` +
                `        } catch (e) {\n` +
                `            console.error('[HMR] Error recargando ${imp.filePath}', e);\n` +
                `            return false;\n` +
                `        }\n` +
                `    };`,
        );
    });

    imports.namespace.forEach(imp => {
        moduleRegistrationBlocks.push(
            `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n` +
                `        try {\n` +
                `            ${imp.varName} = await importWithTimestamp('${imp.filePath}');\n` +
                `            console.log('[HMR] Módulo ${imp.filePath} (namespace) recargado');\n` +
                `            return true;\n` +
                `        } catch (e) {\n` +
                `            console.error('[HMR] Error recargando ${imp.filePath}', e);\n` +
                `            return false;\n` +
                `        }\n` +
                `    };`,
        );
    });

    imports.named.forEach(imp => {
        moduleRegistrationBlocks.push(
            `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n` +
                `        try {\n` +
                `            ({ ${imp.namedExports} } = await importWithTimestamp('${imp.filePath}'));\n` +
                `            console.log('[HMR] Módulo ${imp.filePath} (named) recargado');\n` +
                `            return true;\n` +
                `        } catch (e) {\n` +
                `            console.error('[HMR] Error recargando ${imp.filePath}', e);\n` +
                `            return false;\n` +
                `        }\n` +
                `    };`,
        );
    });

    if (moduleRegistrationBlocks.length === 0) return '';

    // Se incluye la definición de importWithTimestamp y la inicialización de __VERSA_HMR
    // solo si hay módulos que registrar.
    return `
    const importWithTimestamp = (path) => import(path);
    window.__VERSA_HMR = window.__VERSA_HMR || {};
    window.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};
${moduleRegistrationBlocks.join('\n    ')}`;
}

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
    const isFileAComponent = code.includes('defineComponent'); // Detectar si el archivo es un componente Vue
    const isVueInitializationFile =
        code.includes('mount') || code.includes('createApp'); // Detectar si es un archivo de inicialización de Vue

    // Heurística para isExternalImport (debe estar definida antes de usarse en isCoreDefinitionFile)
    const isExternalImport = src => {
        if (src.startsWith('vue') || src.startsWith('react')) {
            return true;
        }
        if (!src.endsWith('.js')) {
            return true;
        }
        return false;
    };

    // Nueva detección generalizada para archivos de definición central
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
                        if (
                            sourceValue.endsWith('.js') &&
                            !isExternalImport(sourceValue)
                        ) {
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
                    // Mínimo 2 nodos para aplicar ratio
                    const ratio = importExportNodeCount / totalTopLevelNodes;
                    if (ratio >= 0.7) {
                        // Umbral ajustable (70%)
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

    // Primera pasada: clasificar imports
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

            // Condición actualizada para mantener el import estático
            if (
                isFileAComponent ||
                isVueInitializationFile ||
                isCoreDefinitionFile || // Usando la nueva heurística de ratio
                isExternalImport(sourceValue) ||
                isResolvedCompImport
            ) {
                nonDynamicImportStatements.push(getCode(node));
            } else {
                // .js local, no es componente resuelto, y el archivo no cumple ninguna de las condiciones de exclusión -> transformar
                node.specifiers.forEach(spec => {
                    const localName = spec.local.name;
                    importVarDecls.add(`let ${localName};`); // Declarar variable

                    if (spec.type === 'ImportDefaultSpecifier') {
                        hmrImports.default.push({
                            varName: localName,
                            filePath: sourceValue,
                        });
                    } else if (spec.type === 'ImportNamespaceSpecifier') {
                        hmrImports.namespace.push({
                            varName: localName,
                            filePath: sourceValue,
                        });
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
            }
        }
    });

    // Construir dynamicImportInitialLoadLines a partir de hmrImports consolidados
    let dynamicImportInitialLoadLines = [];
    hmrImports.default.forEach(imp => {
        dynamicImportInitialLoadLines.push(
            `${imp.varName} = (await import('${imp.filePath}')).default;`,
        );
    });
    hmrImports.namespace.forEach(imp => {
        dynamicImportInitialLoadLines.push(
            `${imp.varName} = await import('${imp.filePath}');`,
        );
    });
    hmrImports.named.forEach(imp => {
        if (imp.namedExports.length > 0) {
            dynamicImportInitialLoadLines.push(
                `({ ${imp.namedExports.join(', ')} } = await import('${imp.filePath}'));`,
            );
        }
    });

    let exportStatements = [];
    ast.body.forEach(node => {
        if (
            node.type === 'ExportNamedDeclaration' ||
            node.type === 'ExportDefaultDeclaration'
        ) {
            exportStatements.push(getCode(node));
        }
    });

    const bodyNodes = ast.body.filter(
        n =>
            n.type !== 'ImportDeclaration' &&
            n.type !== 'ExportNamedDeclaration' &&
            n.type !== 'ExportDefaultDeclaration',
    );
    const bodyNodesCode = bodyNodes.map(getCode).join('\n');

    let result = nonDynamicImportStatements.join('\n');
    if (importVarDecls.size > 0) {
        result += '\n' + Array.from(importVarDecls).join('\n') + '\n';
    }

    const hasDynamicImports =
        hmrImports.default.length > 0 ||
        hmrImports.namespace.length > 0 ||
        hmrImports.named.some(e => e.namedExports.length > 0);

    if (hasDynamicImports) {
        let hmrBlock = hasDynamicImports ? generateHMRBlock(hmrImports) : '';
        const indentedHMRBlock = hmrBlock
            .split('\n')
            .map(line => '    ' + line)
            .join('\n')
            .trimStart();

        // Indentar todo el bodyNodesCode si se mueve al IIFE
        const indentedBodyNodesCode = bodyNodesCode
            .split('\n')
            .map(line => '    ' + line)
            .join('\n')
            .trimStart();

        result += `\n(async () => {\n    ${dynamicImportInitialLoadLines.join('\n    ')}`;
        if (indentedHMRBlock) result += `\n${indentedHMRBlock}`;
        if (indentedBodyNodesCode) result += `\n    ${indentedBodyNodesCode}`;
        result += `\n})();\n`;
    } else {
        // Si no hay imports dinámicos, añadir bodyNodesCode directamente
        result += '\n' + bodyNodesCode + '\n';
    }

    result += '\n' + exportStatements.join('\n');

    let finalOutput = result.trim(); // Limpiar espacios extra del ensamblaje

    const shouldBeMarkedForReload =
        isFileAComponent || isVueInitializationFile || isCoreDefinitionFile;

    if (shouldBeMarkedForReload) {
        // Asegurarse de no duplicar la marca
        if (!finalOutput.startsWith('//versaHRM-reloadFILE')) {
            finalOutput = '//versaHRM-reloadFILE\n' + finalOutput;
        }
    }
    return finalOutput;
}

export function analyzeModuleWithAcorn(code) {
    // Parsear el código a AST
    const ast = acorn.parse(code, {
        sourceType: 'module',
        ecmaVersion: 'latest',
        locations: true,
    });

    // Recorrer nodos top-level
    ast.body.forEach(node => {
        switch (node.type) {
            case 'ImportDeclaration':
                console.log(
                    'Import:',
                    node.source.value,
                    node.specifiers.map(s => s.local.name),
                );
                break;
            case 'ExportNamedDeclaration':
                if (node.declaration) {
                    if (node.declaration.type === 'VariableDeclaration') {
                        node.declaration.declarations.forEach(decl => {
                            console.log('Exported variable:', decl.id.name);
                        });
                    } else if (
                        node.declaration.type === 'FunctionDeclaration'
                    ) {
                        console.log(
                            'Exported function:',
                            node.declaration.id.name,
                        );
                    }
                } else if (node.specifiers.length > 0) {
                    node.specifiers.forEach(spec => {
                        console.log('Exported specifier:', spec.exported.name);
                    });
                }
                break;
            case 'ExportDefaultDeclaration':
                if (node.declaration.type === 'Identifier') {
                    console.log('Export default:', node.declaration.name);
                } else if (node.declaration.type === 'FunctionDeclaration') {
                    console.log(
                        'Export default function:',
                        node.declaration.id && node.declaration.id.name,
                    );
                }
                break;
            case 'FunctionDeclaration':
                console.log('Function:', node.id.name);
                break;
            case 'VariableDeclaration':
                node.declarations.forEach(decl => {
                    if (
                        decl.init &&
                        (decl.init.type === 'ArrowFunctionExpression' ||
                            decl.init.type === 'FunctionExpression')
                    ) {
                        console.log('Function variable:', decl.id.name);
                    }
                });
                break;
            default:
                console.log('Other node type:', node.type);
                break;
        }
    });
}

// Ejemplo de uso:
// analyzeModuleWithAcorn('import {foo} from "bar"; export const x = () => {}; function y(){}; export function z(){};');
