/**
 * hmr.spec.ts — E2E tests para Hot Module Replacement de VersaCompiler
 *
 * Cubre:
 *  1. VersaModuleRegistry API (accept, notifyUpdate, hasObservers, getModule, getStats, clear)
 *  2. HRMHelper - JS/TS module HMR: propagate, self-accept, full-reload, fallback
 *  3. HRMVue - Vue component HMR: sin full-reload de página
 *  4. Múltiples observers, unsubscribe, actualizaciones paralelas
 *
 * Arquitectura del test:
 *  - La página e2e/hmr-test.html monta un mock socket (___browserSync___) de forma
 *    síncrona antes de que initHRM.js cargue, y espera hasta que el listener
 *    'HRMHelper' esté registrado antes de señalar data-hmr-ready="true".
 *  - window.location.reload() está interceptado → window.__reloadCount se incrementa
 *    en lugar de causar un reload real.
 *  - page.route() intercepta los import() dinámicos que el handler HRMHelper ejecuta,
 *    sirviendo módulos ES falsos con el contenido correcto.
 *  - window.__mockSocket.trigger(event, data) retorna una Promise que el handler
 *    awaita completamente, por lo que page.evaluate() espera el ciclo HMR completo.
 */

import { expect, test, type Page } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

const HMR_URL = '/e2e/hmr-test.html';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navega a la página HMR y espera que el entorno esté completamente inicializado */
async function waitForHMR(page: Page, timeout = 20_000) {
    await page.goto(HMR_URL);

    // Verificar si hay error de inicialización
    const hasError = await page
        .waitForSelector('body[data-hmr-error]', { timeout: 500 })
        .then(() => true)
        .catch(() => false);

    if (hasError) {
        const msg = await page.locator('body').getAttribute('data-hmr-error');
        throw new Error(`HMR test page failed to initialize: ${msg}`);
    }

    await page.waitForSelector('body[data-hmr-ready="true"]', { timeout });
}

/**
 * Limpia el registry y resetea el contador de reloads entre tests.
 * Permite que cada test parta de un estado conocido.
 */
async function resetPageState(page: Page) {
    await page.evaluate(() => {
        (window as unknown as Record<string, unknown>).__reloadCount = 0;
        (
            window as unknown as { __versaHMR?: { clear(): void } }
        ).__versaHMR?.clear();
    });
}

/** Sirve un módulo ES falso en el path dado (intercepta el import() dinámico) */
function serveFakeModule(
    page: Page,
    urlPattern: string,
    exportedBody: string,
): void {
    void page.route(urlPattern, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/javascript; charset=utf-8',
            body: exportedBody,
        }),
    );
}

/** Dispara un evento de socket y awaitea hasta que el handler async termina */
async function triggerSocket(
    page: Page,
    event: string,
    data: Record<string, unknown>,
): Promise<void> {
    await page.evaluate(
        ([ev, d]) =>
            (
                window as unknown as {
                    __mockSocket: {
                        trigger(e: string, d: unknown): Promise<void>;
                    };
                }
            ).__mockSocket.trigger(ev, d),
        [event, data] as [string, Record<string, unknown>],
    );
}

/** Lee window.__reloadCount (solo válido cuando reload está interceptado y NO ocurrió) */
async function getReloadCount(page: Page): Promise<number> {
    return page.evaluate(
        () =>
            (window as unknown as { __reloadCount: number }).__reloadCount ?? 0,
    );
}

/**
 * Verifica que una acción disparó una navegación/reload de página.
 * Chrome no permite sobrescribir window.location.reload() via defineProperty,
 * por lo que usamos page.waitForNavigation() para detectar recargas reales.
 *
 * @param page - Instancia de página de Playwright
 * @param action - Acción que debería disparar el reload (puede tirar "context destroyed")
 */
async function expectPageReload(
    page: Page,
    action: () => Promise<void>,
): Promise<void> {
    // Iniciar listener de navegación ANTES de disparar la acción
    const navPromise = page.waitForURL(
        url => url.href.includes('hmr-test.html'),
        {
            timeout: 6_000,
            waitUntil: 'commit',
        },
    );

    // Ejecutar la acción: puede tirar "Execution context was destroyed" si el
    // reload ocurre durante page.evaluate() — eso ES evidencia de reload.
    await action().catch(err => {
        if (
            err instanceof Error &&
            err.message.includes('context was destroyed')
        ) {
            // Expected: page reloaded during evaluate → ok
            return;
        }
        throw err;
    });

    // Esperar a que la navegación/reload complete (lanza si no ocurrió en 6s)
    await navPromise;
}

