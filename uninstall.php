<?php
/**
 * Fired when the user clicks "Delete" for the plugin.
 *
 * @since      1.0.0
 * @package    LoyaltyBay
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

define( 'LOYALTYBAY_OPTION_NAME', 'loyaltybay' );
define( 'LOYALTYBAY_TEXT_DOMAIN', 'loyaltybay' );
define( 'LOYALTYBAY_PATH', plugin_dir_path( __FILE__ ) );

// Composer autoloader.
if ( file_exists( LOYALTYBAY_PATH . 'vendor/autoload.php' ) ) {
	require_once LOYALTYBAY_PATH . 'vendor/autoload.php';
}

loyaltybay_run_uninstall();

/**
 * The main controller function for the uninstallation process.
 *
 * @since 1.0.0
 */
function loyaltybay_run_uninstall() {
	$options = get_option( LOYALTYBAY_OPTION_NAME );

	// Only proceed if user opted in to delete all data.
	if ( ! empty( $options['advanced_deleteAllOnUninstall'] ) && true === $options['advanced_deleteAllOnUninstall'] ) {
		loyaltybay_drop_custom_tables();
		loyaltybay_delete_plugin_options();
		loyaltybay_remove_capabilities();
	}
}

/**
 * Drop Custom Database Tables.
 *
 * @since 1.0.0
 */
function loyaltybay_drop_custom_tables() {
	// Use DbManager to drop all tables based on configured migrations
	\LoyaltyBay\Data\DbManager::get_instance()->drop_tables();
}

/**
 * Delete Plugin Options.
 *
 * @since 1.0.0
 */
function loyaltybay_delete_plugin_options() {
	delete_option( LOYALTYBAY_OPTION_NAME );
	delete_option( LOYALTYBAY_OPTION_NAME . '_version' );

	global $wpdb;
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_loyaltybay_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_loyaltybay_%'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
}

/**
 * Remove Custom Capabilities.
 *
 * @since 1.0.0
 */
function loyaltybay_remove_capabilities() {
	$editable_roles = get_editable_roles();

	foreach ( $editable_roles as $role_name => $role_info ) {
		$role = get_role( $role_name );
		if ( $role && $role->has_cap( 'manage_loyaltybay' ) ) {
			$role->remove_cap( 'manage_loyaltybay' );
		}
	}
}
