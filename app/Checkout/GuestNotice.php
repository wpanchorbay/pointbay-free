<?php
/**
 * Handles the guest notice prompting visitors to log in or register to earn points.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Checkout;

use LoyaltyBay\Core\Settings;

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
	 * @param \LoyaltyBay\Core\Plugin $plugin The plugin instance.
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

		$points_per_dollar = (int) $settings->get_settings( 'earning_pointsPerDollar' );
		if ( $points_per_dollar <= 0 ) {
			return;
		}

		$total = (float) WC()->cart->subtotal;
		if ( $total <= 0 ) {
			return;
		}

		$points_to_award = (int) floor( $total * $points_per_dollar );

		$reg_points = (int) $settings->get_settings( 'earning_pointsForRegistration' );
		if ( $reg_points > 0 ) {
			$points_to_award += $reg_points;
		}

		$message = sprintf(
			// translators: %d: number of points the customer can earn on this order.
			__( 'Log in or create an account to earn <strong>%d</strong> points on this order!', 'loyaltybay-loyalty-points-referral-rewards-woo' ),
			$points_to_award
		);

		echo '<div class="loyaltybay-guest-notice woocommerce-info" style="margin-bottom: 2em;">';
		echo wp_kses_post( $message );
		echo '</div>';
	}
}
