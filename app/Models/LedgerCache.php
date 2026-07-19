<?php
namespace LoyaltyBay\Models;

class LedgerCache extends Model {
    protected $table = 'loyaltybay_ledger_cache';
    protected $primary_key = 'user_id';

    /**
     * Override save to handle ON DUPLICATE KEY UPDATE.
     *
     * @return bool
     */
    public function save() {
        global $wpdb;
        $table = $this->get_table();
        
        if ( ! isset( $this->attributes['user_id'] ) || ! isset( $this->attributes['balance'] ) ) {
            return false;
        }

        $result = $wpdb->query( $wpdb->prepare(
            "INSERT INTO {$table} (user_id, balance) VALUES (%d, %s) ON DUPLICATE KEY UPDATE balance = VALUES(balance)",
            $this->attributes['user_id'], $this->attributes['balance']
        ));
        
        return $result !== false;
    }

    /**
     * Get the cached balance for a user.
     *
     * @param int  $user_id
     * @param bool $for_update
     * @return float
     */
    public static function get_balance( $user_id, $for_update = false ) {
        global $wpdb;
        $instance = new static();
        $table    = $instance->get_table();

        $sql = "SELECT balance FROM {$table} WHERE user_id = %d";
        if ( $for_update ) {
            $sql .= " FOR UPDATE";
        }
        $balance = $wpdb->get_var( $wpdb->prepare( $sql, $user_id ) );
        return $balance !== null ? (float) $balance : 0.00;
    }

    /**
     * Lock the cache row for atomic updates during checkout.
     * Must be called within a database transaction.
     *
     * @param int $user_id
     * @return float Locked balance.
     */
    public static function lock_for_update( $user_id ) {
        global $wpdb;
        $instance = new static();
        $table    = $instance->get_table();

        // This will block until the lock is acquired
        $balance = $wpdb->get_var( $wpdb->prepare( "SELECT balance FROM {$table} WHERE user_id = %d FOR UPDATE", $user_id ) );
        return $balance !== null ? (float) $balance : 0.00;
    }
}
