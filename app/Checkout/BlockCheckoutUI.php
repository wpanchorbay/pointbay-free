<?php
namespace LoyaltyBay\Checkout;

class BlockCheckoutUI {
    public function run( $plugin ) {
        $loader = $plugin->get_loader();
        $loader->add_action( 'woocommerce_blocks_checkout_block_registration', $this, 'register_block' );
    }

    public function register_block( $registry ) {
        if ( class_exists( '\Automattic\WooCommerce\Blocks\Integrations\IntegrationRegistry' ) ) {
            require_once __DIR__ . '/BlockIntegration.php';
            $registry->register( new BlockIntegration() );
        }
    }
}
