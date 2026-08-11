const { test, expect } = require('@playwright/test');
const { loginAndOpenSettings, stepShot, resetStepCounter } = require('./helpers');

const BUY_PRO_URL = 'https://wpanchorbay.com/plugins/pointbay';

/**
 * Confirms the "Buy Pro" upsell UI renders correctly when PointBayPro is
 * NOT active: locked previews of VIP Tiers, License Settings, and the New
 * Customer Bonus Points field, each showing a lock icon and a hover
 * tooltip with a working Buy Pro link. See free-pro/tests/no-upsell.spec.js
 * for the matching "this UI must NOT appear" assertions with Pro active.
 */
test.describe('Free plugin — Buy Pro upsell UI (Pro inactive)', () => {
	test.beforeEach(async ({ page }, testInfo) => {
		resetStepCounter();
		await loginAndOpenSettings(page);
	});

	test('VIP Tiers section renders as a locked PRO preview', async ({ page }, testInfo) => {
		const heading = page.locator('h2', { hasText: 'VIP Tiers' });
		await expect(heading).toBeVisible();
		await expect(heading.locator('..')).toContainText('PRO');
		await stepShot(page, testInfo, 'vip-tiers-locked-heading');

		const enableToggleRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable VIP Tiers' }) });
		await expect(enableToggleRow.locator('input[type="checkbox"]')).toBeDisabled();
		await stepShot(page, testInfo, 'vip-tiers-toggle-disabled');

		// Starter tier rows (Bronze/Silver/Gold) still render as a preview, all inert.
		await expect(page.locator('input[value="Bronze"]')).toBeVisible();
		await expect(page.locator('input[value="Silver"]')).toBeVisible();
		await expect(page.locator('input[value="Gold"]')).toBeVisible();
		await stepShot(page, testInfo, 'vip-tiers-starter-rows-visible');
	});

	test('License Settings section renders as a locked PRO preview', async ({ page }, testInfo) => {
		const heading = page.locator('h2', { hasText: 'License Settings' });
		await expect(heading).toBeVisible();
		await expect(heading.locator('..')).toContainText('PRO');
		await stepShot(page, testInfo, 'license-settings-locked-heading');

		const keyRow = page.locator('tr', { has: page.locator('th', { hasText: 'License Key' }) });
		await expect(keyRow.locator('input')).toBeDisabled();
		await expect(keyRow.locator('button')).toBeDisabled();
		await stepShot(page, testInfo, 'license-key-row-disabled');
	});

	test('New Customer Bonus Points renders as a locked field in Referrals', async ({ page }, testInfo) => {
		const row = page.locator('tr', { has: page.locator('th', { hasText: 'New Customer Bonus Points' }) });
		await expect(row).toBeVisible();
		await expect(row.locator('input')).toBeDisabled();
		await stepShot(page, testInfo, 'new-customer-bonus-locked');
	});

	test('Hovering a locked field shows a tooltip with a working Buy Pro link', async ({ page }, testInfo) => {
		const keyRow = page.locator('tr', { has: page.locator('th', { hasText: 'License Key' }) });
		const lockWrapper = keyRow.locator('.pointbay-relative').first();
		await lockWrapper.scrollIntoViewIfNeeded();
		await stepShot(page, testInfo, 'before-hover');

		await lockWrapper.hover();
		const buyProLink = page.locator(`a[href="${BUY_PRO_URL}"]`);
		await expect(buyProLink).toBeVisible();
		await expect(buyProLink).toHaveAttribute('target', '_blank');
		await stepShot(page, testInfo, 'tooltip-visible-with-buy-pro-link');
	});
});
