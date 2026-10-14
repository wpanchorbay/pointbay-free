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
		if ( ! is_user_logged_in() || ! isset( WC()->cart ) ) {
			return 0;
		}

		$user_id    = get_current_user_id();
		$calculator = EarningCalculator::get_instance();
		$basis      = $calculator->resolve_cart_basis();

		if ( $basis <= 0 ) {
			return 0;
		}

		$is_first_order = 0 === LedgerService::get_instance()->count_by_reference_type( $user_id, OrderHooks::REF_FIRST_ORDER );

		return $calculator->total(
			array(
				'amount'              => $basis,
				'user_id'             => $user_id,
				'include_first_order' => $is_first_order,
				'context'             => 'cart',
			)
		);
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
		$points = $this->get_notice_points();

		if ( $points <= 0 ) {
			return;
		}

		pointbay_log( 'PointBay EarnNotice: Printing notice HTML. Points: ' . $points );

		$this->render( $points );
	}
}
