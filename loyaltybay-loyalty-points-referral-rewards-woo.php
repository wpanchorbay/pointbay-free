<?php
/**
 * Plugin Name:       Loyaltybay - Loyalty Points & Referral Rewards for Woocommerce
 * Plugin URI:        https://wpanchorbay.com/plugins/loyaltybay-loyalty-points-referral-rewards-for-woocommerce
 * Description:       Reward WooCommerce customers with loyalty points they earn on purchases and redeem for discounts at checkout.
 * Requires at least: 6.8
 * Requires PHP:      7.0
 * Requires Plugins:  woocommerce
 * WC requires at least: 6.1
 * Version:           1.0.0
 * Stable tag:        1.0.0
 * Author:            WpAnchorBay
 * Author URI:        https://wpanchorbay.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       loyaltybay-loyalty-points-referral-rewards-woo
 * Domain Path:       /languages
 *
 * @package LoyaltyBay
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'LOYALTYBAY_PATH', plugin_dir_path( __FILE__ ) );
define( 'LOYALTYBAY_DIR', plugin_dir_path( __FILE__ ) );
define( 'LOYALTYBAY_URL', plugin_dir_url( __FILE__ ) );
define( 'LOYALTYBAY_VERSION', '1.0.0' );
define( 'LOYALTYBAY_PLUGIN_NAME', 'loyaltybay' );
define( 'LOYALTYBAY_TEXT_DOMAIN', 'loyaltybay' );
define( 'LOYALTYBAY_OPTION_NAME', 'loyaltybay' );

// Composer autoloader.
if ( file_exists( LOYALTYBAY_PATH . 'vendor/autoload.php' ) ) {
	require_once LOYALTYBAY_PATH . 'vendor/autoload.php';
}



require_once LOYALTYBAY_PATH . 'app/functions.php';

/*
 * Declare WooCommerce feature compatibility.
 *
 * Orders are only ever read through the wc_get_order() CRUD layer and no data
 * is stored in order meta — everything lives in this plugin's own tables — so
 * High-Performance Order Storage is fully supported. The cart and checkout
 * blocks are supported through the registered block integrations.
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);

/**
 * Begins execution of the plugin.
 *
 * @since 1.0.0
 */
function loyaltybay_run() {
	\LoyaltyBay\Core\Plugin::get_instance();
}
loyaltybay_run();

/**
 * Activate the plugin.
 *
 * @since 1.0.0
 */
function loyaltybay_activate() {
	\LoyaltyBay\Core\Activator::activate();
}

/**
 * Deactivate the plugin.
 *
 * @since 1.0.0
 */
function loyaltybay_deactivate() {
	\LoyaltyBay\Core\Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'loyaltybay_activate' );
register_deactivation_hook( __FILE__, 'loyaltybay_deactivate' );
