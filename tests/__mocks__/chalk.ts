// Mock para chalk compatible con lazy loading
const createChalkFunction = (_color: string): any => {
    const chalkFn: any = (text: any) => text;

    // Lista de colores y estilos disponibles
    const colors = [
        'red',
        'green',
        'blue',
        'yellow',
        'gray',
        'cyan',
        'magenta',
        'white',
        'black',
    ];
    const styles = [
        'bold',
        'dim',
        'italic',
        'underline',
        'strikethrough',
        'inverse',
    ];
    const bgColors = [
        'bgRed',
        'bgGreen',
        'bgBlue',
        'bgYellow',
        'bgCyan',
        'bgMagenta',
        'bgWhite',
        'bgBlack',
    ];

    // Evitar recursión infinita - solo agregar propiedades una vez
    if (!chalkFn._initialized) {
        chalkFn._initialized = true;

        // Agregar todos los colores
        colors.forEach(color => {
            chalkFn[color] = chalkFn;
        });

        // Agregar todos los estilos
        styles.forEach(style => {
            chalkFn[style] = chalkFn;
        });

        // Agregar todos los colores de fondo
        bgColors.forEach(bgColor => {
            chalkFn[bgColor] = chalkFn;
        });
    }

    return chalkFn;
};

const chalk = {
    red: createChalkFunction('red'),
    green: createChalkFunction('green'),
    blue: createChalkFunction('blue'),
    yellow: createChalkFunction('yellow'),
    gray: createChalkFunction('gray'),
    cyan: createChalkFunction('cyan'),
    magenta: createChalkFunction('magenta'),
    white: createChalkFunction('white'),
    black: createChalkFunction('black'),
    bold: createChalkFunction('bold'),
    underline: createChalkFunction('underline'),
    dim: createChalkFunction('dim'),
    strikethrough: createChalkFunction('strikethrough'),
    inverse: createChalkFunction('inverse'),
    italic: createChalkFunction('italic'),
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
const chalkDefault = createChalkFunction('default');

// Agregar todos los métodos a la función principal para soportar chalk.red.bold()
Object.keys(chalk).forEach(color => {
    (chalkDefault as any)[color] = (chalk as any)[color];
});

module.exports = chalkDefault;
module.exports.default = chalkDefault;
