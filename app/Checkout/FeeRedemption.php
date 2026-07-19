<?php
namespace LoyaltyBay\Checkout;

use LoyaltyBay\Core\Settings;

class FeeRedemption {
    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function run( $plugin ) {
        $loader = $plugin->get_loader();
        $loader->add_action( 'woocommerce_cart_calculate_fees', $this, 'apply_fee' );
    }

    public function apply_fee( $cart ) {
        if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
            return;
        }

        $settings = Settings::get_instance();
        if ( $settings->get_settings( 'redemption_mode' ) !== 'fee' ) {
            return;
        }

        $redemption_manager = RedemptionManager::get_instance();
        $points = $redemption_manager->get_applied_points();
        error_log( 'LoyaltyBay FeeRedemption: apply_fee points: ' . $points . ', Session exists: ' . (isset(WC()->session) ? 'yes' : 'no') );
        
        if ( $points <= 0 ) {
            return;
        }

        $discount_value = $redemption_manager->calculate_discount_value( $points );
        
        if ( $discount_value > 0 ) {
            $cart->add_fee( __( 'LoyaltyBay Points Discount', 'loyaltybay' ), -$discount_value, true );
        }
    }
}
