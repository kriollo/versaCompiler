import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.ts',
    fullyParallel: false, // globalSetup compila en serie primero
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

    projects: [
        // ── Desktop ──────────────────────────────────────────────────────────
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Desktop Firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        // ── Mobile ───────────────────────────────────────────────────────────
        {
            name: 'Mobile Chrome (Pixel 5)',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Chrome (Galaxy S9+)',
            use: { ...devices['Galaxy S9+'] },
        },
        {
            name: 'Mobile Safari (iPhone 12)',
            use: {
                ...devices['iPhone 12'],
                // WebKit en Linux puede fallar; usamos Chromium emulando iPhone
                browserName: 'chromium',
            },
        },
        {
            name: 'Tablet (iPad Pro)',
            use: {
                ...devices['iPad Pro 11'],
                browserName: 'chromium',
            },
        },
    ],
});
