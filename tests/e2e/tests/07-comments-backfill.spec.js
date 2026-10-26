const { test, expect } = require('@playwright/test');
const {
    login, openSettings, saveAndConfirm, getSetting, settingRow, toggleCheckbox,
    seedCustomer, deleteCustomerIfExists, wpEval, referralLedgerSum,
} = require('./helpers');
const { TestLogger } = require('./test-logger');

/**
 * Earning guardrails (group F1) — blog-comment points and the past-order
 * backfill tool. Free-only: no Pro behaviour is asserted anywhere.
 *
 * Comments: the award/claw-back rules live in CommentHooks (comment_post,
 * transition_comment_status, delete_comment). Specs drive the real hooks by
 * posting through wp_new_comment() and changing status with WordPress's own
 * wp_set_comment_status() / wp_delete_comment() — the exact calls the admin
 * Comments screen makes — and use the real storefront form + real admin
 * Comments screen once, in the first test, to prove the browser path.
 *
 * Backfill: orders are created dated March 2001 (a window no real order can
 * fall in) while the order-status trigger is parked on a status that never
 * fires, so nothing is awarded as they are created. The admin tool is then
 * driven through its real UI; the REST route's capability gate is probed
 * with plain HTTP requests.
 *
 * Everything created is prefixed ZZ-QA / zzqa_ and removed in `finally`;
 * every setting touched is snapshotted and restored.
 */

const PASSWORD = 'E2ePass123!';

// ── Local helpers (kept in this file; helpers.js is owned elsewhere) ─────────

// Snapshot/restore specific keys of the shared `pointbay` option. A key that
// was absent is removed again on restore rather than written back as null.
async function snapshotSettings(keys) {
    const b64 = Buffer.from(JSON.stringify(keys)).toString('base64');
    const raw = await wpEval(
        `$o = get_option('pointbay', array()); $out = array();` +
        `foreach ( json_decode( base64_decode('${b64}'), true ) as $k ) {` +
        ` $out[$k] = array_key_exists($k, $o) ? array('v' => $o[$k]) : null; }` +
        `echo wp_json_encode($out);`
    );
    return JSON.parse(raw);
}
async function restoreSettings(snapshot) {
    const b64 = Buffer.from(JSON.stringify(snapshot)).toString('base64');
    await wpEval(
        `$o = get_option('pointbay', array());` +
        `foreach ( json_decode( base64_decode('${b64}'), true ) as $k => $s ) {` +
        ` if ( null === $s ) { unset($o[$k]); } else { $o[$k] = $s['v']; } }` +
        `update_option('pointbay', $o); echo 'OK';`
    );
}
// Plain WP options (comment_moderation etc.), same snapshot idea.
async function snapshotWpOptions(names) {
    const b64 = Buffer.from(JSON.stringify(names)).toString('base64');
    return JSON.parse(await wpEval(
        `$o = array(); foreach ( json_decode( base64_decode('${b64}'), true ) as $n ) { $o[$n] = get_option($n); } echo wp_json_encode($o);`
    ));
}
async function restoreWpOptions(snapshot) {
    const b64 = Buffer.from(JSON.stringify(snapshot)).toString('base64');
    await wpEval(
        `foreach ( json_decode( base64_decode('${b64}'), true ) as $n => $v ) { update_option($n, $v); } echo 'OK';`
    );
}
// Merge-patch the pointbay option (same idea as helpers.updateSettings, kept
// local so this file does not depend on how that helper evolves).
async function setSettings(patch) {
    const b64 = Buffer.from(JSON.stringify(patch)).toString('base64');
    await wpEval(
        `$o = get_option('pointbay', array()); $p = json_decode( base64_decode('${b64}'), true );` +
        `update_option('pointbay', array_merge($o, $p)); echo 'OK';`
    );
}

async function makeUser(username) {
    await deleteCustomerIfExists(username);
    return seedCustomer({ username, email: `${username}@example.test`, password: PASSWORD });
}
async function makePost(authorId, title) {
    const id = await wpEval(
        `echo wp_insert_post( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_title' => '${title}',` +
        ` 'post_author' => ${authorId}, 'comment_status' => 'open' ) );`
    );
    return Number(id);
}

