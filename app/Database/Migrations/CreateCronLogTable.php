<?php
/**
 * Migration for the cron log table.
 *
 * @package    PointBay
 * @subpackage Database
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Database\Migrations;

use PointBay\Database\MigrationInterface;

/**
 * Creates the cron log database table.
 *
 * @since      1.0.0
 * @package    PointBay
 * @subpackage PointBay/Database
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class CreateCronLogTable implements MigrationInterface {
	/**
	 * Create the table.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function up() {
		global $wpdb;
		$table_name      = $wpdb->prefix . 'pointbay_cron_log';
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            job_name varchar(100) NOT NULL,
            status varchar(20) NOT NULL,
            payload longtext NULL,
            error_message longtext NULL,
            retry_count tinyint(3) unsigned DEFAULT 0 NOT NULL,
            started_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            completed_at datetime NULL,
            PRIMARY KEY  (id),
            KEY idx_status_time (status, started_at)
        ) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/**
	 * Drop the table.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function down() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'pointbay_cron_log';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Dropping this plugin's own table on rollback; no core API exists and the result is not cacheable.
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $table_name ) );
	}
}
