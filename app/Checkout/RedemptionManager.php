<?php
/**
 * Manages the redemption of loyalty points during checkout.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Core\Settings;
use PointBay\Services\LedgerService;

/**
 * Manages loyalty points redemption state stored in the WooCommerce session.
 *
 * @since 1.0.0
 */
class RedemptionManager {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var RedemptionManager|null
	 */
	private static $instance = null;

	const SESSION_KEY = 'pointbay_points_redemption';

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return RedemptionManager
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Set the amount of points the user wants to redeem in the session.
	 *
	 * @since 1.0.0
	 * @param int $user_id          The ID of the user redeeming points.
	 * @param int $points_to_redeem The number of points to redeem.
	 * @return bool|\WP_Error True on success, or a WP_Error on failure.
	 */
	public function apply_points_discount( $user_id, $points_to_redeem ) {
		$settings   = Settings::get_instance();
		$min_points = (int) $settings->get_settings( 'redemption_minPoints' );

		if ( $points_to_redeem === 0 ) {
			$this->remove_points_discount();
			return true;
		}

		if ( $points_to_redeem < $min_points ) {
			// translators: %d: minimum number of points required to redeem.
			return new \WP_Error( 'below_minimum', sprintf( __( 'Minimum points required to redeem is %d.', 'pointbay-loyalty-points-referral-rewards-woo' ), $min_points ) );
		}

		$max_points = $this->get_max_redeemable_points( $user_id );

		if ( $points_to_redeem > $max_points ) {
			return new \WP_Error( 'insufficient_points', __( 'You do not have enough points or the cart value is lower than the points value.', 'pointbay-loyalty-points-referral-rewards-woo' ) );
		}

		WC()->session->set( self::SESSION_KEY, $points_to_redeem );
		return true;
	}

	/**
	 * Remove the points redemption from the session.
	 */
	public function remove_points_discount() {
		if ( isset( WC()->session ) ) {
			WC()->session->set( self::SESSION_KEY, null );
		}
	}

	/**
	 * Get the amount of points currently applied to the cart.
	 */
	public function get_applied_points() {
		if ( ! isset( WC()->session ) ) {
			return 0;
		}
		return (int) WC()->session->get( self::SESSION_KEY, 0 );
	}

	/**
	 * Calculate discount value for a given amount of points.
	 *
	 * @since 1.0.0
	 * @param int $points The number of points to convert into a discount value.
	 * @return float The monetary discount value for the given points.
	 */
	public function calculate_discount_value( $points ) {
		$settings     = Settings::get_instance();
		$points_value = (float) $settings->get_settings( 'redemption_pointsValue' );
		return $points * $points_value;
	}

	/**
	 * Get maximum redeemable points for the user and current cart.
	 *
	 * @since 1.0.0
	 * @param int $user_id The ID of the user whose points are being checked.
	 * @return int|float The maximum number of points that can be redeemed.
	 */
	public function get_max_redeemable_points( $user_id ) {
		$balance = LedgerService::get_instance()->get_balance( $user_id );

		if ( ! isset( WC()->cart ) ) {
			return $balance;
		}

		// Use subtotal minus any coupon discounts already applied, rather than the
		// raw pre-discount subtotal, so the redemption cap can't exceed what's
		// actually still payable when other coupons are stacked on the cart.
		// (Our own points fee is applied later via woocommerce_cart_calculate_fees,
		// so it's intentionally excluded here to avoid a circular dependency.)
		$cart_total = (float) WC()->cart->get_subtotal() - (float) WC()->cart->get_discount_total();
		$cart_total = max( 0.0, $cart_total );

		$settings     = Settings::get_instance();
		$points_value = (float) $settings->get_settings( 'redemption_pointsValue' );

		$max_points_for_cart = $points_value > 0 ? floor( $cart_total / $points_value ) : 0;

		return min( $balance, $max_points_for_cart );
	}
}
