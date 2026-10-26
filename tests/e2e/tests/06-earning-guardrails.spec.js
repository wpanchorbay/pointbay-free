const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, updateSettings, settingRow, toggleCheckbox,
    snapshotSettings, restoreSettings, creditPointsFixture, clearCustomerCart, placeOrder,
    redeemPointsAtCheckout, addToCartAndViewCart, getProductIdBySlug, setOrderStatus, completeOrder,
    ledgerDeltaFor, ledgerSumFor, getOrderMeta, getOrderTotal, getOrderPaymentMethod, getOrderNotes, wpEval,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

/**
 * Earning guardrails — three F1 behaviors, each proven by setting the option,
 * doing the REAL action (storefront views, a real checkout, an admin status
 * change) and asserting the effect:
 *   1. Minimum order amount to earn points (`earning_minCartSpend`) + the
 *      minimum spend message (`display_minSpendMessage`): below the minimum the
 *      storefront says how much more to spend and the order awards NOTHING
 *      (flat/first-order bonuses included); at the minimum it awards normally.
 *   2. Points paid with points: the part of an order paid with redeemed points
 *      never earns; the award breakdown records it and a private order note
 *      says so.
 *   3. Take back earned points when a completed order is cancelled
 *      (`earning_reverseOnCancel`, default on); COD cancels are always reversed
 *      and re-awarded once if the order is reopened.
 *
 * Every order is measured as a per-order ledger delta (the env is reused and
 * stateful). The storefront under test is the WC Blocks cart/checkout (the QIT
 * default) so the notices asserted are the ones EarnNoticeBlock.tsx renders from
 * the Store API extension data; the classic-checkout PHP notice is not
 * exercised here. Basis is pinned to "subtotal" so a $10 product is exactly a
 * $10 basis and the shipping-not-chosen-yet rule (which hides the shortfall in
 * "total" mode) can never interfere.
 */

const CUSTOMER = { username: 'e2ecustomer', password: 'E2ePass123!' };
const PRODUCT = 'earn-test-product'; // $10, seeded by 00-setup

// Every setting these specs read or write, snapshotted and put back in finally.
const PINNED_KEYS = [
    'earning_basis', 'earning_pointsPerDollar', 'earning_flatPointsPerOrder', 'earning_firstOrderBonus',
    'earning_bands', 'earning_minCartSpend', 'earning_orderStatusTrigger', 'earning_reverseOnCancel',
    'display_minSpendMessage', 'display_productNoticeEnabled',
    'redemption_mode', 'redemption_pointsValue', 'redemption_minPoints', 'redemption_allowPartial',
];

// A known-neutral earning configuration; each test overrides only what it is about.
const BASELINE = {
    earning_basis: 'subtotal',
    earning_pointsPerDollar: 1,
    earning_flatPointsPerOrder: 0,
    earning_firstOrderBonus: 0,
    earning_bands: [],
    earning_minCartSpend: 0,
    earning_orderStatusTrigger: 'completed',
    earning_reverseOnCancel: true,
    display_minSpendMessage: 'Spend {amount} more to earn {points} points.',
    display_productNoticeEnabled: true,
    redemption_mode: 'fee',
    redemption_pointsValue: 0.01,
    redemption_minPoints: 100,
    redemption_allowPartial: true,
};

// Clear the persistent cart BEFORE logging in (see 01-earning.spec.js on why
// clearing afterwards does not reach the session WooCommerce already loaded).
async function customerSession(page, log) {
    await clearCustomerCart(CUSTOMER.username);
    await login(page, log, CUSTOMER);
}

async function customerId() {
    return Number(await wpEval(`$u = get_user_by('login','${CUSTOMER.username}'); echo $u ? $u->ID : '';`));
}

