/**
 * Behavioral E2E helpers for PointBay (free plugin). Login + settings +
 * fixture-seeding + real checkout + ledger-delta reads. Confirmed live
 * against a QIT env before writing (selectors, default state, table schema).
 */
const { qit } = require('@woocommerce/qit-runtime');
const { expect } = require('@playwright/test');

// ── WP-CLI eval (base64 to dodge quoting hell) ──────────────────────────────
// SAFETY: this runs test-authored PHP via WordPress's `wp eval` against the
// EPHEMERAL local QIT database only — never production, never external input.
// The `php` argument is a literal written by the spec (never user-supplied); the
// base64 wrapper exists solely to survive shell quoting. Standard QIT/WooCommerce
// E2E pattern for seeding and asserting state with no REST/UI surface.
async function wpEval(php) {
    const b64 = Buffer.from(php).toString('base64');
    const out = await qit.wp(`eval "eval(base64_decode('${b64}'));" --allow-root`);
    return String(out).trim();
}

// ── Auth ──────────────────────────────────────────────────────────────────
// Behavioral specs frequently switch identity mid-test (admin to set up, a
// customer to check out, admin again to transition an order). Submitting
// wp-login.php with new credentials while a DIFFERENT user's auth cookie is
// still valid does not reliably replace the session — confirmed live: an
// order placed right after "logging in" as the test customer still recorded
// customer_id = 1 (admin), silently placing the order as the wrong user and
// corrupting the whole behavioral assertion. Always clear cookies first so
// there is no ambiguity about which session wins.
async function login(page, log, { username = 'admin', password = 'password' } = {}) {
    await page.context().clearCookies();
    await page.goto('/wp-login.php');
    await page.fill('#user_login', username);
    await page.fill('#user_pass', password);
    await page.click('#wp-submit');
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    // On a genuinely FRESH env (no prior admin session ever completed the
    // WooCommerce onboarding), the very first admin login is redirected into
    // the WC Setup Wizard / wc-admin welcome flow, which replaces the normal
    // admin chrome entirely — #wpadminbar exists in the DOM there but stays
    // `display:none` for the full wait window, so waiting for it hangs for
    // the full 45s. Confirmed live: this only reproduces on a genuinely fresh
    // env, never on one already warmed up manually. Escape it explicitly.
    if (/wc-admin&path=%2Fsetup-wizard|wc-setup/.test(page.url())) {
        await page.goto('/wp-admin/index.php', { waitUntil: 'domcontentloaded' });
    }
    // #wpadminbar covers a login that lands in wp-admin (e.g. admin), but
    // `body.logged-in` is a FRONTEND-only class from body_class() — wp-admin
    // pages never carry it. And the admin bar itself only renders on the
    // frontend for roles the active theme chooses to show it to — confirmed
    // live: the customer role landed correctly on /my-account/ with neither
    // #wpadminbar NOR anything admin-bar-shaped. Wait for whichever of the two
    // signals this login's destination actually produces.
    await page.waitForSelector('#wpadminbar, body.logged-in', { timeout: 45000 });
    // Confirm the session actually belongs to the requested user rather than
    // trusting "some session exists" (see file header on why this matters).
    // #wpadminbar's "Howdy" covers admin/staff; WooCommerce's My Account
    // "Hello <user>" greeting covers customers — check whichever is present.
    const howdy = await page.locator('#wp-admin-bar-my-account .display-name').textContent().catch(() => null);
    const helloText = await page.locator('.woocommerce-MyAccount-content').textContent().catch(() => null);
    const identityText = howdy || helloText;
    if (identityText && !identityText.toLowerCase().includes(username.toLowerCase())) {
        throw new Error(`login(${username}) landed on a different session: page shows "${identityText.slice(0, 80)}"`);
    }
    log?.success?.(`Logged in as ${username}`);
}

// ── Settings (shared `pointbay` option) ──────────────────────────────────────
async function getSetting(key) {
    const raw = await wpEval(`echo wp_json_encode( ( get_option('pointbay', array()) )['${key}'] ?? null );`);
    try { return JSON.parse(raw); } catch (e) { return raw; }
}

// Merge-patch keys without clobbering others (the sanitizer may drop unknowns).
async function updateSettings(patch) {
    const b64 = Buffer.from(JSON.stringify(patch)).toString('base64');
    await wpEval(
        `$o = get_option('pointbay', array());` +
        `$p = json_decode( base64_decode('${b64}'), true );` +
        `update_option('pointbay', array_merge($o, $p)); echo 'OK';`
    );
}

