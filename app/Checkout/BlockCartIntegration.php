<?php
namespace LoyaltyBay\Checkout;

use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;

class BlockCartIntegration implements IntegrationInterface {

    public function get_name() {
        return 'loyaltybay_cart';
    }

    public function initialize() {
        $script_url  = \LOYALTYBAY_URL . 'build/block-cart.js';
        $script_path = \LOYALTYBAY_DIR . 'build/block-cart.js';
        $asset_path  = \LOYALTYBAY_DIR . 'build/block-cart.asset.php';
        
        $dependencies = array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins' );
        $version      = \LOYALTYBAY_VERSION;

        if ( file_exists( $asset_path ) ) {
            $asset        = require $asset_path;
            $dependencies = array_merge( $asset['dependencies'], array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins', 'wc-blocks-checkout' ) );
            $version      = $asset['version'];
        } else if ( file_exists( $script_path ) ) {
            $dependencies = array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins', 'wc-blocks-checkout' );
            $version      = filemtime( $script_path );
        } else {
            $dependencies = array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins', 'wc-blocks-checkout' );
        }
        
        wp_register_script(
            'loyaltybay-block-cart',
            $script_url,
            $dependencies,
            $version,
            true
        );
    }

    public function get_script_handles() {
        return array( 'loyaltybay-block-cart' );
    }

    public function get_editor_script_handles() {
        return array( 'loyaltybay-block-cart' );
    }

    public function get_script_data() {
        $user_id = get_current_user_id();
        $manager = \LoyaltyBay\Checkout\RedemptionManager::get_instance();
        $settings = \LoyaltyBay\Core\Settings::get_instance();

        $earning_multiplier = $user_id ? apply_filters( 'loyaltybay_earning_multiplier', 1.0, $user_id ) : 1.0;

        return array(
            'rest_url'            => esc_url_raw( rest_url( 'loyaltybay/v1/redeem' ) ),
            'nonce'               => wp_create_nonce( 'wp_rest' ),
            'max_points'          => $manager->get_max_redeemable_points( $user_id ),
            'applied_points'      => $manager->get_applied_points(),
            'balance'             => \LoyaltyBay\Services\LedgerService::get_instance()->get_balance( $user_id ),
            'is_logged_in'        => is_user_logged_in(),
            'points_value'        => (float) $settings->get_settings( 'redemption_pointsValue' ),
            'points_per_dollar'   => (int) $settings->get_settings( 'earning_pointsPerDollar' ),
            'earning_multiplier'  => (float) $earning_multiplier,
            'currency_sym'        => get_woocommerce_currency_symbol(),
            'currency_pos'        => get_option( 'woocommerce_currency_pos' )
        );
    }
}
