import { jest } from '@jest/globals';
import chokidar from 'chokidar';
import { FileWatcherConfig, watchFiles } from '../src/js/servicios/chokidar';

jest.mock('chokidar', () => ({
    watch: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        add: jest.fn(),
        unwatch: jest.fn(),
    }),
}));

describe('Chokidar Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('debe inicializar watcher con configuración básica', () => {
        const config: FileWatcherConfig = {
            paths: ['./src/**/*'],
            ignored: ['**/node_modules/**'],
            persistent: true,
        };

        const onAdd = jest.fn();
        const onChange = jest.fn();
        const onUnlink = jest.fn();

        const watcher = watchFiles(config, {
            onAdd,
            onChange,
            onUnlink,
        });

        expect(chokidar.watch).toHaveBeenCalledWith(
            ['./src/**/*'],
            expect.objectContaining({
                ignored: ['**/node_modules/**'],
                persistent: true,
            }),
        );

        expect(watcher.on).toHaveBeenCalledWith('add', expect.any(Function));
        expect(watcher.on).toHaveBeenCalledWith('change', expect.any(Function));
        expect(watcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
    });

    test('debe manejar múltiples patrones de observación', () => {
        const config: FileWatcherConfig = {
            paths: ['./src/**/*.ts', './src/**/*.vue', './src/**/*.js'],
            ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
            persistent: true,
        };

        const callbacks = {
            onAdd: jest.fn(),
            onChange: jest.fn(),
            onUnlink: jest.fn(),
        };

        const watcher = watchFiles(config, callbacks);

        expect(chokidar.watch).toHaveBeenCalledWith(
            expect.arrayContaining([
                './src/**/*.ts',
                './src/**/*.vue',
                './src/**/*.js',
            ]),
            expect.objectContaining({
                ignored: expect.arrayContaining([
                    '**/node_modules/**',
                    '**/dist/**',
                    '**/.git/**',
                ]),
                persistent: true,
            }),
        );
    });

    test('debe manejar opciones avanzadas de configuración', () => {
        const config: FileWatcherConfig = {
            paths: ['./src/**/*'],
            ignored: ['**/node_modules/**'],
            persistent: true,
            ignoreInitial: true,
            followSymlinks: false,
            usePolling: true,
            interval: 1000,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100,
            },
        };

        const callbacks = {
            onAdd: jest.fn(),
            onChange: jest.fn(),
            onUnlink: jest.fn(),
        };

        watchFiles(config, callbacks);

        expect(chokidar.watch).toHaveBeenCalledWith(
            ['./src/**/*'],
            expect.objectContaining({
                ignored: ['**/node_modules/**'],
                persistent: true,
                ignoreInitial: true,
                followSymlinks: false,
                usePolling: true,
                interval: 1000,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100,
                },
            }),
        );
    });

    test('debe manejar errores en los callbacks', () => {
        const config: FileWatcherConfig = {
            paths: ['./src/**/*'],
        };

        const errorCallback = jest.fn();
        const failingCallback = jest.fn().mockImplementation(() => {
            throw new Error('Test error');
        });

        const watcher = watchFiles(config, {
            onAdd: failingCallback,
            onChange: failingCallback,
            onUnlink: failingCallback,
            onError: errorCallback,
        });

        // Simular eventos
        const mockOn = watcher.on as jest.Mock;
        const addCallback = mockOn.mock.calls.find(
            call => call[0] === 'add',
        )[1];
        const changeCallback = mockOn.mock.calls.find(
            call => call[0] === 'change',
        )[1];
        const unlinkCallback = mockOn.mock.calls.find(
            call => call[0] === 'unlink',
        )[1];

        // Ejecutar callbacks
        addCallback('test.ts');
        changeCallback('test.ts');
        unlinkCallback('test.ts');

        expect(failingCallback).toHaveBeenCalledTimes(3);
        expect(errorCallback).toHaveBeenCalledTimes(3);
    });
});
