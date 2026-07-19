<?php
namespace LoyaltyBay\Database\Migrations;

use LoyaltyBay\Database\MigrationInterface;

class CreateLedgerTable implements MigrationInterface {
    public function up() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'loyaltybay_ledger';
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

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
    }

    public function down() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'loyaltybay_ledger';
        $wpdb->query( "DROP TABLE IF EXISTS $table_name" );
    }
}
