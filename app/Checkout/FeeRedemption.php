<?php
/**
 * Applies the redeemed loyalty points discount to the cart as a negative fee.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Checkout;

use LoyaltyBay\Core\Settings;

/**
 * Applies the loyalty points discount to the cart using a WooCommerce fee.
 *
 * @since 1.0.0
 */
class FeeRedemption {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var FeeRedemption|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return FeeRedemption
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register the hook that applies the points fee.
	 *
	 * @since 1.0.0
	 * @param \LoyaltyBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_cart_calculate_fees', $this, 'apply_fee' );
	}

	/**
	 * Apply the redeemed points as a negative fee on the cart.
	 *
	 * @since 1.0.0
	 * @param \WC_Cart $cart The WooCommerce cart object.
	 * @return void
	 */
	public function apply_fee( $cart ) {
		if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
			return;
		}

		$settings = Settings::get_instance();
		if ( $settings->get_settings( 'redemption_mode' ) !== 'fee' ) {
			return;
		}

		$redemption_manager = RedemptionManager::get_instance();
		$points             = $redemption_manager->get_applied_points();
		loyaltybay_log( 'LoyaltyBay FeeRedemption: apply_fee points: ' . $points . ', Session exists: ' . ( isset( WC()->session ) ? 'yes' : 'no' ) );

		if ( $points <= 0 ) {
			return;
		}

		$discount_value = $redemption_manager->calculate_discount_value( $points );

		if ( $discount_value > 0 ) {
			$cart->add_fee( __( 'LoyaltyBay Points Discount', 'loyaltybay-loyalty-points-referral-rewards-woo' ), -$discount_value, true );
		}
	}
}
