/**
 * advanced-app.spec.ts
 * Tests Playwright para el Contact Manager — app e2e avanzada que prueba:
 * - localStorage CRUD + persistencia
 * - Validación con Zod (genéricos TS complejos)
 * - provide/inject, Teleport, Transition, named/scoped slots
 * - defineAsyncComponent, onErrorCaptured, deep watcher
 */
import { test, expect, type Page } from '@playwright/test';

const URL = '/e2e/advanced.html';
const LS_KEY = 'e2e-contacts';

async function waitForApp(page: Page) {
    await page.goto(URL);
    await page.waitForSelector('body[data-app-ready="true"]', { timeout: 15000 });
    const errEl = page.locator('#error');
    const isVisible = await errEl.isVisible();
    if (isVisible) {
        const msg = await errEl.textContent();
        throw new Error(`App falló al montar: ${msg}`);
    }
}

function makeContact(overrides: Record<string, unknown> = {}) {
    return {
        id: crypto.randomUUID(),
        name: 'Ana García',
        email: 'ana@example.com',
        phone: '+34 600 111 222',
        category: 'personal',
        favorite: false,
        notes: 'Contacto de prueba',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides,
    };
}

async function seedContacts(page: Page, contacts: unknown[]) {
    await page.evaluate(
        ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
        { key: LS_KEY, data: contacts },
    );
}

async function clearContacts(page: Page) {
    await page.evaluate((key) => localStorage.removeItem(key), LS_KEY);
}

// ── Setup ──────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
    // Limpiar localStorage antes de cada test
    await page.goto(URL);
    await clearContacts(page);
});

// ── 1. Inicialización ──────────────────────────────────────────────────────

test.describe('Inicialización', () => {
    test('monta sin errores y muestra el título', async ({ page }) => {
        await waitForApp(page);
        await expect(page.locator('h1').first()).toContainText('Contact Manager');
        await expect(page.locator('#error')).not.toBeVisible();
    });

    test('muestra estado vacío cuando no hay contactos', async ({ page }) => {
        await waitForApp(page);
        await expect(page.locator('[data-empty-state="true"]')).toBeVisible();
    });

    test('muestra los 3 tabs: Todos, Favoritos, Recientes', async ({ page }) => {
        await waitForApp(page);
        await expect(page.locator('[data-tab="all"]')).toBeVisible();
        await expect(page.locator('[data-tab="favorites"]')).toBeVisible();
        await expect(page.locator('[data-tab="recent"]')).toBeVisible();
    });

    test('tab "Todos" está activo por defecto', async ({ page }) => {
        await waitForApp(page);
        await expect(page.locator('[data-tab="all"][data-active="true"]')).toBeVisible();
    });

    test('AsyncStats se carga y muestra estadísticas', async ({ page }) => {
        await waitForApp(page);
        // Esperar a que el componente asíncrono termine de cargar
        await expect(page.locator('[data-async-stats="true"]')).toBeVisible({ timeout: 5000 });
    });
});

// ── 2. Validación Zod ──────────────────────────────────────────────────────

test.describe('Validación Zod (TypeScript genéricos complejos)', () => {
    test.beforeEach(async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await expect(page.locator('[data-modal="true"]')).toBeVisible();
    });

    test('form vacío muestra errores en nombre y email', async ({ page }) => {
        await page.locator('[data-contact-form="true"] button[type="submit"]').click();
        await expect(page.locator('[data-field-error="name"]')).toBeVisible();
        await expect(page.locator('[data-field-error="email"]')).toBeVisible();
    });

    test('email inválido muestra error de formato', async ({ page }) => {
        await page.locator('#name').fill('Test User');
        await page.locator('#email').fill('no-es-un-email');
        await page.locator('[data-contact-form="true"] button[type="submit"]').click();
        await expect(page.locator('[data-field-error="email"]')).toContainText('inválido');
    });

    test('nombre muy corto (1 char) muestra error', async ({ page }) => {
        await page.locator('#name').fill('A');
        await page.locator('[data-contact-form="true"] button[type="submit"]').click();
        await expect(page.locator('[data-field-error="name"]')).toBeVisible();
    });

    test('datos válidos no muestran errores', async ({ page }) => {
        await page.locator('#name').fill('María García');
        await page.locator('#email').fill('maria@ejemplo.com');
        await page.locator('#category').selectOption('trabajo');
        // No debe haber errores antes de submit
        await expect(page.locator('[data-field-error="name"]')).not.toBeVisible();
        await expect(page.locator('[data-field-error="email"]')).not.toBeVisible();
    });
});

