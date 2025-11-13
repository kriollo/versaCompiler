/**
 * 🔥 Test de HMR Automático con Playwright
 *
 * Este test verifica que el sistema de detección automática de HMR
 * funciona correctamente, similar a Vite y esbuild.
 */

import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DEMO_URL = 'http://localhost:3000/examples/hmr-demo/index.html';
const DASHBOARD_FILE = join(process.cwd(), 'examples/hmr-demo/dashboard.js');

test.describe('HMR Automático - Detección Inteligente', () => {
    let originalContent: string;

    test.beforeEach(async () => {
        // Guardar contenido original del archivo
        originalContent = readFileSync(DASHBOARD_FILE, 'utf-8');
    });

    test.afterEach(async () => {
        // Restaurar contenido original
        if (originalContent) {
            writeFileSync(DASHBOARD_FILE, originalContent, 'utf-8');
        }
        // Esperar un poco para que se procese la restauración
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('debe cargar la demo correctamente', async ({ page }) => {
        await page.goto(DEMO_URL);

        // Verificar que la página carga
        await expect(page.locator('h1')).toContainText(
            'Bienvenido al Dashboard',
        );

        // Verificar que el indicador de HMR está presente
        await expect(page.locator('.hmr-indicator')).toContainText(
            'HMR Activo',
        );
    });

    test('debe detectar estrategia self-accept para dashboard.js', async ({
        page,
    }) => {
        await page.goto(DEMO_URL);

        // Configurar listener para mensajes de consola
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });

        // Esperar a que el dashboard se inicialice
        await page.waitForSelector('#welcome', { timeout: 5000 });

        // Modificar el archivo dashboard.js
        const modifiedContent = originalContent.replace(
            '<h1>🚀 Bienvenido al Dashboard</h1>',
            '<h1>🔥 HMR TEST - Dashboard Actualizado</h1>',
        );
        writeFileSync(DASHBOARD_FILE, modifiedContent, 'utf-8');

        // Esperar a que se detecte el cambio y se aplique HMR
        await page.waitForTimeout(2000);

        // Verificar que el contenido cambió SIN recarga de página
        const heading = await page.locator('#welcome h1');
        await expect(heading).toContainText('HMR TEST - Dashboard Actualizado');

        // Verificar logs de HMR en consola
        const hasHMRLogs = consoleLogs.some(
            log =>
                log.includes('HRMHelper recibido') ||
                log.includes('Analizando estrategia HMR'),
        );
        expect(hasHMRLogs).toBeTruthy();

        // Verificar que detectó self-accept
        const hasSelfAccept = consoleLogs.some(
            log =>
                log.includes('self-accept') ||
                log.includes('Dashboard actualizado'),
        );
        expect(hasSelfAccept).toBeTruthy();
    });

    test('debe actualizar sin recargar la página completa', async ({
        page,
    }) => {
        await page.goto(DEMO_URL);

        // Agregar un marcador único en el DOM para detectar recarga
        await page.evaluate(() => {
            (window as any).__testMarker = 'NO_RELOAD_' + Date.now();
        });

        const markerBefore = await page.evaluate(
            () => (window as any).__testMarker,
        );

        // Modificar el archivo
        const modifiedContent = originalContent.replace(
            'Última actualización:',
            'Última actualización HMR:',
        );
        writeFileSync(DASHBOARD_FILE, modifiedContent, 'utf-8');

        // Esperar a que se aplique HMR
        await page.waitForTimeout(2000);

        // Verificar que el marcador sigue presente (no hubo recarga)
        const markerAfter = await page.evaluate(
            () => (window as any).__testMarker,
        );
        expect(markerAfter).toBe(markerBefore);

        // Verificar que el contenido cambió
        await expect(page.locator('#welcome')).toContainText(
            'Última actualización HMR:',
        );
    });

    test('debe mostrar logs detallados en consola', async ({ page }) => {
        await page.goto(DEMO_URL);

        const consoleLogs: string[] = [];
        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });

        // Modificar archivo
        const modifiedContent = originalContent.replace(
            'Dashboard inicializado correctamente',
            'Dashboard HMR Test',
        );
        writeFileSync(DASHBOARD_FILE, modifiedContent, 'utf-8');

        await page.waitForTimeout(2000);

        // Verificar secuencia de logs esperada
        const logSequence = [
            '🔄 HRMHelper recibido',
            '📋 Archivo modificado',
            '🔍 Analizando estrategia HMR',
            '📊 Estrategia detectada',
        ];

        for (const expectedLog of logSequence) {
            const found = consoleLogs.some(log => log.includes(expectedLog));
            expect(found).toBeTruthy();
        }
    });

    test('debe preservar estado durante HMR', async ({ page }) => {
        await page.goto(DEMO_URL);

        // Agregar datos en el estado del dashboard
        await page.evaluate(() => {
            // Simular interacción del usuario que modifica estado
            (window as any).__userState = {
                clicks: 5,
                timestamp: Date.now(),
            };
        });

        const stateBefore = await page.evaluate(
            () => (window as any).__userState,
        );

        // Modificar archivo (cambio cosmético)
        const modifiedContent = originalContent.replace(
            'Usuarios Activos',
            'Usuarios Online',
        );
        writeFileSync(DASHBOARD_FILE, modifiedContent, 'utf-8');

        await page.waitForTimeout(2000);

        // Verificar que el estado del usuario se preservó
        const stateAfter = await page.evaluate(
            () => (window as any).__userState,
        );
        expect(stateAfter).toEqual(stateBefore);

        // Verificar que el cambio visual se aplicó
        await expect(page.locator('.stat-card h3').first()).toContainText(
            'Usuarios Online',
        );
    });

    test('debe manejar múltiples cambios consecutivos', async ({ page }) => {
        await page.goto(DEMO_URL);

        const consoleLogs: string[] = [];
        page.on('console', msg => consoleLogs.push(msg.text()));

        // Hacer 3 cambios consecutivos
        for (let i = 1; i <= 3; i++) {
            const modifiedContent = originalContent.replace(
                'Bienvenido al Dashboard',
                `Bienvenido al Dashboard ${i}`,
            );
            writeFileSync(DASHBOARD_FILE, modifiedContent, 'utf-8');
            await page.waitForTimeout(1500);
        }

        // Verificar que se procesaron múltiples HMR
        const hmrCount = consoleLogs.filter(log =>
            log.includes('HRMHelper recibido'),
        ).length;

        expect(hmrCount).toBeGreaterThanOrEqual(3);

        // Verificar contenido final
        await expect(page.locator('#welcome h1')).toContainText('Dashboard 3');
    });

    test('debe detectar import.meta.hot.accept en el código', async ({
        page,
    }) => {
        await page.goto(DEMO_URL);

        const consoleLogs: string[] = [];
        page.on('console', msg => consoleLogs.push(msg.text()));

        // Modificar archivo
        const modifiedContent = originalContent.replace(
            'inicializando',
            'starting',
        );
        writeFileSync(DASHBOARD_FILE, modifiedContent, 'utf-8');

        await page.waitForTimeout(2000);

        // Verificar que detectó que el módulo tiene import.meta.hot
        const hasHotAccept = consoleLogs.some(
            log =>
                log.includes('🔥 HMR habilitado') ||
                log.includes('self-accept'),
        );

        expect(hasHotAccept).toBeTruthy();
    });
});

