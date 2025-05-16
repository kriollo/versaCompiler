import * as acorn from 'acorn';

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

function isExternalImport(sourceValue) {
    // A simple check: if it doesn't start with '.' or '/', it's likely external or a Node module.
    // This doesn't handle aliased paths like '@/' without further configuration.
    return !/^[./]/.test(sourceValue) && !sourceValue.includes(':'); // Basic check
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
        // 1. Asegurar que 'setup' sea async
        const setupSignatureRegex =
            /(setup\s*(?::\s*(?:async\s+)?function)?\s*\([^)]*\)\s*\{)/m;
        if (!bodyNodesCode.match(/async\s+setup/)) {
            // Chequeo simple, puede mejorarse
            bodyNodesCode = bodyNodesCode.replace(
                setupSignatureRegex,
                match => {
                    if (match.includes('async ')) return match;
                    if (
                        match.includes('setup:') &&
                        match.includes('function')
                    ) {
                        return match.replace('function', 'async function');
                    }
                    return (
                        'async ' +
                        match.replace(/setup\s*(?::\s*function)?/, 'setup')
                    );
                },
            );
        }

        // 2. Preparar el bloque de código HMR
        let varDeclarations = '';
        if (importVarDecls.size > 0) {
            varDeclarations = Array.from(importVarDecls).join('\n');
        }

        const importWithTimestampFunc =
            'const importWithTimestamp = path => { const url = `${path}?t=${Date.now()}`; return import(url); };';

        let loadFunctionStrings = [];
        let initialLoadCallStrings = [];
        let hrRegistrationStrings = [];

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
            'window.__VERSA_HMR = window.__VERSA_HMR || {};\nwindow.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};';

        let baseBodyIndent = '    ';
        const setupBodyMatch = bodyNodesCode.match(
            /async\s+setup\s*\([^)]*\)\s*\{[^\n]*\n(\s+)/m,
        );
        if (setupBodyMatch && setupBodyMatch[1]) {
            baseBodyIndent = setupBodyMatch[1];
        }

        const injectedCodeLines = [
            varDeclarations,
            importWithTimestampFunc,
            ...loadFunctionStrings,
            ...initialLoadCallStrings,
            hmrInitialization,
            ...hrRegistrationStrings,
        ].filter(line => line && line.trim() !== '');

        let completeInjectionBlock = '';
        if (injectedCodeLines.length > 0) {
            completeInjectionBlock = injectedCodeLines
                .map(line =>
                    line
                        .split('\n')
                        .map(subLine => baseBodyIndent + subLine)
                        .join('\n'),
                )
                .join('\n');
            if (completeInjectionBlock.trim() !== '') {
                completeInjectionBlock = '\n' + completeInjectionBlock + '\n';
            }
        }

        const returnStatementRegex = /(\s*const\s+__returned__\s*=)/m;
        let setupModifiedForHMR = false;
        bodyNodesCode = bodyNodesCode.replace(returnStatementRegex, match => {
            setupModifiedForHMR = true;
            return `${completeInjectionBlock}${match}`;
        });

        if (!setupModifiedForHMR) {
            console.warn(
                '[transformModuleWithAcorn] No se encontró "const __returned__ =" para inyección HMR en componente Vue.',
            );
        }

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
    } else {
        let resultParts = [];
        if (nonDynamicImportStatements.length > 0) {
            resultParts.push(nonDynamicImportStatements.join('\n'));
        }
        if (importVarDecls.size > 0) {
            resultParts.push(Array.from(importVarDecls).join('\n'));
        }

        let bodyHandled = false;

        if (hasDynamicImports) {
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
}
