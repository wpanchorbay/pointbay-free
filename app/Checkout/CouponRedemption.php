<?php
/**
 * Provides a virtual WooCommerce coupon representing redeemed loyalty points.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Checkout;

use LoyaltyBay\Core\Settings;

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
	const COUPON_CODE_PREFIX = 'loyaltybay_points_';

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
	 * @param \LoyaltyBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_filter( 'woocommerce_get_shop_coupon_data', $this, 'provide_virtual_coupon', 10, 2 );
		$loader->add_action( 'woocommerce_before_calculate_totals', $this, 'apply_virtual_coupon' );
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
		$points             = $redemption_manager->get_applied_points();

		$applied_coupons = $cart->get_applied_coupons();
		foreach ( $applied_coupons as $coupon_code ) {
			if ( strpos( $coupon_code, self::COUPON_CODE_PREFIX ) === 0 ) {
				if ( $points <= 0 ) {
					$cart->remove_coupon( $coupon_code );
				}
			}
		}

		if ( $points > 0 ) {
			$coupon_code = self::COUPON_CODE_PREFIX . md5( WC()->session->get_customer_id() . $points );
			if ( ! $cart->has_discount( $coupon_code ) ) {
				$cart->add_discount( $coupon_code );
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

		$discount_value = $redemption_manager->calculate_discount_value( $points );

		return array(
			'id'                         => 0,
			'amount'                     => $discount_value,
			'discount_type'              => 'fixed_cart',
			'usage_limit'                => 1,
			'usage_limit_per_user'       => 1,
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
