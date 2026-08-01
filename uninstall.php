<?php
/**
 * Fired when the user clicks "Delete" for the plugin.
 *
 * @since      1.0.0
 * @package    PointBay
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

define( 'POINTBAY_OPTION_NAME', 'pointbay' );
define( 'POINTBAY_REST_NAMESPACE', 'pointbay' );
define( 'POINTBAY_PATH', plugin_dir_path( __FILE__ ) );

// Composer autoloader.
if ( file_exists( POINTBAY_PATH . 'vendor/autoload.php' ) ) {
	require_once POINTBAY_PATH . 'vendor/autoload.php';
}

pointbay_run_uninstall();

/**
 * The main controller function for the uninstallation process.
 *
 * @since 1.0.0
 */
function pointbay_run_uninstall() {
	$options = get_option( POINTBAY_OPTION_NAME );

	// Only proceed if user opted in to delete all data.
	if ( ! empty( $options['advanced_deleteAllOnUninstall'] ) && true === $options['advanced_deleteAllOnUninstall'] ) {
		pointbay_drop_custom_tables();
		pointbay_delete_plugin_options();
		pointbay_remove_capabilities();
	}
}

/**
 * Drop Custom Database Tables.
 *
 * @since 1.0.0
 */
function pointbay_drop_custom_tables() {
	// Use DbManager to drop all tables based on configured migrations
	\PointBay\Data\DbManager::get_instance()->drop_tables();
}

/**
 * Delete Plugin Options.
 *
 * @since 1.0.0
 */
function pointbay_delete_plugin_options() {
	delete_option( POINTBAY_OPTION_NAME );
	delete_option( POINTBAY_OPTION_NAME . '_version' );

	global $wpdb;

	// The transient names are not known up front, so they are matched with a
	// LIKE prefix. Both the table and the pattern are bound through prepare().
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-off uninstall cleanup of this plugin's transients; no core API enumerates them.
	$wpdb->query(
		$wpdb->prepare(
			'DELETE FROM %i WHERE option_name LIKE %s',
			$wpdb->options,
			$wpdb->esc_like( '_transient_pointbay_' ) . '%'
		)
	);
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-off uninstall cleanup of this plugin's transients; no core API enumerates them.
	$wpdb->query(
		$wpdb->prepare(
			'DELETE FROM %i WHERE option_name LIKE %s',
			$wpdb->options,
			$wpdb->esc_like( '_transient_timeout_pointbay_' ) . '%'
		)
	);
}

/**
 * Remove Custom Capabilities.
 *
 * @since 1.0.0
 */
function pointbay_remove_capabilities() {
	$editable_roles = get_editable_roles();

	foreach ( $editable_roles as $role_name => $role_info ) {
		$role = get_role( $role_name );
		if ( $role && $role->has_cap( 'manage_pointbay' ) ) {
			$role->remove_cap( 'manage_pointbay' );
		}
	}
}
