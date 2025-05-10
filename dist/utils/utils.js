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
