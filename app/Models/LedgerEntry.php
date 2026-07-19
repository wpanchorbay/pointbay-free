<?php
namespace LoyaltyBay\Models;

class LedgerEntry extends Model {
    protected $table = 'loyaltybay_ledger';

    /**
     * Find a transaction to enforce idempotency.
     *
     * @param int    $user_id
     * @param string $ref_type
     * @param int    $ref_id
     * @param string $txn_type
     * @return static|null
     */
    public static function find_by_reference( $user_id, $ref_type, $ref_id, $txn_type ) {
        global $wpdb;
        $instance = new static();
        $table    = $instance->get_table();

        $query = $wpdb->prepare(
            "SELECT * FROM {$table} WHERE user_id = %d AND reference_type = %s AND reference_id = %d AND transaction_type = %s LIMIT 1",
            $user_id, $ref_type, $ref_id, $txn_type
        );

        $row = $wpdb->get_row( $query, ARRAY_A );

        if ( $row ) {
            return new static( $row );
        }

        return null;
    }
}
