<?php
/**
 * Ledger service for crediting, debiting, and clawing back loyalty points.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Services;

use LoyaltyBay\Models\LedgerEntry;
use LoyaltyBay\Models\LedgerCache;

/**
 * Handles ledger transactions (credit, debit, clawback) for user loyalty points.
 *
 * @since 1.0.0
 */
class LedgerService {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var LedgerService|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return LedgerService The single instance of the service.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Credit points to a user.
	 *
	 * @since 1.0.0
	 * @param int    $user_id     The ID of the user to credit.
	 * @param float  $amount      The number of points to credit. Must be greater than zero.
	 * @param string $ref_type    The reference type for the transaction.
	 * @param int    $ref_id      The reference ID for the transaction.
	 * @param string $description Optional. Description of the transaction. Default null.
	 * @param string $origin      Optional. Origin of the transaction. Default 'system'.
	 * @return LedgerEntry|\WP_Error The created ledger entry, or a WP_Error on failure.
	 */
	public function credit( $user_id, $amount, $ref_type, $ref_id, $description = null, $origin = 'system' ) {
		if ( $amount <= 0 ) {
			return new \WP_Error( 'invalid_amount', 'Amount must be greater than zero.' );
		}

		return $this->process_transaction( $user_id, 'credit', $amount, $ref_type, $ref_id, $description, false, $origin );
	}

	/**
	 * Debit points from a user. Fails with insufficient_balance if the user
	 * doesn't have enough points — use clawback() for reversal debits that
	 * must go through regardless of current balance.
	 *
	 * @since 1.0.0
	 * @param int    $user_id        The ID of the user to debit.
	 * @param float  $amount         The number of points to debit. Must be greater than zero.
	 * @param string $ref_type       The reference type for the transaction.
	 * @param int    $ref_id         The reference ID for the transaction.
	 * @param string $description    Optional. Description of the transaction. Default null.
	 * @param bool   $in_transaction Optional. Whether the caller already opened a database transaction. Default false.
	 * @param string $origin         Optional. Origin of the transaction. Default 'system'.
	 * @return LedgerEntry|\WP_Error The created ledger entry, or a WP_Error on failure.
	 */
	public function debit( $user_id, $amount, $ref_type, $ref_id, $description = null, $in_transaction = false, $origin = 'system' ) {
		if ( $amount <= 0 ) {
			return new \WP_Error( 'invalid_amount', 'Amount must be greater than zero.' );
		}

		return $this->process_transaction( $user_id, 'debit', $amount, $ref_type, $ref_id, $description, $in_transaction, $origin, false );
	}

	/**
	 * Debit points from a user, allowing the balance to go negative.
	 *
	 * Only for reversal/clawback debits (refunds, referral reversals) where
	 * the points being clawed back may have already been spent elsewhere —
	 * the reversal must still be recorded even if it drives the balance
	 * negative. Never use this for user-initiated or admin-initiated debits.
	 *
	 * @since 1.0.0
	 * @param int    $user_id        The ID of the user to debit.
	 * @param float  $amount         The number of points to claw back. Must be greater than zero.
	 * @param string $ref_type       The reference type for the transaction.
	 * @param int    $ref_id         The reference ID for the transaction.
	 * @param string $description    Optional. Description of the transaction. Default null.
	 * @param bool   $in_transaction Optional. Whether the caller already opened a database transaction. Default false.
	 * @param string $origin         Optional. Origin of the transaction. Default 'system'.
	 * @return LedgerEntry|\WP_Error The created ledger entry, or a WP_Error on failure.
	 */
	public function clawback( $user_id, $amount, $ref_type, $ref_id, $description = null, $in_transaction = false, $origin = 'system' ) {
		if ( $amount <= 0 ) {
			return new \WP_Error( 'invalid_amount', 'Amount must be greater than zero.' );
		}

		return $this->process_transaction( $user_id, 'debit', $amount, $ref_type, $ref_id, $description, $in_transaction, $origin, true );
	}

