const { test, expect } = require('@playwright/test');
const { loginAndOpenSettings, stepShot, resetStepCounter, saveSettings } = require('./helpers');

/**
 * Re-verifies every free-plugin setting field still saves/persists correctly
 * with PointBayPro active (the "free-pro" QIT environment) — a regression
 * check that Pro's filters/injected fields don't interfere with free's own
 * save path. See tests/e2e-free for the equivalent Pro-inactive coverage.
 */

/**
 * Numeric fields: two candidate values per field. The test picks whichever
 * one differs from the field's current value, so the suite stays idempotent
 * across repeated runs against the same (stateful) environment — otherwise a
 * second run that lands on an already-saved value produces no real change,
 * the Save button correctly stays disabled, and the test would false-fail.
 */
const NUMBER_FIELDS = [
	{ label: 'Points Per Dollar', values: ['5', '7'] },
	{ label: 'Points for Registration', values: ['250', '260'] },
	{ label: 'Points for Product Review', values: ['75', '80'] },
	{ label: 'Point Value ($)', values: ['0.05', '0.06'] },
	{ label: 'Minimum Points to Redeem', values: ['200', '150'] },
	{ label: 'Referral Bonus Points', values: ['1500', '1600'] },
];

/**
 * Select fields: these render as a custom combobox (role="combobox" trigger
 * + a portaled role="listbox"), not a native <select> — ClassicSelect.tsx.
 * optionLabel is the visible text to click in the dropdown / to expect in
 * the trigger afterward.
 */
const SELECT_FIELDS = [
	{ label: 'Order Status Trigger', optionLabels: ['Processing', 'On Hold'] },
	{ label: 'Redemption Mode', optionLabels: ['Virtual Coupon (WC_Coupon)', 'Cart Fee (WC_Fee)'] },
];

/** Checkbox fields: [row label substring]. */
const CHECKBOX_FIELDS = ['Enable Referrals', 'Guest Notice', 'Delete Data on Uninstall', 'Debug Logging'];

test.describe('Free plugin — Settings save/persist (Pro active)', () => {
	test.beforeEach(async ({ page }, testInfo) => {
		resetStepCounter();
		await loginAndOpenSettings(page);
		await stepShot(page, testInfo, 'settings-loaded');
	});

	for (const field of NUMBER_FIELDS) {
		test(`${field.label} saves and persists`, async ({ page }, testInfo) => {
			const row = page.locator('tr', { has: page.locator('th', { hasText: field.label }) });
			const input = row.locator('input').first();

			// Referral Bonus Points is disabled until Enable Referrals is on.
			if (field.label === 'Referral Bonus Points') {
				const enableReferralsRow = page.locator('tr', { has: page.locator('th', { hasText: 'Enable Referrals' }) });
				const checkbox = enableReferralsRow.locator('input[type="checkbox"]');
				if (!(await checkbox.isChecked())) {
					// force:true because the real checkbox is CSS-hidden behind a
					// styled div — a plain label click doesn't reliably forward
					// to a display:none input in Chrome, so click it directly.
					await checkbox.evaluate((el) => el.click());
				}
			}

			await expect(input).toBeVisible();
			await stepShot(page, testInfo, `${field.label}-before`);

			const currentValue = await input.inputValue();
			const targetValue = field.values.find((v) => v !== currentValue) || field.values[0];

			await input.fill('');
			await input.fill(targetValue);
			await stepShot(page, testInfo, `${field.label}-changed`);

			await saveSettings(page);
			await stepShot(page, testInfo, `${field.label}-saved`);

			await page.reload();
			await page.waitForSelector('.pointbay-p-page-default');
			const reloadedRow = page.locator('tr', { has: page.locator('th', { hasText: field.label }) });
			const reloadedInput = reloadedRow.locator('input').first();
			await expect(reloadedInput).toHaveValue(targetValue);
			await stepShot(page, testInfo, `${field.label}-reloaded-confirmed`);
		});
	}

	for (const field of SELECT_FIELDS) {
		test(`${field.label} saves and persists`, async ({ page }, testInfo) => {
			const row = page.locator('tr', { has: page.locator('th', { hasText: field.label }) });
			const trigger = row.locator('[role="combobox"]');

			await expect(trigger).toBeVisible();
			await stepShot(page, testInfo, `${field.label}-before`);

			const currentText = await trigger.textContent();
			const targetLabel = field.optionLabels.find((l) => !currentText.includes(l)) || field.optionLabels[0];

			await trigger.click();
			const option = page.locator('[role="listbox"] [role="option"]', { hasText: targetLabel });
			await option.click();
			await expect(trigger).toContainText(targetLabel);
			await stepShot(page, testInfo, `${field.label}-changed`);

			await saveSettings(page);
			await stepShot(page, testInfo, `${field.label}-saved`);

			await page.reload();
			await page.waitForSelector('.pointbay-p-page-default');
			const reloadedRow = page.locator('tr', { has: page.locator('th', { hasText: field.label }) });
			await expect(reloadedRow.locator('[role="combobox"]')).toContainText(targetLabel);
			await stepShot(page, testInfo, `${field.label}-reloaded-confirmed`);
		});
	}

	for (const label of CHECKBOX_FIELDS) {
		test(`${label} toggle saves and persists`, async ({ page }, testInfo) => {
			const row = page.locator('tr', { has: page.locator('th', { hasText: label }) });
			const checkbox = row.locator('input[type="checkbox"]');

			await stepShot(page, testInfo, `${label}-before`);
			const wasChecked = await checkbox.isChecked();

			await checkbox.evaluate((el) => el.click());
			await stepShot(page, testInfo, `${label}-toggled`);
			await expect(checkbox).toHaveJSProperty('checked', !wasChecked);

			await saveSettings(page);
			await stepShot(page, testInfo, `${label}-saved`);

			await page.reload();
			await page.waitForSelector('.pointbay-p-page-default');
			const reloadedRow = page.locator('tr', { has: page.locator('th', { hasText: label }) });
			await expect(reloadedRow.locator('input[type="checkbox"]')).toHaveJSProperty('checked', !wasChecked);
			await stepShot(page, testInfo, `${label}-reloaded-confirmed`);

			// Restore original state so this test is repeatable and doesn't
			// leak a changed toggle into the next test in the file.
			await reloadedRow.locator('input[type="checkbox"]').evaluate((el) => el.click());
			await saveSettings(page);
		});
	}
});
