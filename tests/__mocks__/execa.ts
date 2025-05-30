// Mock para execa
const mockResult = {
    stdout: '',
    stderr: '',
    exitCode: 0,
    failed: false,
    killed: false,
    signal: undefined,
    signalDescription: undefined,
    command: '',
    timedOut: false,
    isCanceled: false,
    shortMessage: '',
    originalMessage: '',
};

const execaMock = (command: any, args?: any, options?: any) => {
    return Promise.resolve(mockResult);
};

const execaSyncMock = (command: any, args?: any, options?: any) => {
    return mockResult;
};

const $Mock = (template: any, ...substitutions: any[]) => {
    return execaMock;
};

// Crear el módulo principal
const execaModule = execaMock;
Object.assign(execaModule, {
    execa: execaMock,
    execaSync: execaSyncMock,
    $: $Mock,
});

module.exports = execaModule;
module.exports.default = execaModule;
module.exports.execa = execaMock;
module.exports.execaSync = execaSyncMock;
module.exports.$ = $Mock;
