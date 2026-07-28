<?php
/**
 * Migration for the ledger cache table.
 *
 * @package    LoyaltyBay
 * @subpackage Database
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace LoyaltyBay\Database\Migrations;

use LoyaltyBay\Database\MigrationInterface;

/**
 * Creates the ledger cache database table.
 *
 * @since      1.0.0
 * @package    LoyaltyBay
 * @subpackage LoyaltyBay/Database
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class CreateLedgerCacheTable implements MigrationInterface {
	/**
	 * Create the table.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function up() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'loyaltybay_ledger_cache';

		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
            user_id bigint(20) unsigned NOT NULL,
            balance decimal(10,2) NOT NULL DEFAULT '0.00',
            last_updated datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (user_id)
        ) ENGINE=InnoDB $charset_collate;";

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
		$table_name = $wpdb->prefix . 'loyaltybay_ledger_cache';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Dropping this plugin's own table on rollback; no core API exists and the result is not cacheable.
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $table_name ) );
	}
}
