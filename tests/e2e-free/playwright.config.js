// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * This suite runs with PointBayPro deactivated — see qit.json's "free-only"
 * environment. It covers every free-plugin setting field's save/persist
 * behavior, plus the "Buy Pro" upsell UI that should be visible in this state.
 */
module.exports = defineConfig({
	testDir: './tests',
	fullyParallel: false,
	workers: 1,
	retries: 1,
	timeout: 45000,
	reporter: [
		['playwright-ctrf-json-reporter', { outputFile: './results/ctrf.json' }],
		['blob', { outputDir: './results/blob' }],
		['list'],
	],
	use: {
		baseURL: process.env.QIT_SITE_URL || 'http://localhost',
		// 'on' (not 'only-on-failure') because every step needs a reviewable
		// screenshot, not just failures — the whole point of this suite.
		screenshot: 'on',
		video: 'retain-on-failure',
		trace: 'on-first-retry',
		ignoreHTTPSErrors: true,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
