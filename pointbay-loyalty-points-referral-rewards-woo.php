<?php
/**
 * Plugin Name:       PointBay - Loyalty Points & Referral Rewards for WooCommerce
 * Plugin URI:        https://wpanchorbay.com/plugins/pointbay-loyalty-points-referral-rewards-for-woocommerce
 * Description:       Reward WooCommerce customers with loyalty points they earn on purchases and redeem for discounts at checkout.
 * Requires at least: 6.8
 * Requires PHP:      7.0
 * Requires Plugins:  woocommerce
 * WC requires at least: 6.1
 * Version:           1.0.0
 * Stable tag:        1.0.0
 * Author:            WPAnchorBay
 * Author URI:        https://wpanchorbay.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pointbay-loyalty-points-referral-rewards-woo
 * Domain Path:       /languages
 *
 * @package PointBay
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'POINTBAY_PATH', plugin_dir_path( __FILE__ ) );
define( 'POINTBAY_DIR', plugin_dir_path( __FILE__ ) );
define( 'POINTBAY_URL', plugin_dir_url( __FILE__ ) );
define( 'POINTBAY_VERSION', '1.0.0' );
define( 'POINTBAY_PLUGIN_NAME', 'pointbay' );
define( 'POINTBAY_REST_NAMESPACE', 'pointbay' );
define( 'POINTBAY_OPTION_NAME', 'pointbay' );

// Composer autoloader.
if ( file_exists( POINTBAY_PATH . 'vendor/autoload.php' ) ) {
	require_once POINTBAY_PATH . 'vendor/autoload.php';
}



require_once POINTBAY_PATH . 'app/functions.php';

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
function pointbay_run() {
	\PointBay\Core\Plugin::get_instance();
}
pointbay_run();

/**
 * Activate the plugin.
 *
 * @since 1.0.0
 */
function pointbay_activate() {
	\PointBay\Core\Activator::activate();
}

/**
 * Deactivate the plugin.
 *
 * @since 1.0.0
 */
function pointbay_deactivate() {
	\PointBay\Core\Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'pointbay_activate' );
register_deactivation_hook( __FILE__, 'pointbay_deactivate' );
