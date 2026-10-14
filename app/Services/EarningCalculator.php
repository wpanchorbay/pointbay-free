<?php
/**
 * The single implementation of "how many points is this worth".
 *
 * @package PointBay
 */

namespace PointBay\Services;

use PointBay\Core\Settings;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Computes a points award, and is the only place that knows how.
 *
 * Before this class existed the same `floor( amount * rate * multiplier )`
 * expression was copied across the award, the refund clawback, the order-totals
 * row, the cart notice, the guest notice and the checkout block's JavaScript.
 * They had already drifted — the award used the order total while every preview
 * used the cart subtotal — so a shopper was routinely shown a number the store
 * did not go on to award. Every one of those call sites now routes through
 * `calculate()`, which is what lets the product-page preview promise a figure
 * the order actually pays out.
 *
 * ## Canonical order of operations
 *
 * This sequence is the contract. Changing it changes what every store awards.
 *
 * 1. **Basis.** The caller resolves it, via `resolve_order_basis()` or
 *    `resolve_cart_basis()`, both of which honour the `earning_basis` setting
 *    (`total` includes shipping and tax; `subtotal` does not).
 * 2. **Band XOR rate.** With a non-empty `earning_bands`, the band covering the
 *    basis supplies the award and the per-currency rate is not consulted at all.
 *    An amount that falls outside every band earns zero — it does *not* fall
 *    back to the rate, because a configured ladder is a complete statement of
 *    what the store pays. Without bands, `basis * earning_pointsPerDollar`.
 * 3. **Plus the flat per-order bonus** (`earning_flatPointsPerOrder`), which
 *    stacks with step 2 rather than replacing it.
 * 4. **Times the tier multiplier.** Always applied to the step-2 base; applied
 *    to the flat bonus only when `earning_multiplyFlatBonus` is on. A single
 *    `floor()` closes this step, so rounding happens once rather than per
 *    component.
 * 5. **Plus the first-order bonus** (`earning_firstOrderBonus`), multiplied only
 *    when `earning_multiplyFirstOrderBonus` is on. Whether the customer is
 *    actually on their first order is the *caller's* question to answer — this
 *    class never queries the ledger.
 *
 * @since 1.1.0
 */
class EarningCalculator {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var EarningCalculator|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return EarningCalculator The single instance of the calculator.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Reads a setting, substituting a fallback when the key is absent.
	 *
	 * Reads the whole settings array and tests for the key, rather than calling
	 * `get_settings( $key )`. That single-key form returns `false` for a missing
	 * key, which is indistinguishable from a boolean setting that is legitimately
	 * off — so using it here would silently ignore every disabled toggle and
	 * substitute the default instead.
	 *
	 * @since 1.1.0
	 * @param string $key      The setting key.
	 * @param mixed  $fallback The value to use when the key is missing.
	 * @return mixed The setting value, or the fallback.
	 */
	private function setting( $key, $fallback ) {
		$all = Settings::get_instance()->get_settings();

		if ( is_array( $all ) && array_key_exists( $key, $all ) ) {
			return $all[ $key ];
		}

		return $fallback;
	}

	/**
	 * Returns the configured earning basis.
	 *
	 * @since 1.1.0
	 * @return string Either 'total' or 'subtotal'.
	 */
	public function get_basis_mode() {
		$mode = (string) $this->setting( 'earning_basis', 'total' );
		return 'subtotal' === $mode ? 'subtotal' : 'total';
	}

	/**
	 * Resolves the money basis for an order.
	 *
	 * One definition, shared with resolve_cart_basis(), so the figure previewed
	 * is the figure awarded:
	 *
	 * - 'total': what the customer actually paid (order total, which already
	 *   nets off coupons, a points coupon and a negative points fee).
	 * - 'subtotal': item subtotal minus every coupon (the points coupon
	 *   included) minus a fee-mode points discount. Shipping, tax and other
	 *   fees are excluded.
	 *
	 * In both modes points spent on an order never earn points back.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order The order to measure.
	 * @return float The money amount points should be calculated against.
	 */
	public function resolve_order_basis( $order ) {
		if ( ! $order ) {
			return 0.0;
		}

		if ( 'subtotal' === $this->get_basis_mode() ) {
			$points_fee = \PointBay\Checkout\RedemptionManager::get_instance()->get_points_fee_on_order( $order );
			return max( 0.0, (float) $order->get_subtotal() - (float) $order->get_total_discount() - $points_fee );
		}

		return max( 0.0, (float) $order->get_total() );
	}

