const { parentPort } = require('node:worker_threads');

let preCompileVue;
let preCompileTS;
let minifyJS;

async function loadVue() {
    if (!preCompileVue) {
        const mod = await import('./vuejs.js');
        preCompileVue = mod.preCompileVue;
    }
    return preCompileVue;
}

async function loadTypeScript() {
    if (!preCompileTS) {
        const mod = await import('./typescript-manager.js');
        preCompileTS = mod.preCompileTS;
    }
    return preCompileTS;
}

async function loadMinify() {
    if (!minifyJS) {
        const mod = await import('./minify.js');
        minifyJS = mod.minifyJS;
    }
    return minifyJS;
}

parentPort.on('message', async message => {
    const { id, type, payload } = message;
    try {
        if (type === 'vue') {
            const compileVue = await loadVue();
            const result = await compileVue(
                payload.source,
                payload.fileName,
                payload.isProd === true,
            );
            parentPort.postMessage({ id, success: true, data: result });
            return;
        }
        if (type === 'ts') {
            const compileTS = await loadTypeScript();
            const result = await compileTS(
                payload.source,
                payload.fileName,
                payload.scriptInfo,
            );
            parentPort.postMessage({ id, success: true, data: result });
            return;
        }
        if (type === 'minify') {
            const minify = await loadMinify();
            const result = await minify(payload.source, payload.fileName, true);
            parentPort.postMessage({ id, success: true, data: result });
            return;
        }
        parentPort.postMessage({
            id,
            success: false,
            error: `Tipo de tarea desconocido: ${type}`,
        });
    } catch (error) {
        parentPort.postMessage({
            id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
