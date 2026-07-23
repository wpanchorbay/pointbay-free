=== LoyaltyBay - Loyalty Points and Rewards for WooCommerce ===
Contributors: wpanchorbay, sankarsan
Tags: woocommerce, loyalty, rewards, points, loyalty program
Requires at least: 5.6
Tested up to: 7.0
Requires PHP: 7.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Reward WooCommerce customers with loyalty points they earn on purchases and redeem for discounts at checkout.

== Description ==

**LoyaltyBay** is a loyalty and rewards points system for WooCommerce. Let your customers earn points when they shop and spend those points for instant savings at checkout. Everything is configured from a single settings screen, and customers can track their balance right inside their WooCommerce account.

**Earning points**

*   Award points based on how much a customer spends (points per currency unit).
*   Give bonus points when a customer creates an account.
*   Reward customers with points for leaving a product review.
*   Choose which order status triggers points (for example, *Completed* or *Processing*), so points are only granted once an order is confirmed.

**Redeeming points**

*   Customers apply their points at checkout for a discount on their order.
*   Redeem points as an order **fee (discount)** or as a **coupon**, whichever fits your store.
*   Set the monetary value of a point and a minimum number of points required before redemption is allowed.
*   Works with both the **classic checkout** and the **WooCommerce Cart & Checkout blocks**.

**For your customers**

*   A dedicated **My Rewards** tab in the WooCommerce *My Account* area shows the current points balance and recent points history.
*   An optional notice lets guests know they could be earning points by signing in.

**For store owners**

*   A **Points History** ledger in the admin lists every points transaction for auditing.
*   A clean, modern settings screen integrated into WooCommerce settings.
*   A custom `manage_loyaltybay` capability so you control which roles can manage the program.

== Installation ==

1.  Make sure **WooCommerce** is installed and active.
2.  In your WordPress admin, go to **Plugins > Add New > Upload Plugin** and choose the plugin zip file, or upload the `loyaltybay-loyalty-points-referral-rewards-woo` folder to `/wp-content/plugins/`.
3.  Activate the plugin through the **Plugins** menu in WordPress.
4.  Go to **WooCommerce > Settings > LoyaltyBay** to configure earning and redemption rules.

== Frequently Asked Questions ==

= Does this plugin require WooCommerce? =

Yes. LoyaltyBay is a WooCommerce extension and requires WooCommerce to be installed and active.

= How do customers earn points? =

Customers earn points automatically based on the rules you configure: an amount per currency unit spent, plus optional bonuses for registering an account or reviewing a product. Points for an order are granted when the order reaches the order status you select in the settings.

= How do customers redeem their points? =

At checkout, customers can apply their available points for a discount. You decide the value of each point, the minimum points needed to redeem, and whether the discount is applied as an order fee or as a coupon.

= Does it work with the WooCommerce checkout blocks? =

Yes. LoyaltyBay supports both the classic checkout and the block-based Cart and Checkout.

= Where can customers see their points balance? =

Every customer gets a **My Rewards** section under **My Account** showing their current balance and recent points history.

== Screenshots ==

1.  LoyaltyBay settings screen inside WooCommerce settings.
2.  Earning rules: points per purchase, registration, and reviews.
3.  Redemption applied at checkout.
4.  The customer "My Rewards" area in My Account.
5.  The admin Points History ledger.

== Changelog ==

= 1.0.0 =
*   Initial release: earn points on purchases, registration, and reviews; redeem points at checkout (fee or coupon); Points History ledger; and a My Rewards account area.
