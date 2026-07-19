<?php
namespace LoyaltyBay\Checkout;

use LoyaltyBay\Core\Settings;

class EarnNotice {
    public function run( $plugin ) {
        $loader = $plugin->get_loader();
        $loader->add_action( 'woocommerce_before_checkout_form', $this, 'display_notice', 5 );
        $loader->add_action( 'woocommerce_before_cart_totals', $this, 'display_notice', 5 );
    }

    public function display_notice() {
        if ( ! is_user_logged_in() ) {
            return;
        }

        $settings = Settings::get_instance();
        $points_per_dollar = (int) $settings->get_settings( 'earning_pointsPerDollar' );
        if ( $points_per_dollar <= 0 ) {
            return;
        }

        $total = (float) WC()->cart->subtotal;
        
        $manager = \LoyaltyBay\Checkout\RedemptionManager::get_instance();
        $applied_points = $manager->get_applied_points();
        if ( $applied_points > 0 ) {
            $discount_value = $manager->calculate_discount_value( $applied_points );
            $total -= $discount_value; // subtract discount
            $total = max( 0, $total );
        }
        
        error_log('LoyaltyBay EarnNotice: Subtotal after discount is ' . $total);
        
        if ( $total <= 0 ) {
            error_log('LoyaltyBay EarnNotice: Returning because total <= 0');
            return;
        }

        $user_id = get_current_user_id();
        $multiplier = apply_filters( 'loyaltybay_earning_multiplier', 1.0, $user_id );

        $points_to_award = (int) floor( $total * $points_per_dollar * $multiplier );

        if ( $points_to_award <= 0 ) {
            return;
        }

        $message = sprintf( 
            __( 'Complete this order to earn <strong>%d</strong> points!', 'loyaltybay' ), 
            $points_to_award 
        );

        error_log('LoyaltyBay EarnNotice: Printing notice HTML. Points: ' . $points_to_award);

        echo '<div class="loyaltybay-earn-notice woocommerce-info" style="margin-bottom: 2em;">';
        echo wp_kses_post( $message );
        echo '</div>';
    }
}
