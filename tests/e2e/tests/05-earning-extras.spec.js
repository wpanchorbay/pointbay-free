const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, updateSettings, settingRow, selectOption,
    disableComingSoon, enableCodGateway, clearCustomerCart, placeOrder, setOrderStatus,
    ledgerDeltaFor, deleteCustomerIfExists, registerCustomer, enableCustomerRegistration,
    submitProductReview, getCommentApprovalStatus, approveReviewViaAdmin, wpEval,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

/**
 * Earning extras — three earning settings not covered by 01-earning.spec.js:
 * Points for Registration (credits on user_register, unconditionally),
 * Points for Product Review (credits only once a review is APPROVED, unless
 * it auto-approves at insert — either way the credit landed via the same
 * approval-transition hook), and Order Status Trigger (which single order
 * status change credits — proven by showing a non-default trigger status
 * credits at THAT transition and not at the usual "completed" transition).
 */
test.describe('Earning extras (Free)', () => {
    test('Points for Registration credits a brand-new customer on signup', async ({ page }) => {
        const log = new TestLogger('05-earning-extras.spec.js', 'points-for-registration').attach(page);
        log.start();
        const original = await getSetting('earning_pointsForRegistration');
        const bonus = 75; // distinct from the 0 default
        const newUsername = 'e2eregistrant';
        const newEmail = 'e2eregistrant@example.com';

        try {
            await log.step(1, 'Log in as admin, set Points for Registration, and enable registration');
            await login(page, log);
            await enableCustomerRegistration();
            await openSettings(page);
            const bonusInput = settingRow(page, 'Points for Registration').locator('input[type="number"]');
            await bonusInput.fill(String(bonus));
            await log.step(2, 'Save and confirm');
            await saveAndConfirm(page);
            expect(Number(await getSetting('earning_pointsForRegistration'))).toBe(bonus);

            await log.step(3, 'Register a brand-new customer through the real My Account form');
            await deleteCustomerIfExists(newUsername);
            await page.context().clearCookies();
            const newUserId = await registerCustomer(page, { username: newUsername, email: newEmail, password: 'E2ePass123!' });
            await log.snapshot(page, 'registered');

            await log.step(4, 'Confirm the new user was credited exactly the configured bonus');
            const credited = await ledgerDeltaFor(newUserId, 'registration');
            expect(credited).toBe(bonus);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ earning_pointsForRegistration: original });
        }
    });

    test('Points for Product Review credits only once the review is approved', async ({ page }) => {
        const log = new TestLogger('05-earning-extras.spec.js', 'points-for-review').attach(page);
        log.start();
        const original = await getSetting('earning_pointsForReview');
        const bonus = 30; // distinct from the 0 default
        const reviewerUsername = 'e2ereviewer';
        const reviewerEmail = 'e2ereviewer@example.com';

        try {
            await log.step(1, 'Log in as admin, set Points for Product Review');
            await login(page, log);
            await enableCustomerRegistration();
            await openSettings(page);
            const bonusInput = settingRow(page, 'Points for Product Review').locator('input[type="number"]');
            await bonusInput.fill(String(bonus));
            await log.step(2, 'Save and confirm');
            await saveAndConfirm(page);
            expect(Number(await getSetting('earning_pointsForReview'))).toBe(bonus);

            await log.step(3, 'Register a brand-new customer (guarantees their first review is held for moderation)');
            await deleteCustomerIfExists(reviewerUsername);
            await page.context().clearCookies();
            const reviewerId = await registerCustomer(page, { username: reviewerUsername, email: reviewerEmail, password: 'E2ePass123!' });

            await log.step(4, 'Submit a real product review via the storefront form');
            const commentId = await submitProductReview(page, {
                productSlug: 'earn-test-product',
                rating: 5,
                text: 'E2E review — testing the review-bonus credit path.',
            });
            await log.snapshot(page, 'review-submitted');

            await log.step(5, 'Confirm the review is held for moderation and NOT yet credited');
            expect(await getCommentApprovalStatus(commentId)).toBe('0');
            expect(await ledgerDeltaFor(commentId, 'review')).toBe(0);

            await log.step(6, 'Approve the review via the real WooCommerce Reviews admin screen');
            await login(page, log);
            await approveReviewViaAdmin(page, commentId);
            expect(await getCommentApprovalStatus(commentId)).toBe('1');
            await log.snapshot(page, 'review-approved');

            await log.step(7, 'Confirm the reviewer was credited exactly the configured bonus, keyed to this comment');
            const credited = await ledgerDeltaFor(commentId, 'review');
            expect(credited).toBe(bonus);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ earning_pointsForReview: original });
        }
    });

    test('Order Status Trigger "Processing" credits at that transition, not at Completed', async ({ page }) => {
        const log = new TestLogger('05-earning-extras.spec.js', 'order-status-trigger-processing').attach(page);
        log.start();
        const original = await getSetting('earning_orderStatusTrigger');
        const originalRate = await getSetting('earning_pointsPerDollar');

        try {
            await log.step(1, 'Log in as admin, set Order Status Trigger to Processing');
            await login(page, log);
            await openSettings(page);
            if (original !== 'processing') {
                await selectOption(page, 'Order Status Trigger', 'Processing');
                await log.step(2, 'Save and confirm');
                await saveAndConfirm(page);
            }
            expect(await getSetting('earning_orderStatusTrigger')).toBe('processing');
            // Pin a known rate so the expected credit is deterministic regardless
            // of what an earlier spec's finally left behind.
            if (Number(originalRate) !== 1) {
                await updateSettings({ earning_pointsPerDollar: 1 });
            }

            await log.step(3, 'Place a real order as a customer — WooCommerce COD lands new orders on "processing" directly');
            await clearCustomerCart('e2ereferrer');
            await login(page, log, { username: 'e2ereferrer', password: 'E2ePass123!' });
            const { orderId } = await placeOrder(page, { productSlug: 'earn-test-product', customerUsername: 'e2ereferrer', log });
            await log.snapshot(page, 'order-received-processing');

            await log.step(4, 'Confirm the order was credited already, at the processing transition');
            const creditedAtProcessing = await ledgerDeltaFor(orderId);
            expect(creditedAtProcessing).toBe(10); // $10 product × rate 1

            await log.step(5, 'Transition the SAME order to Completed and confirm no double-credit');
            await login(page, log);
            await setOrderStatus(page, orderId, 'completed');
            const creditedAtCompleted = await ledgerDeltaFor(orderId);
            expect(creditedAtCompleted).toBe(creditedAtProcessing);
            await log.snapshot(page, 'order-completed-no-double-credit');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ earning_orderStatusTrigger: original, earning_pointsPerDollar: originalRate });
        }
    });
});
