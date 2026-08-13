=== PointBay - Loyalty Points & Referral Rewards for WooCommerce ===
Contributors: sankarsan, wpanchorbay, forhadkhan, arifac, shuvendushekhar
Tags: woocommerce, loyalty, rewards, points, referral
Requires at least: 6.8
Tested up to: 7.0
Requires PHP: 7.0
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Reward WooCommerce customers with loyalty points they earn on purchases and referrals, and redeem for discounts at checkout.

== Description ==

**PointBay** is a loyalty, rewards and referral system for WooCommerce. Let your customers earn points when they shop, invite their friends for a bonus, and spend those points for instant savings at checkout. Everything is configured from a single settings screen, and customers can track their balance right inside their WooCommerce account.

**Earning points**

*   Award points based on how much a customer spends (points per currency unit).
*   Give bonus points when a customer creates an account.
*   Reward customers with points for leaving a product review.
*   Choose which order status triggers points (for example, *Completed* or *Processing*), so points are only granted once an order is confirmed.

**Referrals**

*   Every logged-in customer gets their own referral link, shown in the **My Rewards** area of their account with a one-click copy button.
*   When someone follows that link and registers, they are attributed to the customer who referred them.
*   The referrer is awarded bonus points once the person they referred completes their first order — not merely on signup, so the reward tracks a real sale.
*   If that qualifying order is later cancelled, fails, or is refunded in full, the bonus is automatically clawed back.
*   Referrals are off by default; switch them on and set the bonus from the settings screen.

**Redeeming points**

*   Customers apply their points at checkout for a discount on their order.
*   Redeem points as an order **fee (discount)** or as a **coupon**, whichever fits your store.
*   Set the monetary value of a point and a minimum number of points required before redemption is allowed.
*   Works with both the **classic checkout** and the **WooCommerce Cart & Checkout blocks**.

**For your customers**

*   A dedicated **My Rewards** tab in the WooCommerce *My Account* area shows the current points balance, the customer's referral link, and recent points history.
*   An optional notice lets guests know they could be earning points by signing in.

**For store owners**

*   A **Points History** ledger in the admin lists every points transaction for auditing.
*   A clean, modern settings screen integrated into WooCommerce settings.
*   A custom `manage_pointbay` capability so you control which roles can manage the program.

== Installation ==

1.  Make sure **WooCommerce** is installed and active.
2.  In your WordPress admin, go to **Plugins > Add New > Upload Plugin** and choose the plugin zip file, or upload the `pointbay-loyalty-points-referral-rewards-woo` folder to `/wp-content/plugins/`.
3.  Activate the plugin through the **Plugins** menu in WordPress.
4.  Go to **WooCommerce > Settings > Loyalty Points** to configure earning and redemption rules.

== Frequently Asked Questions ==

= Does this plugin require WooCommerce? =

Yes. PointBay is a WooCommerce extension and requires WooCommerce to be installed and active.

= How do customers earn points? =

Customers earn points automatically based on the rules you configure: an amount per currency unit spent, plus optional bonuses for registering an account or reviewing a product. Points for an order are granted when the order reaches the order status you select in the settings.

= How do customers redeem their points? =

At checkout, customers can apply their available points for a discount. You decide the value of each point, the minimum points needed to redeem, and whether the discount is applied as an order fee or as a coupon.

= Does it work with the WooCommerce checkout blocks? =

Yes. PointBay supports both the classic checkout and the block-based Cart and Checkout.

= How do referrals work? =

Each logged-in customer has a personal referral link, shown under **My Account > My Rewards**. When a visitor follows that link, the referral code is remembered so that if they register an account they are attributed to the customer who referred them. Once that new customer completes their first order, the referrer is awarded the bonus points you configured. If the qualifying order is later cancelled, fails, or is refunded in full, the bonus is taken back automatically.

= Does the plugin set any cookies? =

