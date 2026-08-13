const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, updateSettings,
    toggleCheckbox, settingRow, seedCustomer, disableComingSoon, enableCodGateway,
    clearCustomerCart, placeOrder, completeOrder, wpEval,
    getReferralCode, deleteCustomerIfExists, registerViaReferralLink,
    referralLedgerSum, getDisplayedReferralLink, enableCustomerRegistration,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

/**
 * Referrals — "Enable Referrals" gates the whole feature (link capture,
 * registration attribution, crediting), and "Referral Bonus Points" is the
 * amount credited to the REFERRER once the REFERRED customer's first order
 * completes (app/Referrals/ReferralProcessor.php, on
 * woocommerce_order_status_completed). A full loop needs: grab the referrer's
 * real link from My Account → My Rewards, visit it as a brand-new customer to
 * set the tracking cookie, register through the real WC registration form,
 * place + complete that new customer's FIRST order, then confirm the
 * referrer's ledger got a 'referral' credit for exactly referrals_bonusPoints
 * — and that a full refund of that order reverses it.
 */
test.describe('Referrals — link, crediting, reversal (Free)', () => {
    test('Enable Referrals + Referral Bonus Points drive real crediting on the referred customer\'s first order', async ({ page }) => {
        const log = new TestLogger('03-referrals.spec.js', 'referral-link-credits-referrer').attach(page);
        log.start();
        const originalEnabled = await getSetting('referrals_enabled');
        const originalBonus = await getSetting('referrals_bonusPoints');
        const bonus = 250; // distinct from the 1000 default so a stale value can't accidentally pass

        try {
            await log.step(1, 'Log in as admin, enable Referrals and set a distinct bonus');
            await login(page, log);
            await enableCustomerRegistration();
            await openSettings(page);
            await toggleCheckbox(page, 'Enable Referrals', true);
            const bonusInput = settingRow(page, 'Referral Bonus Points').locator('input[type="number"]');
            await bonusInput.fill(String(bonus));
            await log.step(2, 'Save and confirm');
            await saveAndConfirm(page);
            expect(await getSetting('referrals_enabled')).toBe(true);
            expect(Number(await getSetting('referrals_bonusPoints'))).toBe(bonus);

            await log.step(3, 'Seed the referrer and grab their real referral link');
            const referrerId = await seedCustomer({ username: 'e2ereferrer', email: 'e2ereferrer@example.com', password: 'E2ePass123!' });
            const refCode = await getReferralCode(referrerId);
            expect(refCode).toBeTruthy();
            await login(page, log, { username: 'e2ereferrer', password: 'E2ePass123!' });
            const referralLink = await getDisplayedReferralLink(page);
            expect(referralLink).toContain(`ref=${refCode}`);
            await log.snapshot(page, 'referral-link-displayed');

            await log.step(4, 'Visit the referral link as a brand-new visitor, then register');
            const newUsername = 'e2ereferred';
            const newEmail = 'e2ereferred@example.com';
            await deleteCustomerIfExists(newUsername);
            const newCustomerId = await registerViaReferralLink(page, {
                refCode, username: newUsername, email: newEmail, password: 'E2ePass123!',
            });
            const referredBy = await wpEval(`echo get_user_meta(${newCustomerId}, 'pointbay_referred_by', true);`);
            expect(Number(referredBy)).toBe(referrerId);

            await log.step(5, 'New customer places and completes their FIRST order');
            await clearCustomerCart(newUsername);
            await login(page, log, { username: newUsername, password: 'E2ePass123!' });
            const { orderId } = await placeOrder(page, { productSlug: 'earn-test-product', customerUsername: newUsername, log });
            await log.snapshot(page, 'referred-order-received');

            await login(page, log);
            await completeOrder(page, orderId);
            await log.snapshot(page, 'referred-order-completed');

            await log.step(6, 'Confirm the REFERRER (not the referred customer) was credited exactly the bonus');
            // Scope to THIS run's referred customer (reference_id = buyer_id, per
            // ReferralProcessor::maybe_process_referral) — the referrer is a
            // reused fixture across retries/runs, so summing ALL of their
            // 'referral' credits would double-count a prior run's bonus too.
            const creditedToReferrer = await referralLedgerSum(referrerId, 'referral', 'credit', newCustomerId);
            expect(creditedToReferrer).toBe(bonus);
            const creditedToReferred = await referralLedgerSum(newCustomerId, 'referral', 'credit', newCustomerId);
            expect(creditedToReferred).toBe(0);

            await log.step(7, 'Fully refund the qualifying order and confirm the referral bonus is clawed back');
            await wpEval(
                `$o = wc_get_order(${orderId});` +
                `wc_create_refund(['order_id'=>${orderId},'amount'=>$o->get_total(),'reason'=>'e2e clawback test']);` +
                `echo 'OK';`
            );
            // Unlike the credit (keyed on the buyer), the reversal is keyed on
            // the ORDER id — a buyer could re-qualify on a later order, so
            // keying the reversal on the buyer too would collide the ledger's
            // unique key the second time (see reverse_referral_for_order()).
            const reversed = await referralLedgerSum(referrerId, 'referral_reversal', 'debit', orderId);
            expect(reversed).toBe(bonus);
            // The "rewarded" flag lives on the REFERRED customer (the buyer), not
            // the order — see ReferralProcessor::maybe_process_referral()/
            // reverse_referral_for_order(), both of which use update_user_meta()
            // against $buyer_id.
            const rewardedFlag = await wpEval(`echo get_user_meta(${newCustomerId}, 'pointbay_referral_rewarded', true);`);
            expect(String(rewardedFlag)).toBe('0');

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ referrals_enabled: originalEnabled, referrals_bonusPoints: originalBonus });
        }
    });

    test('Enable Referrals OFF — no cookie captured, no crediting, referral block hidden on My Rewards', async ({ page }) => {
        const log = new TestLogger('03-referrals.spec.js', 'referrals-disabled-no-op').attach(page);
        log.start();
        const originalEnabled = await getSetting('referrals_enabled');

        try {
            await log.step(1, 'Log in as admin and disable Referrals');
            await login(page, log);
            await openSettings(page);
            if (originalEnabled === false) {
                await log.info?.('Referrals already disabled — nothing to save');
            } else {
                await toggleCheckbox(page, 'Enable Referrals', false);
                await log.step(2, 'Save and confirm');
                await saveAndConfirm(page);
            }
            expect(await getSetting('referrals_enabled')).toBe(false);

            await log.step(3, 'A referrer\'s My Rewards page shows no referral block');
            const referrerId = await seedCustomer({ username: 'e2ereferrer', email: 'e2ereferrer@example.com', password: 'E2ePass123!' });
            await login(page, log, { username: 'e2ereferrer', password: 'E2ePass123!' });
            await page.goto('/my-account/my-rewards/', { waitUntil: 'domcontentloaded' });
            await expect(page.locator('#pointbay-referral-link')).toHaveCount(0);
            await log.snapshot(page, 'no-referral-block');

            await log.step(4, 'Visiting a referral link while disabled sets no tracking cookie');
            const refCode = await getReferralCode(referrerId);
            await page.context().clearCookies();
            await page.goto(`/?ref=${refCode}`, { waitUntil: 'domcontentloaded' });
            const cookies = await page.context().cookies();
            expect(cookies.some((c) => c.name === 'pointbay_ref')).toBe(false);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await updateSettings({ referrals_enabled: originalEnabled });
        }
    });
});