// ── Suite 1: VersaModuleRegistry API ─────────────────────────────────────────

test.describe('VersaModuleRegistry — API del registry', () => {
    test.beforeEach(async ({ page }) => {
        await waitForHMR(page);
        await resetPageState(page);
    });

    test('registry inicializado con estado vacío', async ({ page }) => {
        const stats = await page.evaluate(() =>
            (
                window as unknown as {
                    __versaHMR: {
                        getStats(): {
                            modules: number;
                            totalObservers: number;
                            failedModules: number;
                        };
                    };
                }
            ).__versaHMR.getStats(),
        );
        expect(stats.modules).toBe(0);
        expect(stats.totalObservers).toBe(0);
        expect(stats.failedModules).toBe(0);
    });

    test('accept() registra observer y hasObservers() lo refleja', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        hasObservers(id: string): boolean;
                        accept(id: string, cb: () => void): () => void;
                    };
                }
            ).__versaHMR;
            const before = reg.hasObservers('/test/mod.js');
            reg.accept('/test/mod.js', () => {});
            const after = reg.hasObservers('/test/mod.js');
            return { before, after };
        });
        expect(result.before).toBe(false);
        expect(result.after).toBe(true);
    });

    test('accept() retorna función de unsubscribe que elimina el observer', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        hasObservers(id: string): boolean;
                        accept(id: string, cb: () => void): () => void;
                    };
                }
            ).__versaHMR;
            const unsub = reg.accept('/test/unsub.js', () => {});
            const before = reg.hasObservers('/test/unsub.js');
            unsub();
            const after = reg.hasObservers('/test/unsub.js');
            return { before, after };
        });
        expect(result.before).toBe(true);
        expect(result.after).toBe(false);
    });

    test('notifyUpdate() llama al observer con el nuevo módulo', async ({
        page,
    }) => {
        const received = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                    };
                }
            ).__versaHMR;
            let received: unknown = null;
            reg.accept('/test/notify.js', mod => {
                received = mod;
            });
            reg.notifyUpdate('/test/notify.js', { value: 42, updated: true });
            return received;
        });
        expect(received).toEqual({ value: 42, updated: true });
    });

    test('notifyUpdate() retorna false cuando no hay observers', async ({
        page,
    }) => {
        const result = await page.evaluate(() =>
            (
                window as unknown as {
                    __versaHMR: {
                        notifyUpdate(id: string, mod: unknown): boolean;
                    };
                }
            ).__versaHMR.notifyUpdate('/test/no-observer.js', { v: 1 }),
        );
        expect(result).toBe(false);
    });

    test('notifyUpdate() retorna true cuando hay observers y todos ejecutan', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                    };
                }
            ).__versaHMR;
            reg.accept('/test/success.js', () => {});
            return reg.notifyUpdate('/test/success.js', { ok: true });
        });
        expect(result).toBe(true);
    });

    test('version del módulo incrementa en cada notifyUpdate()', async ({
        page,
    }) => {
        const version = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                        _registry: Map<string, { version: number }>;
                    };
                }
            ).__versaHMR;
            reg.accept('/test/versioned.js', () => {});
            reg.notifyUpdate('/test/versioned.js', { v: 1 });
            reg.notifyUpdate('/test/versioned.js', { v: 2 });
            reg.notifyUpdate('/test/versioned.js', { v: 3 });
            return reg._registry.get('/test/versioned.js')?.version;
        });
        expect(version).toBe(3);
    });

    test('getStats() retorna conteos correctos con múltiples módulos', async ({
        page,
    }) => {
        const stats = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        getStats(): {
                            modules: number;
                            totalObservers: number;
                        };
                    };
                }
            ).__versaHMR;
            reg.accept('/stats/a.js', () => {});
            reg.accept('/stats/a.js', () => {}); // 2 observers para el mismo módulo
            reg.accept('/stats/b.js', () => {}); // 1 observer para otro módulo
            return reg.getStats();
        });
        expect(stats.modules).toBe(2);
        expect(stats.totalObservers).toBe(3);
    });

    test('getModule() retorna null antes de update y el módulo después', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                        getModule(id: string): unknown;
                    };
                }
            ).__versaHMR;
            reg.accept('/test/getmod.js', () => {});
            const before = reg.getModule('/test/getmod.js');
            reg.notifyUpdate('/test/getmod.js', { fn: 'hello' });
            const after = reg.getModule('/test/getmod.js');
            return { before, after };
        });
        expect(result.before).toBeNull();
        expect(result.after).toEqual({ fn: 'hello' });
    });

    test('notifyUpdate() con URLs con query string normaliza correctamente', async ({
        page,
    }) => {
        const received = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                        hasObservers(id: string): boolean;
                    };
                }
            ).__versaHMR;
            let received: unknown = null;
            // Registrar sin query string
            reg.accept('/test/qstr.js', mod => {
                received = mod;
            });
            // Notificar con query string (como hace el servidor real)
            reg.notifyUpdate('/test/qstr.js?t=1234', { normalized: true });
            return received;
        });
        expect(received).toEqual({ normalized: true });
    });
});