async function openSettings(page) {
    await page.goto('/wp-admin/admin.php?page=wc-settings&tab=pointbay', { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Do NOT wait for networkidle — the admin-ajax heartbeat never idles.
    await page.waitForSelector('.pointbay-p-page-default', { timeout: 30000 });
}

// Save via the real WooCommerce button; success = it re-disables after submit.
async function saveAndConfirm(page) {
    const save = page.locator('button[name="save"]').first();
    await expect(save).toBeEnabled({ timeout: 10000 });
    await save.click();
    await page.waitForFunction(() => {
        const b = document.querySelector('button[name="save"]');
        return b && b.disabled;
    }, { timeout: 20000 });
}

// ── Row / control helpers ────────────────────────────────────────────────
function settingRow(page, label) {
    return page.locator('tr', { has: page.locator('th', { hasText: label }) });
}
async function toggleCheckbox(page, label, on) {
    const cb = settingRow(page, label).locator('input[type="checkbox"]');
    if ((await cb.isChecked()) !== on) await cb.evaluate((el) => el.click()); // native input is display:none
}
async function selectOption(page, label, optionText) {
    const trigger = settingRow(page, label).locator('[role="combobox"]');
    await trigger.click();
    await page.locator('[role="listbox"] [role="option"]', { hasText: optionText }).click();
    await expect(trigger).toContainText(optionText);
}

// ── Fixtures (wp-cli is fine here — fixtures aren't the behavior under test) ─
async function seedProduct({ slug, name, price, manageStock = false }) {
    const existing = await wpEval(`$p = get_page_by_path('${slug}', OBJECT, 'product'); echo $p ? $p->ID : '';`);
    if (existing) return Number(existing);
    const id = await wpEval(
        `$id = wp_insert_post(['post_type'=>'product','post_status'=>'publish','post_title'=>'${name}','post_name'=>'${slug}']);` +
        `wp_set_object_terms($id,'simple','product_type');` +
        `update_post_meta($id,'_price','${price}'); update_post_meta($id,'_regular_price','${price}');` +
        `update_post_meta($id,'_manage_stock','${manageStock ? 'yes' : 'no'}');` +
        `update_post_meta($id,'_stock_status','instock'); echo $id;`
    );
    return Number(id);
}

async function seedCustomer({ username, email, password }) {
    const existing = await wpEval(`$u = get_user_by('login','${username}'); echo $u ? $u->ID : '';`);
    if (existing) return Number(existing);
    const id = await wpEval(
        `$id = wp_insert_user(['user_login'=>'${username}','user_email'=>'${email}','user_pass'=>'${password}','role'=>'customer']);` +
        `echo is_wp_error($id) ? '' : $id;`
    );
    return Number(id);
}

// WooCommerce's "coming soon" store mode (default ON in a fresh env) blocks the
// storefront/checkout content behind a placeholder — no purchase flow works
// until this is off. Real environment default, not a plugin concern; belongs
// in 00-setup, not in every spec.
async function disableComingSoon() {
    await wpEval(`update_option('woocommerce_coming_soon','no'); echo 'OK';`);
}

// Cash on Delivery is not enabled by default; every order-placing spec needs it.
async function enableCodGateway() {
    const php = `
        update_option('woocommerce_cod_settings', [
            'enabled' => 'yes', 'title' => 'Cash on delivery', 'instructions' => '',
            'enable_for_methods' => [], 'enable_for_virtual' => 'yes',
        ]);
        echo 'OK';
    `;
    await wpEval(php);
}

// A prior interrupted test run (a failure mid-checkout, a killed process, or
// even a HUMAN debugging session that logged in as this same test customer
// and added something to cart without checking out) can leave a stray item
// behind in TWO separate places WooCommerce tracks cart state:
//   1. The PERSISTENT cart, saved to user meta — restored into a fresh
//      session at login.
//   2. The ACTIVE SESSION cart in `wp_woocommerce_sessions`, keyed by user ID
//      (not by cookie) for logged-in customers — a brand-new Playwright
//      browser context still inherits it purely by authenticating as that
//      user, with no cookie in common with whatever session created it.
// Clearing only #1 leaves #2 silently inflating the next order's total.
// Confirmed live: a leftover item from an earlier manual debugging session
// (different browser entirely) doubled an order's total via #2 alone, well
// after #1 had already been correctly cleared.
async function clearCustomerCart(username) {
    await wpEval(
        `$u = get_user_by('login','${username}');` +
        `if ($u) { global $wpdb;` +
        ` $wpdb->delete($wpdb->usermeta, ['user_id'=>$u->ID,'meta_key'=>'_woocommerce_persistent_cart_' . get_current_blog_id()]);` +
        ` $wpdb->delete($wpdb->prefix.'woocommerce_sessions', ['session_key'=>$u->ID]); }` +
        `echo 'OK';`
    );
}

// ── Orders — real browser checkout (WC Blocks) ───────────────────────────
// Places an order as whatever user `page` is currently logged in as (must be a
// real customer — guest checkout has no customer_id, so PointBay never awards
// points on it; that's a real product behavior, not a test limitation).
// Returns {orderId, total}.
async function placeOrder(page, { productSlug, customerUsername, beforePlaceOrder, log } = {}) {
    if (customerUsername) await clearCustomerCart(customerUsername);
    await page.goto(`/checkout/?add-to-cart=${await getProductIdBySlug(productSlug)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#email', { timeout: 30000 });
    // WC Blocks checkout re-renders the whole form after its async cart/
    // customer-data fetch settles — filling immediately on domcontentloaded
    // hits fields mid-swap and Playwright reports them "not visible" for a
    // full 15s (not a brief blip). networkidle is safe here (unlike wp-admin,
    // the storefront has no admin-ajax heartbeat to keep the network busy).
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Once a customer HAS a saved billing address, WC Blocks shows a
    // confirmed-address CARD (with an "Edit" <span role="button">, not a
    // <button>) instead of the raw form — the form's inputs are still in the
    // DOM but `visibility: hidden` on a parent, so filling them directly
    // "succeeds" per one flaky retry and then times out forever. Confirmed
    // live: this only reproduces on a SECOND checkout for the same customer
    // (the first has no saved address yet, so the raw form shows normally).
    // The saved address is already valid, so just use it — no need to force
    // the form open.
    // `.count()` alone is a false positive: WC Blocks keeps the card wrapper
    // element in the DOM (empty/invisible) even for a brand-new customer with
    // no saved address — confirmed live: a fresh customer's checkout skipped
    // filling because the card "existed" per .count(), submitted an empty
    // form, and hung on client-side validation errors instead of navigating.
    // Check the raw form field's actual visibility instead — the thing this
    // code is about to interact with.
    const firstNameVisible = await page.locator('#billing-first_name').isVisible().catch(() => false);
    if (!firstNameVisible) {
        await log?.step?.(0, 'Reusing saved billing address (confirmed-address card shown)');
    } else {
        await log?.step?.(0, 'Fill checkout billing details');
        await page.fill('#billing-first_name', 'E2E');
        await page.fill('#billing-last_name', 'Customer');
        await page.fill('#billing-address_1', '123 Test St');
        await page.fill('#billing-city', 'Los Angeles');
        await page.fill('#billing-postcode', '90001');
    }

    // Cash on Delivery radio — click via label association (WC Blocks radios
    // are plain inputs, not hidden, but wait for it to be attached first since
    // payment methods render async after address validation).
    const codRadio = page.locator('#radio-control-wc-payment-method-options-cod');
    await codRadio.waitFor({ state: 'visible', timeout: 20000 });
    if (!(await codRadio.isChecked())) await codRadio.check();

    // Hook for specs that need to interact with checkout (e.g. redeem points)
    // AFTER the form/payment method are ready but BEFORE placing the order.
    if (beforePlaceOrder) await beforePlaceOrder(page);

    const placeOrderBtn = page.getByRole('button', { name: 'Place Order' });
    await expect(placeOrderBtn).toBeEnabled({ timeout: 20000 });
    await placeOrderBtn.click();

    await page.waitForURL(/order-received/, { timeout: 30000 });
    const match = page.url().match(/order-received\/(\d+)/);
    const orderId = match ? Number(match[1]) : null;
    if (!orderId) throw new Error(`Could not extract order id from URL: ${page.url()}`);
    return { orderId };
}

async function getProductIdBySlug(slug) {
    const id = await wpEval(`$p = get_page_by_path('${slug}', OBJECT, 'product'); echo $p ? $p->ID : '';`);
    if (!id) throw new Error(`Product not found for slug: ${slug}`);
    return Number(id);
}

// Change order status on the ADMIN order screen (HPOS: admin.php?page=wc-orders).
// A real transition via the UI, because the transition itself is frequently the
// behavior under test (earning_orderStatusTrigger). The #order_status <select>
// is select2-wrapped but the native element is still directly settable.
async function setOrderStatus(page, orderId, status) {
    await page.goto(`/wp-admin/admin.php?page=wc-orders&action=edit&id=${orderId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#order_status', { timeout: 30000 });
    await page.selectOption('#order_status', `wc-${status}`);
    await page.locator('button.save_order').click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForSelector('#order_status', { timeout: 30000 });
}
const completeOrder = (page, orderId) => setOrderStatus(page, orderId, 'completed');

// ── Ledger — measure the PER-ORDER delta, never the running balance ──────
async function ledgerDeltaFor(orderId, referenceType = 'order') {
    const sum = await wpEval(
        `global $wpdb; echo (string) $wpdb->get_var( $wpdb->prepare(` +
        `"SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}pointbay_ledger ` +
        `WHERE reference_type = %s AND reference_id = %d AND transaction_type = 'credit'", '${referenceType}', ${orderId} ) );`
    );
    return Number(sum);
}

// Directly credit a user's ledger for TEST FIXTURE purposes only (e.g. giving
// a customer a redeemable balance for a redemption spec) — this is seeding,
// not the behavior under test, same rationale as seedProduct. Never use this
// to fake the outcome a spec is supposed to be proving.
// IMPORTANT: use the plugin's own crediting method, never a raw SQL insert
// into the ledger table. Confirmed live: a hand-rolled $wpdb->insert() wrote
// the ledger row correctly but left the SEPARATE pointbay_ledger_cache table
// (a materialized per-user balance the checkout UI actually reads) stale, so
// the customer's displayed/usable balance silently didn't reflect the fixture
// credit at all. `pointbay_log()`'s absence in the debug log was the tell —
// LedgerService::credit() is what keeps both tables consistent.
// referenceId MUST be unique per call: the ledger table's UNIQUE KEY is
// (user_id, reference_type, reference_id, transaction_type) — confirmed live,
// two specs both crediting the same user with the default reference_id=0
// collided with "A transaction for this reference already exists" on the
// second call. Date.now() is a fine default (Playwright specs are plain
// Node.js, unlike Workflow scripts — no restriction on it here).
async function creditPointsFixture(userId, amount, description = 'E2E fixture credit', referenceId = Date.now()) {
    const result = await wpEval(
        `$r = \\PointBay\\Services\\LedgerService::get_instance()->credit(${userId}, ${amount}, 'fixture', ${referenceId}, '${description}', 'system');` +
        `echo is_wp_error($r) ? 'ERROR:' . $r->get_error_message() : 'OK';`
    );
    if (result.startsWith('ERROR:')) throw new Error(`creditPointsFixture failed: ${result}`);
}

// Real UI action: use the checkout's "Redeem Loyalty Points" panel (WC Blocks
// sidebar, see src/checkout/RedemptionBlock.tsx — no element ids, class-based
// selectors only) to apply a points discount. Call via placeOrder()'s
// beforePlaceOrder hook so it runs once the checkout form is ready.
async function redeemPointsAtCheckout(page, points) {
    const panel = page.locator('.wc-block-components-totals-coupon', { has: page.locator('h3', { hasText: 'Redeem Loyalty Points' }) });
    await panel.waitFor({ state: 'visible', timeout: 20000 });
    const input = panel.locator('input[type="number"]');
    await input.fill(String(points));
    await panel.getByRole('button', { name: /Apply/ }).click();
    // The REST call updates the WC Store API cart; wait for the redeemed-
    // amount confirmation text rather than a fixed delay.
    await page.waitForSelector('text=/redeemed .* points/', { timeout: 20000 });
}

// ── Order-level reads for redemption mode (fee vs coupon) ────────────────
async function orderHasPointsFee(orderId) {
    const found = await wpEval(
        `$o = wc_get_order(${orderId}); foreach ($o->get_fees() as $f) { if (strpos($f->get_name(), 'PointBay Points Discount') !== false) { echo 'yes'; exit; } } echo 'no';`
    );
    return found === 'yes';
}
async function orderHasPointsCoupon(orderId) {
    const found = await wpEval(
        `$o = wc_get_order(${orderId}); foreach ($o->get_coupon_codes() as $c) { if (strpos($c, 'pointbay_points_') === 0) { echo 'yes'; exit; } } echo 'no';`
    );
    return found === 'yes';
}

module.exports = {
    wpEval, login, getSetting, updateSettings, openSettings, saveAndConfirm,
    settingRow, toggleCheckbox, selectOption, seedProduct, seedCustomer,
    disableComingSoon, enableCodGateway, clearCustomerCart, placeOrder, getProductIdBySlug,
    setOrderStatus, completeOrder, ledgerDeltaFor, creditPointsFixture,
    redeemPointsAtCheckout, orderHasPointsFee, orderHasPointsCoupon,
};
