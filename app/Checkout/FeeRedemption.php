<?php
/**
 * Applies the redeemed loyalty points discount to the cart as a negative fee.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Core\Settings;

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
	 * @param \PointBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_cart_calculate_fees', $this, 'apply_fee' );
	}

	/**
	 * The label of the negative fee, which is also how an order's points fee is recognised.
	 *
	 * @since 1.1.0
	 * @return string The fee name.
	 */
	public static function fee_name() {
		return __( 'PointBay Points Discount', 'pointbay-loyalty-points-referral-rewards-woo' );
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

		// Deliberately NOT reconciling here. This hook also runs during the
		// place-order request, and clamping the session mid-checkout turns an
		// honest "your points discount could no longer be applied, please try
		// again" into a silent full-price order — the customer expected a
		// discount and is charged without it. Reconciliation happens when a
		// checkout page is rendered instead, where the shopper can see the
		// adjustment notice and decide. Order-time safety is still handled by
		// CheckoutProcessor, which re-validates against the locked balance.
		$points = $redemption_manager->get_applied_points();
		pointbay_log( 'PointBay FeeRedemption: apply_fee points: ' . $points . ', Session exists: ' . ( isset( WC()->session ) ? 'yes' : 'no' ) );

		if ( $points <= 0 ) {
			return;
		}

		// Eligibility can change after points were applied (a filter, an account
		// change). Never price a discount for a customer who may not redeem; the
		// order-time check in CheckoutProcessor aborts rather than charging full price.
		if ( ! $redemption_manager->can_redeem( get_current_user_id(), array( 'source' => 'cart' ) ) ) {
			return;
		}

		$discount_value = $redemption_manager->calculate_discount_value( $points, get_current_user_id(), array( 'source' => 'cart' ) );

		if ( $discount_value > 0 ) {
			$cart->add_fee( self::fee_name(), -$discount_value, true );
		}
	}
}
