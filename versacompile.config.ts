// Archivo de configuración de VersaCompiler
export default {
    tsconfig: './tsconfig.json',
    compilerOptions: {
        sourceRoot: './src',
        outDir: './dist',
        pathsAlias: {
            '@/*': ['examples/*'],
            'P@/*': ['public/*'],
            'e@/*': ['examples/*'],
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
        input: './examples/css/input.css',
        output: './public/css/output.css',
    },
    linter: [
        {
            name: 'eslint',
            bin: './node_modules/.bin/eslint',
            configFile: './eslint.config.js',
            fix: false,
            paths: ['examples/'],
        },
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['examples/'],
        },
    ],
    bundlers: [
        {
            name: 'appLoader',
            fileInput: './public/module/appLoader.js',
            fileOutput: './public/module/appLoader.prod.js',
        },
    ],
};
