// Test simple para validar TypeScript Language Service
const name: string = 'VersaCompiler';
const version: number = 2.0;

interface Config {
    name: string;
    version: number;
}

const config: Config = {
    name,
    version,
};

console.log(`${config.name} v${config.version}`);

export default config;
