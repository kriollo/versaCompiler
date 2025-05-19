import * as acorn from 'acorn';
import { simple as walk } from 'acorn-walk';
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
export function transformVueComponentWithDynamicImports({
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
            !node.type.startsWith('Export'), // Corregido para excluir todos los tipos de exportación
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
