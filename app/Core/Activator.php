<?php
/**
 * Fired during plugin activation.
 *
 * @package    LoyaltyBay
 * @subpackage Core
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace LoyaltyBay\Core;

use LoyaltyBay\Data\DbManager;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    LoyaltyBay
 * @subpackage Core
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class Activator {

	/**
	 * The main activation method.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public static function activate() {
		// Bail out (and deactivate) if WooCommerce isn't active — this plugin requires it.
		if ( ! self::is_woocommerce_active() ) {
			deactivate_plugins( plugin_basename( \LOYALTYBAY_PATH . 'loyaltybay-loyalty-points-referral-rewards-woo.php' ) );
			wp_die(
				esc_html__( 'LoyaltyBay requires WooCommerce to be installed and active.', 'loyaltybay-loyalty-points-referral-rewards-woo' ),
				esc_html__( 'Plugin dependency check', 'loyaltybay-loyalty-points-referral-rewards-woo' ),
				array( 'back_link' => true )
			);
		}

		// Set up the default options if they don't exist.
		if ( false === get_option( \LOYALTYBAY_OPTION_NAME ) ) {
			Settings::get_instance()->update_settings( Settings::get_instance()->get_default_settings() );
		}

		// Create custom database tables.
		self::create_custom_tables();

		// Register the rewrite endpoint before flushing, since init has already run during the activation request.
		if ( class_exists( '\LoyaltyBay\Dashboard\MyRewardsEndpoint' ) ) {
			\LoyaltyBay\Dashboard\MyRewardsEndpoint::get_instance()->add_endpoint();
		}

		// Flush rewrite rules.
		flush_rewrite_rules();

		// Add custom capabilities.
		self::add_plugin_roles_and_capabilities();

		// Schedule cron events.
		Cron::get_instance()->schedule_events();
	}

	/**
	 * Checks whether WooCommerce is active, covering activation paths (WP-CLI,
	 * network activate) that bypass the Plugins-list "Requires Plugins" UI check.
	 *
	 * @since 1.0.0
	 * @access private
	 * @return bool
	 */
	private static function is_woocommerce_active() {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		return class_exists( 'WooCommerce' ) || is_plugin_active( 'woocommerce/woocommerce.php' );
	}

	/**
	 * Instantiates the DB Manager and creates the custom tables.
	 *
	 * @since 1.0.0
	 * @access private
	 * @return void
	 */
	private static function create_custom_tables() {
		DbManager::get_instance()->create_tables();
	}

	/**
	 * Adds custom roles and capabilities required by the plugin.
	 *
	 * @since 1.0.0
	 * @access private
	 * @static
	 */
	private static function add_plugin_roles_and_capabilities() {
		$custom_capability = 'manage_loyaltybay';

		$admin_role = get_role( 'administrator' );
		if ( $admin_role && ! $admin_role->has_cap( $custom_capability ) ) {
			$admin_role->add_cap( $custom_capability );
		}
	}
}
