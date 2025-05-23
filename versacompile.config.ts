// Archivo de configuración de VersaCompiler
export default {
    compilerOptions: {
        sourceRoot: './src',
        outDir: './public',
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
    // puede dejar en false o no agregarlo si no quiere que se ejecute el compilador de tailwind
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './src/css/input.css',
        output: './public/css/output.css',
    },
};
