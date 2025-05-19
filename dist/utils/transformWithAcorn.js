import * as acorn from 'acorn';
import { simple as walk } from 'acorn-walk';

function getAllImports(ast) {
    const imports = ast.body.filter(node => node.type === 'ImportDeclaration');
    const importValidos = [];
    for (const importNode of imports) {
        if (importNode.source.value.endsWith('.js')) {
            importValidos.push({
                filePath: importNode.source.value,
                variables: importNode.specifiers.map(spec => spec.local.name),
                type: 'default',
            });
        }
    }
    return importValidos;
}

function fileDiscards(ast) {
    // revisar si existe un export
    const exports = ast.body.filter(
        node =>
            node.type === 'ExportNamedDeclaration' ||
            node.type === 'ExportDefaultDeclaration',
    );
    // Revisar si hay un ".mount(" en el código o "createApp("
    const hasMountOrCreateApp = ast.body.some(node => {
        if (
            node.type === 'ExpressionStatement' &&
            node.expression.type === 'CallExpression'
        ) {
            const callee = node.expression.callee;
            return (
                (callee.type === 'MemberExpression' &&
                    callee.property.name === 'mount') ||
                (callee.type === 'Identifier' && callee.name === 'createApp')
            );
        }
        return false;
    });
    if (exports.length === 0 && !hasMountOrCreateApp) {
        return true; // El archivo no tiene exportaciones ni es un punto de entrada de Vue
    }
    return false; // El archivo tiene exportaciones o es un punto de entrada de Vue
}

