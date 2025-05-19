export function transformModuleWithStaticImportsOnly({
    code,
    ast,
    bodyNodesCode,
    nonDynamicImportStatements,
    importVarDecls,
}) {
    let resultParts = [];

    if (nonDynamicImportStatements.length > 0) {
        resultParts.push(nonDynamicImportStatements.join('\n'));
    }

    if (importVarDecls.size > 0) {
        resultParts.push(Array.from(importVarDecls).join('\n'));
    }

    let currentIifeParts = [];

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

    let finalOutput = resultParts.filter(p => p && p.trim()).join('\n\n');
    finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n').trim();

    return finalOutput;
}
