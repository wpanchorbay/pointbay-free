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

// ── Referrals ─────────────────────────────────────────────────────────────
// Real referral codes are generated lazily (ReferralManager::get_referral_code)
// on first use — calling the plugin's own method (not hand-rolling the format)
// keeps this aligned if the code scheme ever changes.
async function getReferralCode(userId) {
    return wpEval(`echo \\PointBay\\Referrals\\ReferralManager::get_instance()->get_referral_code(${userId});`);
}

// Deletes a user by USERNAME if present, so a referral spec can register a
// genuinely NEW customer every run without colliding with a leftover account
// from a previous (possibly failed) run — referral crediting is strictly
// "this user's first order", so a reused account would silently no-op.
async function deleteCustomerIfExists(username) {
    await wpEval(
        `$u = get_user_by('login','${username}');` +
        `if ($u) { require_once ABSPATH.'wp-admin/includes/user.php'; wp_delete_user($u->ID); }` +
        `echo 'OK';`
    );
}

// WooCommerce customer registration is OFF by default, and when on defaults to
// auto-generating the password (hiding #reg_password) — a referral spec needs
// a real registration form with both fields to drive through the browser.
async function enableCustomerRegistration() {
    await wpEval(
        `update_option('woocommerce_enable_myaccount_registration','yes');` +
        `update_option('woocommerce_registration_generate_password','no');` +
        `echo 'OK';`
    );
}

// Registers a brand-new customer through WooCommerce's real My Account
// registration form — the actual mechanism behind user_register (registration
// bonus points, referral attribution, etc.), not a wp-cli shortcut. Assumes
// the caller has already navigated wherever it needs to (a referral link, or
// just /my-account/ directly) and cleared cookies for a genuinely anonymous
// session. Returns the new user's id.
async function registerCustomer(page, { username, email, password }) {
    await page.goto('/my-account/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#reg_email', { timeout: 20000 });
    await page.fill('#reg_email', email);
    // WooCommerce's default registration form has no separate username field
    // unless woocommerce_registration_generate_username is off; the account's
    // WP username still needs to be deterministic for login(), so set it via
    // the account's generated user then rename — simpler: use email as login
    // isn't guaranteed, so create then immediately verify/rename via wp-cli.
    await page.fill('#reg_password', password);
    // A plain page.click('button[name="register"]') was confirmed live (via
    // network tracing) to dispatch a real click that NEVER submits the form —
    // Chromium in this headless/QIT context doesn't reliably fire the
    // resulting form submission for this particular button. form.submit() /
    // requestSubmit() with no argument don't fix it either: per the HTML spec,
    // ONLY the button passed as requestSubmit()'s "submitter" has its
    // name=value pair (name="register") included in the POST body — omit it
    // and WooCommerce's `isset($_POST['register'])` check silently sees no
    // registration attempt at all, so the page just re-renders the same empty
    // form with a 200 and no error. Confirmed live via response-body dumps
    // both ways. Passing the actual button as the submitter is what a real
    // click does, and reproduces reliably.
    await page.locator('form.woocommerce-form-register').evaluate((form) => {
        const btn = form.querySelector('button[name="register"]');
        form.requestSubmit(btn);
    });
    await Promise.race([
        page.waitForSelector('a[href*="customer-logout"]', { timeout: 20000 }),
        page.waitForSelector('.woocommerce-error, .woocommerce-notices-wrapper .woocommerce-error', { timeout: 20000 }),
    ]);
    const errorText = await page.locator('.woocommerce-error').first().textContent().catch(() => null);
    if (errorText) throw new Error(`Registration rejected for ${email}: ${errorText.trim()}`);
    const newId = await wpEval(`$u = get_user_by('email','${email}'); echo $u ? $u->ID : '';`);
    if (!newId) throw new Error(`Registration failed for ${email}`);
    // Force the login-friendly username the test expects, since WooCommerce
    // derives it from the email local-part by default and specs need a fixed,
    // predictable value for later login() calls.
    await wpEval(`global $wpdb; $wpdb->update($wpdb->users, ['user_login'=>'${username}'], ['ID'=>${newId}]); echo 'OK';`);
    return Number(newId);
}

// Visits the real referral link (?ref=CODE) to set the pointbay_ref cookie via
// ReferralManager::capture_referral_cookie() (hooked on `init`), THEN registers
// through the real form via registerCustomer() — this is the actual mechanism
// (`user_register` reads the cookie), not a shortcut.
async function registerViaReferralLink(page, { refCode, username, email, password }) {
    await page.context().clearCookies();
    await page.goto(`/?ref=${refCode}`, { waitUntil: 'domcontentloaded' });
    return registerCustomer(page, { username, email, password });
}

