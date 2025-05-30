// Mock para chalk
const chalk = {
    red: (text: any) => text,
    green: (text: any) => text,
    blue: (text: any) => text,
    yellow: (text: any) => text,
    gray: (text: any) => text,
    bold: (text: any) => text,
    underline: (text: any) => text,
    dim: (text: any) => text,
    strikethrough: (text: any) => text,
    inverse: (text: any) => text,
    bgRed: (text: any) => text,
    bgGreen: (text: any) => text,
    bgBlue: (text: any) => text,
    bgYellow: (text: any) => text,
    bgCyan: (text: any) => text,
    bgMagenta: (text: any) => text,
    bgWhite: (text: any) => text,
    bgBlack: (text: any) => text,
};

// Función principal
const chalkDefault = (text: any) => text;

// Agregar todos los métodos a la función principal
Object.assign(chalkDefault, chalk);

module.exports = chalkDefault;
module.exports.default = chalkDefault;
