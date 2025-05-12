import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';
import dynamicEntries from './vite.entries';

export default defineConfig({
    plugins: [vue()],
    build: {
        rollupOptions: {
            input: dynamicEntries,
            output: {
                entryFileNames: 'js/[name].js',
            },
        },
        outDir: 'public',
        emptyOutDir: false,
    },
    server: {
        watch: {
            usePolling: true,
        },
        hmr: true,
    },
    resolve: {
        alias: {
            vue: 'vue/dist/vue.esm-bundler.js',
            '@': path.resolve(__dirname, 'src/'),
        },
    },
});