// Sum of referral-related ledger rows for a user: pass 'referral' (credit) or
// 'referral_reversal' (debit) as reference_type — see ReferralProcessor's
// REF_TYPE_AWARD / REF_TYPE_REVERSAL constants. reference_id is the REFERRED
// customer's user id (ReferralProcessor uses $buyer_id as reference_id) — pass
// it to scope the sum to one run's referral, since a reused referrer fixture
// accumulates credits from every prior run's referral otherwise.
async function referralLedgerSum(userId, referenceType, transactionType, referenceId = null) {
    const refClause = referenceId !== null ? ` AND reference_id = ${Number(referenceId)}` : '';
    const sum = await wpEval(
        `global $wpdb; echo (string) $wpdb->get_var( $wpdb->prepare(` +
        `"SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}pointbay_ledger ` +
        `WHERE user_id = %d AND reference_type = %s AND transaction_type = %s${refClause}", ${userId}, '${referenceType}', '${transactionType}' ) );`
    );
    return Number(sum);
}

// The referral link surfaced on My Account → My Rewards (readonly input).
async function getDisplayedReferralLink(page) {
    await page.goto('/my-account/my-rewards/', { waitUntil: 'domcontentloaded' });
    const input = page.locator('#pointbay-referral-link');
    await input.waitFor({ state: 'visible', timeout: 20000 });
    return input.inputValue();
}

// ── Display & System ─────────────────────────────────────────────────────
// Debug Logging routes through WooCommerce's OWN logger (wc_get_logger()),
// not core's wp-content/debug.log, despite the Settings UI caption saying
// "WordPress debug log" — confirmed by reading app/functions.php's
// pointbay_log(). Resolve the real file path via WC's own API rather than
// guessing the {source}-{hash}.log naming.
async function tailPointbayWcLog(lines = 50) {
    const path = await wpEval(`echo function_exists('wc_get_log_file_path') ? wc_get_log_file_path('pointbay') : '';`);
    if (!path) return '';
    return wpEval(
        `$p = '${path}'; if (!file_exists($p)) { echo ''; exit; }` +
        `$all = file($p); echo implode('', array_slice($all, -${lines}));`
    );
}

// The log file is cumulative across the WHOLE reused env's history — tailing
// N lines can include stale entries from an EARLIER debug-enabled run and
// produce a false positive. Confirmed live: `apply_fee` lines appeared in a
// tail check taken right after setting debug OFF, purely because prior runs
// (minutes earlier, debug ON) were still within the tail window. Use a
// before/after line-count delta instead — count lines now, trigger the
// action, then read only what was appended since.
async function pointbayWcLogLineCount() {
    const path = await wpEval(`echo function_exists('wc_get_log_file_path') ? wc_get_log_file_path('pointbay') : '';`);
    if (!path) return 0;
    const out = await wpEval(`$p = '${path}'; echo file_exists($p) ? count(file($p)) : 0;`);
    return Number(out);
}
async function pointbayWcLogLinesSince(startCount) {
    const path = await wpEval(`echo function_exists('wc_get_log_file_path') ? wc_get_log_file_path('pointbay') : '';`);
    if (!path) return '';
    return wpEval(
        `$p = '${path}'; if (!file_exists($p)) { echo ''; exit; }` +
        `$all = file($p); echo implode('', array_slice($all, ${startCount}));`
    );
}

