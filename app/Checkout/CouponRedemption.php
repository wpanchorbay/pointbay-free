<?php
/**
 * Provides a virtual WooCommerce coupon representing redeemed loyalty points.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Core\Settings;

/**
 * Applies the loyalty points discount to the cart using a virtual coupon.
 *
 * @since 1.0.0
 */
class CouponRedemption {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var CouponRedemption|null
	 */
	private static $instance = null;
	const COUPON_CODE_PREFIX = 'pointbay_points_';

	/**
	 * True only while this class is attaching its own coupon to the cart.
	 *
	 * @since 1.1.0
	 * @var bool
	 */
	public static $adding = false;

	/**
	 * True only while this class is swapping out a stale points coupon itself.
	 *
	 * @since 1.1.0
	 * @var bool
	 */
	public static $removing = false;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return CouponRedemption
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register the hooks for the virtual points coupon.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_filter( 'woocommerce_get_shop_coupon_data', $this, 'provide_virtual_coupon', 10, 2 );
		$loader->add_action( 'woocommerce_before_calculate_totals', $this, 'apply_virtual_coupon' );
		$loader->add_action( 'woocommerce_removed_coupon', $this, 'on_coupon_removed' );
		$loader->add_filter( 'woocommerce_cart_totals_coupon_label', $this, 'friendly_coupon_label', 10, 2 );
	}

	/**
	 * Clears the applied points when the customer removes the points coupon
	 * through WooCommerce's own controls (the cart [Remove] link, the checkout chip).
	 *
	 * The virtual coupon is re-added on every calculation from the session value,
	 * so without this the removal silently does nothing. Our own add and swap are
	 * excluded by the flags.
	 *
	 * @since 1.1.0
	 * @param string $coupon_code The removed coupon code.
	 * @return void
	 */
	public function on_coupon_removed( $coupon_code ) {
		if ( self::$adding || self::$removing ) {
			return;
		}

		if ( 0 === strpos( strtolower( (string) $coupon_code ), self::COUPON_CODE_PREFIX ) ) {
			RedemptionManager::get_instance()->remove_points_discount();
		}
	}

	/**
	 * Shows "Points discount" instead of the raw `pointbay_points_<hash>` code in
	 * the classic cart and checkout totals.
	 *
	 * Display only: the coupon code itself is untouched, and every internal check
	 * keys off the code rather than this label.
	 *
	 * @since 1.1.0
	 * @param string     $label  The coupon label.
	 * @param \WC_Coupon $coupon The coupon.
	 * @return string
	 */
	public function friendly_coupon_label( $label, $coupon ) {
		if ( $coupon instanceof \WC_Coupon && 0 === strpos( strtolower( $coupon->get_code() ), self::COUPON_CODE_PREFIX ) ) {
			return esc_html__( 'Points discount', 'pointbay-loyalty-points-referral-rewards-woo' );
		}
		return $label;
	}

	/**
	 * Add or remove the virtual points coupon on the cart.
	 *
	 * @since 1.0.0
	 * @param \WC_Cart $cart The WooCommerce cart object.
	 * @return void
	 */
	public function apply_virtual_coupon( $cart ) {
		if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
			return;
		}

		$settings = Settings::get_instance();
		if ( $settings->get_settings( 'redemption_mode' ) !== 'coupon' ) {
			return;
		}

		$redemption_manager = RedemptionManager::get_instance();

		// Deliberately NOT reconciling here, for two reasons. This runs on
		// woocommerce_before_calculate_totals, where the cart subtotal has not
		// been computed yet — the ceiling would be measured against zero and
		// clear the customer's redemption outright. And the discount is a
		// coupon in this mode, so it is inside get_discount_total(): recomputing
		// the ceiling from a total that already has the discount in it is
		// circular, the same trap get_max_redeemable_points() documents for fees.
		$points = $redemption_manager->get_applied_points();

		// A customer who may no longer redeem must not keep the points coupon.
		if ( $points > 0 && ! $redemption_manager->can_redeem( get_current_user_id(), array( 'source' => 'cart' ) ) ) {
			$points = 0;
		}

		// The code encodes the points amount, and provide_virtual_coupon() serves
		// any prefixed code at the CURRENT amount. A leftover code from an earlier
		// amount would therefore stack a second full discount, so only the code
		// for the current points may remain.
		$wanted = $points > 0 ? self::COUPON_CODE_PREFIX . md5( WC()->session->get_customer_id() . $points ) : '';

		foreach ( $cart->get_applied_coupons() as $coupon_code ) {
			if ( strpos( $coupon_code, self::COUPON_CODE_PREFIX ) === 0 && $coupon_code !== $wanted ) {
				self::$removing = true;
				try {
					$cart->remove_coupon( $coupon_code );
				} finally {
					self::$removing = false;
				}
			}
		}

		if ( $points > 0 ) {
			$coupon_code = $wanted;
			if ( ! $cart->has_discount( $coupon_code ) ) {
				// WC_Cart::add_discount() refuses outright while coupons are
				// disabled, and CouponFormVisibility disables them to hide the
				// form once points are applied. Our own coupon must still be
				// attachable, so the flag lets it through for this one call.
				self::$adding = true;
				// add_discount() queues "Coupon code applied successfully." for a coupon
				// the customer never typed; it would surface on a later page load.
				$notices_before = function_exists( 'wc_get_notices' ) ? wc_get_notices() : null;
				try {
					$cart->add_discount( $coupon_code );
				} finally {
					self::$adding = false;
					if ( null !== $notices_before && function_exists( 'wc_set_notices' ) ) {
						wc_set_notices( $notices_before );
					}
				}
			}
		}
	}

	/**
	 * Provide the data for the virtual points coupon.
	 *
	 * @since 1.0.0
	 * @param array|bool $coupon_data The existing coupon data, or false when none exists.
	 * @param string     $coupon_code The coupon code being requested.
	 * @return array|bool The virtual coupon data array, or the unmodified input.
	 */
	public function provide_virtual_coupon( $coupon_data, $coupon_code ) {
		$settings = Settings::get_instance();
		if ( $settings->get_settings( 'redemption_mode' ) !== 'coupon' ) {
			return $coupon_data;
		}

		if ( strpos( $coupon_code, self::COUPON_CODE_PREFIX ) !== 0 ) {
			return $coupon_data;
		}

		$redemption_manager = RedemptionManager::get_instance();
		$points             = $redemption_manager->get_applied_points();

		if ( $points <= 0 ) {
			return false;
		}

		$discount_value = $redemption_manager->calculate_discount_value(
			$points,
			get_current_user_id(),
			array(
				'source' => 'cart',
				'amount' => $redemption_manager->get_cart_basis_before_points(),
			)
		);

		return array(
			'id'                         => 0,
			'amount'                     => $discount_value,
			'discount_type'              => 'fixed_cart',
			// Virtual coupons created via `woocommerce_get_shop_coupon_data` never get a
			// data store (WC_Coupon::read_manual_coupon() sets props directly and never
			// calls read_object_from_database(), which is what normally assigns one), so
			// get_data_store() is null. WooCommerce's Store API only touches the data
			// store when usage_limit_per_user is non-zero (see
			// OrderController::validate_coupon_usage_limit()), so a non-zero value here
			// fatals on Place Order. This coupon is already single-use by construction
			// (regenerated per redemption amount, tied to the session), so relying on
			// WooCommerce's own usage-limit bookkeeping is unnecessary — 0 (unlimited)
			// avoids the null data store entirely.
			'usage_limit'                => 0,
			'usage_limit_per_user'       => 0,
			'limit_usage_to_x_items'     => null,
			'usage_count'                => 0,
			'expiry_date'                => null,
			'apply_before_tax'           => 'yes',
			'free_shipping'              => false,
			'product_categories'         => array(),
			'exclude_product_categories' => array(),
			'exclude_sale_items'         => false,
			'minimum_amount'             => '',
			'maximum_amount'             => '',
			'customer_email'             => array(),
		);
	}
}