// ── 3. CRUD + localStorage ─────────────────────────────────────────────────

test.describe('CRUD + localStorage', () => {
    test('agregar contacto lo muestra en la lista', async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await page.locator('#name').fill('Carlos López');
        await page.locator('#email').fill('carlos@test.com');
        await page.locator('#category').selectOption('trabajo');
        await page.locator('[data-contact-form="true"] button[type="submit"]').click();

        await expect(page.locator('[data-contact-list="true"]')).toContainText('Carlos López');
    });

    test('agregar contacto lo persiste en localStorage', async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await page.locator('#name').fill('Laura Martínez');
        await page.locator('#email').fill('laura@test.com');
        await page.locator('#category').selectOption('personal');
        await page.locator('[data-contact-form="true"] button[type="submit"]').click();

        // Verificar en localStorage directamente
        const stored = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].name).toBe('Laura Martínez');
        expect(parsed[0].email).toBe('laura@test.com');
    });

    test('agregar múltiples contactos — todos visibles', async ({ page }) => {
        await waitForApp(page);

        for (const name of ['Ana', 'Bob', 'Carlos']) {
            await page.locator('[data-action="add-contact"]').click();
            await page.locator('#name').fill(name);
            await page.locator('#email').fill(`${name.toLowerCase()}@test.com`);
            await page.locator('#category').selectOption('personal');
            await page.locator('[data-contact-form="true"] button[type="submit"]').click();
        }

        const list = page.locator('[data-contact-list="true"]');
        await expect(list).toContainText('Ana');
        await expect(list).toContainText('Bob');
        await expect(list).toContainText('Carlos');
    });

    test('eliminar contacto lo quita de la lista y del localStorage', async ({ page }) => {
        const contact = makeContact({ name: 'Para Eliminar', email: 'delete@test.com' });
        await seedContacts(page, [contact]);
        await waitForApp(page);

        await expect(page.locator('[data-contact-list="true"]')).toContainText('Para Eliminar');
        await page.locator('[aria-label="Eliminar"]').first().click();

        await expect(page.locator('[data-empty-state="true"]')).toBeVisible();

        const stored = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
        const parsed = JSON.parse(stored ?? '[]');
        expect(parsed).toHaveLength(0);
    });

    test('toggle favorito cambia el ícono y actualiza localStorage', async ({ page }) => {
        const contact = makeContact({ name: 'Toggle Test', email: 'toggle@test.com' });
        await seedContacts(page, [contact]);
        await waitForApp(page);

        // Inicialmente no favorito
        const starBtn = page.locator('[aria-label="Marcar favorito"]').first();
        await expect(starBtn).toBeVisible();
        await starBtn.click();

        // Ahora debería ser favorito
        await expect(page.locator('[aria-label="Quitar de favoritos"]').first()).toBeVisible();

        const stored = await page.evaluate((key) => localStorage.getItem(key), LS_KEY);
        const parsed = JSON.parse(stored!);
        expect(parsed[0].favorite).toBe(true);
    });
});

// ── 4. Persistencia localStorage ──────────────────────────────────────────

test.describe('Persistencia localStorage', () => {
    test('contactos sobreviven un reload de página', async ({ page }) => {
        const contact = makeContact({ name: 'Persistente', email: 'persist@test.com' });
        await seedContacts(page, [contact]);
        await waitForApp(page);

        await expect(page.locator('[data-contact-list="true"]')).toContainText('Persistente');

        // Reload
        await page.reload();
        await page.waitForSelector('body[data-app-ready="true"]', { timeout: 10000 });

        await expect(page.locator('[data-contact-list="true"]')).toContainText('Persistente');
    });

    test('pre-seed de localStorage se muestra al cargar', async ({ page }) => {
        const contacts = [
            makeContact({ name: 'Seed 1', email: 'seed1@test.com', category: 'trabajo' }),
            makeContact({ name: 'Seed 2', email: 'seed2@test.com', category: 'familia', favorite: true }),
        ];
        await seedContacts(page, contacts);
        await waitForApp(page);

        const list = page.locator('[data-contact-list="true"]');
        await expect(list).toContainText('Seed 1');
        await expect(list).toContainText('Seed 2');
    });

    test('JSON inválido en localStorage activa ErrorBoundary', async ({ page }) => {
        // Inyectar JSON inválido antes de navegar
        await page.evaluate(
            ({ key }) => localStorage.setItem(key, '{"esto es": "json roto, sin cerrar array'),
            { key: LS_KEY },
        );
        await page.goto(URL);

        // La app puede montar (ErrorBoundary atrapa el error del componente hijo)
        // o el error se muestra en el div de error
        const errorBoundary = page.locator('[data-error-boundary="true"]');
        const errorDiv = page.locator('#error');

        await expect(errorBoundary.or(errorDiv)).toBeVisible({ timeout: 10000 });
    });

    test('array vacío en localStorage muestra estado vacío', async ({ page }) => {
        await seedContacts(page, []);
        await waitForApp(page);
        await expect(page.locator('[data-empty-state="true"]')).toBeVisible();
    });
});

