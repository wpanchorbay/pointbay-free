<?php
/**
 * Handles the "earn points" notice shown on the cart and checkout for logged-in users.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Core\Settings;

/**
 * Displays a notice informing logged-in customers how many points they will earn.
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
	 * Output the earn-points notice on the cart and checkout pages.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function display_notice() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$settings          = Settings::get_instance();
		$points_per_dollar = (int) $settings->get_settings( 'earning_pointsPerDollar' );
		if ( $points_per_dollar <= 0 ) {
			return;
		}

		$total = (float) WC()->cart->subtotal;

		$manager        = \PointBay\Checkout\RedemptionManager::get_instance();
		$applied_points = $manager->get_applied_points();
		if ( $applied_points > 0 ) {
			$discount_value = $manager->calculate_discount_value( $applied_points );
			$total         -= $discount_value; // subtract discount
			$total          = max( 0, $total );
		}

		pointbay_log( 'PointBay EarnNotice: Subtotal after discount is ' . $total );

		if ( $total <= 0 ) {
			pointbay_log( 'PointBay EarnNotice: Returning because total <= 0' );
			return;
		}

		$user_id    = get_current_user_id();
		$multiplier = apply_filters( 'pointbay_earning_multiplier', 1.0, $user_id );

		$points_to_award = (int) floor( $total * $points_per_dollar * $multiplier );

		if ( $points_to_award <= 0 ) {
			return;
		}

		$message = sprintf(
			// translators: %d: number of points the customer will earn on this order.
			__( 'Complete this order to earn <strong>%d</strong> points!', 'pointbay-loyalty-points-referral-rewards-woo' ),
			$points_to_award
		);

		pointbay_log( 'PointBay EarnNotice: Printing notice HTML. Points: ' . $points_to_award );

		echo '<div class="pointbay-earn-notice woocommerce-info" style="margin-bottom: 2em;">';
		echo wp_kses_post( $message );
		echo '</div>';
	}
}
