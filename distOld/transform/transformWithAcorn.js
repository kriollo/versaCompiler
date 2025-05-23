import * as acorn from 'acorn';
import { transformModuleDefault } from './transformModuleDefault.js';
import { transformModuleWithDynamicImports } from './transformModuleWithDynamicImports.js';
import { transformModuleWithStaticImportsOnly } from './transformModuleWithStaticImportsOnly.js';
import { transformVueComponentWithDynamicImports } from './transformVueComponent.js';

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
    let hmrNamedByPath = {};
    let importVarDecls = new Set();
    let dynamicImportInitialLoadLines = [];
    let namedImportLineGeneratedForPath = new Set();
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
                !/^[./]/.test(sourceValue) || sourceValue.includes(':'); // Corregida la lógica de isExternal

            if (
                isVueInitializationFile ||
                isCoreDefinitionFile ||
                isExternal ||
                isResolvedCompImport
            ) {
                nonDynamicImportStatements.push(getCode(node));
            } else {
                // INICIO: Lógica para HMR de dependencias JS en componentes Vue
                if (isFileAComponent && sourceValue.endsWith('.js')) {
                    // Para componentes Vue, preparamos para HMR de dependencias JS
                    // Generamos un placeholder único para esta dependencia.
                    const placeholder = `__VERSA_DEP_PLACEHOLDER_${sourceValue.replace(/[^a-zA-Z0-9]/g, '_')}__`;
                    const newImportPath = `${sourceValue}?t=${placeholder}`;

                    // Reconstruimos la declaración de importación con el placeholder
                    let importStatementWithPlaceholder = `import `;
                    const defaultSpecifier = node.specifiers.find(
                        s => s.type === 'ImportDefaultSpecifier',
                    );
                    const namespaceSpecifier = node.specifiers.find(
                        s => s.type === 'ImportNamespaceSpecifier',
                    );
                    const namedSpecifiers = node.specifiers.filter(
                        s => s.type === 'ImportSpecifier',
                    );

                    if (defaultSpecifier) {
                        importStatementWithPlaceholder += `${defaultSpecifier.local.name}`;
                        if (namedSpecifiers.length > 0 || namespaceSpecifier) {
                            importStatementWithPlaceholder += ', ';
                        }
                    }
                    if (namespaceSpecifier) {
                        importStatementWithPlaceholder += `* as ${namespaceSpecifier.local.name}`;
                    }
                    if (namedSpecifiers.length > 0) {
                        importStatementWithPlaceholder += `{ ${namedSpecifiers.map(s => (s.imported.name === s.local.name ? s.imported.name : `${s.imported.name} as ${s.local.name}`)).join(', ')} }`;
                    }
                    if (
                        defaultSpecifier ||
                        namespaceSpecifier ||
                        namedSpecifiers.length > 0
                    ) {
                        importStatementWithPlaceholder += ` from '${newImportPath}';`;
                    } else {
                        // Importar solo por efecto secundario
                        importStatementWithPlaceholder += `'${newImportPath}';`;
                    }

                    nonDynamicImportStatements.push(
                        importStatementWithPlaceholder,
                    );

                    // Guardamos la información para hmrDepsInfo
                    if (!hmrNamedByPath[sourceValue]) {
                        // Usamos hmrNamedByPath temporalmente para almacenar esta info
                        hmrNamedByPath[sourceValue] = {
                            filePath: sourceValue,
                            placeholder: placeholder,
                            isVueDependency: true, // Marca especial para diferenciar
                        };
                    }
                    // No procesar más como import dinámico HMR tradicional para este caso
                    return;
                }
                // FIN: Lógica para HMR de dependencias JS en componentes Vue

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
                        if (!hmrNamedByPath[sourceValue]) {
                            hmrNamedByPath[sourceValue] = {
                                filePath: sourceValue,
                                namedExportsSet: new Set(),
                                variablesSet: new Set(),
                            };
                        }
                        const namedEntry = hmrNamedByPath[sourceValue];
                        const exportString =
                            spec.imported.name === localName
                                ? localName
                                : `${spec.imported.name} as ${localName}`;
                        namedEntry.namedExportsSet.add(exportString);
                        namedEntry.variablesSet.add(localName);
                    }
                });

                if (!isFileAComponent) {
                    const namedImportEntry = hmrNamedByPath[sourceValue];
                    if (
                        namedImportEntry &&
                        namedImportEntry.variablesSet.size > 0 &&
                        !namedImportLineGeneratedForPath.has(sourceValue)
                    ) {
                        const varString = Array.from(
                            namedImportEntry.variablesSet,
                        ).join(', ');
                        dynamicImportInitialLoadLines.push(
                            `({ ${varString} } = await import('${sourceValue}'));`,
                        );
                        namedImportLineGeneratedForPath.add(sourceValue);
                    }
                }
            }
        } else if (node.type.startsWith('Export')) {
            // Corrected condition
            exportStatements.push(getCode(node));
        } else {
            // Consider other node types if necessary, or they become part of bodyNodes by default if not filtered
        }
    });

    // Convertir hmrNamedByPath al formato de array esperado por hmrImports.named
    // Y también extraer hmrDepsInfo para componentes Vue
    let hmrDepsInfo = null; // Inicializar como null

    const tempNamedImports = [];
    const vueDepPlaceholders = {};

    Object.values(hmrNamedByPath).forEach(entry => {
        if (entry.isVueDependency) {
            // Si es una dependencia JS de un componente Vue
            if (!hmrDepsInfo) hmrDepsInfo = {};
            hmrDepsInfo[entry.filePath] = entry.placeholder;
        } else {
            // Si es un import HMR-able estándar
            tempNamedImports.push({
                filePath: entry.filePath,
                namedExports: Array.from(entry.namedExportsSet),
                variables: Array.from(entry.variablesSet),
            });
        }
    });
    hmrImports.named = tempNamedImports;

    // Asegurar que hasDynamicImports se defina aquí
    const hasDynamicImports =
        hmrImports.default.length > 0 ||
        hmrImports.namespace.length > 0 ||
        hmrImports.named.some(
            imp => imp.variablesSet && imp.variablesSet.size > 0,
        ) || // Corregido para usar variablesSet.size de hmrNamedByPath antes de la conversión final
        hmrImports.named.some(imp => imp.variables && imp.variables.length > 0); // Mantenido por si se usa hmrImports.named directamente en otro lado

    const bodyNodes = ast.body.filter(
        node =>
            node.type !== 'ImportDeclaration' &&
            !node.type.startsWith('Export'), // Corrected condition
    );

    let bodyNodesCode = bodyNodes.map(getCode).join('\n');

    // Estructura de decisión reorganizada
    // 1. Manejo de Componentes Vue
    if (isFileAComponent) {
        if (hasDynamicImports) {
            // Esto se refiere a los imports dinámicos HMR tradicionales
            // Si es un componente Vue y tiene dependencias JS HMR-ables (con placeholders)
            // o si tiene los imports dinámicos HMR tradicionales.
            const resultFromVueTransform =
                transformVueComponentWithDynamicImports({
                    code, // El código original del componente Vue (script part)
                    ast,
                    bodyNodesCode,
                    hmrImports, // Puede estar vacío si solo hay dependencias JS con placeholders
                    importVarDecls,
                    exportStatements,
                    nonDynamicImportStatements, // Contendrá los imports con placeholders
                });
            // Devolver el código transformado y hmrDepsInfo si existe
            return { code: resultFromVueTransform, hmrDepsInfo: hmrDepsInfo };
        } else {
            // Componente Vue sin imports dinámicos HMR tradicionales,
            // pero podría tener dependencias JS con placeholders.
            if (hmrDepsInfo && Object.keys(hmrDepsInfo).length > 0) {
                // Reconstruir el código solo con los imports (con placeholders) y el resto del cuerpo.
                // Esto es simplificado; transformVueComponentWithDynamicImports podría ser adaptado
                // para manejar este caso también si se necesita más lógica de Vue.
                // Por ahora, asumimos que nonDynamicImportStatements ya tiene los imports correctos.
                const reconstructedCode = [
                    ...nonDynamicImportStatements,
                    bodyNodesCode,
                    ...exportStatements,
                ].join('\n');
                return { code: reconstructedCode, hmrDepsInfo: hmrDepsInfo };
            }
            // Si no hay ni imports HMR tradicionales ni dependencias JS con placeholders
            return { code: code, hmrDepsInfo: null };
        }
    }

    // A partir de este punto, el archivo NO es un componente Vue.

    // 2. Manejo de Módulos JS estándar con Imports Dinámicos
    if (hasDynamicImports) {
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
    }

    // A partir de este punto, el archivo NO es un componente Vue Y NO tiene imports dinámicos.

    // 3. Manejo de Módulos JS con solo Imports Estáticos (sin exports, no es punto de entrada Vue)
    const criteriaForStaticOnlyTransform =
        !isVueInitializationFile && exportStatements.length === 0;

    if (criteriaForStaticOnlyTransform) {
        return transformModuleWithStaticImportsOnly({
            code,
            ast,
            bodyNodesCode,
            nonDynamicImportStatements,
            importVarDecls, // Este Set estará vacío si !hasDynamicImports
        });
    }

    // 4. Caso por Defecto para Módulos JS
    return transformModuleDefault({
        code,
        ast,
        bodyNodesCode,
        hmrImports, // Vacío aquí
        importVarDecls, // Vacío aquí
        dynamicImportInitialLoadLines, // Vacío aquí
        nonDynamicImportStatements,
        exportStatements,
        isFileAComponent, // false aquí
        isVueInitializationFile,
        isCoreDefinitionFile,
    });
}
