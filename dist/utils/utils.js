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
