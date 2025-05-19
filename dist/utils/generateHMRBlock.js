export function generateHMRBlock(imports) {
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
