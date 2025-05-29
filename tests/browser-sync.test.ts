import { jest } from '@jest/globals';
import {
    BrowserSyncConfig,
    startBrowserSync,
} from '../src/js/servicios/browserSync';

jest.mock('browser-sync', () => ({
    create: jest.fn().mockReturnValue({
        init: jest.fn(),
        reload: jest.fn(),
        watch: jest.fn(),
    }),
}));

describe('BrowserSync Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('debe inicializar BrowserSync con configuración básica', async () => {
        const config: BrowserSyncConfig = {
            proxy: 'localhost:3000',
            files: ['./public/**/*'],
            open: false,
            notify: false,
        };

        const instance = await startBrowserSync(config);

        expect(instance).toBeDefined();
        expect(instance.init).toHaveBeenCalledWith(
            expect.objectContaining({
                proxy: 'localhost:3000',
                files: ['./public/**/*'],
                open: false,
                notify: false,
            }),
        );
    });

    test('debe manejar configuración de puerto personalizado', async () => {
        const config: BrowserSyncConfig = {
            port: 4000,
            files: ['./public/**/*'],
            open: true,
        };

        const instance = await startBrowserSync(config);

        expect(instance.init).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 4000,
                files: ['./public/**/*'],
                open: true,
            }),
        );
    });

    test('debe manejar configuración de archivos a observar', async () => {
        const config: BrowserSyncConfig = {
            files: [
                './public/**/*.js',
                './public/**/*.css',
                './public/**/*.html',
            ],
            watchOptions: {
                ignoreInitial: true,
                ignored: ['**/node_modules/**'],
            },
        };

        const instance = await startBrowserSync(config);

        expect(instance.init).toHaveBeenCalledWith(
            expect.objectContaining({
                files: expect.arrayContaining([
                    './public/**/*.js',
                    './public/**/*.css',
                    './public/**/*.html',
                ]),
                watchOptions: expect.objectContaining({
                    ignoreInitial: true,
                    ignored: ['**/node_modules/**'],
                }),
            }),
        );
    });

    test('debe manejar configuración de middleware', async () => {
        const mockMiddleware = jest.fn((req, res, next) => next());

        const config: BrowserSyncConfig = {
            middleware: [mockMiddleware],
            files: ['./public/**/*'],
        };

        const instance = await startBrowserSync(config);

        expect(instance.init).toHaveBeenCalledWith(
            expect.objectContaining({
                middleware: expect.arrayContaining([mockMiddleware]),
            }),
        );
    });
});