// ── Suite 2: HRMHelper — JS/TS module HMR ────────────────────────────────────

test.describe('HRMHelper — Hot Module Replacement de módulos JS/TS', () => {
    test.beforeEach(async ({ page }) => {
        await waitForHMR(page);
        await resetPageState(page);
    });

    test('strategy=propagate con observer → callback llamado, sin page reload', async ({
        page,
    }) => {
        // Servir módulo actualizado falso
        serveFakeModule(
            page,
            '**/hmr-prop-mod.js*',
            'export default { value: 99, source: "hmr-updated" };',
        );

        // Registrar observer antes de disparar el evento
        await page.evaluate(() => {
            (window as unknown as Record<string, unknown>).__hmrReceived = null;
            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-prop-mod.js', mod => {
                (window as unknown as Record<string, unknown>).__hmrReceived =
                    mod;
            });
        });

        // Disparar HRMHelper con estrategia 'propagate'
        await triggerSocket(page, 'HRMHelper', {
            strategy: 'propagate',
            filePath: '/hmr-prop-mod.js',
            moduleId: '/hmr-prop-mod.js',
        });

        const [received, reloads] = await Promise.all([
            page.evaluate(
                () =>
                    (window as unknown as Record<string, unknown>)
                        .__hmrReceived,
            ),
            getReloadCount(page),
        ]);

        // El callback debe haber recibido el módulo actualizado
        expect(received).toEqual({ value: 99, source: 'hmr-updated' });
        // NO debe haber ocurrido un page reload
        expect(reloads).toBe(0);
        // El sentinel de reload sigue presente
        await expect(page.locator('#reload-sentinel')).toHaveAttribute(
            'data-alive',
            'true',
        );
    });

    test('strategy=propagate sin observer → no hay page reload (re-import ESM)', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-no-obs.js*',
            'export const x = "no-observer";',
        );

        // Sin registrar observer para este módulo
        await triggerSocket(page, 'HRMHelper', {
            strategy: 'propagate',
            filePath: '/hmr-no-obs.js',
            moduleId: '/hmr-no-obs.js',
        });

        const reloads = await getReloadCount(page);
        expect(reloads).toBe(0);
    });

    test('strategy=self-accept → módulo re-importado sin page reload', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-self-acc.js*',
            'export const version = "v2-self-accept";',
        );

        await triggerSocket(page, 'HRMHelper', {
            strategy: 'self-accept',
            filePath: '/hmr-self-acc.js',
            moduleId: '/hmr-self-acc.js',
        });

        const reloads = await getReloadCount(page);
        expect(reloads).toBe(0);
        await expect(page.locator('#reload-sentinel')).toHaveAttribute(
            'data-alive',
            'true',
        );
    });

    test('strategy=self-accept con observer → observer notificado sin reload', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-self-obs.js*',
            'export default { selfAccepted: true, ts: 42 };',
        );

        await page.evaluate(() => {
            (window as unknown as Record<string, unknown>).__selfAcceptMod =
                null;
            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-self-obs.js', mod => {
                (window as unknown as Record<string, unknown>).__selfAcceptMod =
                    mod;
            });
        });

        await triggerSocket(page, 'HRMHelper', {
            strategy: 'self-accept',
            filePath: '/hmr-self-obs.js',
            moduleId: '/hmr-self-obs.js',
        });

        const [received, reloads] = await Promise.all([
            page.evaluate(
                () =>
                    (window as unknown as Record<string, unknown>)
                        .__selfAcceptMod,
            ),
            getReloadCount(page),
        ]);
        expect(received).toEqual({ selfAccepted: true, ts: 42 });
        expect(reloads).toBe(0);
    });

    test('strategy=full-reload → page reload disparado', async ({ page }) => {
        await expectPageReload(page, () =>
            triggerSocket(page, 'HRMHelper', {
                strategy: 'full-reload',
                filePath: '/hmr-force-reload.js',
                moduleId: '/hmr-force-reload.js',
            }),
        );
        // Si llegamos aquí la navegación ocurrió → reload confirmado
    });

    test('strategy=propagate con import fallido → fallback a page reload', async ({
        page,
    }) => {
        // La ruta devuelve 500 → import() lanzará TypeError
        void page.route('**/hmr-fail.js*', route =>
            route.fulfill({
                status: 500,
                contentType: 'text/plain',
                body: 'Internal Server Error',
            }),
        );

        // Registrar observer para asegurar que intentamos el camino HMR primero
        await page.evaluate(() => {
            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-fail.js', () => {});
        });

        // El catch block del handler llama window.location.reload() como fallback
        await expectPageReload(page, () =>
            triggerSocket(page, 'HRMHelper', {
                strategy: 'propagate',
                filePath: '/hmr-fail.js',
                moduleId: '/hmr-fail.js',
            }),
        );
    });

    test('reloadFull event → siempre dispara page reload', async ({ page }) => {
        await expectPageReload(page, () =>
            triggerSocket(page, 'reloadFull', {}),
        );
        // Si llegamos aquí la navegación ocurrió → reload confirmado
    });

    test('HRMHelper recibe módulo con export default y lo propaga correctamente', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-default-exp.js*',
            // Módulo con export default (clase/función)
            'export default function greet(name) { return `Hello, ${name}!`; }',
        );

        await page.evaluate(() => {
            (window as unknown as Record<string, unknown>).__greetFn = null;
            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-default-exp.js', mod => {
                (window as unknown as Record<string, unknown>).__greetFn = mod;
            });
        });

        await triggerSocket(page, 'HRMHelper', {
            strategy: 'propagate',
            filePath: '/hmr-default-exp.js',
            moduleId: '/hmr-default-exp.js',
        });

        const [greetFnType, reloads] = await Promise.all([
            page.evaluate(
                () =>
                    typeof (window as unknown as Record<string, unknown>)
                        .__greetFn,
            ),
            getReloadCount(page),
        ]);
        // export default function → el observer recibe la función directamente
        expect(greetFnType).toBe('function');
        expect(reloads).toBe(0);
    });

    test('HRMHelper recibe módulo con named exports y los propaga como namespace', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-named-exp.js*',
            'export const add = (a, b) => a + b;\nexport const PI = 3.14;',
        );

        await page.evaluate(() => {
            (window as unknown as Record<string, unknown>).__namedMod = null;
            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-named-exp.js', mod => {
                // Cuando no hay default export, mod es el namespace object
                (window as unknown as Record<string, unknown>).__namedMod = mod;
            });
        });

        await triggerSocket(page, 'HRMHelper', {
            strategy: 'propagate',
            filePath: '/hmr-named-exp.js',
            moduleId: '/hmr-named-exp.js',
        });

        const [modType, reloads] = await Promise.all([
            page.evaluate(
                () =>
                    typeof (window as unknown as Record<string, unknown>)
                        .__namedMod,
            ),
            getReloadCount(page),
        ]);
        // Sin default export → mod es el Module namespace object
        expect(modType).toBe('object');
        expect(reloads).toBe(0);
    });
});