	/**
	 * Resolves the money basis for the current cart.
	 *
	 * Mirrors resolve_order_basis(): coupons are subtracted (a points coupon
	 * included), and in fee mode the applied points discount is subtracted
	 * explicitly because a fee is not a coupon. Total mode adds shipping, tax
	 * and any fees other than the points fee.
	 *
	 * @since 1.1.0
	 * @return float The money amount points should be calculated against.
	 */
	public function resolve_cart_basis() {
		if ( ! function_exists( 'WC' ) || ! isset( WC()->cart ) ) {
			return 0.0;
		}

		$cart    = WC()->cart;
		$manager = \PointBay\Checkout\RedemptionManager::get_instance();
		$basis   = (float) $cart->get_subtotal() - (float) $cart->get_discount_total();

		$applied = (int) $manager->get_applied_points();
		if ( $applied > 0 && 'fee' === (string) $this->setting( 'redemption_mode', 'coupon' ) ) {
			$basis -= (float) $manager->calculate_discount_value(
				$applied,
				get_current_user_id(),
				array(
					'source' => 'cart',
					'amount' => $manager->get_cart_basis_before_points(),
				)
			);
		}

		if ( 'total' === $this->get_basis_mode() ) {
			$basis += (float) $cart->get_shipping_total() + (float) $cart->get_taxes_total();

			foreach ( $cart->get_fees() as $fee ) {
				if ( \PointBay\Checkout\FeeRedemption::fee_name() !== $fee->name ) {
					$basis += (float) $fee->total;
				}
			}
		}

		return max( 0.0, $basis );
	}

	/**
	 * Whether a customer qualifies for the one-time first-order bonus.
	 *
	 * Requires BOTH that no first-order bonus has been credited to them AND that
	 * they have no earlier qualifying order. The second condition matters when
	 * the bonus is switched on (or was zero) after a customer already had order
	 * history: without it a customer with forty past orders is treated as new.
	 * Earlier means created before $order, or any qualifying order at all when
	 * previewing a cart. Guests never qualify: points are only awarded to
	 * registered customers, so there is no ledger to hold the bonus.
	 *
	 * @since 1.1.0
	 * @param int            $user_id The customer.
	 * @param \WC_Order|null $order   The order being awarded, or null for a cart preview.
	 * @return bool True when the bonus applies.
	 */
	public function is_first_order( $user_id, $order = null ) {
		$user_id = (int) $user_id;
		if ( $user_id < 1 ) {
			return false;
		}

		if ( LedgerService::get_instance()->count_by_reference_type( $user_id, 'first_order_bonus' ) > 0 ) {
			return false;
		}

		$query = array(
			'customer_id' => $user_id,
			'status'      => array( 'wc-processing', 'wc-completed', 'wc-on-hold', 'wc-refunded' ),
			'limit'       => 1,
			'return'      => 'ids',
		);

		if ( $order ) {
			$query['exclude'] = array( $order->get_id() );
			$created          = $order->get_date_created();
			if ( $created ) {
				$query['date_created'] = '<' . $created->getTimestamp();
			}
		}

		return 0 === count( wc_get_orders( $query ) );
	}

