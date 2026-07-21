<?php
/**
 * Cart block UI registration for the WooCommerce Cart block.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Checkout;

/**
 * Registers the LoyaltyBay integration with the WooCommerce Cart block.
 *
 * @since 1.0.0
 */
class BlockCartUI {
	/**
	 * Register the hooks for the cart block UI.
	 *
	 * @since 1.0.0
	 * @param \LoyaltyBay\Core\Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_blocks_cart_block_registration', $this, 'register_block' );
	}

	/**
	 * Register the cart block integration with the WooCommerce blocks registry.
	 *
	 * @since 1.0.0
	 * @param \Automattic\WooCommerce\Blocks\Integrations\IntegrationRegistry $registry The blocks integration registry.
	 * @return void
	 */
	public function register_block( $registry ) {
		if ( class_exists( '\Automattic\WooCommerce\Blocks\Integrations\IntegrationRegistry' ) ) {
			require_once __DIR__ . '/BlockCartIntegration.php';
			$registry->register( new BlockCartIntegration() );
		}
	}
}