// Posts a comment through wp_new_comment() (what fires comment_post). `approved`
// forces the moderation outcome: 1 approved, 0 held, 'spam'. Flood protection
// is bypassed so a single spec can post several comments back to back.
async function postComment({ postId, userId, approved = 1, parent = 0 }) {
    const forced = approved === 'spam' ? "'spam'" : String(Number(approved));
    const out = await wpEval(
        `$u = get_userdata(${userId});` +
        `$f = function () { return ${forced}; };` +
        `add_filter('pre_comment_approved', $f, 99); add_filter('comment_flood_filter', '__return_false', 99);` +
        `$id = wp_new_comment( array(` +
        ` 'comment_post_ID' => ${postId}, 'comment_content' => 'ZZ-QA comment ' . wp_generate_password(12, false),` +
        ` 'user_id' => ${userId}, 'comment_author' => $u->display_name, 'comment_author_email' => $u->user_email,` +
        ` 'comment_type' => 'comment', 'comment_author_url' => '', 'comment_parent' => ${parent} ), true );` +
        `remove_filter('pre_comment_approved', $f, 99); remove_filter('comment_flood_filter', '__return_false', 99);` +
        `echo is_wp_error($id) ? 'ERR:' . $id->get_error_message() : $id;`
    );
    if (out.startsWith('ERR:')) throw new Error(`postComment failed: ${out}`);
    return Number(out);
}
// status: approve | hold | spam | trash — the same call the admin Comments screen makes.
async function setCommentStatus(commentId, status) {
    await wpEval(`wp_set_comment_status(${commentId}, '${status}'); echo 'OK';`);
}
async function deleteCommentForever(commentId) {
    await wpEval(`wp_delete_comment(${commentId}, true); echo 'OK';`);
}

async function balanceOf(userId) {
    return Number(await wpEval(`echo (string) \\PointBay\\Services\\LedgerService::get_instance()->get_balance(${userId});`));
}
// Count of ledger rows for one (user, reference_type, reference_id, transaction_type).
async function ledgerRows(userId, referenceType, referenceId, transactionType) {
    return Number(await wpEval(
        `global $wpdb; echo (string) $wpdb->get_var( $wpdb->prepare(` +
        `"SELECT COUNT(*) FROM {$wpdb->prefix}pointbay_ledger WHERE user_id = %d AND reference_type = %s AND reference_id = %d AND transaction_type = %s",` +
        ` ${userId}, '${referenceType}', ${referenceId}, '${transactionType}' ) );`
    ));
}

// Removes ZZ-QA users and every ledger/cache row they own, so a failed or
// retried run leaves nothing behind that could skew a later balance read.
async function purgeUsers(userIds) {
    const ids = userIds.filter(Boolean).map(Number);
    if (!ids.length) return;
    await wpEval(
        `global $wpdb; $ids = array(${ids.join(',')});` +
        `require_once ABSPATH . 'wp-admin/includes/user.php';` +
        `foreach ( $ids as $i ) {` +
        ` $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}pointbay_ledger WHERE user_id = %d", $i ) );` +
        ` $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}pointbay_ledger_cache WHERE user_id = %d", $i ) );` +
        ` wp_delete_user( $i ); }` +
        `echo 'OK';`
    );
}
async function deletePosts(postIds) {
    const ids = postIds.filter(Boolean).map(Number);
    if (!ids.length) return;
    await wpEval(`foreach ( array(${ids.join(',')}) as $i ) { wp_delete_post( $i, true ); } echo 'OK';`);
}

// ── Comment points ──────────────────────────────────────────────────────────

const COMMENT_KEYS = ['earning_pointsForComment', 'earning_commentRequireApproval', 'earning_commentDailyLimit'];

