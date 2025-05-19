import { generateHMRBlock } from './generateHMRBlock.js';
export function transformModuleWithDynamicImports({
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
