// Mock para execa
const execaModule = {
    execa: jest.fn(() =>
        Promise.resolve({
            stdout: '',
            stderr: '',
            exitCode: 0,
            command: 'mock-command',
            escapedCommand: 'mock-command',
            failed: false,
            timedOut: false,
            isCanceled: false,
            killed: false,
        }),
    ),
    execaSync: jest.fn(() => ({
        stdout: '',
        stderr: '',
        exitCode: 0,
        command: 'mock-command',
        escapedCommand: 'mock-command',
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false,
    })),
    $: jest.fn(() =>
        Promise.resolve({
            stdout: '',
            stderr: '',
            exitCode: 0,
            command: 'mock-command',
            escapedCommand: 'mock-command',
            failed: false,
            timedOut: false,
            isCanceled: false,
            killed: false,
        }),
    ),
};

module.exports = execaModule;
module.exports.default = execaModule;

// Para destructuring
module.exports.execa = execaModule.execa;
module.exports.execaSync = execaModule.execaSync;
module.exports.$ = execaModule.$;