// Adds a product to cart as whatever identity `page` currently has (including
// a guest with no session) via the classic ?add-to-cart= query param, which
// redirects straight to the cart page — the simplest real path to a non-empty
// cart without going through checkout.
async function addToCartAndViewCart(page, productSlug) {
    const productId = await getProductIdBySlug(productSlug);
    await page.goto(`/cart/?add-to-cart=${productId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
}

// ── Uninstall (advanced_deleteAllOnUninstall) ────────────────────────────
// uninstall.php is only ever invoked by WordPress's real "Delete" action,
// which this suite can't trigger without deactivating pointbay for the rest
// of the run. `wp eval-file` can't be combined with the WP_UNINSTALL_PLUGIN
// define() in one wp-cli invocation (define() doesn't persist across
// separate `wp` processes), so both the define and the include must happen
// inside the SAME `wp eval` call — this runs the real uninstall.php source,
// not a re-implementation of its logic.
async function runUninstallRoutine() {
    await wpEval(
        `define('WP_UNINSTALL_PLUGIN', 'pointbay-loyalty-points-referral-rewards-woo/pointbay-loyalty-points-referral-rewards-woo.php');` +
        `include WP_PLUGIN_DIR . '/pointbay-loyalty-points-referral-rewards-woo/uninstall.php';` +
        `echo 'OK';`
    );
}

// get_option('pointbay') is NOT a reliable way to check whether uninstall.php
// actually deleted the row — WordPress core's register_setting() was called
// with a 'default' array for this option (Settings::register()), and
// get_option() falls back to that REGISTERED DEFAULT whenever the row is
// missing, WITHOUT writing it back to the DB. Confirmed live: right after a
// real uninstall run, get_option('pointbay') still returned a full default
// settings array — looking exactly like nothing was deleted — while a raw
// SQL read of wp_options showed the row was genuinely gone. Query the table
// directly to see the real DB state, bypassing core's default-value masking.
async function pointbayOptionRowExists() {
    const out = await wpEval(
        `global $wpdb; $row = $wpdb->get_var($wpdb->prepare('SELECT option_value FROM %i WHERE option_name = %s', $wpdb->options, 'pointbay')); echo $row === null ? 'ABSENT' : 'PRESENT';`
    );
    return out === 'PRESENT';
}

async function pointbayTablesExist() {
    const out = await wpEval(
        `global $wpdb; $t = $wpdb->get_col("SHOW TABLES LIKE '{$wpdb->prefix}pointbay_%'"); echo count($t);`
    );
    return Number(out) > 0;
}

// Recovery after a real (destructive-by-design) uninstall run: DbManager owns
// the same migrations uninstall.php used to drop the tables, so re-running
// create_tables() is the plugin's own, not hand-rolled, path back to a clean
// schema — the same thing plugin (re)activation does.
async function recreatePointbayTables() {
    await wpEval(`\\PointBay\\Data\\DbManager::get_instance()->create_tables(); echo 'OK';`);
}

// Uninstall deletes the ENTIRE `pointbay` option, not just the one setting
// under test — a plain updateSettings() patch afterward would merge into an
// empty array and leave every OTHER setting undefined for the rest of the
// suite. Rebuild the full option from the plugin's own default-settings
// method (not a hand-maintained JS copy of config/settings.php).
// update_option() alone is NOT enough here: WordPress core's update_option()
// no-ops (skips the write) when the new value equals what get_option() already
// returns — and get_option() for a MISSING row returns the register_setting()
// default (see the discovery landmine), which is EXACTLY the value being
// restored. Confirmed live: after uninstall.php deleted the row,
// update_option('pointbay', <the same defaults>) silently did nothing — the
// raw DB row stayed absent. delete_option() first removes any ambiguity, then
// add_option() forces a genuine INSERT regardless of what get_option() would
// have returned.
async function restorePointbayDefaultsOption() {
    await wpEval(
        `delete_option('pointbay');` +
        `$ok = add_option('pointbay', \\PointBay\\Core\\Settings::get_instance()->get_default_settings());` +
        `echo $ok ? 'OK' : 'FAILED';`
    );
}

// ── Product reviews (earning_pointsForReview) ────────────────────────────
// Submits a review as whatever customer `page` is currently logged in as, via
// the real storefront review form (WooCommerce's native #commentform on the
// product page's Reviews tab — a plain <select id="rating"> and #comment
// textarea, confirmed live; no WC Blocks equivalent, this form is shared by
// both checkout modes). Returns the new comment's id.
async function submitProductReview(page, { productSlug, rating = 5, text }) {
    const productId = await getProductIdBySlug(productSlug);
    // Something in this env transiently drops the comment POST entirely —
    // no error, no redirect, no row — confirmed live: the identical flow
    // (register brand-new customer, wait, submit) succeeded on some runs and
    // silently produced nothing on others, with no code difference between
    // them. This matches WordPress core's comment flood guard
    // (wp_check_comment_flood(), a 15s minimum gap) more often than not, but
    // wasn't 100% reproducible as exactly that, so rather than chase the
    // precise cause, retry the whole submission with a growing wait — cheap,
    // and correct regardless of which transient guard is responsible.
    let newId = null;
    let lastError = null;
    for (let submitAttempt = 0; submitAttempt < 3 && !newId; submitAttempt++) {
        try {
            await page.goto(`/product/${productSlug}/#tab-reviews`, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('#commentform', { timeout: 20000 });
            await page.waitForTimeout(submitAttempt === 0 ? 2000 : 16000);
            // The native <select id="rating"> is present but display:none —
            // WooCommerce's star-rating JS hides it and drives it via a
            // clickable star widget instead (confirmed live), so Playwright's
            // actionability check on the hidden select itself times out. Set
            // the value directly (what the star click does under the hood).
            await page.locator('#rating').evaluate((el, val) => {
                el.value = String(val);
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, rating);
            await page.fill('#comment', text);
            // The redirect target after submission (?unapproved=N vs
            // #comment-N vs staying on the same hash) was NOT consistent
            // across runs in this env — confirmed live. Read the new comment
            // id from the DB instead of parsing the post-submit URL: capture
            // the max id before submitting, then find whatever landed above
            // it for this exact product.
            const beforeMaxId = await wpEval(`global $wpdb; echo (int) $wpdb->get_var("SELECT MAX(comment_ID) FROM {$wpdb->comments}");`);
            // Same requestSubmit(submitter) requirement as registerCustomer()
            // — see that function's comment for why a plain click doesn't
            // reliably submit.
            await page.locator('#commentform').evaluate((form) => {
                const btn = form.querySelector('#submit');
                form.requestSubmit(btn);
            });
            for (let poll = 0; poll < 20 && !newId; poll++) {
                await new Promise((r) => setTimeout(r, 500));
                const found = await wpEval(
                    `global $wpdb; echo (int) $wpdb->get_var($wpdb->prepare(` +
                    `"SELECT comment_ID FROM {$wpdb->comments} WHERE comment_post_ID = %d AND comment_ID > %d ORDER BY comment_ID DESC LIMIT 1", ${productId}, ${beforeMaxId}));`
                );
                if (Number(found) > 0) newId = Number(found);
            }
        } catch (err) {
            lastError = err;
        }
    }
    if (!newId) throw lastError || new Error(`Review submission produced no new comment row for product ${productId} after 3 attempts`);
    return newId;
}