test.describe('Points for blog comments (Free)', () => {
    test('Awards the configured points once a real comment is approved, not while held', async ({ page }) => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'comment-points-approval-ui').attach(page);
        log.start();
        const settingsBefore = await snapshotSettings(COMMENT_KEYS);
        const wpBefore = await snapshotWpOptions(['comment_moderation', 'comment_previously_approved']);
        const bonus = 12; // distinct from the 0 default
        let commenterId = 0;
        let postId = 0;

        try {
            await log.step(1, 'Fixtures: a ZZ-QA post (admin-authored) and a ZZ-QA customer who will comment');
            commenterId = await makeUser('zzqa_commenter_ui');
            postId = await makePost(1, 'ZZ-QA comment points post');
            // Hold every comment for moderation so the "held" state is deterministic
            // (a brand-new commenter is held by default, but do not rely on it).
            await setSettings({ earning_commentRequireApproval: true, earning_commentDailyLimit: 0 });
            await restoreWpOptions({ comment_moderation: 1, comment_previously_approved: 0 });

            await log.step(2, 'Log in as admin, set Points for blog comments in the Earning section, save');
            await login(page, log);
            await openSettings(page);
            await settingRow(page, 'Points for blog comments').locator('input[type="number"]').fill(String(bonus));
            await toggleCheckbox(page, 'Require comment approval before earning', true);
            await saveAndConfirm(page);
            expect(Number(await getSetting('earning_pointsForComment'))).toBe(bonus);
            expect(await getSetting('earning_commentRequireApproval')).toBe(true);

            await log.step(3, 'As the customer, submit a comment through the real storefront comment form');
            await login(page, log, { username: 'zzqa_commenter_ui', password: PASSWORD });
            const beforeMax = Number(await wpEval(`global $wpdb; echo (int) $wpdb->get_var("SELECT MAX(comment_ID) FROM {$wpdb->comments}");`));
            await page.goto(`/?p=${postId}`, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('#commentform', { timeout: 20000 });
            await page.fill('#comment', `ZZ-QA ui comment ${Date.now()}`);
            // requestSubmit(submitter) — same reason as submitProductReview() in helpers.
            await page.locator('#commentform').evaluate((form) => {
                const btn = form.querySelector('#submit');
                if (btn) form.requestSubmit(btn); else form.requestSubmit();
            });
            let commentId = 0;
            for (let i = 0; i < 20 && !commentId; i++) {
                await new Promise((r) => setTimeout(r, 500));
                const found = Number(await wpEval(
                    `global $wpdb; echo (int) $wpdb->get_var($wpdb->prepare("SELECT comment_ID FROM {$wpdb->comments} WHERE comment_post_ID = %d AND comment_ID > %d AND user_id = %d ORDER BY comment_ID DESC LIMIT 1", ${postId}, ${beforeMax}, ${commenterId}));`
                ));
                if (found > 0) commentId = found;
            }
            expect(commentId).toBeGreaterThan(0);
            await log.snapshot(page, 'comment-submitted');

            await log.step(4, 'The comment is held and has earned nothing yet');
            expect(await wpEval(`echo get_comment(${commentId})->comment_approved;`)).toBe('0');
            expect(await referralLedgerSum(commenterId, 'comment', 'credit', commentId)).toBe(0);

            await log.step(5, 'Approve it on the real admin Comments screen');
            await login(page, log);
            await page.goto('/wp-admin/edit-comments.php?comment_status=moderated', { waitUntil: 'domcontentloaded' });
            const row = page.locator(`#comment-${commentId}`);
            await row.waitFor({ state: 'visible', timeout: 20000 });
            await row.hover(); // row actions are CSS-hidden until hover
            await row.locator('.approve a').click();
            await page.waitForFunction(
                (id) => { const r = document.querySelector(`#comment-${id}`); return !r || !r.className.includes('unapproved'); },
                commentId,
                { timeout: 15000 }
            ).catch(() => {});
            await log.snapshot(page, 'comment-approved');
            expect(await wpEval(`echo get_comment(${commentId})->comment_approved;`)).toBe('1');

            await log.step(6, 'The commenter was credited exactly the configured bonus, keyed to the comment');
            expect(await referralLedgerSum(commenterId, 'comment', 'credit', commentId)).toBe(bonus);
            expect(await balanceOf(commenterId)).toBe(bonus);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await restoreWpOptions(wpBefore);
            await deletePosts([postId]);
            await purgeUsers([commenterId]);
        }
    });

    test('Approval required ON: held earns nothing, approving awards once, unapprove keeps points and re-approving never double-awards', async () => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'comment-points-approval-on');
        log.start();
        const settingsBefore = await snapshotSettings(COMMENT_KEYS);
        const pts = 10;
        let uid = 0;
        let postId = 0;

        try {
            await log.step(1, 'Fixtures and settings: 10 points, approval required, no daily limit');
            uid = await makeUser('zzqa_cm_appr_on');
            postId = await makePost(1, 'ZZ-QA approval-on post');
            await setSettings({ earning_pointsForComment: pts, earning_commentRequireApproval: true, earning_commentDailyLimit: 0 });

            await log.step(2, 'A held comment earns nothing');
            const held = await postComment({ postId, userId: uid, approved: 0 });
            expect(await balanceOf(uid)).toBe(0);

            await log.step(3, 'Approving it awards the points once');
            await setCommentStatus(held, 'approve');
            expect(await balanceOf(uid)).toBe(pts);
            expect(await ledgerRows(uid, 'comment', held, 'credit')).toBe(1);

            await log.step(4, 'Unapprove then approve twice more: points stay, no extra credit row');
            await setCommentStatus(held, 'hold');
            expect(await balanceOf(uid)).toBe(pts); // unapproving does not take points back
            await setCommentStatus(held, 'approve');
            await setCommentStatus(held, 'hold');
            await setCommentStatus(held, 'approve');
            expect(await balanceOf(uid)).toBe(pts);
            expect(await ledgerRows(uid, 'comment', held, 'credit')).toBe(1);

            await log.step(5, 'A comment posted already-approved is awarded straight away');
            await postComment({ postId, userId: uid, approved: 1 });
            expect(await balanceOf(uid)).toBe(pts * 2);

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await deletePosts([postId]);
            await purgeUsers([uid]);
        }
    });

    test('Approval required OFF: a held comment earns at posting, spam never earns', async () => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'comment-points-approval-off');
        log.start();
        const settingsBefore = await snapshotSettings(COMMENT_KEYS);
        const pts = 7;
        let uid = 0;
        let postId = 0;

        try {
            await log.step(1, 'Fixtures and settings: 7 points, approval NOT required');
            uid = await makeUser('zzqa_cm_appr_off');
            postId = await makePost(1, 'ZZ-QA approval-off post');
            await setSettings({ earning_pointsForComment: pts, earning_commentRequireApproval: false, earning_commentDailyLimit: 0 });

            await log.step(2, 'A comment held for moderation is credited as soon as it is posted');
            const held = await postComment({ postId, userId: uid, approved: 0 });
            expect(await wpEval(`echo get_comment(${held})->comment_approved;`)).toBe('0');
            expect(await balanceOf(uid)).toBe(pts);
            expect(await ledgerRows(uid, 'comment', held, 'credit')).toBe(1);

            await log.step(3, 'Approving it afterwards does not credit a second time');
            await setCommentStatus(held, 'approve');
            expect(await balanceOf(uid)).toBe(pts);

            await log.step(4, 'A comment posted as spam never earns');
            const spam = await postComment({ postId, userId: uid, approved: 'spam' });
            expect(await ledgerRows(uid, 'comment', spam, 'credit')).toBe(0);
            expect(await balanceOf(uid)).toBe(pts);

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await deletePosts([postId]);
            await purgeUsers([uid]);
        }
    });

    test('Daily limit caps the comments that earn per day, per user; 0 means unlimited', async () => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'comment-points-daily-limit');
        log.start();
        const settingsBefore = await snapshotSettings(COMMENT_KEYS);
        const pts = 5;
        let limited = 0;
        let other = 0;
        let unlimited = 0;
        let postId = 0;

        try {
            await log.step(1, 'Fixtures and settings: 5 points, approval off, limit 2 comments per day');
            limited = await makeUser('zzqa_cm_limited');
            other = await makeUser('zzqa_cm_other');
            unlimited = await makeUser('zzqa_cm_unlimited');
            postId = await makePost(1, 'ZZ-QA daily limit post');
            await setSettings({ earning_pointsForComment: pts, earning_commentRequireApproval: false, earning_commentDailyLimit: 2 });

            await log.step(2, 'Three approved comments by one user: only the first two earn');
            const c1 = await postComment({ postId, userId: limited });
            const c2 = await postComment({ postId, userId: limited });
            const c3 = await postComment({ postId, userId: limited });
            expect(await ledgerRows(limited, 'comment', c1, 'credit')).toBe(1);
            expect(await ledgerRows(limited, 'comment', c2, 'credit')).toBe(1);
            expect(await ledgerRows(limited, 'comment', c3, 'credit')).toBe(0);
            expect(await balanceOf(limited)).toBe(pts * 2);

            await log.step(3, 'The limit is per user: a different customer still earns today');
            await postComment({ postId, userId: other });
            expect(await balanceOf(other)).toBe(pts);

            await log.step(4, 'Limit 0 is unlimited: four comments earn four times');
            await setSettings({ earning_commentDailyLimit: 0 });
            for (let i = 0; i < 4; i++) await postComment({ postId, userId: unlimited });
            expect(await balanceOf(unlimited)).toBe(pts * 4);

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await deletePosts([postId]);
            await purgeUsers([limited, other, unlimited]);
        }
    });

    test('A post author earns nothing for commenting on their own post (top level or reply); self-replies earn nothing either', async () => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'comment-points-own-post');
        log.start();
        const settingsBefore = await snapshotSettings(COMMENT_KEYS);
        const pts = 10;
        let author = 0;
        let visitor = 0;
        let postId = 0;

        try {
            await log.step(1, 'Fixtures: a post authored by a customer, plus a different customer; approval off so only the rule under test can block');
            author = await makeUser('zzqa_cm_author');
            visitor = await makeUser('zzqa_cm_visitor');
            postId = await makePost(author, 'ZZ-QA own-post comment');
            await setSettings({ earning_pointsForComment: pts, earning_commentRequireApproval: false, earning_commentDailyLimit: 0 });

            await log.step(2, 'Control: the other customer commenting on that post earns');
            const vTop = await postComment({ postId, userId: visitor });
            expect(await balanceOf(visitor)).toBe(pts);

            await log.step(3, 'The author commenting on their own post (top level) earns nothing');
            const aTop = await postComment({ postId, userId: author });
            expect(await ledgerRows(author, 'comment', aTop, 'credit')).toBe(0);
            expect(await balanceOf(author)).toBe(0);

            await log.step(4, "The author replying to someone else's comment on their own post earns nothing");
            const aReply = await postComment({ postId, userId: author, parent: vTop });
            expect(await ledgerRows(author, 'comment', aReply, 'credit')).toBe(0);
            expect(await balanceOf(author)).toBe(0);

            await log.step(5, 'Replying to your own comment earns nothing either (visitor replies to their own vTop)');
            const vSelfReply = await postComment({ postId, userId: visitor, parent: vTop });
            expect(await ledgerRows(visitor, 'comment', vSelfReply, 'credit')).toBe(0);
            expect(await balanceOf(visitor)).toBe(pts); // unchanged

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await deletePosts([postId]);
            await purgeUsers([author, visitor]);
        }
    });

    test('Spam, trash and permanent delete claw the points back exactly once; restoring does not re-award', async () => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'comment-points-clawback');
        log.start();
        const settingsBefore = await snapshotSettings(COMMENT_KEYS);
        const pts = 10;
        let uid = 0;
        let postId = 0;

        try {
            await log.step(1, 'Fixtures and settings: 10 points, approval required (comments posted already approved)');
            uid = await makeUser('zzqa_cm_clawback');
            postId = await makePost(1, 'ZZ-QA clawback post');
            await setSettings({ earning_pointsForComment: pts, earning_commentRequireApproval: true, earning_commentDailyLimit: 0 });

            await log.step(2, 'Marking an approved comment as spam takes its points back (one reversal row)');
            const a = await postComment({ postId, userId: uid });
            expect(await balanceOf(uid)).toBe(pts);
            await setCommentStatus(a, 'spam');
            expect(await balanceOf(uid)).toBe(0);
            expect(await ledgerRows(uid, 'comment_reversal', a, 'debit')).toBe(1);

            await log.step(3, 'Trashing and permanently deleting that same comment does not claw twice');
            await setCommentStatus(a, 'trash');
            await deleteCommentForever(a);
            expect(await balanceOf(uid)).toBe(0);
            expect(await ledgerRows(uid, 'comment_reversal', a, 'debit')).toBe(1);

            await log.step(4, 'Restoring a spammed comment (approve again) does not re-award');
            const b = await postComment({ postId, userId: uid });
            expect(await balanceOf(uid)).toBe(pts);
            await setCommentStatus(b, 'spam');
            expect(await balanceOf(uid)).toBe(0);
            await setCommentStatus(b, 'approve');
            expect(await balanceOf(uid)).toBe(0);
            expect(await ledgerRows(uid, 'comment', b, 'credit')).toBe(1); // the original credit row only
            await deleteCommentForever(b);

            await log.step(5, 'Trashing an approved comment claws back');
            const c = await postComment({ postId, userId: uid });
            expect(await balanceOf(uid)).toBe(pts);
            await setCommentStatus(c, 'trash');
            expect(await balanceOf(uid)).toBe(0);
            await deleteCommentForever(c);

            await log.step(6, 'Permanently deleting an approved comment (skipping trash) claws back');
            const d = await postComment({ postId, userId: uid });
            expect(await balanceOf(uid)).toBe(pts);
            await deleteCommentForever(d);
            expect(await balanceOf(uid)).toBe(0);
            expect(await ledgerRows(uid, 'comment_reversal', d, 'debit')).toBe(1);

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await deletePosts([postId]);
            await purgeUsers([uid]);
        }
    });
});

