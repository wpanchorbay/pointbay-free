<?php
namespace LoyaltyBay\Checkout;

use LoyaltyBay\Core\Settings;

class GuestNotice {
    public function run( $plugin ) {
        $loader = $plugin->get_loader();
        $loader->add_action( 'woocommerce_before_checkout_form', $this, 'display_notice', 5 );
        $loader->add_action( 'woocommerce_before_cart_totals', $this, 'display_notice', 5 );
    }

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
            __( 'Log in or create an account to earn <strong>%d</strong> points on this order!', 'loyaltybay' ), 
            $points_to_award 
        );

        echo '<div class="loyaltybay-guest-notice woocommerce-info" style="margin-bottom: 2em;">';
        echo wp_kses_post( $message );
        echo '</div>';
    }
}