// ── Suite 3: HRMVue — Vue component HMR ──────────────────────────────────────

test.describe('HRMVue — Hot Module Replacement de componentes Vue', () => {
    test.beforeEach(async ({ page }) => {
        await waitForHMR(page);
        await resetPageState(page);
    });

    test('HRMVue event no dispara page reload (HMR de Vue es sin reload)', async ({
        page,
    }) => {
        // El componente de prueba no existe en la app → HRM no hará nada,
        // pero tampoco debe hacer un page reload.
        await triggerSocket(page, 'HRMVue', {
            normalizedPath: '/test/FakeComponent.js',
            nameFile: 'FakeComponent',
        });

        // Dar tiempo a que cualquier código async termine
        await page.waitForTimeout(800);

        const reloads = await getReloadCount(page);
        expect(reloads).toBe(0);
    });

    test('el sentinel de reload persiste tras HRMVue (confirma sin page reload)', async ({
        page,
    }) => {
        await triggerSocket(page, 'HRMVue', {
            normalizedPath: '/test/AnotherComponent.js',
            nameFile: 'AnotherComponent',
        });

        await page.waitForTimeout(800);
        await expect(page.locator('#reload-sentinel')).toHaveAttribute(
            'data-alive',
            'true',
        );
    });

    test('múltiples eventos HRMVue consecutivos sin acumular reloads', async ({
        page,
    }) => {
        for (let i = 0; i < 3; i++) {
            await triggerSocket(page, 'HRMVue', {
                normalizedPath: `/test/Comp${i}.js`,
                nameFile: `Comp${i}`,
            });
        }

        await page.waitForTimeout(1000);
        const reloads = await getReloadCount(page);
        expect(reloads).toBe(0);
    });
});

