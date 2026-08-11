// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * This suite runs with PointBayPro active — see qit.json's "free-pro"
 * environment (installs ../pointbaypro). Re-verifies every free-plugin
 * field still saves correctly with Pro active, then covers the Pro-only
 * fields (VIP Tiers, License Settings, New Customer Bonus Points) and
 * confirms the free-only "Buy Pro" upsell UI no longer appears.
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
