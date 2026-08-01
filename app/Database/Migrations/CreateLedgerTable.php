<?php
/**
 * Migration for the ledger table.
 *
 * @package    PointBay
 * @subpackage Database
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Database\Migrations;

use PointBay\Database\MigrationInterface;

/**
 * Creates the points ledger database table.
 *
 * @since      1.0.0
 * @package    PointBay
 * @subpackage PointBay/Database
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class CreateLedgerTable implements MigrationInterface {
	/**
	 * Create the table.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function up() {
		global $wpdb;
		$table_name      = $wpdb->prefix . 'pointbay_ledger';
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            user_id bigint(20) unsigned NOT NULL,
            transaction_type varchar(20) NOT NULL,
            origin varchar(20) NOT NULL DEFAULT 'system',
            amount decimal(10,2) NOT NULL,
            reference_type varchar(50) NOT NULL,
            reference_id bigint(20) unsigned NOT NULL,
            description varchar(255) NULL,
            expires_at datetime NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY unique_transaction (user_id, reference_type, reference_id, transaction_type),
            KEY idx_user_created (user_id, created_at)
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
		$table_name = $wpdb->prefix . 'pointbay_ledger';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Dropping this plugin's own table on rollback; no core API exists and the result is not cacheable.
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $table_name ) );
	}
}
