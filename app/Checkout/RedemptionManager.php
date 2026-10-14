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

		if ( ! $this->can_redeem( $user_id, array( 'source' => 'cart' ) ) ) {
			return new \WP_Error( 'redemption_not_allowed', __( 'Points redemption is not available on this account.', 'pointbay-loyalty-points-referral-rewards-woo' ) );
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
	 * @param int   $points  The number of points to convert into a discount value.
	 * @param int   $user_id Optional. The customer the conversion is for. Default 0.
	 * @param array $context Optional. Conversion context passed to the filter. Default empty.
	 * @return float The monetary discount value for the given points.
	 */
	public function calculate_discount_value( $points, $user_id = 0, $context = array() ) {
		$settings     = Settings::get_instance();
		$points_value = (float) $settings->get_settings( 'redemption_pointsValue' );

		/**
		 * Filters the money value a number of points converts into.
		 *
		 * The conversion is linear by default. An add-on may replace it with
		 * something else — a percentage of the cart, say.
		 *
		 * IMPORTANT: anything filtering this MUST filter `pointbay_max_redeemable`
		 * to match. The ceiling is what inverts this conversion, so a filter that
		 * changes one and not the other lets a customer discount more than the
		 * cart is worth.
		 *
		 * @since 1.1.0
		 * @param float $value   The money value of the points.
		 * @param int   $points  The points being converted.
		 * @param int   $user_id The customer, when known.
		 * @param array $context Conversion context: 'source', 'amount', 'order'.
		 */
		return (float) apply_filters(
			'pointbay_redemption_discount_value',
			$points * $points_value,
			$points,
			(int) $user_id,
			(array) $context
		);
	}

	/**
	 * Whether a customer is permitted to redeem points at all.
	 *
	 * Free always says yes; the filter exists so an add-on can restrict
	 * redemption without editing any of the four places that ask.
	 *
	 * @since 1.1.0
	 * @param int   $user_id The customer.
	 * @param array $context Where the question is being asked from.
	 * @return bool True when redemption is allowed.
	 */
	public function can_redeem( $user_id, $context = array() ) {
		if ( (int) $user_id < 1 ) {
			return false;
		}

		/**
		 * Filters whether a customer may redeem points.
		 *
		 * @since 1.1.0
		 * @param bool  $can_redeem Whether redemption is allowed. Default true.
		 * @param int   $user_id    The customer.
		 * @param array $context    Context: 'source' and, where known, 'order'.
		 */
		return (bool) apply_filters( 'pointbay_can_redeem', true, (int) $user_id, (array) $context );
	}

	/**
	 * Get maximum redeemable points for the user against a money basis.
	 *
	 * The single ceiling. Every surface that asks "how many points may this
	 * customer spend" — both checkout UIs, the REST endpoint and the order-time
	 * re-validation — comes through here, which is what makes the
	 * `pointbay_max_redeemable` filter binding rather than cosmetic. There is
	 * deliberately one exit: an early return for the no-cart case would leave a
	 * filtered cap unapplied on exactly the path that debits the order.
	 *
	 * @since 1.0.0
	 * @param int        $user_id The ID of the user whose points are being checked.
	 * @param float|null $amount  Optional. The money basis. Defaults to the current cart.
	 * @param array      $context Optional. Caller context: 'source' and 'order'.
	 * @return int The maximum number of points that can be redeemed.
	 */
	public function get_max_redeemable_points( $user_id, $amount = null, $context = array() ) {
		$balance = LedgerService::get_instance()->get_balance( $user_id );
		$max     = (float) $balance;

		if ( null === $amount && isset( WC()->cart ) ) {
			// Use subtotal minus any coupon discounts already applied, rather than the
			// raw pre-discount subtotal, so the redemption cap can't exceed what's
			// actually still payable when other coupons are stacked on the cart.
			// (Our own points fee is applied later via woocommerce_cart_calculate_fees,
			// so it's intentionally excluded here to avoid a circular dependency.)
			$amount = (float) WC()->cart->get_subtotal() - (float) WC()->cart->get_discount_total();
		}

		if ( null !== $amount ) {
			$max = min( $max, (float) $this->get_max_points_for_amount( $amount ) );
		}

		$context = wp_parse_args(
			$context,
			array(
				'amount' => $amount,
				'source' => 'cart',
				'order'  => null,
			)
		);

		/**
		 * Filters the maximum number of points a customer may redeem.
		 *
		 * The value is in POINTS, not money.
		 *
		 * @since 1.1.0
		 * @param float $max     The ceiling in points.
		 * @param int   $user_id The customer.
		 * @param array $context Context: 'amount', 'source' ('cart'|'order'|'api'), 'order'.
		 */
		$max = (float) apply_filters( 'pointbay_max_redeemable', $max, (int) $user_id, $context );

		return (int) max( 0, floor( $max ) );
	}

	/**
	 * Clamps the session's applied points down to the current ceiling.
	 *
	 * The ceiling can move underneath a customer who has already applied points
	 * — a cap introduced mid-session, a cart edited in another tab. Without this
	 * the session and the fee disagree until order time, where the re-validation
	 * in CheckoutProcessor aborts the whole checkout. Reconciling on every cart
	 * calculation keeps that exception for genuine races instead.
	 *
	 * @since 1.1.0
	 * @param int $user_id The customer.
	 * @return int The applied points after clamping.
	 */
	public function reconcile_applied_points( $user_id ) {
		$applied = $this->get_applied_points();

		if ( $applied <= 0 || (int) $user_id < 1 || ! isset( WC()->session ) ) {
			return $applied;
		}

		$max = $this->can_redeem( $user_id, array( 'source' => 'cart' ) ) ? (int) $this->get_max_redeemable_points( $user_id ) : 0;

		if ( $applied <= $max ) {
			return $applied;
		}

		WC()->session->set( self::SESSION_KEY, $max > 0 ? $max : null );

		if ( function_exists( 'wc_add_notice' ) && ! is_admin() ) {
			if ( $max > 0 ) {
				$notice = sprintf(
					// translators: %d: the number of points now applied.
					__( 'Your points discount was adjusted to %d points.', 'pointbay-loyalty-points-referral-rewards-woo' ),
					$max
				);
			} else {
				$notice = __( 'Your points discount is no longer available and has been removed.', 'pointbay-loyalty-points-referral-rewards-woo' );
			}

			if ( ! wc_has_notice( $notice, 'notice' ) ) {
				wc_add_notice( $notice, 'notice' );
			}
		}

		return $max > 0 ? $max : 0;
	}

	/**
	 * Convert a monetary amount into the maximum number of points redeemable
	 * against it, given the current redemption_pointsValue setting.
	 *
	 * Shared arithmetic between get_max_redeemable_points() (cart-time cap)
	 * and CheckoutProcessor::debit_for_order() (order-time re-validation
	 * against the order's final total, in case the cart changed between the
	 * two).
	 *
	 * @since 1.0.0
	 * @param float $amount The monetary amount to convert, e.g. a cart or order total basis.
	 * @return int|float The maximum number of points redeemable against that amount.
	 */
	public function get_max_points_for_amount( $amount ) {
		$settings     = Settings::get_instance();
		$points_value = (float) $settings->get_settings( 'redemption_pointsValue' );

		return $points_value > 0 ? floor( max( 0.0, (float) $amount ) / $points_value ) : 0;
	}
}
