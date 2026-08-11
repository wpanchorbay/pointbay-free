// Template — copy into tests/e2e/playwright.config.js.
// Serial (workers:1) because the shared plugin option + WooCommerce cart are
// global state that parallel workers would corrupt. retries:1 absorbs genuine
// Docker/WordPress warm-up on the first run after env creation. Behavioral
// specs do far more than a settings save/reload — often 2+ logins, a real
// storefront checkout, an admin order-status transition, and several wp-cli
// reads — so the per-test timeout is generous; a tight budget here starves a
// legitimately multi-step spec mid-flow rather than catching a real hang.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    workers: 1,
    fullyParallel: false,
    retries: 1,
    timeout: 120000,
    expect: { timeout: 15000 },
    reporter: [
        ['list'],
        // CTRF report name is overridden per-phase via CTRF_OUTPUT in the runner.
        ['playwright-ctrf-json-reporter', { outputFile: process.env.CTRF_OUTPUT || 'ctrf.json', outputDir: 'results' }],
    ],
    use: {
        baseURL: process.env.WP_URL || process.env.WP_BASE_URL,
        viewport: { width: 1440, height: 900 },
        screenshot: 'off',        // the TestLogger owns screenshots (every step, flat folder)
        trace: 'retain-on-failure',
        actionTimeout: 15000,
        navigationTimeout: 45000,
        ignoreHTTPSErrors: true,
    },
});
