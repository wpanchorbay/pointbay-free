<?php
/**
 * Handles the "earn points" notice shown on the cart and checkout for logged-in users.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Services\EarningCalculator;
use PointBay\Services\LedgerService;
use PointBay\Hooks\OrderHooks;

/**
 * Displays a notice informing logged-in customers how many points they will earn.
 *
 * The figure comes from EarningCalculator, the same class the award itself uses,
 * so the promise made here and the credit written later cannot drift apart.
 *
 * @since 1.0.0
 */
class EarnNotice {

	/**
	 * Register the hooks that display the earn notice.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_before_checkout_form', $this, 'display_notice', 5 );
		$loader->add_action( 'woocommerce_before_cart_totals', $this, 'display_notice', 5 );
	}

	/**
	 * Calculates the points the current cart would earn the current customer.
	 *
	 * @since 1.1.0
	 * @return int The points, or 0 when there is nothing to promise.
	 */
	public function get_notice_points() {
		$state = $this->get_notice_state();

		return (int) $state['points'];
	}

	/**
	 * Works out what the notice should say for the current cart and customer.
	 *
	 * `points` is what the cart earns now (0 below the minimum spend). `minimum`
	 * is null unless the cart is under the minimum and reaching it would earn
	 * something, in which case it is the array from minimum_spend_state().
	 *
	 * @since 1.1.0
	 * @return array{points:int,minimum:array|null} The notice state.
	 */
	public function get_notice_state() {
		$state = array(
			'points'  => 0,
			'minimum' => null,
		);

		if ( ! is_user_logged_in() || ! isset( WC()->cart ) ) {
			return $state;
		}

		$user_id    = get_current_user_id();
		$calculator = EarningCalculator::get_instance();
		$basis      = $calculator->resolve_cart_basis();

		if ( $basis <= 0 ) {
			return $state;
		}

		$is_first_order = $calculator->is_first_order( $user_id );

		$state['points'] = $calculator->total(
			array(
				'amount'              => $basis,
				'user_id'             => $user_id,
				'include_first_order' => $is_first_order,
				'context'             => 'cart',
			)
		);

		$minimum = $calculator->minimum_spend_state( $basis, $user_id, 'cart', $is_first_order );

		// A minimum that would earn nothing (an empty band, say) has nothing to
		// promise, so no message is shown for it.
		if ( $minimum && (int) $minimum['points'] > 0 ) {
			$state['minimum'] = $minimum;
		}

		return $state;
	}

	/**
	 * Renders the "spend more to earn" notice shown under the minimum spend.
	 *
	 * @since 1.1.0
	 * @param array $minimum The minimum_spend_state() array.
	 * @return void
	 */
	public function render_minimum( $minimum ) {
		if ( empty( $minimum['message'] ) ) {
			return;
		}

		echo '<div class="pointbay-earn-notice pointbay-earn-notice--minimum woocommerce-info" style="margin-bottom: 2em;">';
		echo esc_html( $minimum['message'] );
		echo '</div>';
	}

	/**
	 * Renders the notice markup for a points figure.
	 *
	 * Kept separate from the calculation so other surfaces can reuse the exact
	 * notice styling without duplicating the wording.
	 *
	 * @since 1.1.0
	 * @param int $points The points to announce.
	 * @return void
	 */
	public function render( $points ) {
		$points = (int) $points;

		if ( $points <= 0 ) {
			return;
		}

		$message = sprintf(
			// translators: %d: number of points the customer will earn on this order.
			__( 'Complete this order to earn <strong>%d</strong> points!', 'pointbay-loyalty-points-referral-rewards-woo' ),
			$points
		);

		echo '<div class="pointbay-earn-notice woocommerce-info" style="margin-bottom: 2em;">';
		echo wp_kses_post( $message );
		echo '</div>';
	}

	/**
	 * Output the earn-points notice on the cart and checkout pages.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function display_notice() {
		$state = $this->get_notice_state();

		if ( $state['minimum'] ) {
			$this->render_minimum( $state['minimum'] );
			return;
		}

		$points = (int) $state['points'];

		if ( $points <= 0 ) {
			return;
		}

		pointbay_log( 'PointBay EarnNotice: Printing notice HTML. Points: ' . $points );

		$this->render( $points );
	}
}
