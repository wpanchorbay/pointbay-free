<?php
/**
 * Ledger cache model.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Models;

/**
 * Caches the current loyalty points balance per user.
 *
 * @since 1.0.0
 */
class LedgerCache extends Model {

	/**
	 * Database table name (without prefix).
	 *
	 * @var string
	 */
	protected $table = 'loyaltybay_ledger_cache';

	/**
	 * Primary key column for this table.
	 *
	 * @var string
	 */
	protected $primary_key = 'user_id';

	/**
	 * Override save to handle ON DUPLICATE KEY UPDATE.
	 *
	 * @since 1.0.0
	 * @return bool True on success, false on failure.
	 */
	public function save() {
		global $wpdb;
		$table = $this->get_table();

		if ( ! isset( $this->attributes['user_id'] ) || ! isset( $this->attributes['balance'] ) ) {
			return false;
		}

		$result = $wpdb->query(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is safe (from $wpdb->prefix); user values use placeholders.
				"INSERT INTO {$table} (user_id, balance) VALUES (%d, %s) ON DUPLICATE KEY UPDATE balance = VALUES(balance)",
				$this->attributes['user_id'],
				$this->attributes['balance']
			)
		);

		return $result !== false;
	}

	/**
	 * Get the cached balance for a user.
	 *
	 * @since 1.0.0
	 * @param int  $user_id    The user ID.
	 * @param bool $for_update Whether to lock the row for update.
	 * @return float The cached balance, or 0.00 when none is stored.
	 */
	public static function get_balance( $user_id, $for_update = false ) {
		global $wpdb;
		$instance = new static();
		$table    = $instance->get_table();

		$sql = "SELECT balance FROM {$table} WHERE user_id = %d";
		if ( $for_update ) {
			$sql .= ' FOR UPDATE';
		}
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Table name is safe (from $wpdb->prefix); user value uses a %d placeholder.
		$balance = $wpdb->get_var( $wpdb->prepare( $sql, $user_id ) );
		return $balance !== null ? (float) $balance : 0.00;
	}

	/**
	 * Lock the cache row for atomic updates during checkout.
	 * Must be called within a database transaction.
	 *
	 * @since 1.0.0
	 * @param int $user_id The user ID.
	 * @return float Locked balance.
	 */
	public static function lock_for_update( $user_id ) {
		global $wpdb;
		$instance = new static();
		$table    = $instance->get_table();

		// This will block until the lock is acquired
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is safe (from $wpdb->prefix); user values use placeholders.
		$balance = $wpdb->get_var( $wpdb->prepare( "SELECT balance FROM {$table} WHERE user_id = %d FOR UPDATE", $user_id ) );
		return $balance !== null ? (float) $balance : 0.00;
	}
}
