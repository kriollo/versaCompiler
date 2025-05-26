// Archivo de configuración de VersaCompiler
export default {
    tsconfig: './tsconfig.json',
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
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['src/'],
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
        },
    ],
};