test.describe('HMR - Estrategia Auto-Propagate', () => {
    const FORMATTERS_FILE = join(
        process.cwd(),
        'examples/hmr-demo/utils/formatters.js',
    );
    let originalFormattersContent: string;

    test.beforeEach(() => {
        originalFormattersContent = readFileSync(FORMATTERS_FILE, 'utf-8');
    });

    test.afterEach(() => {
        if (originalFormattersContent) {
            writeFileSync(FORMATTERS_FILE, originalFormattersContent, 'utf-8');
        }
    });

    test('debe aplicar HMR a módulos con funciones puras sin import.meta.hot', async ({
        page,
    }) => {
        await page.goto(DEMO_URL);

        const consoleLogs: string[] = [];
        page.on('console', msg => consoleLogs.push(msg.text()));

        // Modificar formatters.js (sin import.meta.hot)
        const modifiedContent = originalFormattersContent.replace(
            "currency: 'EUR'",
            "currency: 'USD'",
        );
        writeFileSync(FORMATTERS_FILE, modifiedContent, 'utf-8');

        await page.waitForTimeout(2000);

        // Verificar que detectó estrategia propagate
        const hasPropagateStrategy = consoleLogs.some(
            log =>
                log.includes('propagate') ||
                log.includes('Estrategia detectada'),
        );

        expect(hasPropagateStrategy).toBeTruthy();
    });
});