test.describe('Earning guardrails (Free)', () => {
    test('Minimum order amount: below it the storefront shows the shortfall and the order awards nothing', async ({ page }) => {
        test.setTimeout(240000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'min-spend-below-awards-zero').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);

        try {
            await log.step(1, 'Pin a neutral earning config: 1 pt/$, subtotal basis, +20 flat bonus (so we can prove bonuses are gated too)');
            await updateSettings({ ...BASELINE, earning_flatPointsPerOrder: 20 });

            await log.step(2, 'Log in as admin and set Minimum order amount to 10.01 through the Settings UI (one cent above the $10 product)');
            await login(page, log);
            await openSettings(page);
            await settingRow(page, 'Minimum order amount to earn points').locator('input[type="number"]').fill('10.01');
            await saveAndConfirm(page);
            expect(Number(await getSetting('earning_minCartSpend'))).toBe(10.01);

            await log.step(3, 'Product page (empty cart): the minimum-spend notice replaces the normal earn notice');
            await customerSession(page, log);
            const productId = await getProductIdBySlug(PRODUCT);
            await page.goto(`/?p=${productId}`, { waitUntil: 'domcontentloaded' });
            // Reaching 10.01 would earn floor(10.01 x 1) + 20 flat = 30 points; $0.01 is left to spend.
            const productNotice = page.locator('.pointbay-product-earn-notice--minimum');
            await expect(productNotice).toBeVisible({ timeout: 15000 });
            await expect(productNotice).toHaveText(/Spend .*0\.01 more to earn 30 points\./);
            await log.snapshot(page, 'product-below-minimum');

            await log.step(4, 'Cart page: the same shortfall message');
            await addToCartAndViewCart(page, PRODUCT);
            await expect(page.getByText(/Spend .*0\.01 more to earn 30 points\./).first()).toBeVisible({ timeout: 20000 });
            await expect(page.getByText('Complete this order to earn')).toHaveCount(0);
            await log.snapshot(page, 'cart-below-minimum');

            await log.step(5, 'Checkout: same message, then place a real order');
            // Fresh session first — the cart above already holds the product and
            // placeOrder() adds it again, which would make it a $20 order.
            await customerSession(page, log);
            const { orderId } = await placeOrder(page, {
                productSlug: PRODUCT,
                customerUsername: CUSTOMER.username,
                beforePlaceOrder: async (p) => {
                    await expect(p.getByText(/Spend .*0\.01 more to earn 30 points\./).first()).toBeVisible({ timeout: 20000 });
                    await expect(p.getByText('Complete this order to earn')).toHaveCount(0);
                    await log.snapshot(p, 'checkout-below-minimum');
                },
                log,
            });

            await log.step(6, 'Complete the order as admin');
            await login(page, log);
            await completeOrder(page, orderId);

            await log.step(7, 'Nothing awarded: no base, no flat bonus, no first-order bonus, no award note');
            expect(await ledgerDeltaFor(orderId, 'order')).toBe(0);
            expect(await ledgerDeltaFor(orderId, 'order_flat_bonus')).toBe(0);
            expect(await ledgerDeltaFor(orderId, 'first_order_bonus')).toBe(0);
            const notes = await getOrderNotes(orderId);
            expect(notes.filter((n) => /PointBay: .* points awarded/.test(n.content))).toHaveLength(0);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });

    test('Minimum order amount: an order exactly at the minimum earns normally (boundary), bonuses included', async ({ page }) => {
        test.setTimeout(240000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'min-spend-boundary-awards').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);

        try {
            await log.step(1, 'Pin the config with Minimum order amount = 10.00 (exactly the $10 product) and a +20 flat bonus');
            await updateSettings({ ...BASELINE, earning_minCartSpend: 10, earning_flatPointsPerOrder: 20 });
            expect(Number(await getSetting('earning_minCartSpend'))).toBe(10);

            await log.step(2, 'Product page: no minimum-spend notice (the minimum is met)');
            await customerSession(page, log);
            const productId = await getProductIdBySlug(PRODUCT);
            await page.goto(`/?p=${productId}`, { waitUntil: 'domcontentloaded' });
            await expect(page.locator('.pointbay-product-earn-notice').first()).toBeVisible({ timeout: 15000 });
            await expect(page.locator('.pointbay-product-earn-notice--minimum')).toHaveCount(0);
            await log.snapshot(page, 'product-at-minimum');

            await log.step(3, 'Cart page: promises the full award (10 + 20 flat = 30) and no shortfall');
            await addToCartAndViewCart(page, PRODUCT);
            await expect(page.getByText('Complete this order to earn 30 points!').first()).toBeVisible({ timeout: 20000 });
            await expect(page.getByText(/more to earn/)).toHaveCount(0);
            await log.snapshot(page, 'cart-at-minimum');

            await log.step(4, 'Checkout: same promise, then place a real order');
            await customerSession(page, log);
            const { orderId } = await placeOrder(page, {
                productSlug: PRODUCT,
                customerUsername: CUSTOMER.username,
                beforePlaceOrder: async (p) => {
                    await expect(p.getByText('Complete this order to earn 30 points!').first()).toBeVisible({ timeout: 20000 });
                    await expect(p.getByText(/more to earn/)).toHaveCount(0);
                },
                log,
            });

            await log.step(5, 'Complete the order as admin');
            await login(page, log);
            await completeOrder(page, orderId);

            await log.step(6, 'Awarded in full: 10 base + 20 flat, and the private award note says 30');
            expect(await ledgerDeltaFor(orderId, 'order')).toBe(10);
            expect(await ledgerDeltaFor(orderId, 'order_flat_bonus')).toBe(20);
            const notes = await getOrderNotes(orderId);
            expect(notes.some((n) => /PointBay: 30 points awarded/.test(n.content))).toBe(true);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });

    test('Minimum spend message: a custom template is used on the product page and the cart', async ({ page }) => {
        test.setTimeout(180000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'min-spend-custom-message').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);
        const template = 'ZZ-QA add {amount} to unlock {points} pts';

        try {
            await log.step(1, 'Pin the config with Minimum order amount = 25 (no bonuses, 1 pt/$)');
            await updateSettings({ ...BASELINE, earning_minCartSpend: 25 });

            await log.step(2, 'Log in as admin and set the Minimum spend message through the Settings UI');
            await login(page, log);
            await openSettings(page);
            await settingRow(page, 'Minimum spend message').locator('input[type="text"]').fill(template);
            await saveAndConfirm(page);
            expect(await getSetting('display_minSpendMessage')).toBe(template);

            await log.step(3, 'Product page shows the custom wording: $15 left to spend, 25 points at the minimum');
            await customerSession(page, log);
            const productId = await getProductIdBySlug(PRODUCT);
            await page.goto(`/?p=${productId}`, { waitUntil: 'domcontentloaded' });
            await expect(page.locator('.pointbay-product-earn-notice--minimum')).toHaveText(/ZZ-QA add .*15\.00 to unlock 25 pts/, { timeout: 15000 });

            await log.step(4, 'Cart shows the same custom wording and not the default sentence');
            await addToCartAndViewCart(page, PRODUCT);
            await expect(page.getByText(/ZZ-QA add .*15\.00 to unlock 25 pts/).first()).toBeVisible({ timeout: 20000 });
            await expect(page.getByText(/more to earn/)).toHaveCount(0);
            await log.snapshot(page, 'cart-custom-message');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });

    test('Points paid with points never earn, and the award breakdown and a private order note record it', async ({ page }) => {
        test.setTimeout(240000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'points-paid-breakdown-and-note').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);

        try {
            await log.step(1, 'Pin the config: 2 pts/$, subtotal basis, fee-mode redemption at $0.01 per point, no minimum or bonuses');
            await updateSettings({ ...BASELINE, earning_pointsPerDollar: 2 });
            const userId = await customerId();
            await creditPointsFixture(userId, 1000, 'ZZ-QA points-paid fixture');

            await log.step(2, 'Place a real order and redeem 300 points ($3) at checkout');
            await customerSession(page, log);
            const { orderId } = await placeOrder(page, {
                productSlug: PRODUCT,
                customerUsername: CUSTOMER.username,
                beforePlaceOrder: async (p) => {
                    await redeemPointsAtCheckout(p, 300);
                },
                log,
            });
            await log.snapshot(page, 'order-received-with-points');
            expect(await getOrderTotal(orderId)).toBe(7); // $10 - $3 paid with points

            await log.step(3, 'Complete the order as admin');
            await login(page, log);
            await completeOrder(page, orderId);

            await log.step(4, 'Only the $7 paid in money earned: 7 x 2 = 14 points (not 10 x 2 = 20)');
            expect(await ledgerDeltaFor(orderId, 'order')).toBe(14);

            await log.step(5, 'The stored award breakdown records the $3 points-paid value and the $7 basis');
            const breakdown = JSON.parse(await getOrderMeta(orderId, '_pointbay_award_breakdown'));
            expect(Number(breakdown.points_paid_value)).toBeCloseTo(3, 2);
            expect(Number(breakdown.basis_amount)).toBeCloseTo(7, 2);
            expect(breakdown.basis_mode).toBe('subtotal');
            expect(Number(breakdown.total)).toBe(14);

            await log.step(6, 'A PRIVATE order note says what the award was measured on and that the points-paid part did not earn');
            const notes = await getOrderNotes(orderId);
            const awardNote = notes.find((n) => /PointBay: .* points awarded/.test(n.content));
            expect(awardNote, `no PointBay award note among: ${JSON.stringify(notes)}`).toBeTruthy();
            expect(awardNote.content).toMatch(/PointBay: 14 points awarded \(earning basis 7\.00, subtotal\)\./);
            expect(awardNote.content).toMatch(/3\.00 paid with points did not earn\./);
            expect(awardNote.customer_note).toBe(false);

            await log.step(7, 'Control: an order with no points redeemed earns on the full $10 and its note has no points-paid sentence');
            await customerSession(page, log);
            const control = await placeOrder(page, { productSlug: PRODUCT, customerUsername: CUSTOMER.username, log });
            await login(page, log);
            await completeOrder(page, control.orderId);
            expect(await ledgerDeltaFor(control.orderId, 'order')).toBe(20);
            const controlBreakdown = JSON.parse(await getOrderMeta(control.orderId, '_pointbay_award_breakdown'));
            expect(Number(controlBreakdown.points_paid_value)).toBe(0);
            const controlNotes = await getOrderNotes(control.orderId);
            const controlNote = controlNotes.find((n) => /PointBay: .* points awarded/.test(n.content));
            expect(controlNote, `no PointBay award note among: ${JSON.stringify(controlNotes)}`).toBeTruthy();
            expect(controlNote.content).toMatch(/PointBay: 20 points awarded \(earning basis 10\.00, subtotal\)\./);
            expect(controlNote.content).not.toContain('paid with points');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });

    // The checkout helper can only place Cash on Delivery orders, and COD is the
    // one method that is ALWAYS reversed. To exercise the setting itself, a real
    // order is switched to another payment method (a fixture edit, after the
    // award) before it is cancelled through the real admin order screen.
    async function placeAndCompleteOrder(page, log) {
        await customerSession(page, log);
        const { orderId } = await placeOrder(page, { productSlug: PRODUCT, customerUsername: CUSTOMER.username, log });
        await login(page, log);
        await completeOrder(page, orderId);
        expect(await ledgerDeltaFor(orderId, 'order')).toBe(10); // $10 x 1 pt/$
        return orderId;
    }
    async function switchToNonCod(orderId) {
        await wpEval(`$o = wc_get_order(${orderId}); $o->set_payment_method('bacs'); $o->save(); echo 'OK';`);
        expect(await getOrderPaymentMethod(orderId)).toBe('bacs');
    }

    test('Take back points on cancel ON (default): a cancelled completed order is reversed, and restored once if reopened', async ({ page }) => {
        test.setTimeout(240000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'cancel-clawback-on').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);

        try {
            await log.step(1, 'Pin the config with Take Back Points When an Order Is Cancelled ON (the default)');
            await updateSettings({ ...BASELINE, earning_reverseOnCancel: true });

            await log.step(2, 'Place a real order, complete it as admin, and confirm the 10-point award');
            const orderId = await placeAndCompleteOrder(page, log);
            await switchToNonCod(orderId);

            await log.step(3, 'Cancel the completed non-COD order on the admin order screen');
            await setOrderStatus(page, orderId, 'cancelled');
            expect(await getOrderPaymentMethod(orderId)).not.toBe('cod'); // guard: the admin form must not have flipped it back
            await log.snapshot(page, 'order-cancelled');

            await log.step(4, 'The earned 10 points were taken back (one reversal debit keyed to the order)');
            expect(await ledgerSumFor(orderId, 'order_reversal', 'debit')).toBe(10);
            expect(await ledgerDeltaFor(orderId, 'order')).toBe(10); // the original award row is untouched; the reversal is a separate debit

            await log.step(5, 'Reopen to Completed: the 10 points are restored exactly once');
            await completeOrder(page, orderId);
            expect(await ledgerSumFor(orderId, 'order_reaward', 'credit')).toBe(10);
            expect(await ledgerSumFor(orderId, 'order_reversal', 'debit')).toBe(10);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });

    test('Take back points on cancel OFF: a non-COD cancel keeps the earned points', async ({ page }) => {
        test.setTimeout(240000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'cancel-clawback-off-non-cod').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);

        try {
            await log.step(1, 'Pin a neutral config with the take-back setting ON, then turn it OFF through the Settings UI');
            await updateSettings({ ...BASELINE, earning_reverseOnCancel: true });
            await login(page, log);
            await openSettings(page);
            await toggleCheckbox(page, 'Take Back Points When an Order Is Cancelled', false);
            await saveAndConfirm(page);
            expect(await getSetting('earning_reverseOnCancel')).toBe(false);

            await log.step(2, 'Place a real order, complete it as admin, and confirm the 10-point award');
            const orderId = await placeAndCompleteOrder(page, log);
            await switchToNonCod(orderId);

            await log.step(3, 'Cancel the completed non-COD order on the admin order screen');
            await setOrderStatus(page, orderId, 'cancelled');
            expect(await getOrderPaymentMethod(orderId)).not.toBe('cod');
            await log.snapshot(page, 'order-cancelled-setting-off');

            await log.step(4, 'Nothing was taken back: no reversal debit, award row intact');
            expect(await ledgerSumFor(orderId, 'order_reversal', 'debit')).toBe(0);
            expect(await ledgerDeltaFor(orderId, 'order')).toBe(10);

            await log.step(5, 'Reopen to Completed: nothing to restore, so no re-award either (no double credit)');
            await completeOrder(page, orderId);
            expect(await ledgerSumFor(orderId, 'order_reaward', 'credit')).toBe(0);
            expect(await ledgerDeltaFor(orderId, 'order')).toBe(10);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });

    test('Take back points on cancel OFF: a Cash on Delivery cancel is STILL reversed, and restored once if reopened', async ({ page }) => {
        test.setTimeout(240000);
        const log = new TestLogger('06-earning-guardrails.spec.js', 'cancel-clawback-off-cod-always').attach(page);
        log.start();
        const original = await snapshotSettings(PINNED_KEYS);

        try {
            await log.step(1, 'Pin the config with the take-back setting OFF');
            await updateSettings({ ...BASELINE, earning_reverseOnCancel: false });
            expect(await getSetting('earning_reverseOnCancel')).toBe(false);

            await log.step(2, 'Place a real COD order, complete it as admin, and confirm the 10-point award');
            const orderId = await placeAndCompleteOrder(page, log);
            expect(await getOrderPaymentMethod(orderId)).toBe('cod');

            await log.step(3, 'Cancel the completed COD order on the admin order screen');
            await setOrderStatus(page, orderId, 'cancelled');
            await log.snapshot(page, 'cod-order-cancelled');

            await log.step(4, 'Reversed regardless of the setting: a cash order has no gateway refund to do it');
            expect(await ledgerSumFor(orderId, 'order_reversal', 'debit')).toBe(10);

            await log.step(5, 'Reopen to Completed: the points come back exactly once');
            await completeOrder(page, orderId);
            expect(await ledgerSumFor(orderId, 'order_reaward', 'credit')).toBe(10);
            expect(await ledgerSumFor(orderId, 'order_reversal', 'debit')).toBe(10);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(original);
        }
    });
});
