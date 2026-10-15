<?php
/**
 * Handles the guest notice prompting visitors to log in or register to earn points.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Core\Settings;
use PointBay\Services\EarningCalculator;

/**
 * Displays a notice encouraging guests to log in or register to earn points.
 *
 * @since 1.0.0
 */
class GuestNotice {

	/**
	 * Register the hooks that display the guest notice.
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
	 * Output the guest notice on the cart and checkout pages.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function display_notice() {
		if ( is_user_logged_in() ) {
			return;
		}

		$settings = Settings::get_instance();
		if ( ! $settings->get_settings( 'display_guestNoticeEnabled' ) ) {
			return;
		}

		$calculator = EarningCalculator::get_instance();
		$basis      = $calculator->resolve_cart_basis();

		if ( $basis <= 0 ) {
			return;
		}

		// Two deliberate departures from the logged-in notice, both intentional
		// and neither a bug to be tidied away:
		//
		// 1. apply_multiplier is off. A visitor has no account, so no VIP tier,
		// so no multiplier can honestly be promised to them.
		// 2. The registration points are added *outside* the calculator. They
		// are not an earning rule for this order — they are a separate
		// signup incentive being previewed alongside it, and folding them in
		// would make them prorate on refund like order-earned points.
		$points_to_award = $calculator->total(
			array(
				'amount'           => $basis,
				'user_id'          => 0,
				'apply_multiplier' => false,
				'context'          => 'guest',
			)
		);

		$reg_points = (int) $settings->get_settings( 'earning_pointsForRegistration' );
		if ( $reg_points > 0 ) {
			$points_to_award += $reg_points;
		}

		if ( $points_to_award <= 0 ) {
			return;
		}

		$message = sprintf(
			// translators: %d: number of points the customer can earn on this order.
			__( 'Log in or create an account to earn <strong>%d</strong> points on this order!', 'pointbay-loyalty-points-referral-rewards-woo' ),
			$points_to_award
		);

		echo '<div class="pointbay-guest-notice woocommerce-info" style="margin-bottom: 2em;">';
		echo wp_kses_post( $message );
		echo '</div>';
	}
}
