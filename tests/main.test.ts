import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// main.ts es un entrypoint auto-ejecutable: al importarlo corre main()
// inmediatamente usando process.argv real. Para testear su manejo de un
// argumento inválido, simulamos argv antes de importar, con
// NODE_ENV='test' para que exitProcess() lance en vez de matar el proceso
// del test runner (mismo patrón que file-watcher.ts).
describe('main.ts - CLI', () => {
    const originalArgv = process.argv;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.resetModules();
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        process.argv = originalArgv;
        process.env.NODE_ENV = originalNodeEnv;
        vi.restoreAllMocks();
    });

    it('--file con una ruta que no existe termina con exit code 1 y un mensaje claro', async () => {
        process.argv = [
            'node',
            'main.js',
            '--file',
            '/definitely/does/not/exist/Component.vue',
        ];

        // logger.error() escribe directo a process.stderr, no a console.error
        const stderrSpy = vi
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

        // main() corre en el top-level del módulo; su rechazo termina en
        // main().catch(...), que a su vez llama exitProcess(1) — en modo
        // test eso lanza, y como nada más encadena esa promesa se ve como
        // un unhandledRejection del proceso. Lo capturamos para poder
        // aserirlo en vez de dejar que rompa el test runner.
        const unhandled = new Promise<Error>(resolve => {
            process.once('unhandledRejection', reason => {
                resolve(reason as Error);
            });
        });

        await import('../src/main');

        const reason = await unhandled;
        expect(reason.message).toBe('__PROCESS_EXIT_1__');

        const loggedOutput = stderrSpy.mock.calls.flat().join('\n');
        expect(loggedOutput).toContain(
            "El archivo '/definitely/does/not/exist/Component.vue' no existe",
        );
    });
});
