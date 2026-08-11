const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, updateSettings, selectOption,
    creditPointsFixture, clearCustomerCart, placeOrder, redeemPointsAtCheckout,
    orderHasPointsFee, orderHasPointsCoupon, wpEval,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

/**
 * Redemption Mode — the setting decides HOW a redeemed-points discount is
 * represented on the order: a negative cart fee, or a virtual single-use
 * coupon (mutually exclusive real WooCommerce mechanisms, see
 * app/Checkout/FeeRedemption.php and CouponRedemption.php). Each mode gets
 * its own real checkout: credit a fixture balance, redeem points through the
 * REAL checkout widget, place the order, and assert the mode-specific
 * artifact landed on the order (not just that the total dropped — a fee and
 * a coupon can produce the same total, so the artifact itself is the proof).
 */
test.describe('Redemption — mode drives fee vs. coupon on the order (Free)', () => {
    for (const mode of [
        { value: 'fee', optionLabel: 'Cart Fee (WC_Fee)' },
        { value: 'coupon', optionLabel: 'Virtual Coupon (WC_Coupon)' },
    ]) {
        test(`Redemption Mode "${mode.value}" produces a ${mode.value} on the order`, async ({ page }) => {
            // BUG-01 (fixed, see BUGS-FOUND.md): "coupon" mode's virtual coupon (id => 0,
            // not a real wp_posts coupon) used to crash WooCommerce's Blocks Store API
            // coupon-usage-limit validation with an uncaught fatal error on Place Order.
            // Fixed in app/Checkout/CouponRedemption.php by setting usage_limit /
            // usage_limit_per_user to 0 so WooCommerce never touches the coupon's (null)
            // data store. No longer quarantined.

            const log = new TestLogger('02-redemption.spec.js', `redemption-mode-${mode.value}`).attach(page);
            log.start();
            const originalMode = await getSetting('redemption_mode');

            try {
                await log.step(1, 'Log in as admin and set Redemption Mode');
                await login(page, log);
                await openSettings(page);
                if (originalMode === mode.value) {
                    // Already at the target — selecting the SAME option produces no
                    // dirty state and Save stays disabled forever (confirmed live).
                    // Nothing to change or save; the setting is already correct.
                    await log.info?.(`Redemption Mode already "${mode.value}" — nothing to save`);
                } else {
                    await selectOption(page, 'Redemption Mode', mode.optionLabel);
                    await log.step(2, 'Save and confirm');
                    await saveAndConfirm(page);
                }
                expect(await getSetting('redemption_mode')).toBe(mode.value);

                await log.step(3, 'Credit the test customer a redeemable fixture balance (500 points)');
                const customerId = Number(await wpEval(`$u = get_user_by('login','e2ecustomer'); echo $u ? $u->ID : '';`));
                await creditPointsFixture(customerId, 500, `fixture for redemption-${mode.value} test`);

                await log.step(4, 'Log in as the test customer');
                await clearCustomerCart('e2ecustomer');
                await login(page, log, { username: 'e2ecustomer', password: 'E2ePass123!' });

                await log.step(5, 'Redeem 200 points at checkout, then place the order');
                const { orderId } = await placeOrder(page, {
                    productSlug: 'earn-test-product',
                    customerUsername: 'e2ecustomer',
                    beforePlaceOrder: async (p) => {
                        await log.step(0, 'Apply 200-point discount via the real checkout widget');
                        await redeemPointsAtCheckout(p, 200);
                    },
                    log,
                });
                await log.snapshot(page, 'order-received');

                await log.step(6, `Confirm the order carries a ${mode.value}, not the other mechanism`);
                const hasFee = await orderHasPointsFee(orderId);
                const hasCoupon = await orderHasPointsCoupon(orderId);
                if (mode.value === 'fee') {
                    expect(hasFee).toBe(true);
                    expect(hasCoupon).toBe(false);
                } else {
                    expect(hasCoupon).toBe(true);
                    expect(hasFee).toBe(false);
                }

                await log.step(7, 'Confirm the order total reflects the $2 discount ($10 - $2 = $8)');
                const total = await wpEval(`echo wc_get_order(${orderId})->get_total();`);
                expect(Number(total)).toBe(8);

                log.end('passed');
            } catch (err) {
                await log.snapshot(page, 'failure');
                log.end('failed');
                throw err;
            } finally {
                await updateSettings({ redemption_mode: originalMode });
            }
        });
    }
});
