import fileTypes from 'public/dashboard/js/store/fileTypes.js';

/**
 * Comprueba si un archivo es válido según una lista de tipos de archivo permitidos.
 * @param {Array} filesPermitidos - La lista de tipos de archivo permitidos.
 * @param {File} file - El archivo a comprobar.
 * @returns {boolean} - Devuelve true si el archivo es válido, de lo contrario devuelve false.
 */
export const useValidFile = (
    /** @type {Array} */ filesPermitidos,
    /** @type {File} */ file,
) => {
    //obterner la ext desde fileTypes
    const fileExt = fileTypes
        .data()
        .fileTypes.find(item => item.type === file.type);
    if (!fileExt) return false;

    const fileTypeValid = filesPermitidos.find(item => item === fileExt.ext);
    return !!fileTypeValid;
};

/**
 * Checks if the size of a file is less than or equal to a specified size.
 * @param {File} file - The file to check the size of.
 * @param {Number} size - The maximum allowed size in megabytes.
 * @returns {boolean} - Returns true if the file size is less than or equal to the specified size, otherwise returns false.
 */
export const useFileZise = (
    /** @type {File} */ file,
    /** @type {number} */ size,
) => {
    const fileSize = file.size / 1000000;
    return fileSize <= size;
};
