const qit = require('@woocommerce/qit-runtime').default;

const SETTINGS_PATH = '/wp-admin/admin.php?page=wc-settings&tab=pointbay';

/** Logs in as the QIT-provisioned WP admin and opens the Loyalty Points settings screen. */
async function loginAndOpenSettings(page) {
	await page.goto('/wp-login.php');
	await page.fill('#user_login', qit.env.wp.username);
	await page.fill('#user_pass', qit.env.wp.password);
	await page.click('#wp-submit');
	await page.goto(SETTINGS_PATH);
	await page.waitForSelector('.pointbay-p-page-default');
}

/**
 * Screenshots the current page state, named and numbered so a reviewer can
 * follow a test step-by-step in file-listing order.
 */
let stepCounter = 0;
async function stepShot(page, testInfo, label) {
	stepCounter += 1;
	const fileName = `${String(stepCounter).padStart(2, '0')}-${label}.png`;
	await page.screenshot({
		path: `screenshots/${testInfo.title.replace(/[^a-z0-9]+/gi, '-')}/${fileName}`,
		fullPage: true,
	});
	await testInfo.attach(label, {
		path: `screenshots/${testInfo.title.replace(/[^a-z0-9]+/gi, '-')}/${fileName}`,
		contentType: 'image/png',
	});
}

function resetStepCounter() {
	stepCounter = 0;
}

async function saveSettings(page) {
	const saveButton = page.locator('button[name="save"]');
	await saveButton.click();
	// Settings.tsx disables the save button again once the POST resolves —
	// waiting for that is a more reliable "save finished" signal than a fixed sleep.
	await page.waitForFunction(
		() => {
			const btn = document.querySelector('button[name="save"]');
			return btn && btn.disabled;
		},
		{ timeout: 10000 }
	);
}

module.exports = { loginAndOpenSettings, stepShot, resetStepCounter, saveSettings, SETTINGS_PATH };