	/**
	 * Core method to process a transaction securely.
	 *
	 * @since 1.0.0
	 * @param int    $user_id        The ID of the user the transaction applies to.
	 * @param string $txn_type       The transaction type, either 'credit' or 'debit'.
	 * @param float  $amount         The number of points involved in the transaction.
	 * @param string $ref_type       The reference type for the transaction.
	 * @param int    $ref_id         The reference ID for the transaction.
	 * @param string $description    Description of the transaction. May be null.
	 * @param bool   $in_transaction Optional. Whether the caller already opened a database transaction. Default false.
	 * @param string $origin         Optional. Origin of the transaction. Default 'system'.
	 * @param bool   $allow_negative Optional. Whether the balance may go negative. Default false.
	 * @return LedgerEntry|\WP_Error The created ledger entry, or a WP_Error on failure.
	 * @throws \Exception If the ledger entry or cache fails to save (caught internally and returned as a WP_Error).
	 */
	private function process_transaction( $user_id, $txn_type, $amount, $ref_type, $ref_id, $description, $in_transaction = false, $origin = 'system', $allow_negative = false ) {
		global $wpdb;

		if ( ! $in_transaction ) {
			$existing = LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type );
			if ( $existing ) {
				return new \WP_Error( 'duplicate_transaction', 'A transaction for this reference already exists.' );
			}
			$wpdb->query( 'BEGIN' );
		}

		try {
			if ( ! $in_transaction ) {
				LedgerCache::lock_for_update( $user_id );
			}

			$existing_locked = LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type );
			if ( $existing_locked ) {
				if ( ! $in_transaction ) {
					$wpdb->query( 'ROLLBACK' );
				}
				return new \WP_Error( 'duplicate_transaction', 'A transaction for this reference already exists.' );
			}

			$current_balance = LedgerCache::get_balance( $user_id, true );

			if ( $txn_type === 'debit' && ! $allow_negative && $current_balance < $amount ) {
				if ( ! $in_transaction ) {
					$wpdb->query( 'ROLLBACK' );
				}
				return new \WP_Error( 'insufficient_balance', 'User does not have enough points for this debit.' );
			}

			$entry = new LedgerEntry(
				array(
					'user_id'          => $user_id,
					'transaction_type' => $txn_type,
					'origin'           => $origin,
					'amount'           => $amount,
					'reference_type'   => $ref_type,
					'reference_id'     => $ref_id,
					'description'      => $description,
				)
			);

			$saved = $entry->save();
			if ( ! $saved ) {
				throw new \Exception( 'Failed to save ledger entry.' );
			}

			$new_balance = $txn_type === 'credit' ? $current_balance + $amount : $current_balance - $amount;

			$cache       = new LedgerCache(
				array(
					'user_id' => $user_id,
					'balance' => $new_balance,
				)
			);
			$cache_saved = $cache->save();

			if ( ! $cache_saved ) {
				throw new \Exception( 'Failed to update ledger cache.' );
			}

			update_user_meta( $user_id, 'loyaltybay_balance', $new_balance );

			if ( ! $in_transaction ) {
				$wpdb->query( 'COMMIT' );
			}

			if ( $txn_type === 'credit' ) {
				do_action( 'loyaltybay_points_credited', $user_id, $amount, $entry );
			} else {
				do_action( 'loyaltybay_points_debited', $user_id, $amount, $entry );
			}

			return $entry;

		} catch ( \Exception $e ) {
			if ( ! $in_transaction ) {
				$wpdb->query( 'ROLLBACK' );
			}
			return new \WP_Error( 'transaction_failed', $e->getMessage() );
		}
	}

	/**
	 * Check for existing transaction.
	 *
	 * @since 1.0.0
	 * @param int    $user_id  The ID of the user to check.
	 * @param string $ref_type The reference type for the transaction.
	 * @param int    $ref_id   The reference ID for the transaction.
	 * @param string $txn_type The transaction type, either 'credit' or 'debit'.
	 * @return bool True if a matching transaction already exists, false otherwise.
	 */
	public function has_existing_transaction( $user_id, $ref_type, $ref_id, $txn_type ) {
		return LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type ) !== null;
	}

	/**
	 * Get user balance.
	 *
	 * @since 1.0.0
	 * @param int $user_id The ID of the user whose balance to retrieve.
	 * @return float The user's current point balance.
	 */
	public function get_balance( $user_id ) {
		return LedgerCache::get_balance( $user_id );
	}
}