function generateHMRBlock(imports) {
    let moduleRegistrationBlocks = [];

    // Helper para generar el cuerpo de la función de recarga HMR para default/namespace
    const createHandlerBodySimple = (varName, filePath, isDefault) => {
        const assignment = isDefault
            ? `${varName} = mod.default;`
            : `${varName} = mod;`;
        const typeString = isDefault ? 'default' : 'namespace';
        return (
            `        try {\n` +
            `            const mod = await importWithTimestamp('${filePath}');\n` +
            `            ${assignment}\n` +
            `            console.log('[HMR] Módulo ${filePath} (${typeString}) recargado con éxito');\n` +
            `            return true;\n` +
            `        } catch (e) {\n` +
            `            console.error('[HMR] Error recargando ${filePath}', e);\n` +
            `            return false;\n` +
            `        }\n`
        );
    };

    imports.default.forEach(imp => {
        moduleRegistrationBlocks.push(
            `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n` +
                createHandlerBodySimple(imp.varName, imp.filePath, true) +
                `    };`,
        );
    });

    imports.namespace.forEach(imp => {
        moduleRegistrationBlocks.push(
            `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n` +
                createHandlerBodySimple(imp.varName, imp.filePath, false) +
                `    };`,
        );
    });

    imports.named.forEach(imp => {
        // Para named imports, la reasignación es variable por variable.
        // imp.variables tiene los nombres locales. imp.namedExports tiene los strings de exportación originales.
        let assignments = imp.variables
            .map(localVar => {
                let originalExportName = localVar; // Por defecto, si no es un alias
                // Buscar si esta variable local fue importada con un alias
                const aliasEntry = imp.namedExports.find(ne =>
                    ne.endsWith(` as ${localVar}`),
                );
                if (aliasEntry) {
                    originalExportName = aliasEntry.split(' as ')[0];
                } else {
                    // Si no es un alias, el nombre exportado debe coincidir con el nombre local
                    const directExport = imp.namedExports.find(
                        ne => ne === localVar,
                    );
                    if (directExport) {
                        originalExportName = directExport;
                    } else {
                        // Fallback si no se encuentra (debería ser raro si hmrImports está bien construido)
                        console.warn(
                            `[HMR transform] No se pudo determinar el nombre original exportado para ${localVar} desde ${imp.filePath}`,
                        );
                    }
                }
                return `            ${localVar} = mod.${originalExportName};`;
            })
            .join('\n');

        if (assignments) {
            // Solo si hay variables que reasignar
            moduleRegistrationBlocks.push(
                `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n` +
                    `        try {\n` +
                    `            const mod = await importWithTimestamp('${imp.filePath}');\n` +
                    `${assignments}\n` +
                    `            console.log('[HMR] Módulo ${imp.filePath} (named) recargado con éxito');\n` +
                    `            return true;\n` +
                    `        } catch (e) {\n` +
                    `            console.error('[HMR] Error recargando ${imp.filePath}', e);\n` +
                    `            return false;\n` +
                    `        }\n` +
                    `    };`,
            );
        }
    });

    if (moduleRegistrationBlocks.length === 0) {
        return '';
    }
    // Devuelve solo los bloques de registro de módulos, la indentación se maneja en el ensamblaje.
    return moduleRegistrationBlocks.join('\n');
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

function ExtractOnMountedBlocks(code, ast) {
    const onMountedBlocks = [];
    walk(ast, {
        CallExpression(node) {
            if (
                node.callee.name === 'onMounted' &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'ArrowFunctionExpression'
            ) {
                console.log(code.slice(node.start, node.end));
                onMountedBlocks.push({
                    start: node.start,
                    end: node.end,
                    code: code.slice(node.start, node.end),
                });
            }
        },
    });
    return onMountedBlocks;
}

function transformVueComponentWithDynamicImports({
    code,
    ast,
    bodyNodesCode,
    hmrImports,
    importVarDecls,
    exportStatements,
    nonDynamicImportStatements,
}) {
    const importWithTimestampFunc =
        'const importWithTimestamp = path => { const url = `${path}?t=${Date.now()}`; return import(url); };';
    let loadFunctionStrings = [];
    let initialLoadCallStrings = [];
    let hrRegistrationStrings = [];
    // 1. Extraer y eliminar bloques onMounted del código fuente completo
    let blockOnMounted = ExtractOnMountedBlocks(code, ast);
    let codeClean = code;
    if (blockOnMounted && blockOnMounted.length > 0) {
        blockOnMounted
            .sort((a, b) => b.start - a.start)
            .forEach(({ start, end }) => {
                codeClean = codeClean.slice(0, start) + codeClean.slice(end);
            });
    }
    // 2. Volver a calcular bodyNodesCode limpio
    // (asumiendo que bodyNodesCode se obtiene de los nodos no import/export)
    const acornAstClean = acorn.parse(codeClean, {
        sourceType: 'module',
        ecmaVersion: 'latest',
    });
    const getCode = node => codeClean.slice(node.start, node.end);
    const bodyNodes = acornAstClean.body.filter(
        node =>
            node.type !== 'ImportDeclaration' &&
            node.type !== 'ExportDeclaration',
    );
    let bodyNodesCodeClean = bodyNodes.map(getCode).join('\n');
    // 3. Buscar la línea __expose(); y su indentación
    const exposeRegex = /(\n[ \t]*__expose\s*\(\s*\);?)/;
    const exposeMatch = bodyNodesCodeClean.match(exposeRegex);
    let exposeIndent = '    ';
    let beforeExpose = bodyNodesCodeClean;
    let afterExpose = '';
    if (exposeMatch) {
        const exposeLine = exposeMatch[1];
        const exposeIndex = bodyNodesCodeClean.indexOf(exposeLine);
        beforeExpose = bodyNodesCodeClean.slice(
            0,
            exposeIndex + exposeLine.length,
        );
        afterExpose = bodyNodesCodeClean.slice(exposeIndex + exposeLine.length);
        const indentMatch = exposeLine.match(/^\n([ \t]*)/);
        if (indentMatch && indentMatch[1]) {
            exposeIndent = indentMatch[1];
        }
    }
    // 4. Preparar bloques onMounted indentados
    let onMountedToInject = '';
    if (blockOnMounted && blockOnMounted.length > 0) {
        blockOnMounted.forEach(({ code: onMountedBlockString }) => {
            let formattedBlock = onMountedBlockString.trim();
            if (!formattedBlock.endsWith(';')) {
                formattedBlock += ';';
            }
            onMountedToInject +=
                formattedBlock
                    .split('\n')
                    .map(line => exposeIndent + line.trimStart())
                    .join('\n') + '\n';
        });
    }
    // 5. Preparar bloque HMR indentado
    const allImports = [
        ...hmrImports.default.map(imp => ({ ...imp, type: 'default' })),
        ...hmrImports.namespace.map(imp => ({ ...imp, type: 'namespace' })),
        ...hmrImports.named.map(imp => ({ ...imp, type: 'named' })),
    ];
    allImports.forEach(imp => {
        const loadFunctionName = `load_${imp.filePath.replace(/[^a-zA-Z0-9_]/g, '_')}_module`;
        let assignments = '';
        if (imp.type === 'default') {
            assignments = `    ${imp.varName} = mod.default;`;
        } else if (imp.type === 'namespace') {
            assignments = `    ${imp.varName} = mod;`;
        } else if (imp.type === 'named') {
            assignments = imp.variables
                .map(localVar => {
                    let originalExportName = localVar;
                    const aliasEntry = imp.namedExports.find(ne =>
                        ne.endsWith(` as ${localVar}`),
                    );
                    if (aliasEntry) {
                        originalExportName = aliasEntry.split(' as ')[0];
                    } else {
                        const directExport = imp.namedExports.find(
                            ne => ne === localVar,
                        );
                        if (directExport) originalExportName = directExport;
                    }
                    return `    ${localVar} = mod.${originalExportName};`;
                })
                .join('\n');
        }
        loadFunctionStrings.push(
            `const ${loadFunctionName} = async () => {\n    const mod = await importWithTimestamp('${imp.filePath}');\n${assignments}\n};`,
        );
        initialLoadCallStrings.push(`await ${loadFunctionName}();`);
        hrRegistrationStrings.push(
            `window.__VERSA_HMR.modules['${imp.filePath}'] = async () => {\n    try {\n        await ${loadFunctionName}();\n        console.log('[HMR] Módulo recargado: ${imp.filePath}');\n        return true;\n    } catch (e) {\n        console.error('[HMR] Falló recarga ${imp.filePath}', e);\n        return false;\n    }\n};`,
        );
    });
    const hmrInitialization =
        'window.__VERSA_HMR = window.__VERSA_HMR || {};' +
        '\nwindow.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {}';
    const injectedCodeLines = [
        Array.from(importVarDecls).join('\n'),
        importWithTimestampFunc,
        ...loadFunctionStrings,
        ...initialLoadCallStrings,
        hmrInitialization,
        ...hrRegistrationStrings,
    ].filter(line => line && line.trim() !== '');
    let completeInjectionBlock = '';
    if (injectedCodeLines.length > 0) {
        completeInjectionBlock =
            injectedCodeLines
                .map(line =>
                    line
                        .split('\n')
                        .map(subLine => exposeIndent + subLine.trimStart())
                        .join('\n'),
                )
                .join('\n') + '\n';
    }
    // 6. Reconstruir el bodyNodesCode respetando el flujo
    bodyNodesCode =
        beforeExpose + onMountedToInject + completeInjectionBlock + afterExpose;
    let resultParts = [];
    if (nonDynamicImportStatements.length > 0) {
        resultParts.push(nonDynamicImportStatements.join('\n'));
    }
    resultParts.push(bodyNodesCode);
    if (exportStatements.length > 0) {
        resultParts.push(exportStatements.join('\n'));
    }
    let finalOutput = resultParts.filter(p => p && p.trim()).join('\n\n');
    finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n').trim();
    return finalOutput;
}

function transformModuleWithDynamicImports({
    code,
    ast,
    bodyNodesCode,
    hmrImports,
    importVarDecls,
    dynamicImportInitialLoadLines,
    nonDynamicImportStatements,
    exportStatements,
}) {
    let resultParts = [];
    if (nonDynamicImportStatements.length > 0) {
        resultParts.push(nonDynamicImportStatements.join('\n'));
    }
    if (importVarDecls.size > 0) {
        resultParts.push(Array.from(importVarDecls).join('\n'));
    }
    let currentIifeParts = [];
    currentIifeParts.push(
        '    const importWithTimestamp = path => { const url = `${path}?t=${Date.now()}`; return import(url); };',
    );
    if (dynamicImportInitialLoadLines.length > 0) {
        currentIifeParts.push('    try {');
        dynamicImportInitialLoadLines.forEach(line => {
            let modifiedLine = line.replace(
                /await import\(([^)]+)\)/g,
                'await importWithTimestamp($1)',
            );
            currentIifeParts.push(`        ${modifiedLine}`);
        });
        currentIifeParts.push(
            "        console.log('[HMR] Módulos dinámicos cargados inicialmente');",
        );
        currentIifeParts.push('    } catch (e) {');
        currentIifeParts.push(
            "        console.error('[HMR] Error en carga inicial de módulos dinámicos', e);",
        );
        currentIifeParts.push('    }');
    }
    currentIifeParts.push('    window.__VERSA_HMR = window.__VERSA_HMR || {};');
    currentIifeParts.push(
        '    window.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};',
    );
    let hmrModuleRegistrations = generateHMRBlock(hmrImports);
    if (hmrModuleRegistrations.trim()) {
        const indentedHmrRegistrations = hmrModuleRegistrations
            .split('\n')
            .map(line => '    ' + line)
            .join('\n');
        currentIifeParts.push(indentedHmrRegistrations);
    }
    currentIifeParts.push(
        '    window.__VERSA_HMR.reload = async () => { console.log("[HMR] Reload all invoked"); const P = Object.values(window.__VERSA_HMR.modules).map(f=>f()); await Promise.all(P); };',
    );
    const indentedBodyNodesCode = bodyNodesCode
        .split('\n')
        .map(line => '    ' + line)
        .join('\n')
        .trimStart();
    if (indentedBodyNodesCode.trim()) {
        currentIifeParts.push(indentedBodyNodesCode);
    }
    if (currentIifeParts.length > 0) {
        const iifeBlock = `\n(async () => {\n${currentIifeParts.join('\n')}\n})();`;
        resultParts.push(iifeBlock);
    }
    if (exportStatements.length > 0) {
        resultParts.push(exportStatements.join('\n'));
    }
    let finalOutput = resultParts.filter(p => p && p.trim()).join('\n\n');
    finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n').trim();
    return finalOutput;
}