// ── Suite 4: Múltiples observers y comportamiento avanzado ───────────────────

test.describe('VersaHMR — Múltiples observers y escenarios avanzados', () => {
    test.beforeEach(async ({ page }) => {
        await waitForHMR(page);
        await resetPageState(page);
    });

    test('múltiples observers del mismo módulo reciben la actualización', async ({
        page,
    }) => {
        const received = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                    };
                }
            ).__versaHMR;
            const received: number[] = [];
            reg.accept('/multi-obs.js', () => received.push(1));
            reg.accept('/multi-obs.js', () => received.push(2));
            reg.accept('/multi-obs.js', () => received.push(3));
            reg.notifyUpdate('/multi-obs.js', { ok: true });
            return received;
        });
        expect(received).toEqual([1, 2, 3]);
    });

    test('unsubscribe un observer no afecta a los demás', async ({ page }) => {
        const received = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                    };
                }
            ).__versaHMR;
            const received: number[] = [];
            const unsub = reg.accept('/multi-unsub.js', () => received.push(1));
            reg.accept('/multi-unsub.js', () => received.push(2));
            reg.accept('/multi-unsub.js', () => received.push(3));
            unsub(); // Eliminar el primero
            reg.notifyUpdate('/multi-unsub.js', {});
            return received;
        });
        // Solo los observers 2 y 3 deben ejecutarse
        expect(received).toEqual([2, 3]);
    });

    test('clear() elimina todos los observers y módulos', async ({ page }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                        getStats(): { modules: number; totalObservers: number };
                        clear(): void;
                    };
                }
            ).__versaHMR;
            reg.accept('/clear-a.js', () => {});
            reg.accept('/clear-b.js', () => {});
            reg.accept('/clear-c.js', () => {});
            const before = reg.getStats();
            reg.clear();
            const after = reg.getStats();
            return { before, after };
        });
        expect(result.before.modules).toBe(3);
        expect(result.before.totalObservers).toBe(3);
        expect(result.after.modules).toBe(0);
        expect(result.after.totalObservers).toBe(0);
    });

    test('actualizaciones paralelas a distintos módulos son independientes y sin reload', async ({
        page,
    }) => {
        // Servir dos módulos distintos
        serveFakeModule(
            page,
            '**/para-mod-a.js*',
            'export default { module: "A", version: 2 };',
        );
        serveFakeModule(
            page,
            '**/para-mod-b.js*',
            'export default { module: "B", version: 2 };',
        );

        // Registrar observers para ambos módulos
        await page.evaluate(() => {
            (window as unknown as Record<string, unknown>).__paraA = null;
            (window as unknown as Record<string, unknown>).__paraB = null;
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR;
            reg.accept('/para-mod-a.js', m => {
                (window as unknown as Record<string, unknown>).__paraA = m;
            });
            reg.accept('/para-mod-b.js', m => {
                (window as unknown as Record<string, unknown>).__paraB = m;
            });
        });

        // Disparar los dos eventos HRM secuencialmente (el handler es async)
        await triggerSocket(page, 'HRMHelper', {
            strategy: 'propagate',
            filePath: '/para-mod-a.js',
            moduleId: '/para-mod-a.js',
        });
        await triggerSocket(page, 'HRMHelper', {
            strategy: 'propagate',
            filePath: '/para-mod-b.js',
            moduleId: '/para-mod-b.js',
        });

        const [modA, modB, reloads] = await Promise.all([
            page.evaluate(
                () => (window as unknown as Record<string, unknown>).__paraA,
            ),
            page.evaluate(
                () => (window as unknown as Record<string, unknown>).__paraB,
            ),
            getReloadCount(page),
        ]);

        expect(modA).toMatchObject({ module: 'A', version: 2 });
        expect(modB).toMatchObject({ module: 'B', version: 2 });
        expect(reloads).toBe(0);
    });

    test('actualizar mismo módulo N veces incrementa versión y llama observer N veces', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-repeat.js*',
            'export default { repeated: true };',
        );

        await page.evaluate(() => {
            (window as unknown as Record<string, unknown>).__repeatCount = 0;
            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: unknown) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-repeat.js', () => {
                (window as unknown as Record<string, unknown>).__repeatCount =
                    ((window as unknown as Record<string, unknown>)
                        .__repeatCount as number) + 1;
            });
        });

        // Disparar 3 veces
        for (let i = 0; i < 3; i++) {
            await triggerSocket(page, 'HRMHelper', {
                strategy: 'propagate',
                filePath: '/hmr-repeat.js',
                moduleId: '/hmr-repeat.js',
            });
        }

        const [callCount, reloads] = await Promise.all([
            page.evaluate(
                () =>
                    (window as unknown as Record<string, unknown>)
                        .__repeatCount as number,
            ),
            getReloadCount(page),
        ]);
        expect(callCount).toBe(3);
        expect(reloads).toBe(0);
    });

    test('observer puede actualizar referencias locales (patrón típico de uso)', async ({
        page,
    }) => {
        serveFakeModule(
            page,
            '**/hmr-lib-update.js*',
            'export default { multiply: (a, b) => a * b };',
        );

        // Simular un consumidor que actualiza su referencia local
        const result = await page.evaluate(async () => {
            type MathLib = { multiply: (a: number, b: number) => number };
            let mathLib: MathLib = {
                multiply: (a: number, b: number) => a + b,
            }; // versión antigua (suma)

            (
                window as unknown as {
                    __versaHMR: {
                        accept(
                            id: string,
                            cb: (mod: MathLib) => void,
                        ): () => void;
                    };
                }
            ).__versaHMR.accept('/hmr-lib-update.js', newLib => {
                mathLib = newLib; // Actualizar referencia local
            });

            // Uso ANTES de HMR: suma
            const before = mathLib.multiply(3, 4); // 3+4=7

            // Disparar HMR (actualizará mathLib a multiplicación)
            await (
                window as unknown as {
                    __mockSocket: {
                        trigger(e: string, d: unknown): Promise<void>;
                    };
                }
            ).__mockSocket.trigger('HRMHelper', {
                strategy: 'propagate',
                filePath: '/hmr-lib-update.js',
                moduleId: '/hmr-lib-update.js',
            });

            // Uso DESPUÉS de HMR: multiplicación
            const after = mathLib.multiply(3, 4); // 3*4=12

            return { before, after };
        });

        expect(result.before).toBe(7); // suma (versión vieja)
        expect(result.after).toBe(12); // multiplicación (versión nueva post-HMR)
    });
});

