<?php
namespace LoyaltyBay\Database\Migrations;

use LoyaltyBay\Database\MigrationInterface;

class CreateLedgerCacheTable implements MigrationInterface {
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

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
    }

    public function down() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'loyaltybay_ledger_cache';
        $wpdb->query( "DROP TABLE IF EXISTS $table_name" );
    }
}
