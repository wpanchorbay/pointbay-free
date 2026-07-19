<?php
namespace LoyaltyBay\Database\Migrations;

use LoyaltyBay\Database\MigrationInterface;

class CreateCronLogTable implements MigrationInterface {
    public function up() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'loyaltybay_cron_log';
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

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
    }

    public function down() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'loyaltybay_cron_log';
        $wpdb->query( "DROP TABLE IF EXISTS $table_name" );
    }
}