// ── Suite 5: Integridad del entorno HMR ──────────────────────────────────────

test.describe('Integridad del entorno HMR', () => {
    test('la página carga sin errores de inicialización', async ({ page }) => {
        await waitForHMR(page);
        // No debe haber atributo data-hmr-error
        const errorAttr = await page
            .locator('body')
            .getAttribute('data-hmr-error');
        expect(errorAttr).toBeNull();
        // El overlay de error HMR no debe estar visible
        await expect(
            page.locator('#versa-hmr-error-overlay'),
        ).not.toBeVisible();
    });

    test('window.__versaHMR está disponible y es instancia de VersaModuleRegistry', async ({
        page,
    }) => {
        await waitForHMR(page);
        const result = await page.evaluate(() => {
            const reg = (window as unknown as { __versaHMR: unknown })
                .__versaHMR;
            return {
                exists: reg != null,
                hasAccept:
                    typeof (reg as { accept?: unknown })?.accept === 'function',
                hasNotify:
                    typeof (reg as { notifyUpdate?: unknown })?.notifyUpdate ===
                    'function',
                hasStats:
                    typeof (reg as { getStats?: unknown })?.getStats ===
                    'function',
            };
        });
        expect(result.exists).toBe(true);
        expect(result.hasAccept).toBe(true);
        expect(result.hasNotify).toBe(true);
        expect(result.hasStats).toBe(true);
    });

    test('el mock socket tiene los listeners clave registrados', async ({
        page,
    }) => {
        await waitForHMR(page);
        const listeners = await page.evaluate(() => {
            const s = (
                window as unknown as {
                    __mockSocket: { _listeners: Record<string, unknown[]> };
                }
            ).__mockSocket;
            return Object.keys(s._listeners);
        });
        // initHRM.js debe registrar al menos estos listeners
        expect(listeners).toContain('HRMHelper');
        expect(listeners).toContain('HRMVue');
        expect(listeners).toContain('reloadFull');
    });

    test('el sentinel de reload no es afectado por la inicialización normal', async ({
        page,
    }) => {
        await waitForHMR(page);
        await expect(page.locator('#reload-sentinel')).toHaveAttribute(
            'data-alive',
            'true',
        );
        const reloads = await getReloadCount(page);
        expect(reloads).toBe(0);
    });

    test('la app Vue está montada correctamente en #app', async ({ page }) => {
        await waitForHMR(page);
        // El componente de prueba debe estar en el DOM
        await expect(page.locator('#vue-counter-root')).toBeVisible();
        await expect(page.locator('#count-display')).toContainText('Count: 0');
    });
});

