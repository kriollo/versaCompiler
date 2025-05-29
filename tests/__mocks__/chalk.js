// Mock para chalk
const chalk = {
    red: text => text,
    green: text => text,
    blue: text => text,
    yellow: text => text,
    gray: text => text,
    bold: text => text,
    underline: text => text,
    dim: text => text,
    strikethrough: text => text,
    inverse: text => text,
    bgRed: text => text,
    bgGreen: text => text,
    bgBlue: text => text,
    bgYellow: text => text,
    bgCyan: text => text,
    bgMagenta: text => text,
    bgWhite: text => text,
    bgBlack: text => text,
};

// Función principal
const chalkDefault = text => text;

// Agregar todos los métodos a la función principal
Object.assign(chalkDefault, chalk);

module.exports = chalkDefault;
module.exports.default = chalkDefault;