	/**
	 * Calculates a points award and returns its components.
	 *
	 * A breakdown rather than a single integer, because two callers need the
	 * parts: the award writes one ledger row per component, and the refund
	 * clawback prorates only the amount-proportional part.
	 *
	 * `base`, `flat` and `first_order` in the return value are all *post*
	 * multiplier — they are the figures to write to the ledger, and they always
	 * sum to `total`.
	 *
	 * @since 1.1.0
	 * @param array $args {
	 *     Arguments.
	 *
	 *     @type float          $amount              The resolved money basis. Required.
	 *     @type int            $user_id             The customer. 0 for a guest.
	 *     @type bool           $apply_multiplier    Whether to apply the tier multiplier. Default true.
	 *     @type bool           $include_first_order Whether the first-order bonus applies. Default false.
	 *     @type string         $context             One of 'order', 'cart', 'product', 'guest'.
	 *     @type \WC_Order|null $order               The order, when there is one.
	 * }
	 * @return array The award breakdown.
	 */
	public function calculate( $args ) {
		$args = wp_parse_args(
			$args,
			array(
				'amount'              => 0.0,
				'user_id'             => 0,
				'apply_multiplier'    => true,
				'include_first_order' => false,
				'context'             => 'order',
				'order'               => null,
			)
		);

		$amount  = max( 0.0, (float) $args['amount'] );
		$user_id = (int) $args['user_id'];

		$rate     = (int) $this->setting( 'earning_pointsPerDollar', 1 );
		$bands    = (array) $this->setting( 'earning_bands', array() );
		$flat_raw = (int) $this->setting( 'earning_flatPointsPerOrder', 0 );

		// Step 2 — a configured ladder is authoritative and the rate is ignored.
		$band_id = null;
		if ( $bands ) {
			$band     = EarningBands::find_for_amount( $bands, $amount );
			$base_raw = 0.0;

			if ( $band ) {
				$band_id  = isset( $band['id'] ) ? (string) $band['id'] : null;
				$base_raw = 'rate' === (string) $this->setting( 'earning_bandMode', 'fixed' )
					? $amount * (float) $band['points']
					: (float) $band['points'];
			}
		} else {
			$base_raw = $amount * $rate;
		}

		// Step 4 — one multiplier, one call site, one rounding point.
		$multiplier = 1.0;
		if ( $args['apply_multiplier'] ) {
			/**
			 * Filters the earning multiplier applied to a points award.
			 *
			 * @since 1.0.0
			 * @param float $multiplier The multiplier. Default 1.0.
			 * @param int   $user_id    The customer the award is for.
			 * @param array $context    Award context: 'context', 'amount' and 'order'.
			 */
			$multiplier = (float) apply_filters(
				'pointbay_earning_multiplier',
				1.0,
				$user_id,
				array(
					'context' => (string) $args['context'],
					'amount'  => $amount,
					'order'   => $args['order'],
				)
			);
		}

		$base = (int) floor( $base_raw * $multiplier );

		if ( $flat_raw > 0 && $this->setting( 'earning_multiplyFlatBonus', true ) ) {
			// Derive the flat component from the combined figure rather than
			// rounding it on its own, so the two rows always sum to the total a
			// single floor() over (base + flat) would have produced.
			$flat = (int) floor( ( $base_raw + $flat_raw ) * $multiplier ) - $base;
		} else {
			$flat = $flat_raw;
		}

		$first_order = 0;
		if ( $args['include_first_order'] ) {
			$first_order_raw = (int) $this->setting( 'earning_firstOrderBonus', 0 );

			if ( $first_order_raw > 0 ) {
				$first_order = $this->setting( 'earning_multiplyFirstOrderBonus', false )
					? (int) floor( $first_order_raw * $multiplier )
					: $first_order_raw;
			}
		}

		return array(
			'basis_amount' => $amount,
			'basis_mode'   => $this->get_basis_mode(),
			'base'         => max( 0, $base ),
			'flat'         => max( 0, $flat ),
			'first_order'  => max( 0, $first_order ),
			'multiplier'   => $multiplier,
			'rate_used'    => $bands ? 0 : $rate,
			'band_id'      => $band_id,
			'total'        => max( 0, $base ) + max( 0, $flat ) + max( 0, $first_order ),
		);
	}

	/**
	 * Convenience wrapper returning only the total.
	 *
	 * @since 1.1.0
	 * @param array $args See calculate().
	 * @return int The total points.
	 */
	public function total( $args ) {
		$result = $this->calculate( $args );
		return (int) $result['total'];
	}
}