// ── Suite 6: import.meta.hot compatible API (_onDispose, _getHotData, _invalidate) ──

test.describe('VersaHMR — import.meta.hot compatible API', () => {
    test.beforeEach(async ({ page }) => {
        await waitForHMR(page);
        await resetPageState(page);
    });

    test('_getHotData() retorna objeto vacío por primera vez', async ({
        page,
    }) => {
        const data = await page.evaluate(() =>
            (
                window as unknown as {
                    __versaHMR: {
                        _getHotData(id: string): Record<string, unknown>;
                    };
                }
            ).__versaHMR._getHotData('/test/hotdata.js'),
        );
        expect(data).toEqual({});
    });

    test('_getHotData() retorna el mismo objeto entre llamadas (persistencia)', async ({
        page,
    }) => {
        const sameRef = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _getHotData(id: string): Record<string, unknown>;
                    };
                }
            ).__versaHMR;
            const d1 = reg._getHotData('/test/persistent.js');
            d1.counter = 42;
            const d2 = reg._getHotData('/test/persistent.js');
            return d2.counter;
        });
        expect(sameRef).toBe(42);
    });

    test('_getHotData() aísla datos entre módulos distintos', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _getHotData(id: string): Record<string, unknown>;
                    };
                }
            ).__versaHMR;
            const dA = reg._getHotData('/mod-a.js');
            const dB = reg._getHotData('/mod-b.js');
            dA.value = 'A';
            dB.value = 'B';
            return {
                a: reg._getHotData('/mod-a.js').value,
                b: reg._getHotData('/mod-b.js').value,
            };
        });
        expect(result.a).toBe('A');
        expect(result.b).toBe('B');
    });

    test('_onDispose() registra callback que se ejecuta en _runDispose()', async ({
        page,
    }) => {
        const called = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _onDispose(
                            id: string,
                            cb: (data: unknown) => void,
                        ): void;
                        _runDispose(id: string): void;
                    };
                }
            ).__versaHMR;
            let called = false;
            reg._onDispose('/test/dispose.js', () => {
                called = true;
            });
            reg._runDispose('/test/dispose.js');
            return called;
        });
        expect(called).toBe(true);
    });

    test('dispose callback recibe objeto de hotData como argumento', async ({
        page,
    }) => {
        const receivedData = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _onDispose(
                            id: string,
                            cb: (data: Record<string, unknown>) => void,
                        ): void;
                        _runDispose(id: string): void;
                        _getHotData(id: string): Record<string, unknown>;
                    };
                }
            ).__versaHMR;
            reg._getHotData('/test/disposedata.js').state = 'active';
            let receivedData: unknown = null;
            reg._onDispose('/test/disposedata.js', data => {
                receivedData = data;
            });
            reg._runDispose('/test/disposedata.js');
            return receivedData;
        });
        expect(receivedData).toMatchObject({ state: 'active' });
    });

    test('_runDispose() llama todos los callbacks registrados con _onDispose()', async ({
        page,
    }) => {
        const calls = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _onDispose(id: string, cb: () => void): void;
                        _runDispose(id: string): void;
                    };
                }
            ).__versaHMR;
            const calls: number[] = [];
            reg._onDispose('/test/multi-dispose.js', () => calls.push(1));
            reg._onDispose('/test/multi-dispose.js', () => calls.push(2));
            reg._onDispose('/test/multi-dispose.js', () => calls.push(3));
            reg._runDispose('/test/multi-dispose.js');
            return calls;
        });
        expect(calls).toEqual([1, 2, 3]);
    });

    test('_runDispose() limpia callbacks tras ejecutarlos (no re-ejecuta)', async ({
        page,
    }) => {
        const calls = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _onDispose(id: string, cb: () => void): void;
                        _runDispose(id: string): void;
                    };
                }
            ).__versaHMR;
            let callCount = 0;
            reg._onDispose('/test/dispose-once.js', () => callCount++);
            reg._runDispose('/test/dispose-once.js');
            reg._runDispose('/test/dispose-once.js'); // segunda ejecución → no debe llamar de nuevo
            return callCount;
        });
        expect(calls).toBe(1);
    });

    test('notifyUpdate() ejecuta dispose callbacks antes de notificar observers', async ({
        page,
    }) => {
        const order = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        accept(id: string, cb: () => void): () => void;
                        _onDispose(id: string, cb: () => void): void;
                        notifyUpdate(id: string, mod: unknown): boolean;
                    };
                }
            ).__versaHMR;
            const order: string[] = [];
            reg._onDispose('/test/order.js', () => order.push('dispose'));
            reg.accept('/test/order.js', () => order.push('observer'));
            reg.notifyUpdate('/test/order.js', {});
            return order;
        });
        // dispose debe ejecutarse ANTES que el observer
        expect(order).toEqual(['dispose', 'observer']);
    });

    test('_invalidate() dispara page reload', async ({ page }) => {
        await expectPageReload(page, () =>
            page.evaluate(() =>
                (
                    window as unknown as {
                        __versaHMR: { _invalidate(id: string): void };
                    }
                ).__versaHMR._invalidate('/test/invalidate.js'),
            ),
        );
    });

    test('clear() también limpia datos de dispose y hotData', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            const reg = (
                window as unknown as {
                    __versaHMR: {
                        _onDispose(id: string, cb: () => void): void;
                        _getHotData(id: string): Record<string, unknown>;
                        clear(): void;
                        _disposeCallbacks: Map<string, unknown>;
                        _hotData: Map<string, unknown>;
                    };
                }
            ).__versaHMR;
            reg._getHotData('/clear-test.js').x = 1;
            reg._onDispose('/clear-test.js', () => {});
            const before = {
                hotData: reg._hotData.size,
                disposeCallbacks: reg._disposeCallbacks.size,
            };
            reg.clear();
            const after = {
                hotData: reg._hotData.size,
                disposeCallbacks: reg._disposeCallbacks.size,
            };
            return { before, after };
        });
        expect(result.before.hotData).toBeGreaterThan(0);
        expect(result.before.disposeCallbacks).toBeGreaterThan(0);
        expect(result.after.hotData).toBe(0);
        expect(result.after.disposeCallbacks).toBe(0);
    });
});
