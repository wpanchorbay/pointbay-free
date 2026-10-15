<?php
/**
 * Hides the coupon form while a points discount is applied.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Core\Settings;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Suppresses coupon entry while points are redeemed, to stop double-discounting.
 *
 * Filtering `woocommerce_coupons_enabled` does the real work in both checkouts:
 * WooCommerce's own Store API route (CartApplyCoupon) refuses to apply a coupon
 * when it returns false, so the restriction is enforced server-side regardless
 * of what the page shows.
 *
 * Hiding the *form* is a separate problem, and the two checkouts differ:
 *
 * - Classic reads the filter while rendering, so the form disappears correctly.
 * - Block checkout does not. `Checkout::enqueue_data()` pushes `couponsEnabled`
 *   into the asset data registry once, at page render, and the front end never
 *   re-reads it. Applying points over AJAX therefore leaves the coupon panel on
 *   screen even though the server has already stopped accepting coupons. A body
 *   class toggled by the redemption block, plus the rule in public.css, closes
 *   that gap. It is presentation only — someone who removes the class in
 *   devtools gets a form whose submissions the server still rejects.
 *
 * @since 1.1.0
 */
class CouponFormVisibility {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var CouponFormVisibility|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return CouponFormVisibility
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers the hooks handled by this class.
	 *
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_filter( 'woocommerce_coupons_enabled', $this, 'maybe_disable_coupons' );
		$loader->add_filter( 'body_class', $this, 'add_body_class' );
	}

	/**
	 * Whether points are currently applied and the setting is on.
	 *
	 * @since 1.1.0
	 * @return bool True when the coupon form should be suppressed.
	 */
	private function should_hide() {
		if ( ! Settings::get_instance()->get_settings( 'redemption_hideCouponForm' ) ) {
			return false;
		}

		return RedemptionManager::get_instance()->get_applied_points() > 0;
	}

	/**
	 * Turns coupons off while points are applied.
	 *
	 * @since 1.1.0
	 * @param bool $enabled Whether coupons are currently enabled.
	 * @return bool The filtered value.
	 */
	public function maybe_disable_coupons( $enabled ) {
		if ( ! $enabled || CouponRedemption::$adding ) {
			return $enabled;
		}

		return ! $this->should_hide();
	}

	/**
	 * Marks the page so the block checkout's coupon panel can be hidden.
	 *
	 * @since 1.1.0
	 * @param array $classes The existing body classes.
	 * @return array The filtered classes.
	 */
	public function add_body_class( $classes ) {
		if ( $this->should_hide() ) {
			$classes[] = 'pointbay-points-applied';
		}

		return $classes;
	}
}
