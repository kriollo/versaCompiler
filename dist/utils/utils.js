import path from 'node:path';
/**
 * Converts a 24-hour time string to a 12-hour time string with AM/PM.
 *
 * @param {number} timing - The value of the timing en miliseconds.
 * @returns {string} the timing in ms, seconds, minutes or hours.
 */
export const showTimingForHumans = timing => {
    if (timing < 1000) {
        return `${timing} ms`;
    } else if (timing < 60000) {
        return `${timing / 1000} s`;
    } else if (timing < 3600000) {
        return `${timing / 60000} min`;
    } else {
        return `${timing / 3600000} h`;
    }
};

/**
 * Mapea una ruta de origen a una ruta de destino en el directorio de distribución.
 * @param {string} ruta - La ruta de origen.
 * @returns {Promise<string>} - La ruta mapeada en el directorio de distribución.
 */
export const mapRuta = async (ruta, PATH_DIST, PATH_SOURCE) =>
    path.join(PATH_DIST, path.relative(PATH_SOURCE, ruta));

/**
 * Agrega la extensión .js a las importaciones en la cadena de datos proporcionada.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {Promise<string>} - Una promesa que se resuelve con la cadena modificada con las importaciones actualizadas.
 */
export const addImportEndJs = async data => {
    const importRegExp =
        /(?:import\s+.*?from\s+['"](.*?)['"]|import\(['"](.*?)['"]\))/g; // Manejar importaciones estáticas y dinámicas

    return data.replace(importRegExp, (match, ruta1, ruta2) => {
        const ruta = ruta1 || ruta2; // Usar la ruta capturada, ya sea estática o dinámica
        if (ruta.endsWith('.vue') || ruta.endsWith('.ts')) {
            const fullPath = ruta.replace(/\.(vue|ts)$/, '.js');
            return match.replace(ruta, fullPath);
        } else if (!ruta.match(/\/.*\.(js|mjs|css)$/) && ruta.includes('/')) {
            return match.replace(ruta, `${ruta}.js`);
        }

        return match; // Devolver el match original si no se cumple ninguna condición
    });
};

/**
 * Reemplaza las importaciones estáticas en el código JavaScript proporcionado por importaciones dinámicas, sólo para archivos JS.
 * @param {string} data - La cadena de entrada que contiene el código JavaScript.
 * @returns {string} - La cadena modificada con las importaciones actualizadas.
 */
export const transformStaticImports = data => {
    // Detectar archivos sensibles que NO deben transformarse
    const isSystemFile =
        data.includes('vue-loader') ||
        data.includes('loadModule') ||
        data.includes('handleError') ||
        data.includes('createApp(') ||
        data.includes('system/');

    // Si es un archivo del sistema, dejarlo intacto
    if (isSystemFile) {
        return data;
    }

    // Proceder con la transformación normal para archivos regulares
    let updatedData = data;

    // Verificar si un componente se usa con _resolveComponent
    const isVueComponent = varName => {
        const pattern1 = `_resolveComponent(${varName})`;
        const pattern2 = `_resolveComponent("${varName}")`;
        const pattern3 = `_resolveComponent('${varName}')`;

        return (
            data.includes(pattern1) ||
            data.includes(pattern2) ||
            data.includes(pattern3)
        );
    };

    // Caso 1: import defaultExport from "./module.js";
    const defaultImportRegex =
        /import\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+\.js)['"];?/g;
    updatedData = updatedData.replace(
        defaultImportRegex,
        (match, varName, filePath) => {
            // Si es un componente Vue (usado con _resolveComponent), mantenerlo estático
            if (isVueComponent(varName)) {
                return match; // Mantener el import original
            }

            return `let ${varName}; // Declaración adelantada\n(async () => { \n  // Generar timestamp fresco en runtime, no en compilación\n  const importWithTimestamp = (path) => import(path + '?t=' + Date.now());\n  ${varName} = (await importWithTimestamp('${filePath}')).default;\n  \n  // Registrar función de recarga para HMR\n  window.__VERSA_HMR = window.__VERSA_HMR || {};\n  window.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};\n  window.__VERSA_HMR.modules['${filePath}'] = async () => {\n    try {\n      ${varName} = (await import('${filePath}?t=' + Date.now())).default;\n      console.log('[HMR] Módulo ${filePath} recargado');\n      return true;\n    } catch (e) {\n      console.error('[HMR] Error recargando ${filePath}', e);\n      return false;\n    }\n  };\n})();`;
        },
    );

    // Caso 2: import * as namespace from "./module.js";
    const namespaceImportRegex =
        /import\s+\*\s+as\s+([a-zA-Z_$][\w$]*)\s+from\s+['"]([^'"]+\.js)['"];?/g;
    updatedData = updatedData.replace(
        namespaceImportRegex,
        (match, namespaceName, filePath) => {
            // Si es un componente Vue, mantenerlo estático
            if (isVueComponent(namespaceName)) {
                return match;
            }

            return `let ${namespaceName}; // Declaración adelantada\n(async () => { \n  // Generar timestamp fresco en runtime, no en compilación\n  const importWithTimestamp = (path) => import(path + '?t=' + Date.now());\n  ${namespaceName} = await importWithTimestamp('${filePath}');\n  \n  // Registrar función de recarga para HMR\n  window.__VERSA_HMR = window.__VERSA_HMR || {};\n  window.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};\n  window.__VERSA_HMR.modules['${filePath}'] = async () => {\n    try {\n      ${namespaceName} = await import('${filePath}?t=' + Date.now());\n      console.log('[HMR] Módulo ${filePath} recargado');\n      return true;\n    } catch (e) {\n      console.error('[HMR] Error recargando ${filePath}', e);\n      return false;\n    }\n  };\n})();`;
        },
    );

    // Caso 3: import { ... } from "./module.js";
    const namedImportRegex =
        /import\s*\{([^}]*?)\}\s*from\s+['"]([^'"]+\.js)['"];?/g;
    updatedData = updatedData.replace(
        namedImportRegex,
        (match, namedExports, filePath) => {
            const trimmedNamedExports = namedExports
                .replace(/\s+/g, ' ')
                .trim();

            // Extraer los nombres de variables
            const variables = trimmedNamedExports.split(',').map(e => {
                const parts = e.trim().split(' as ');
                return parts.length > 1 ? parts[1].trim() : parts[0].trim();
            });

            // Verificar si alguna de las variables es un componente Vue
            const isVueImport = variables.some(varName =>
                isVueComponent(varName),
            );
            if (isVueImport) {
                return match; // Mantener el import original
            }

            let varNames = variables.join(', ');
            if (varNames.endsWith(', ')) {
                varNames = varNames.slice(0, -2);
            }
            return `let ${varNames}; // Declaración adelantada\n(async () => { \n  // Generar timestamp fresco en runtime, no en compilación\n  const importWithTimestamp = (path) => import(path + '?t=' + Date.now());\n  ({ ${trimmedNamedExports} } = await importWithTimestamp('${filePath}'));\n  \n  // Registrar función de recarga para HMR\n  window.__VERSA_HMR = window.__VERSA_HMR || {};\n  window.__VERSA_HMR.modules = window.__VERSA_HMR.modules || {};\n  window.__VERSA_HMR.modules['${filePath}'] = async () => {\n    try {\n      ({ ${trimmedNamedExports} } = await import('${filePath}?t=' + Date.now()));\n      console.log('[HMR] Módulo ${filePath} recargado');\n      return true;\n    } catch (e) {\n      console.error('[HMR] Error recargando ${filePath}', e);\n      return false;\n    }\n  };\n})();`;
        },
    );

    // El archivo ya ha sido procesado y no es un archivo del sistema
    // por lo que podemos proceder con seguridad

    return updatedData;
};
