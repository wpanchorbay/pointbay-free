const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, updateSettings, toggleCheckbox,
    seedCustomer, clearCustomerCart, addToCartAndViewCart,
    pointbayWcLogLineCount, pointbayWcLogLinesSince, runUninstallRoutine, pointbayTablesExist,
    pointbayOptionRowExists, recreatePointbayTables, restorePointbayDefaultsOption,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

test.describe('Display & System (Free)', () => {
    test('Guest Notice ON shows the earn-prompt to a logged-out visitor', async ({ page }) => {
        const log = new TestLogger('04-display-system.spec.js', 'guest-notice-on').attach(page);
        log.start();
        const original = await getSetting('display_guestNoticeEnabled');

        try {
            await log.step(1, 'Log in as admin, set Guest Notice ON');
            await login(page, log);
            await openSettings(page);
            if ((await getSetting('display_guestNoticeEnabled')) !== true) {
                await toggleCheckbox(page, 'Guest Notice', true);
                await log.step(2, 'Save and confirm');
                await saveAndConfirm(page);
            }
            expect(await getSetting('display_guestNoticeEnabled')).toBe(true);

            await log.step(3, 'View the cart as a logged-out guest — notice should be visible');
            await page.context().clearCookies();
            await addToCartAndViewCart(page, 'earn-test-product');
            await log.snapshot(page, 'cart-guest-notice-on');
            // GuestNotice.php emits a plain <div class="pointbay-guest-notice">, but
            // WC Blocks Cart reflows legacy woocommerce_before_cart_totals HTML into
            // its own totals-row markup and drops the original wrapper/class entirely
            // — confirmed live via DOM inspection, the text survives as a
            // `.wc-block-components-totals-item__label` span, not the plugin's class.
            // Match by the notice's actual (translatable) text instead.
            const notice = page.getByText('Create an account to earn', { exact: false });
            await expect(notice).toBeVisible({ timeout: 10000 });
            await expect(notice).toContainText('points on this order');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ display_guestNoticeEnabled: original });
        }
    });

    test('Guest Notice OFF hides the earn-prompt to a logged-out visitor', async ({ page }) => {
        // BUG-02 (see BUGS-FOUND.md): on the WC Blocks storefront (the default),
        // EarnNoticeBlock.tsx renders the guest-facing earn prompt unconditionally
        // whenever points would be earned — it never checks display_guestNoticeEnabled,
        // and BlockIntegration::get_script_data() never even passes the flag to the
        // block. Only the classic-checkout PHP path (GuestNotice.php) respects the
        // toggle. Confirmed live: turning the setting OFF has zero effect on Blocks.
        test.fixme(true, 'BUG-02: display_guestNoticeEnabled has no effect on WC Blocks cart/checkout — see BUGS-FOUND.md');

        const log = new TestLogger('04-display-system.spec.js', 'guest-notice-off').attach(page);
        log.start();
        const original = await getSetting('display_guestNoticeEnabled');

        try {
            await log.step(1, 'Log in as admin, set Guest Notice OFF');
            await login(page, log);
            await openSettings(page);
            if ((await getSetting('display_guestNoticeEnabled')) !== false) {
                await toggleCheckbox(page, 'Guest Notice', false);
                await log.step(2, 'Save and confirm');
                await saveAndConfirm(page);
            }
            expect(await getSetting('display_guestNoticeEnabled')).toBe(false);

            await log.step(3, 'View the cart as a logged-out guest — notice should be absent');
            await page.context().clearCookies();
            await addToCartAndViewCart(page, 'earn-test-product');
            await log.snapshot(page, 'cart-guest-notice-off');
            const notice = page.getByText('Create an account to earn', { exact: false });
            await expect(notice).toHaveCount(0);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ display_guestNoticeEnabled: original });
        }
    });

    test('Debug Logging gates whether PointBay writes to the WooCommerce log', async ({ page }) => {
        const log = new TestLogger('04-display-system.spec.js', 'debug-logging-toggle').attach(page);
        log.start();
        const original = await getSetting('debug_enableMode');
        const originalRedemptionMode = await getSetting('redemption_mode');

        try {
            await log.step(1, 'Log in as admin, ensure Debug Logging is OFF and Redemption Mode is fee');
            await login(page, log);
            await openSettings(page);
            if ((await getSetting('debug_enableMode')) !== false) {
                await toggleCheckbox(page, 'Debug Logging', false);
                await saveAndConfirm(page);
            }
            expect(await getSetting('debug_enableMode')).toBe(false);
            if (originalRedemptionMode !== 'fee') {
                await updateSettings({ redemption_mode: 'fee' });
            }
            // The distinguishing action: FeeRedemption::apply_fee() runs on
            // EVERY cart-fee calculation (woocommerce_cart_calculate_fees) —
            // a real PHP hook fired on any cart view, unlike the earn-points
            // NOTICE itself. Confirmed live: that notice text is rendered by a
            // separate React component for WC Blocks (src/checkout/EarnNoticeBlock.tsx)
            // which never calls pointbay_log() at all — only the classic-checkout
            // PHP path (app/Checkout/EarnNotice.php) does, so asserting against
            // the notice was a dead end on the (Blocks-default) storefront.
            // apply_fee() is unconditionally PHP-side for BOTH checkout modes.
            // The log file is cumulative across this whole reused env's
            // history, so compare a before/after line count rather than
            // tailing N lines — a tail can include stale entries from an
            // earlier debug-enabled run and false-positive.
            await log.step(2, 'View cart as a customer with Debug Logging OFF — no new log line');
            const customerId = await seedCustomer({ username: 'e2ereferrer', email: 'e2ereferrer@example.com', password: 'E2ePass123!' });
            const countBeforeOff = await pointbayWcLogLineCount();
            await clearCustomerCart('e2ereferrer');
            await login(page, log, { username: 'e2ereferrer', password: 'E2ePass123!' });
            await addToCartAndViewCart(page, 'earn-test-product');
            const newLinesOff = await pointbayWcLogLinesSince(countBeforeOff);
            expect(newLinesOff).not.toContain('FeeRedemption');

            await log.step(3, 'Turn Debug Logging ON and confirm the same action now logs');
            await login(page, log);
            await openSettings(page);
            await toggleCheckbox(page, 'Debug Logging', true);
            await log.step(4, 'Save and confirm');
            await saveAndConfirm(page);
            expect(await getSetting('debug_enableMode')).toBe(true);

            const countBeforeOn = await pointbayWcLogLineCount();
            await clearCustomerCart('e2ereferrer');
            await login(page, log, { username: 'e2ereferrer', password: 'E2ePass123!' });
            await addToCartAndViewCart(page, 'earn-test-product');
            const newLinesOn = await pointbayWcLogLinesSince(countBeforeOn);
            expect(newLinesOn).toContain('FeeRedemption');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ debug_enableMode: original, redemption_mode: originalRedemptionMode });
        }
    });

    // Genuinely destructive by design (drops PointBay's own tables + option) —
    // this is the ONLY way to observe advanced_deleteAllOnUninstall's real
    // effect, since it's uninstall.php's own logic, not a re-implementation.
    // Runs last in this file, recreates the schema and restores full settings
    // in `finally` so every spec after it still sees a clean, working plugin.
    test('Delete Data on Uninstall gates whether uninstall.php actually drops PointBay data', async ({ page }) => {
        const log = new TestLogger('04-display-system.spec.js', 'delete-on-uninstall').attach(page);
        log.start();
        const original = await getSetting('advanced_deleteAllOnUninstall');

        try {
            await log.step(1, 'Log in as admin and confirm Delete Data on Uninstall is OFF');
            await login(page, log);
            await openSettings(page);
            if ((await getSetting('advanced_deleteAllOnUninstall')) !== false) {
                await toggleCheckbox(page, 'Delete Data on Uninstall', false);
                await saveAndConfirm(page);
            }
            expect(await getSetting('advanced_deleteAllOnUninstall')).toBe(false);

            await log.step(2, 'Run the real uninstall.php while OFF — data must survive');
            await runUninstallRoutine();
            expect(await pointbayTablesExist()).toBe(true);
            expect(await pointbayOptionRowExists()).toBe(true);

            await log.step(3, 'Turn Delete Data on Uninstall ON and save');
            await login(page, log);
            await openSettings(page);
            await toggleCheckbox(page, 'Delete Data on Uninstall', true);
            await log.step(4, 'Save and confirm');
            await saveAndConfirm(page);
            expect(await getSetting('advanced_deleteAllOnUninstall')).toBe(true);

            await log.step(5, 'Run the real uninstall.php while ON — data must be dropped');
            await runUninstallRoutine();
            expect(await pointbayTablesExist()).toBe(false);
            // NOT getSetting()/get_option() — WordPress core's register_setting()
            // was called with a 'default' array for this option (Settings::register()),
            // so get_option() falls back to that default whenever the row is
            // missing, without ever writing it back. That fallback makes a
            // genuinely-deleted option look identical to a present one from
            // get_option()'s perspective. Read the raw DB row instead.
            expect(await pointbayOptionRowExists()).toBe(false);
            await log.snapshot(page, 'post-uninstall-state');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            // Recovery, not cleanup: the whole rest of the suite depends on
            // PointBay's schema and settings existing again.
            await recreatePointbayTables();
            await restorePointbayDefaultsOption();
            await updateSettings({ advanced_deleteAllOnUninstall: original });
        }
    });
});
