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

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the idempotency check must read live data.
		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE user_id = %d AND reference_type = %s AND reference_id = %d AND transaction_type = %s LIMIT 1',
				$table,
				$user_id,
				$ref_type,
				$ref_id,
				$txn_type
			),
			ARRAY_A
		);

		if ( $row ) {
			return new static( $row );
		}

		return null;
	}
}
