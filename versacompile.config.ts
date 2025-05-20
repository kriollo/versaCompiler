// Archivo de configuración de VersaCompiler
export default {
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['src/*'],
            'P@/*': ['public/*'],
        },
    },
    proxyConfig: {
        proxyUrl: '',
        assetsOmit: true,
    },
    aditionalWatch: ['./app/templates/**/*.twig', './app/templates/**/*.html'],
    tailwindConfig: {
        cli: 'npx tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
};