test.describe('HMR - Interfaz de Usuario', () => {
    test('debe mostrar indicador visual de HMR activo', async ({ page }) => {
        await page.goto(DEMO_URL);

        // Verificar indicador visual
        const indicator = page.locator('.hmr-indicator');
        await expect(indicator).toBeVisible();
        await expect(indicator).toContainText('HMR Activo');

        // Verificar que tiene estilos correctos
        const bgColor = await indicator.evaluate(
            el => window.getComputedStyle(el).background,
        );
        expect(bgColor).toBeTruthy();
    });

    test('debe mostrar información de HMR en la página', async ({ page }) => {
        await page.goto(DEMO_URL);

        // Verificar que hay instrucciones visibles
        await expect(page.locator('.hmr-info')).toBeVisible();
        await expect(page.locator('.hmr-info h2')).toContainText(
            'Hot Module Replacement',
        );

        // Verificar que hay ejemplos de código
        const codeBlocks = await page.locator('code').count();
        expect(codeBlocks).toBeGreaterThan(0);
    });

    test('debe actualizar stats cards correctamente', async ({ page }) => {
        await page.goto(DEMO_URL);

        // Verificar que las stats cards se renderizan
        const statsCards = await page.locator('.stat-card').count();
        expect(statsCards).toBe(3);

        // Verificar contenido de las cards
        await expect(page.locator('.stat-card').first()).toContainText(
            'Usuarios',
        );
        await expect(page.locator('.stat-card').nth(1)).toContainText(
            'Ingresos',
        );
        await expect(page.locator('.stat-card').nth(2)).toContainText(
            'Conversión',
        );
    });
});

test.describe('HMR - Casos Edge', () => {
    test('debe manejar cambios rápidos sin perder actualizaciones', async ({
        page,
    }) => {
        await page.goto(DEMO_URL);

        const DASHBOARD_FILE = join(
            process.cwd(),
            'examples/hmr-demo/dashboard.js',
        );
        const originalContent = readFileSync(DASHBOARD_FILE, 'utf-8');

        try {
            // Hacer cambios muy rápidos
            for (let i = 0; i < 5; i++) {
                const content = originalContent.replace(
                    'Dashboard',
                    `Dashboard-${i}`,
                );
                writeFileSync(DASHBOARD_FILE, content, 'utf-8');
                await page.waitForTimeout(200); // Cambios muy rápidos
            }

            // Esperar a que se procesen
            await page.waitForTimeout(2000);

            // La página no debería haber crasheado
            const isVisible = await page.locator('#welcome').isVisible();
            expect(isVisible).toBeTruthy();
        } finally {
            writeFileSync(DASHBOARD_FILE, originalContent, 'utf-8');
        }
    });

    test('debe recuperarse de errores de sintaxis', async ({ page }) => {
        await page.goto(DEMO_URL);

        const DASHBOARD_FILE = join(
            process.cwd(),
            'examples/hmr-demo/dashboard.js',
        );
        const originalContent = readFileSync(DASHBOARD_FILE, 'utf-8');

        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        try {
            // Introducir error de sintaxis
            const brokenContent = originalContent.replace(
                'export function showWelcome()',
                'export function showWelcome(', // Falta cerrar paréntesis
            );
            writeFileSync(DASHBOARD_FILE, brokenContent, 'utf-8');

            await page.waitForTimeout(2000);

            // Restaurar contenido correcto
            writeFileSync(DASHBOARD_FILE, originalContent, 'utf-8');

            await page.waitForTimeout(2000);

            // Verificar que se recuperó
            const isVisible = await page.locator('#welcome').isVisible();
            expect(isVisible).toBeTruthy();
        } finally {
            writeFileSync(DASHBOARD_FILE, originalContent, 'utf-8');
        }
    });
});
