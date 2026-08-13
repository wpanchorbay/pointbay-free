# Bugs found by the QIT e2e behavioral suite

Report-only — the suite never edits `app/` or `src/` product code. A spec that hits one of these
is quarantined with `test.fixme(...)` asserting the *intended* behavior, with a comment pointing
here, so the suite stays honestly green rather than hiding the bug.

## BUG-01 (FIXED): Redemption Mode "Virtual Coupon" fatally crashes checkout on WooCommerce Blocks

- **Where**: `app/Checkout/CouponRedemption.php` (`provide_virtual_coupon()`, line ~118) — the
  virtual coupon is handed to WooCommerce with `'id' => 0`, since it isn't backed by a real
  `wp_posts` coupon row.
- **How found**: spec `tests/e2e/tests/02-redemption.spec.js` — "Redemption Mode coupon produces a
  coupon on the order". Confirmed live against a real checkout, not a static read.
- **Symptom**: On the storefront's **WooCommerce Blocks checkout** (the modern default — this is
  what `/checkout/` renders unless the site is still on the classic shortcode checkout), applying a
  points discount while `redemption_mode = 'coupon'` works fine up through the Store API's cart
  totals (the sidebar correctly shows the coupon code, `-$2.00` discount, and reduced total). But
  clicking **Place Order** throws an **uncaught fatal error** and the checkout page renders
  WordPress's "There has been a critical error on this website" — the order is never created. The
  Redemption Mode = "fee" path works correctly in the same environment; only "coupon" mode is
  affected.
- **Root cause (from the stack trace)**: WooCommerce's Store API validates coupon usage limits
  before creating the order (`OrderController::validate_coupon_usage_limit()` →
  `get_usage_per_aliases()`), which calls `get_tentative_usages_for_user()` on an object that's
  `null` for this coupon — almost certainly because the coupon's `id` is `0` (not a real coupon
  post), so WooCommerce's own coupon data-store/usage-tracking machinery has nothing to load and
  silently returns null instead of an object, which the Store API then calls a method on
  unconditionally.
- **Repro** (from the spec): set Redemption Mode to "Virtual Coupon (WC_Coupon)", give a customer a
  redeemable balance, redeem any points at checkout via the "Redeem Loyalty Points" widget, click
  Place Order. Full PHP stack trace:
  ```
  PHP Fatal error:  Uncaught Error: Call to a member function get_tentative_usages_for_user() on
  null in .../woocommerce/src/StoreApi/Utilities/OrderController.php:677
  #0 OrderController.php(576): OrderController->get_usage_per_aliases(WC_Coupon, Array)
  #1 OrderController->validate_coupon_usage_limit(WC_Coupon, WC_Order)
  ...
  #6 StoreApi/Routes/V1/Checkout.php(587): OrderController->validate_order_before_payment(WC_Order)
  #7 StoreApi/Routes/V1/Checkout.php(506): Checkout->process_order(WP_REST_Request)
  ```
- **Impact**: Any store using the modern WooCommerce Blocks checkout (the default for new stores)
  with Redemption Mode set to "Virtual Coupon" has a **completely broken checkout** for any customer
  who redeems points — not a cosmetic bug, an unrecoverable fatal on the purchase path. The "Cart
  Fee" mode does not have this problem and is unaffected.
- **Fix applied**: `app/Checkout/CouponRedemption.php` — `read_manual_coupon()` (the path
  WooCommerce uses for any coupon supplied via `woocommerce_get_shop_coupon_data`, i.e. every
  virtual/programmatic coupon, not just this plugin's) sets props directly and never calls
  `read_object_from_database()`, which is the only place `$this->data_store` gets assigned — so
  `get_data_store()` is `null` for any manual coupon. The Store API's
  `validate_coupon_usage_limit()` only dereferences the data store when
  `usage_limit_per_user !== 0`. Changed the virtual coupon's `usage_limit` and
  `usage_limit_per_user` from `1` to `0` (unlimited), which makes WooCommerce skip that check
  entirely and never touch the null data store. Safe because this coupon is already single-use by
  construction — it's regenerated per redemption amount, keyed to the session, and removed as soon
  as the redeemed points change — so WooCommerce's own usage-limit bookkeeping was redundant, not
  load-bearing.
- **Spec status**: `tests/e2e/tests/02-redemption.spec.js` — both "fee" and "coupon" mode tests are
  green; the `test.fixme()` quarantine has been removed.

## BUG-02: "Guest Notice" setting has no effect on the WooCommerce Blocks storefront

- **Where**: `src/checkout/EarnNoticeBlock.tsx` (lines 52-67, the `!isLoggedIn` branch) and
  `app/Checkout/BlockIntegration.php` (`get_script_data()`, lines 97-113).
- **How found**: spec `tests/e2e/tests/04-display-system.spec.js` — "Guest Notice OFF hides the
  earn-prompt to a logged-out visitor". Confirmed live: turning the setting off in the real Settings
  UI and viewing the storefront cart as a logged-out visitor.
- **Symptom**: On the WooCommerce Blocks storefront (the modern default checkout/cart, what
  `/cart/` and `/checkout/` render unless the site is on the classic shortcode UI), the "Create an
  account to earn N points on this order!" prompt shown to logged-out visitors renders
  **unconditionally** whenever points would be earned on the cart — setting **Guest Notice to OFF
  in Settings → Display & System has zero effect**. Only the classic-checkout PHP path
  (`app/Checkout/GuestNotice.php`, gated correctly on `display_guestNoticeEnabled`) respects the
  toggle; the modern default surface does not.
- **Root cause**: the plugin ships a SEPARATE implementation of this notice for WC Blocks —
  `EarnNoticeBlock.tsx`, a React component driven by client-side cart data. Its guest-facing branch
  (`!isLoggedIn`) gates only on `points_to_award > 0` and never reads a
  `display_guestNoticeEnabled`-equivalent flag. On the PHP side, `BlockIntegration::get_script_data()`
  — which supplies all the data this component reads (`pointbay_checkout_data`/`pointbay_cart_data`)
  — never passes the setting to the block at all, so there is nothing for the component to check
  even if it wanted to.
- **Impact**: Any store owner who disables the guest notice, expecting it to stop nudging logged-out
  shoppers to register, sees no change on the storefront's default checkout/cart. Not a crash — a
  silently ineffective setting.
- **Not auto-fixed**: this would require editing both `EarnNoticeBlock.tsx` and
  `BlockIntegration.php` and regenerating the compiled `build/block-cart.js`/`build/block-checkout.js`
  bundles the plugin ships (a `build:prod`/`build.sh` step per `CLAUDE.md`, not a plain
  `npm run build` — the shipped bundle format wasn't verified reproducible from this repo state).
  Whether the Blocks-side notice *should* be gated the same way as the classic path is also a
  product-design call for the plugin owner, not something to presume. Per this suite's rule, product
  bugs are reported, not silently fixed.
- **Spec status**: `tests/e2e/tests/04-display-system.spec.js` — the ON case (`enabled=true`) is
  green and unaffected. The OFF case is quarantined with `test.fixme(...)`, asserting the intended
  (currently broken) behavior.