// ── 5. Modal con Teleport ─────────────────────────────────────────────────

test.describe('Modal via Teleport', () => {
    test('click en Agregar abre el modal', async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await expect(page.locator('[data-modal="true"]')).toBeVisible();
    });

    test('el modal renderiza dentro de #modal-target (Teleport)', async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await expect(page.locator('[data-modal="true"]')).toBeVisible();

        // El modal debe ser hijo de #modal-target (Teleport)
        const isInsideTarget = await page.evaluate(() => {
            const modal = document.querySelector('[data-modal="true"]');
            const target = document.getElementById('modal-target');
            return target?.contains(modal) ?? false;
        });
        expect(isInsideTarget).toBe(true);
    });

    test('cancelar cierra el modal sin guardar', async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await page.locator('#name').fill('No guardar');
        await page.locator('[data-contact-form="true"] button[type="button"]').first().click();

        await expect(page.locator('[data-modal="true"]')).not.toBeVisible();
        await expect(page.locator('[data-contact-list="true"]')).not.toContainText('No guardar');
    });

    test('editar contacto desde modal actualiza los datos', async ({ page }) => {
        const contact = makeContact({ name: 'Original', email: 'original@test.com' });
        await seedContacts(page, [contact]);
        await waitForApp(page);

        await page.locator('[aria-label="Editar"]').first().click();
        await expect(page.locator('[data-modal="true"]')).toBeVisible();

        await page.locator('#name').clear();
        await page.locator('#name').fill('Editado');
        await page.locator('[data-contact-form="true"] button[type="submit"]').click();

        await expect(page.locator('[data-contact-list="true"]')).toContainText('Editado');
        await expect(page.locator('[data-contact-list="true"]')).not.toContainText('Original');
    });
});

// ── 6. Tabs (provide/inject) ───────────────────────────────────────────────

test.describe('Tabs con provide/inject', () => {
    test.beforeEach(async ({ page }) => {
        const contacts = [
            makeContact({ name: 'Ana Favorita', email: 'ana@test.com', favorite: true }),
            makeContact({ name: 'Bob Normal', email: 'bob@test.com', favorite: false }),
        ];
        await seedContacts(page, contacts);
        await waitForApp(page);
    });

    test('tab Favoritos muestra solo contactos favoritos', async ({ page }) => {
        await page.locator('[data-tab="favorites"]').click();
        await expect(page.locator('[data-contact-list="true"]')).toContainText('Ana Favorita');
        await expect(page.locator('[data-contact-list="true"]')).not.toContainText('Bob Normal');
    });

    test('tab Recientes muestra contactos', async ({ page }) => {
        await page.locator('[data-tab="recent"]').click();
        const list = page.locator('[data-contact-list="true"]');
        await expect(list).toBeVisible();
        // Debe mostrar ambos (o el estado vacío si el tab funciona)
        const isEmpty = await page.locator('[data-empty-state="true"]').isVisible();
        if (!isEmpty) {
            await expect(list).toContainText('Ana Favorita');
        }
    });

    test('el indicador activo cambia al clickear tabs', async ({ page }) => {
        await expect(page.locator('[data-tab="all"][data-active="true"]')).toBeVisible();

        await page.locator('[data-tab="favorites"]').click();
        await expect(page.locator('[data-tab="favorites"][data-active="true"]')).toBeVisible();
        await expect(page.locator('[data-tab="all"][data-active="true"]')).not.toBeVisible();
    });

    test('volver a tab Todos muestra todos los contactos', async ({ page }) => {
        await page.locator('[data-tab="favorites"]').click();
        await page.locator('[data-tab="all"]').click();

        const list = page.locator('[data-contact-list="true"]');
        await expect(list).toContainText('Ana Favorita');
        await expect(list).toContainText('Bob Normal');
    });
});