One, and only when referrals are enabled. If a visitor arrives on a referral link, the plugin stores that referral code in a cookie named `pointbay_ref` for 30 days, so the referral can still be credited if the visitor registers on a later visit. The cookie holds only the referral code — no personal data. It is never set while the referral feature is switched off, and nothing else in the plugin uses cookies.

= Can a customer refer themselves? =

No. If a customer follows their own referral link and registers a second account, the referral is ignored and no bonus is awarded.

= Where can customers see their points balance? =

Every customer gets a **My Rewards** section under **My Account** showing their current balance, their referral link, and recent points history.

== Privacy ==

PointBay does not track your visitors, and it does not send anything anywhere while it is running. Points, referrals and ledger history are stored only in your own database.

There is exactly one case where data leaves your site, and only if you choose it. When you deactivate PointBay from the Plugins screen, a short optional survey appears. If you select a reason and press **Submit & Deactivate**, the following is sent to WPAnchorBay at `https://dfs.wpanchorbay.com`:

*   the reason you selected and any note you typed,
*   your site address,
*   the email address of the WordPress account you are signed in with,
*   your WordPress version.

The modal states this before you submit. Choosing **Skip & Deactivate**, closing the modal, or deactivating any other way sends nothing at all. The survey is never shown outside the Plugins screen, and nothing is transmitted during normal use of the plugin.

The plugin sets one cookie, `pointbay_ref`, and only when the referral feature is switched on and a visitor arrives via a referral link. It holds the referral code and nothing else, and expires after 30 days.

== Screenshots ==

1.  PointBay settings screen inside WooCommerce settings.
2.  Earning rules: points per purchase, registration, and reviews.
3.  Referral settings: enable referrals and set the referrer bonus.
4.  Redemption applied at checkout.
5.  The customer "My Rewards" area in My Account, including the referral link.
6.  The admin Points History ledger.

== Changelog ==

= 1.0.1 =
*   Added a Buy Pro upsell preview for VIP Tiers and License Settings.
*   Fixed Order Status Trigger and Redemption Mode dropdowns not saving.

= 1.0.0 =
*   Initial release.

== Development ==

PointBay is fully open source. The complete, human-readable source — the React/TypeScript admin interface and the Sass stylesheets in the `src/` directory that compile to the minified files in `build/`, together with the build configuration (`package.json`, `webpack.config.js`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`) — ships inside the plugin, so it can be rebuilt from the downloaded plugin alone. The same source is also published publicly at:

https://github.com/wpanchorbay/pointbay-free

The admin interface is built with @wordpress/scripts (webpack + Babel); the stylesheets are compiled from Sass with Tailwind CSS via PostCSS by the same build. To regenerate the compiled assets from source, from the plugin directory:

1.  Run `npm install` to install the build tooling.
2.  Run `npm run build` to produce the production bundles in `build/`.

PHP dependencies are managed with Composer (`composer install`); third-party libraries live under `vendor/`. React and ReactDOM are provided by WordPress core and are not bundled. For a byte-for-byte reproducible build, the public repository above also includes the pinned `package-lock.json`.

**Uncompressed source of the minified files**

Every minified file in `build/` is compiled from our own source, which is available uncompressed at:

https://github.com/wpanchorbay/pointbay-free/tree/1.0.0/src

*   `build/admin.js` and `build/settings.js` are compiled from the React/TypeScript entry points `src/admin.tsx` and `src/settings.tsx` (which mount `src/AdminApp.tsx` and `src/SettingsApp.tsx`); `build/block-cart.js` and `build/block-checkout.js` are compiled from `src/cart/index.tsx` and `src/checkout/index.tsx`.
*   `build/admin.css`, `build/settings.css` and their `-rtl` variants are compiled from `src/styles/index.scss` (Sass + Tailwind CSS via PostCSS).

Each compiled file also carries a header comment pointing back to this source. The uncompressed `src/` directory ships inside the plugin zip as well, so the build is reproducible from the download alone with `npm install && npm run build`. The front-end scripts and styles in `assets/` are not compiled — they ship as the original, human-readable source.
