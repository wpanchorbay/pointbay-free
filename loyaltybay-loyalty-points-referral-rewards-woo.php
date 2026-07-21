<?php
/**
 * Plugin Name:       LoyaltyBay
 * Plugin URI:        https://wpanchorbay.com/plugins/loyaltybay
 * Description:       A WooCommerce loyalty and rewards points system.
 * Requires at least: 5.6
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
define( 'LOYALTYBAY_REMOTE_URL', 'https://wpanchorbay.com/wp-json/' );

// Composer autoloader.
if ( file_exists( LOYALTYBAY_PATH . 'vendor/autoload.php' ) ) {
	require_once LOYALTYBAY_PATH . 'vendor/autoload.php';
}



require_once LOYALTYBAY_PATH . 'app/functions.php';



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
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
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
