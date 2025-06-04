// Mock para chalk compatible con lazy loading
const createChalkFunction = (_color: string) => {
    const chalkFn = (text: any) => text;
    // Agregar métodos encadenables
    chalkFn.bold = (text: any) => text;
    chalkFn.dim = (text: any) => text;
    chalkFn.italic = (text: any) => text;
    chalkFn.underline = (text: any) => text;
    chalkFn.strikethrough = (text: any) => text;
    chalkFn.inverse = (text: any) => text;
    return chalkFn;
};

// Interfaz para chalk con firma de índice
interface ChalkMock {
    (text: any): any;
    [key: string]: any;
    red: any;
    green: any;
    blue: any;
    yellow: any;
    gray: any;
    cyan: any;
    bold: any;
    underline: any;
    dim: any;
    strikethrough: any;
    inverse: any;
    italic: any;
    bgRed: any;
    bgGreen: any;
    bgBlue: any;
    bgYellow: any;
    bgCyan: any;
    bgMagenta: any;
    bgWhite: any;
    bgBlack: any;
}

const chalk = {
    red: createChalkFunction('red'),
    green: createChalkFunction('green'),
    blue: createChalkFunction('blue'),
    yellow: createChalkFunction('yellow'),
    gray: createChalkFunction('gray'),
    cyan: createChalkFunction('cyan'),
    bold: createChalkFunction('bold'),
    underline: createChalkFunction('underline'),
    dim: createChalkFunction('dim'),
    strikethrough: createChalkFunction('strikethrough'),
    inverse: createChalkFunction('inverse'),
    bgRed: createChalkFunction('bgRed'),
    bgGreen: createChalkFunction('bgGreen'),
    bgBlue: createChalkFunction('bgBlue'),
    bgYellow: createChalkFunction('bgYellow'),
    bgCyan: createChalkFunction('bgCyan'),
    bgMagenta: createChalkFunction('bgMagenta'),
    bgWhite: createChalkFunction('bgWhite'),
    bgBlack: createChalkFunction('bgBlack'),
};

// Función principal que soporta encadenamiento
const chalkDefault = ((text: any) => text) as ChalkMock;

// Agregar todos los métodos a la función principal para soportar chalk.red.bold()
Object.keys(chalk).forEach(color => {
    (chalkDefault as any)[color] = (chalk as any)[color];
});

// Soportar métodos encadenables en la función principal
chalkDefault.bold = chalk.bold;
chalkDefault.dim = chalk.dim;
chalkDefault.italic = createChalkFunction('italic');
chalkDefault.underline = chalk.underline;
chalkDefault.strikethrough = chalk.strikethrough;
chalkDefault.inverse = chalk.inverse;

module.exports = chalkDefault;
module.exports.default = chalkDefault;
