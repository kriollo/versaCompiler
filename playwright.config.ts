import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.ts',
    fullyParallel: true,
    workers: 4,
    retries: 1,
    timeout: 30_000,
    reporter: [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list'],
    ],

    webServer: {
        command: 'node e2e/server.mjs',
        port: 4173,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
    },

    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        // Chromium necesita --no-sandbox en algunos entornos Linux
        launchOptions: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    },

    // Matrix reducido a los navegadores más usados y con motor propio, más
    // un representante móvil para los tests de viewport/overflow: Desktop
    // Chrome (chromium) y Desktop Firefox cubren los dos motores reales que
    // se probaban; Pixel 5 cubre el caso de viewport pequeño. Las otras
    // variantes móviles/tablet ya quitadas (Galaxy S9+, iPhone 12, iPad Pro)
    // corrían sobre el mismo motor chromium que Desktop Chrome — Safari/
    // WebKit real ni se llegaba a probar (ver comentario histórico) — solo
    // sumaban tiempo de CI sin cobertura de motor adicional.
    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Desktop Firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'Mobile Chrome (Pixel 5)',
            use: { ...devices['Pixel 5'] },
        },
    ],
});