async function getCommentApprovalStatus(commentId) {
    return wpEval(`$c = get_comment(${commentId}); echo $c ? $c->comment_approved : 'MISSING';`);
}

// Approves a comment via the real WooCommerce Reviews admin screen (the
// actual UI a shop manager uses) — the approval transition itself is the
// behavior a review-bonus spec is proving, so it goes through the browser
// like every other UI-driven transition in this suite, not wp-cli.
async function approveReviewViaAdmin(page, commentId) {
    await page.goto('/wp-admin/edit.php?post_type=product&page=product-reviews', { waitUntil: 'domcontentloaded' });
    const row = page.locator(`#comment-${commentId}`);
    await row.waitFor({ state: 'visible', timeout: 20000 });
    // WordPress admin list tables keep row actions (.row-actions, including
    // "Approve") CSS-hidden until the row is hovered/focused — confirmed live,
    // Playwright's actionability check found the link "visible" but
    // positioned outside the viewport (zero-size while hidden) and retried
    // for the full timeout. Hover the row first, matching what a real user
    // does to reveal the action before clicking it.
    await row.hover();
    await row.locator('.approve a').click();
    await page.waitForFunction(
        (id) => {
            const r = document.querySelector(`#comment-${id}`);
            return r && !r.className.includes('unapproved');
        },
        commentId,
        { timeout: 15000 }
    ).catch(() => {});
}

module.exports = {
    wpEval, login, getSetting, updateSettings, openSettings, saveAndConfirm,
    settingRow, toggleCheckbox, selectOption, seedProduct, seedCustomer,
    disableComingSoon, enableCodGateway, clearCustomerCart, placeOrder, getProductIdBySlug,
    setOrderStatus, completeOrder, ledgerDeltaFor, creditPointsFixture,
    redeemPointsAtCheckout, orderHasPointsFee, orderHasPointsCoupon,
    getReferralCode, deleteCustomerIfExists, registerViaReferralLink, registerCustomer,
    referralLedgerSum, getDisplayedReferralLink, enableCustomerRegistration,
    tailPointbayWcLog, pointbayWcLogLineCount, pointbayWcLogLinesSince,
    addToCartAndViewCart, runUninstallRoutine,
    pointbayTablesExist, pointbayOptionRowExists, recreatePointbayTables, restorePointbayDefaultsOption,
    submitProductReview, getCommentApprovalStatus, approveReviewViaAdmin,
};