// ── Past-order backfill ─────────────────────────────────────────────────────

const BACKFILL_KEYS = [
    'earning_pointsPerDollar', 'earning_basis', 'earning_bands', 'earning_flatPointsPerOrder',
    'earning_firstOrderBonus', 'earning_minCartSpend', 'earning_orderStatusTrigger', 'tiers_enabled',
];
// Rate 5 per dollar on the subtotal; no bands, bonuses or minimum, so a $100
// order is exactly 500 points and a $40 order exactly 200.
const BACKFILL_RULES = {
    earning_pointsPerDollar: 5, earning_basis: 'subtotal', earning_bands: [], earning_flatPointsPerOrder: 0,
    earning_firstOrderBonus: 0, earning_minCartSpend: 0, tiers_enabled: false,
};

// Removes every ZZ-QA order (tagged with _zzqa meta) and the ZZ-QA product.
async function purgeBackfillFixtures() {
    await wpEval(
        `$ids = wc_get_orders( array( 'limit' => -1, 'status' => array_keys( wc_get_order_statuses() ), 'return' => 'ids',` +
        ` 'meta_query' => array( array( 'key' => '_zzqa', 'value' => '1' ) ) ) );` +
        `foreach ( $ids as $i ) { $o = wc_get_order( $i ); if ( $o ) { $o->delete( true ); } }` +
        `foreach ( get_posts( array( 'post_type' => 'product', 'title' => 'ZZ-QA Backfill Widget', 'numberposts' => -1, 'post_status' => 'any', 'fields' => 'ids' ) ) as $p ) { wp_delete_post( $p, true ); }` +
        `echo 'OK';`
    );
}
async function createZzProduct() {
    return Number(await wpEval(
        `$p = new WC_Product_Simple(); $p->set_name('ZZ-QA Backfill Widget'); $p->set_regular_price('100'); $p->set_tax_status('none'); echo $p->save();`
    ));
}
// A historic order dated `date` (Y-m-d, March 2001). userId 0 = guest order.
// status completed also stamps a completion date. Tagged _zzqa for cleanup.
async function createHistoricOrder({ productId, userId, amount, date, status = 'completed' }) {
    return Number(await wpEval(
        `$o = wc_create_order( array( 'customer_id' => ${userId} ) );` +
        `$o->add_product( wc_get_product(${productId}), 1, array( 'subtotal' => ${amount}, 'total' => ${amount} ) );` +
        `$o->set_payment_method('bacs'); $o->set_date_created( strtotime('${date} 09:00:00 UTC') );` +
        `$o->calculate_totals(false); $o->update_meta_data('_zzqa', '1'); $o->save();` +
        `$o->set_status('${status}'); if ( 'completed' === '${status}' ) { $o->set_date_completed( strtotime('${date} 14:30:00 UTC') ); }` +
        `$o->save(); echo $o->get_id();`
    ));
}
// Points the ledger holds for one order as an "order" credit.
async function orderCredit(userId, orderId) {
    return referralLedgerSum(userId, 'order', 'credit', orderId);
}
// Runs the real service as a commit/preview over a window, returns its summary.
async function runBackfillService(start, end, commit) {
    const raw = await wpEval(
        `$tot = array( 'credited_orders' => 0, 'points' => 0, 'scanned' => 0 ); $offset = 0;` +
        `do { $r = \\PointBay\\Services\\BackfillService::get_instance()->process_batch( '${start}', '${end}', 1, 25, ${commit ? 'true' : 'false'}, $offset );` +
        ` $tot['credited_orders'] += $r['credited_orders']; $tot['points'] += $r['points']; $tot['scanned'] += $r['scanned'];` +
        ` $offset = $r['next_offset']; } while ( ! $r['done'] );` +
        `echo wp_json_encode($tot);`
    );
    return JSON.parse(raw);
}

