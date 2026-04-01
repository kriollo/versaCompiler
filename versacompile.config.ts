import { defineConfig } from './src/config';

export default defineConfig({
    root: './src',
    build: {
        outDir: './dist',
    },
    resolve: {
        alias: {
            '@': 'public',
            'P@': 'public',
            'e@': 'examples',
        },
    },
    server: {
        proxyUrl: '',
        assetsOmit: true,
        watch: {
            additional: [
                './app/templates/**/*.twig',
                './app/templates/**/*.html',
            ],
        },
    },
    tsconfig: './tsconfig.json',
    tailwindConfig: {
        bin: './node_modules/.bin/tailwindcss',
        input: './examples/css/input.css',
        output: './public/css/output.css',
    },
    linter: [
        {
            name: 'oxlint',
            bin: './node_modules/.bin/oxlint',
            configFile: './.oxlintrc.json',
            fix: false,
            paths: ['src/'],
        },
    ],
});