function transformModuleDefault({
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
}) {
    let resultParts = [];
    if (nonDynamicImportStatements.length > 0) {
        resultParts.push(nonDynamicImportStatements.join('\n'));
    }
    if (importVarDecls.size > 0) {
        resultParts.push(Array.from(importVarDecls).join('\n'));
    }
    let bodyHandled = false;
    const hasDynamicImports =
        hmrImports.default.length > 0 ||
        hmrImports.namespace.length > 0 ||
        hmrImports.named.some(imp => imp.variables && imp.variables.length > 0);
    if (hasDynamicImports) {
        let currentIifeParts = [];
        currentIifeParts.push(
            '    const importWithTimestamp = path => { const url = `${path}?t=${Date.now()}`; return import(url); };',
        );
        // Add initial load and assignment for all HMR imports
        const allImportsToLoad = [
            ...hmrImports.default.map(imp => ({ ...imp, type: 'default' })),
            ...hmrImports.namespace.map(imp => ({ ...imp, type: 'namespace' })),
            ...hmrImports.named.map(imp => ({ ...imp, type: 'named' })),
        ];
        if (allImportsToLoad.length > 0) {
            currentIifeParts.push('    try {');
            for (const imp of allImportsToLoad) {
                currentIifeParts.push(
                    `        // Carga inicial para ${imp.filePath}`,
                );
                currentIifeParts.push(
                    `        const mod_${imp.filePath.replace(/[^a-zA-Z0-9_]/g, '_')} = await importWithTimestamp('${imp.filePath}');`,
                );
                if (imp.type === 'default') {
                    currentIifeParts.push(
                        `        ${imp.varName} = mod_${imp.filePath.replace(/[^a-zA-Z0-9_]/g, '_')}.default;`,
                    );
                } else if (imp.type === 'namespace') {
                    currentIifeParts.push(
                        `        ${imp.varName} = mod_${imp.filePath.replace(/[^a-zA-Z0-9_]/g, '_')};`,
                    );
                } else if (imp.type === 'named') {
                    imp.variables.forEach(localVar => {
                        let originalExportName = localVar;
                        const aliasEntry = imp.namedExports.find(ne =>
                            ne.endsWith(` as ${localVar}`),
                        );
                        if (aliasEntry) {
                            originalExportName = aliasEntry.split(' as ')[0];
                        } else {
                            const directExport = imp.namedExports.find(
                                ne => ne === localVar,
                            );
                            if (directExport) originalExportName = directExport;
                        }
                        currentIifeParts.push(
                            `        ${localVar} = mod_${imp.filePath.replace(/[^a-zA-Z0-9_]/g, '_')}.${originalExportName};`,
                        );
                    });
                }
            }
            currentIifeParts.push(
                "        console.log('[HMR] Módulos dinámicos cargados inicialmente');",
            );
            currentIifeParts.push('    } catch (e) {');
            currentIifeParts.push(
                "        console.error('[HMR] Error en carga inicial de módulos dinámicos', e);",
            );
            currentIifeParts.push('    }');
        }
        currentIifeParts.push(
            '    window.__VERSA_HMR = window.__VERSA_HMR || {};',
        );
        currentIifeParts.push(
            '    window.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};',
        );
        let hmrModuleRegistrations = generateHMRBlock(hmrImports);
        if (hmrModuleRegistrations.trim()) {
            const indentedHmrRegistrations = hmrModuleRegistrations
                .split('\n')
                .map(line => '    ' + line)
                .join('\n');
            currentIifeParts.push(indentedHmrRegistrations);
        }
        currentIifeParts.push(
            '    window.__VERSA_HMR.reload = async () => { console.log("[HMR] Reload all invoked"); const P = Object.values(window.__VERSA_HMR.modules).map(f=>f()); await Promise.all(P); };',
        );
        if (!isFileAComponent) {
            const indentedBodyNodesCode = bodyNodesCode
                .split('\n')
                .map(line => '    ' + line)
                .join('\n')
                .trimStart();
            if (indentedBodyNodesCode.trim()) {
                currentIifeParts.push(indentedBodyNodesCode);
            }
            bodyHandled = true;
        }
        if (currentIifeParts.length > 0) {
            const iifeBlock = `\n(async () => {\n${currentIifeParts.join(
                '\n',
            )}\n})();`;
            resultParts.push(iifeBlock);
        }
    }
    if (!bodyHandled && bodyNodesCode.trim()) {
        resultParts.push(bodyNodesCode);
    }
    if (exportStatements.length > 0) {
        resultParts.push(exportStatements.join('\n'));
    }
    let finalOutput = resultParts.filter(p => p && p.trim()).join('\n\n');
    finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n').trim();
    const shouldBeMarkedForReload =
        isVueInitializationFile || isCoreDefinitionFile;
    if (shouldBeMarkedForReload) {
        if (!finalOutput.startsWith('//versaHRM-reloadFILE')) {
            finalOutput = '//versaHRM-reloadFILE\n' + finalOutput;
        }
    }
    return finalOutput;
}

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
                !/^[./]/.test(sourceValue) && !sourceValue.includes(':');

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
    const exportNodes = ast.body.filter(
        node => node.type === 'ExportDeclaration',
    );

    let bodyNodesCode = bodyNodes.map(getCode).join('\n');
    const exportStatements = exportNodes.map(getCode);

    if (isFileAComponent && hasDynamicImports) {
        return transformVueComponentWithDynamicImports({
            code,
            ast,
            bodyNodesCode,
            hmrImports,
            importVarDecls,
            exportStatements,
            nonDynamicImportStatements,
        });
    } else if (hasDynamicImports && !isFileAComponent) {
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