// Drives the admin tool: fills the dates and clicks Preview. Returns the tool locator.
async function previewBackfillInUi(page, start, end) {
    await openSettings(page);
    const tool = page.locator('.pointbay-backfill-tool');
    await tool.scrollIntoViewIfNeeded();
    const dates = tool.locator('input[type="date"]');
    await dates.nth(0).fill(start);
    await dates.nth(1).fill(end);
    await tool.getByRole('button', { name: 'Preview' }).click();
    return tool;
}

test.describe('Past-order backfill tool (Free)', () => {
    test('Preview shows the expected points without crediting; Confirm credits exactly that', async ({ page }) => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'backfill-preview-then-confirm').attach(page);
        log.start();
        const settingsBefore = await snapshotSettings(BACKFILL_KEYS);
        let u1 = 0;
        let u2 = 0;
        let oa = 0;
        let ob = 0;
        let oal = 0;

        try {
            await log.step(1, 'Fixtures: 2001 history for two customers (trigger parked so nothing is awarded as it is created)');
            await purgeBackfillFixtures();
            u1 = await makeUser('zzqa_bf1');
            u2 = await makeUser('zzqa_bf2');
            await setSettings({ ...BACKFILL_RULES, earning_orderStatusTrigger: 'on-hold' });
            const productId = await createZzProduct();
            oa = await createHistoricOrder({ productId, userId: u1, amount: 100, date: '2001-03-05' });                 // 500
            ob = await createHistoricOrder({ productId, userId: u2, amount: 40, date: '2001-03-06' });                  // 200
            await createHistoricOrder({ productId, userId: 0, amount: 100, date: '2001-03-07' });                       // guest: skipped
            oal = await createHistoricOrder({ productId, userId: u2, amount: 100, date: '2001-03-08' });                // already awarded
            await createHistoricOrder({ productId, userId: u1, amount: 100, date: '2001-03-09', status: 'processing' }); // not an earning status
            await wpEval(`\\PointBay\\Services\\LedgerService::get_instance()->credit(${u2}, 77, 'order', ${oal}, 'ZZ-QA pre-existing award'); echo 'OK';`);
            // Only now switch to the real earning trigger the backfill scans for.
            await setSettings({ earning_orderStatusTrigger: 'completed' });
            const u1Before = await balanceOf(u1);
            const u2Before = await balanceOf(u2);
            expect(await orderCredit(u1, oa)).toBe(0);

            await log.step(2, 'Log in as admin and open the tool on Settings; preview March 2001');
            await login(page, log);
            const tool = await previewBackfillInUi(page, '2001-03-01', '2001-03-10');
            await expect(tool.getByText('will earn 700 points in total')).toBeVisible({ timeout: 30000 });
            await expect(tool).toContainText('2 order(s) from 2 customer(s)');
            await expect(tool).toContainText('Guest orders: 1');
            await expect(tool).toContainText('Already awarded: 1');
            await log.snapshot(page, 'backfill-previewed');

            await log.step(3, 'The preview wrote nothing: no order credit, balances untouched, no marker');
            expect(await orderCredit(u1, oa)).toBe(0);
            expect(await orderCredit(u2, ob)).toBe(0);
            expect(await balanceOf(u1)).toBe(u1Before);
            expect(await balanceOf(u2)).toBe(u2Before);
            expect(await wpEval(`echo wc_get_order(${oa})->get_meta('_pointbay_backfilled') ? 'yes' : 'no';`)).toBe('no');

            await log.step(4, 'Confirm and award points');
            await tool.getByRole('button', { name: 'Confirm and award points' }).click();
            await expect(tool.locator('.notice-success')).toContainText('Done: 2 order(s) credited, 2 customer(s), 700 points', { timeout: 60000 });
            await log.snapshot(page, 'backfill-done');

            await log.step(5, 'The ledger holds exactly the previewed numbers; the pre-existing award is untouched');
            expect(await orderCredit(u1, oa)).toBe(500);
            expect(await orderCredit(u2, ob)).toBe(200);
            expect(await orderCredit(u2, oal)).toBe(77);
            expect(await balanceOf(u1)).toBe(u1Before + 500);
            expect(await balanceOf(u2)).toBe(u2Before + 200);

            await log.step(6, 'Credited order carries the backfill marker and a retroactive note; its ledger row is dated at completion, not now');
            expect(await wpEval(`echo wc_get_order(${oa})->get_meta('_pointbay_backfilled') ? 'yes' : 'no';`)).toBe('yes');
            const noted = await wpEval(
                `$n = wc_get_order_notes( array( 'order_id' => ${oa} ) ); $t = ''; foreach ( $n as $x ) { $t .= $x->content . ' | '; } echo $t;`
            );
            expect(noted).toContain('Awarded retroactively.');
            const createdAt = await wpEval(
                `global $wpdb; echo $wpdb->get_var( $wpdb->prepare( "SELECT created_at FROM {$wpdb->prefix}pointbay_ledger WHERE user_id = %d AND reference_type = 'order' AND reference_id = %d AND transaction_type = 'credit'", ${u1}, ${oa} ) );`
            );
            expect(createdAt.startsWith('2001-03-05')).toBe(true);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await purgeBackfillFixtures();
            await purgeUsers([u1, u2]);
        }
    });

    test('Running it a second time credits nothing (once-only), in the UI and at the service', async ({ page }) => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'backfill-once-only').attach(page);
        log.start();
        const settingsBefore = await snapshotSettings(BACKFILL_KEYS);
        let u1 = 0;
        let o1 = 0;

        try {
            await log.step(1, 'Fixtures: one $100 completed order in a March 2001 window; run the backfill for real once');
            await purgeBackfillFixtures();
            u1 = await makeUser('zzqa_bf_once');
            await setSettings({ ...BACKFILL_RULES, earning_orderStatusTrigger: 'on-hold' });
            const productId = await createZzProduct();
            o1 = await createHistoricOrder({ productId, userId: u1, amount: 100, date: '2001-03-15' });
            await setSettings({ earning_orderStatusTrigger: 'completed' });
            const first = await runBackfillService('2001-03-11', '2001-03-20', true);
            expect(first.credited_orders).toBe(1);
            expect(first.points).toBe(500);
            const balanceAfterFirst = await balanceOf(u1);
            expect(await ledgerRows(u1, 'order', o1, 'credit')).toBe(1);

            await log.step(2, 'Preview the same range in the real UI: nothing left to award, no Confirm button');
            await login(page, log);
            const tool = await previewBackfillInUi(page, '2001-03-11', '2001-03-20');
            await expect(tool.getByText('Nothing to award for this date range.')).toBeVisible({ timeout: 30000 });
            await expect(tool).toContainText('Already awarded: 1');
            await expect(tool.getByRole('button', { name: 'Confirm and award points' })).toHaveCount(0);
            await log.snapshot(page, 'second-preview-nothing');

            await log.step(3, 'Force a second COMMIT through the service: still credits nothing');
            const second = await runBackfillService('2001-03-11', '2001-03-20', true);
            expect(second.credited_orders).toBe(0);
            expect(second.points).toBe(0);
            expect(await balanceOf(u1)).toBe(balanceAfterFirst);
            expect(await ledgerRows(u1, 'order', o1, 'credit')).toBe(1);

            log.end('passed');
        } catch (err) {
            await log.snapshot(page, 'failure');
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await purgeBackfillFixtures();
            await purgeUsers([u1]);
        }
    });

    test('Live notifications are suppressed while backfilling: listeners see the backfill flag and retroactive context, no email is sent', async () => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'backfill-suppresses-notifications');
        log.start();
        const settingsBefore = await snapshotSettings(BACKFILL_KEYS);
        let u1 = 0;
        let o1 = 0;

        try {
            await log.step(1, 'Fixtures: one $100 completed order in a March 2001 window');
            await purgeBackfillFixtures();
            u1 = await makeUser('zzqa_bf_notify');
            await setSettings({ ...BACKFILL_RULES, earning_orderStatusTrigger: 'on-hold' });
            const productId = await createZzProduct();
            o1 = await createHistoricOrder({ productId, userId: u1, amount: 100, date: '2001-03-25' });
            await setSettings({ earning_orderStatusTrigger: 'completed' });

            await log.step(2, 'Commit through the real service while recording the award hooks and any wp_mail attempt');
            // The free plugin sends no customer email itself; the contract is that
            // every listener of the award hooks can tell this is a backfill (the
            // flag + context Pro and third parties key their notifications on).
            // pre_wp_mail short-circuits sending so nothing real is mailed.
            const raw = await wpEval(
                `$seen = array( 'backfilling' => null, 'retro' => null, 'mails' => 0 );` +
                `add_action( 'pointbay_points_credited', function () use ( &$seen ) { $seen['backfilling'] = \\PointBay\\Services\\BackfillService::is_backfilling(); }, 10, 3 );` +
                `add_action( 'pointbay_order_points_awarded', function ( $uid, $oid, $bd, $ctx = array() ) use ( &$seen ) { $seen['retro'] = ! empty( $ctx['retroactive'] ); }, 10, 4 );` +
                `add_filter( 'pre_wp_mail', function () use ( &$seen ) { $seen['mails']++; return true; }, 1, 0 );` +
                `$r = \\PointBay\\Services\\BackfillService::get_instance()->process_batch( '2001-03-21', '2001-03-31', 1, 25, true );` +
                `$seen['credited'] = $r['credited_orders']; $seen['after'] = \\PointBay\\Services\\BackfillService::is_backfilling();` +
                `echo wp_json_encode($seen);`
            );
            const seen = JSON.parse(raw);

            await log.step(3, 'Assert the award happened, was flagged as a backfill, and no mail was attempted');
            expect(seen.credited).toBe(1);
            expect(await orderCredit(u1, o1)).toBe(500);
            expect(seen.backfilling).toBe(true);
            expect(seen.retro).toBe(true);
            expect(seen.mails).toBe(0);
            expect(seen.after).toBe(false); // the flag is cleared again afterwards

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await purgeBackfillFixtures();
            await purgeUsers([u1]);
        }
    });

    test('The backfill route is capability-protected: anonymous, customers and nonce-less admins are refused; a nonced admin succeeds', async ({ page }) => {
        const log = new TestLogger('07-comments-backfill.spec.js', 'backfill-route-capability').attach(page);
        log.start();
        const settingsBefore = await snapshotSettings(BACKFILL_KEYS);
        let u1 = 0;
        let cust = 0;
        let o1 = 0;
        // Plain-permalink-safe REST address.
        const route = '/?rest_route=/pointbay/v1/backfill/batch';
        const body = { start_date: '2001-03-01', end_date: '2001-03-31', per_page: 25, commit: true };
        // core's own "give me a REST nonce for the logged-in user" ajax action
        const restNonce = async () => (await (await page.request.get('/wp-admin/admin-ajax.php?action=rest-nonce')).text()).trim();

        try {
            await log.step(1, 'Fixtures: an eligible 2001 order that a successful call WOULD credit, and a plain customer');
            await purgeBackfillFixtures();
            u1 = await makeUser('zzqa_bf_cap_owner');
            cust = await makeUser('zzqa_bf_cap_customer');
            await setSettings({ ...BACKFILL_RULES, earning_orderStatusTrigger: 'on-hold' });
            const productId = await createZzProduct();
            o1 = await createHistoricOrder({ productId, userId: u1, amount: 100, date: '2001-03-12' });
            await setSettings({ earning_orderStatusTrigger: 'completed' });

            await log.step(2, 'Anonymous POST is refused (401/403)');
            await page.context().clearCookies();
            const anon = await page.request.post(route, { data: body });
            expect([401, 403]).toContain(anon.status());

            await log.step(3, 'A logged-in customer with a VALID REST nonce is still refused with 403 (no manage_pointbay)');
            await login(page, log, { username: 'zzqa_bf_cap_customer', password: PASSWORD });
            const custNonce = await restNonce();
            expect(custNonce.length).toBeGreaterThan(4);
            const asCustomer = await page.request.post(route, { data: body, headers: { 'X-WP-Nonce': custNonce } });
            expect(asCustomer.status()).toBe(403);

            await log.step(4, 'An admin cookie session WITHOUT the REST nonce is refused (cookie alone is not enough)');
            await login(page, log);
            const adminNoNonce = await page.request.post(route, { data: body });
            expect([401, 403]).toContain(adminNoNonce.status());

            await log.step(5, 'None of the refused calls credited anything');
            expect(await orderCredit(u1, o1)).toBe(0);
            expect(await balanceOf(u1)).toBe(0);

            await log.step(6, 'Positive control: the same admin WITH the nonce is allowed and the order is credited');
            const adminNonce = await restNonce();
            const asAdmin = await page.request.post(route, { data: body, headers: { 'X-WP-Nonce': adminNonce } });
            expect(asAdmin.status()).toBe(200);
            const result = await asAdmin.json();
            expect(result.credited_orders).toBe(1);
            expect(result.points).toBe(500);
            expect(await orderCredit(u1, o1)).toBe(500);

            log.end('passed');
        } catch (err) {
            log.end('failed');
            throw err;
        } finally {
            await restoreSettings(settingsBefore);
            await purgeBackfillFixtures();
            await purgeUsers([u1, cust]);
        }
    });
});
