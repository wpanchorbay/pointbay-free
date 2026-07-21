<?php
/**
 * Ledger entry model.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Models;

/**
 * Represents a single row in the loyalty points ledger.
 *
 * @since 1.0.0
 */
class LedgerEntry extends Model {

	/**
	 * Database table name (without prefix).
	 *
	 * @var string
	 */
	protected $table = 'loyaltybay_ledger';

	/**
	 * Find a transaction to enforce idempotency.
	 *
	 * @since 1.0.0
	 * @param int    $user_id  The user ID.
	 * @param string $ref_type The reference type.
	 * @param int    $ref_id   The reference ID.
	 * @param string $txn_type The transaction type.
	 * @return static|null The matching entry, or null when none is found.
	 */
	public static function find_by_reference( $user_id, $ref_type, $ref_id, $txn_type ) {
		global $wpdb;
		$instance = new static();
		$table    = $instance->get_table();

		$query = $wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is safe (from $wpdb->prefix); user values use placeholders.
			"SELECT * FROM {$table} WHERE user_id = %d AND reference_type = %s AND reference_id = %d AND transaction_type = %s LIMIT 1",
			$user_id,
			$ref_type,
			$ref_id,
			$txn_type
		);

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Query is prepared above.
		$row = $wpdb->get_row( $query, ARRAY_A );

		if ( $row ) {
			return new static( $row );
		}

		return null;
	}
}
