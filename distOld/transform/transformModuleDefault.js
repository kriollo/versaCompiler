import { generateHMRBlock } from './generateHMRBlock.js';
export function transformModuleDefault({
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
