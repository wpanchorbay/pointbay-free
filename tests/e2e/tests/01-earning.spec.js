const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, updateSettings,
    clearCustomerCart, placeOrder, completeOrder, ledgerDeltaFor,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

/**
 * Earning — Points Per Dollar. The behavioral vertical slice: change the
 * setting through the real Settings UI, save, confirm persisted, then place a
 * REAL order through the storefront checkout, complete it via the admin order
 * screen, and assert the ledger credited exactly subtotal x rate for THIS
 * order (a per-order delta, never the running balance — the env is reused and
 * stateful across runs).
 */
test.describe('Earning — Points Per Dollar drives credit (Free)', () => {
    test('Points Per Dollar changes points credited on a real order', async ({ page }, testInfo) => {
        const log = new TestLogger('01-earning.spec.js', 'points-per-dollar-drives-credit').attach(page);
        log.start();
        const original = await getSetting('earning_pointsPerDollar');

        try {
            await log.step(1, 'Log in as admin and open Settings');
            await login(page, log);
            await openSettings(page);

            // Idempotent target: pick whichever candidate differs from the
            // current value, so a re-run against the same stateful env is a
            // real change (otherwise Save stays disabled and the click hangs).
            const candidates = ['5', '7'];
            const rate = candidates.find((v) => v !== String(original)) || candidates[0];

            await log.step(2, `Set Points Per Dollar to ${rate}`);
            const input = page.locator('tr', { has: page.locator('th', { hasText: 'Points Per Dollar' }) }).locator('input').first();
            await input.fill('');
            await input.fill(rate);

            await log.step(3, 'Save and confirm');
            await saveAndConfirm(page);
            expect(String(await getSetting('earning_pointsPerDollar'))).toBe(rate);

            await log.step(4, 'Log in as the test customer');
            // Must clear the persistent cart BEFORE login, not after: WooCommerce
            // restores a customer's saved cart into the session right at login,
            // so clearing the underlying usermeta afterward doesn't touch the
            // session's already-loaded copy. Confirmed live: a stray item from
            // an earlier debugging session survived a post-login clear and
            // silently inflated this order's total (and its point credit) by
            // 11x. See placeOrder()'s own clear for the "called standalone,
            // no prior login this test" case — this is the one that actually
            // matters when login() precedes it, as it does here.
            await clearCustomerCart('e2ecustomer');
            await login(page, log, { username: 'e2ecustomer', password: 'E2ePass123!' });

            await log.step(5, 'Place a real order for the $10 test product via storefront checkout');
            const { orderId } = await placeOrder(page, { productSlug: 'earn-test-product', customerUsername: 'e2ecustomer', log });
            await log.snapshot(page, 'order-received');

            await log.step(6, 'Log in as admin and transition the order to Completed');
            await login(page, log);
            await completeOrder(page, orderId);
            await log.snapshot(page, 'order-completed');

            await log.step(7, `Ledger: THIS order credited $10 x ${rate} = ${10 * Number(rate)} points`);
            const credited = await ledgerDeltaFor(orderId);
            expect(credited).toBe(10 * Number(rate));

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ earning_pointsPerDollar: original });
        }
    });
});
