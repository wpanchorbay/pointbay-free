const { test, expect } = require('@playwright/test');
const { loginAndOpenSettings, stepShot, resetStepCounter, saveSettings } = require('./helpers');

/**
 * With PointBayPro active, none of the free plugin's "Buy Pro" locked
 * previews should render — the real Pro UI takes their place. Mirrors
 * tests/e2e-free/tests/upsell.spec.js, asserting the opposite.
 */
test.describe('Free plugin — Buy Pro upsell UI must not appear (Pro active)', () => {
	test.beforeEach(async ({ page }, testInfo) => {
		resetStepCounter();
		await loginAndOpenSettings(page);
	});

	test('No PRO badges, lock icons, or Buy Pro links render anywhere on the page', async ({ page }, testInfo) => {
		await stepShot(page, testInfo, 'settings-loaded');

		const proBadges = page.locator('span.pointbay-bg-\\[\\#8a5cf6\\]');
		await expect(proBadges).toHaveCount(0);

		const lockIcons = page.locator('.lucide-lock');
		await expect(lockIcons).toHaveCount(0);

		const buyProLinks = page.locator('a[href="https://wpanchorbay.com/plugins/pointbay"]');
		await expect(buyProLinks).toHaveCount(0);

		await stepShot(page, testInfo, 'confirmed-no-upsell-elements');
	});

	test('VIP Tiers, License Settings, and New Customer Bonus Points are enabled, not locked', async ({ page }, testInfo) => {
		const tiersRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable VIP Tiers' }) });
		await expect(tiersRow.locator('input[type="checkbox"]')).toBeEnabled();

		const licenseKeyRow = page.locator('tr', { has: page.locator('th', { hasText: 'License Key' }) });
		await expect(licenseKeyRow.locator('input')).toBeEnabled();

		// New Customer Bonus Points is a real (non-locked) field, but like
		// Referral Bonus Points it stays disabled until Enable Referrals is on —
		// that's a data dependency, not the "PRO lock" this test is checking for.
		const enableReferralsRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable Referrals' }) });
		const enableReferralsCheckbox = enableReferralsRow.locator('input[type="checkbox"]');
		if (!(await enableReferralsCheckbox.isChecked())) {
			await enableReferralsCheckbox.evaluate((el) => el.click());
			await saveSettings(page);
		}

		const bonusRow = page.locator('tr', { has: page.locator('th', { hasText: 'New Customer Bonus Points' }) });
		await expect(bonusRow.locator('input')).toBeEnabled();

		await stepShot(page, testInfo, 'all-pro-fields-enabled');
	});
});