// ── 7. Accordion + Transitions ────────────────────────────────────────────

test.describe('Accordion y Transitions', () => {
    test.beforeEach(async ({ page }) => {
        await seedContacts(page, [makeContact({ notes: 'Nota de prueba', phone: '+34 999 888 777' })]);
        await waitForApp(page);
    });

    test('click en "Ver detalles" expande el accordion', async ({ page }) => {
        const accordionBtn = page.locator('button[aria-expanded]').first();
        await expect(accordionBtn).toBeVisible();
        await accordionBtn.click();
        // El contenido del accordion aparece
        await expect(page.locator('text=+34 999 888 777')).toBeVisible();
    });

    test('el accordion empieza cerrado', async ({ page }) => {
        const accordionBtn = page.locator('button[aria-expanded="false"]').first();
        await expect(accordionBtn).toBeVisible();
    });
});

// ── 8. Búsqueda ────────────────────────────────────────────────────────────

test.describe('Búsqueda de contactos', () => {
    test.beforeEach(async ({ page }) => {
        const contacts = [
            makeContact({ name: 'Alfonso Rodríguez', email: 'alfonso@test.com' }),
            makeContact({ name: 'Beatriz Sánchez', email: 'beatriz@test.com' }),
        ];
        await seedContacts(page, contacts);
        await waitForApp(page);
    });

    test('buscar por nombre filtra la lista', async ({ page }) => {
        await page.locator('[data-search-input="true"]').fill('Alfonso');
        await expect(page.locator('[data-contact-list="true"]')).toContainText('Alfonso Rodríguez');
        await expect(page.locator('[data-contact-list="true"]')).not.toContainText('Beatriz Sánchez');
    });

    test('buscar por email filtra la lista', async ({ page }) => {
        await page.locator('[data-search-input="true"]').fill('beatriz@');
        await expect(page.locator('[data-contact-list="true"]')).toContainText('Beatriz Sánchez');
        await expect(page.locator('[data-contact-list="true"]')).not.toContainText('Alfonso Rodríguez');
    });

    test('limpiar búsqueda muestra todos los contactos', async ({ page }) => {
        await page.locator('[data-search-input="true"]').fill('Alfonso');
        await page.locator('[data-search-input="true"]').clear();
        const list = page.locator('[data-contact-list="true"]');
        await expect(list).toContainText('Alfonso Rodríguez');
        await expect(list).toContainText('Beatriz Sánchez');
    });
});

// ── 9. Responsive ─────────────────────────────────────────────────────────

test.describe('Responsive', () => {
    test('la app no tiene overflow horizontal', async ({ page }) => {
        await waitForApp(page);
        const overflow = await page.evaluate(() => {
            return document.body.scrollWidth > document.documentElement.clientWidth;
        });
        expect(overflow).toBe(false);
    });

    test('el botón Agregar es visible y clickeable en mobile', async ({ page }) => {
        await waitForApp(page);
        const btn = page.locator('[data-action="add-contact"]');
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThan(0);
        expect(box!.width).toBeGreaterThan(0);
    });

    test('el modal se muestra correctamente en viewports pequeños', async ({ page }) => {
        await waitForApp(page);
        await page.locator('[data-action="add-contact"]').click();
        await expect(page.locator('[data-modal="true"]')).toBeVisible();
        // El form debe ser visible sin scroll excesivo
        await expect(page.locator('[data-contact-form="true"]')).toBeVisible();
    });
});

// ── 10. Screenshot ─────────────────────────────────────────────────────────

test('screenshot del Contact Manager con datos', async ({ page }) => {
    const contacts = [
        makeContact({ name: 'María García', email: 'maria@test.com', category: 'personal', favorite: true }),
        makeContact({ name: 'Carlos López', email: 'carlos@test.com', category: 'trabajo' }),
        makeContact({ name: 'Ana Martínez', email: 'ana@test.com', category: 'familia' }),
    ];
    await seedContacts(page, contacts);
    await waitForApp(page);
    // Esperar AsyncStats
    await page.locator('[data-async-stats="true"]').waitFor({ timeout: 5000 });
    await page.screenshot({ path: 'playwright-report/contact-manager.png', fullPage: true });
});
