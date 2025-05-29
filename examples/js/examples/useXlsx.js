import { read, utils, writeFile } from '/vendor/xlsx/xlsx.full.min.esm.js';

/**
 * @preserve
 * Retrieves the names of all sheets in the Excel file.
 * @param {File} file - The Excel file to read.
 * @returns {Promise<string[]>} - A promise that resolves to an array of sheet names.
 */
export const getSheetNames = async file => {
    const f = await file.arrayBuffer();
    const w = new Uint8Array(f);

    const workbook = await read(w, { type: 'array' });

    return workbook.SheetNames;
};

/**
 * @preserve
 * Reads an XLSX file and returns the data from the specified sheet.
 * @param {File} file - The XLSX file to read.
 * @param {number} [hoja=0] - The index of the sheet to read (default is 0).
 * @returns { Promise<Array> } - A promise that resolves to an array of arrays, where each array represents a row of the sheet.
 */
export const readXlsx = async (file, hoja = 0) => {
    const f = await file.arrayBuffer();
    const w = new Uint8Array(f);

    const workbook = await read(w, { type: 'array' });

    const sheet = workbook.Sheets[workbook.SheetNames[hoja]];

    return utils.sheet_to_json(sheet, { header: 1 });
};

/**
 * @preserve
 * Creates an XLSX file from JSON data.
 * @param {Array} data - The JSON data to be converted to XLSX.
 * @param {string} [sheetName='Sheet1'] - The name of the sheet in the XLSX file.
 * @returns {Promise<void>} - A promise that resolves when the XLSX file is created.
 */
export const createXlsxFromJson = async (data, sheetName = 'Sheet1') => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(data);
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, `${sheetName}.xlsx`);
};
