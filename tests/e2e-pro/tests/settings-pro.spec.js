const { test, expect } = require('@playwright/test');
const { loginAndOpenSettings, stepShot, resetStepCounter, saveSettings } = require('./helpers');

/**
 * Covers every PointBayPro-only setting field: VIP Tiers (enable toggle +
 * tier editor rows), License Settings, and the Referrals group's New
 * Customer Bonus Points field. Runs against the "free-pro" QIT environment.
 */
test.describe('Pro plugin — Settings save/persist (Pro active)', () => {
	test.beforeEach(async ({ page }, testInfo) => {
		resetStepCounter();
		await loginAndOpenSettings(page);
		await stepShot(page, testInfo, 'settings-loaded');
	});

	test('New Customer Bonus Points saves and persists', async ({ page }, testInfo) => {
		// Enable Referrals is off by default in a fresh environment, and this
		// field (like Referral Bonus Points) is disabled until it's on.
		const enableReferralsRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable Referrals' }) });
		const enableReferralsCheckbox = enableReferralsRow.locator('input[type="checkbox"]');
		if (!(await enableReferralsCheckbox.isChecked())) {
			await enableReferralsCheckbox.evaluate((el) => el.click());
			await saveSettings(page);
		}

		const row = page.locator('tr', { has: page.locator('th', { hasText: 'New Customer Bonus Points' }) });
		const input = row.locator('input');
		await expect(input).toBeEnabled();
		await stepShot(page, testInfo, 'before');

		// Two candidate values so a repeat run against the same stateful
		// environment doesn't land on a no-op change (see NUMBER_FIELDS in
		// settings-free.spec.js for the same idempotency concern).
		const candidates = ['321', '350'];
		const currentValue = await input.inputValue();
		const targetValue = candidates.find((v) => v !== currentValue) || candidates[0];

		await input.fill('');
		await input.fill(targetValue);
		await stepShot(page, testInfo, 'changed');

		await saveSettings(page);
		await stepShot(page, testInfo, 'saved');

		await page.reload();
		await page.waitForSelector('.pointbay-p-page-default');
		const reloadedRow = page.locator('tr', { has: page.locator('th', { hasText: 'New Customer Bonus Points' }) });
		await expect(reloadedRow.locator('input')).toHaveValue(targetValue);
		await stepShot(page, testInfo, 'reloaded-confirmed');
	});

	test('Enable VIP Tiers toggle saves and persists, and reveals the tier editor', async ({ page }, testInfo) => {
		// VIP Tiers is on by default in a fresh environment, so toggle
		// whichever direction actually changes state rather than assuming off.
		const row = page.locator('tr', { has: page.locator('th', { hasText: 'Enable VIP Tiers' }) });
		const checkbox = row.locator('input[type="checkbox"]');
		await stepShot(page, testInfo, 'before');

		const wasChecked = await checkbox.isChecked();
		await checkbox.evaluate((el) => el.click());
		const nowChecked = !wasChecked;

		if (nowChecked) {
			await expect(page.getByText('Tiers Configuration')).toBeVisible();
		} else {
			await expect(page.getByText('Tiers Configuration')).toHaveCount(0);
		}
		await stepShot(page, testInfo, 'toggled');

		await saveSettings(page);
		await stepShot(page, testInfo, 'saved');

		await page.reload();
		await page.waitForSelector('.pointbay-p-page-default');
		const reloadedRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable VIP Tiers' }) });
		await expect(reloadedRow.locator('input[type="checkbox"]')).toHaveJSProperty('checked', nowChecked);
		await stepShot(page, testInfo, 'reloaded-confirmed');

		// Leave VIP Tiers enabled for the tier-editing test that follows.
		if (!nowChecked) {
			await reloadedRow.locator('input[type="checkbox"]').evaluate((el) => el.click());
			await saveSettings(page);
		}
	});

	test('Editing a VIP tier row (threshold + multiplier) saves and persists', async ({ page }, testInfo) => {
		// Depends on the previous test having left VIP Tiers enabled; ensure it here too.
		const enableRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable VIP Tiers' }) });
		const enableCheckbox = enableRow.locator('input[type="checkbox"]');
		if (!(await enableCheckbox.isChecked())) {
			await enableCheckbox.evaluate((el) => el.click());
			await saveSettings(page);
		}

		// A fresh environment starts with zero configured tiers — add one named
		// "Silver" via "Add Tier" if it isn't there yet, rather than assuming
		// the Bronze/Silver/Gold starter set from the free-plugin upsell preview.
		let silverRow = page.locator('div.pointbay-flex.pointbay-gap-2.pointbay-items-center', {
			has: page.locator('input[value="Silver"]'),
		});
		if ((await silverRow.count()) === 0) {
			await page.locator('button', { hasText: 'Add Tier' }).click();
			const newNameInput = page.locator('input[placeholder="Tier Name (e.g. Gold)"]').last();
			await newNameInput.fill('Silver');
			silverRow = page.locator('div.pointbay-flex.pointbay-gap-2.pointbay-items-center', {
				has: page.locator('input[value="Silver"]'),
			});
		}
		const thresholdInput = silverRow.locator('input').nth(1);
		const multiplierInput = silverRow.locator('input').nth(2);
		await stepShot(page, testInfo, 'before');

		const thresholdCandidates = ['750', '800'];
		const multiplierCandidates = ['1.3', '1.4'];
		const currentThreshold = await thresholdInput.inputValue();
		const currentMultiplier = await multiplierInput.inputValue();
		const targetThreshold = thresholdCandidates.find((v) => v !== currentThreshold) || thresholdCandidates[0];
		const targetMultiplier = multiplierCandidates.find((v) => v !== currentMultiplier) || multiplierCandidates[0];

		await thresholdInput.fill('');
		await thresholdInput.fill(targetThreshold);
		await multiplierInput.fill('');
		await multiplierInput.fill(targetMultiplier);
		await stepShot(page, testInfo, 'changed');

		await saveSettings(page);
		await stepShot(page, testInfo, 'saved');

		await page.reload();
		await page.waitForSelector('.pointbay-p-page-default');
		const reloadedRow = page.locator('div.pointbay-flex.pointbay-gap-2.pointbay-items-center', {
			has: page.locator('input[value="Silver"]'),
		});
		await expect(reloadedRow.locator('input').nth(1)).toHaveValue(targetThreshold);
		await expect(reloadedRow.locator('input').nth(2)).toHaveValue(targetMultiplier);
		await stepShot(page, testInfo, 'reloaded-confirmed');
	});

	test('License Key: an invalid key is rejected without activating', async ({ page }, testInfo) => {
		// Deliberately uses a fake, obviously-invalid key rather than a real
		// purchased license — this exercises the full activation round trip
		// (the free-pro environment declares requires.network: true for this
		// reason) without embedding a real secret in test source. A real key's
		// success path isn't covered here for that same reason.
		const keyRow = page.locator('tr', { has: page.locator('th', { hasText: 'License Key' }) });
		const input = keyRow.locator('input');
		const activateButton = keyRow.locator('button', { hasText: 'Activate' });
		await stepShot(page, testInfo, 'before');

		await input.fill('WPAB-TEST0-TEST0-TEST0');
		await stepShot(page, testInfo, 'key-entered');

		await activateButton.click();
		// Give the network round trip time to resolve either a toast or a status change.
		await page.waitForTimeout(3000);
		await stepShot(page, testInfo, 'after-activate-attempt');

		const statusRow = page.locator('tr', { has: page.locator('th', { hasText: 'License Status' }) });
		await expect(statusRow).toContainText('INACTIVE');
		await stepShot(page, testInfo, 'status-confirms-not-active');
	});
});
