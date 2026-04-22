import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    workers: 1,
    use: {
        baseURL: 'http://localhost:3002',
        headless: true,
    },
    webServer: {
        command: 'npm run demo2:serve',
        port: 3002,
        reuseExistingServer: true,
    },
});
