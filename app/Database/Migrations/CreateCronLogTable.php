<?php
/**
 * Migration for the cron log table.
 *
 * @package    LoyaltyBay
 * @subpackage Database
 * @since      1.0.0
 * @author     LoyaltyBay <loyaltybay@gmail.com>
 */

namespace LoyaltyBay\Database\Migrations;

use LoyaltyBay\Database\MigrationInterface;

/**
 * Creates the cron log database table.
 *
 * @since      1.0.0
 * @package    LoyaltyBay
 * @subpackage LoyaltyBay/Database
 * @author     LoyaltyBay <loyaltybay@gmail.com>
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
		$table_name      = $wpdb->prefix . 'loyaltybay_cron_log';
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
		$table_name = $wpdb->prefix . 'loyaltybay_cron_log';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is safe (from $wpdb->prefix); user values use placeholders.
		$wpdb->query( "DROP TABLE IF EXISTS $table_name" );
	}
}
