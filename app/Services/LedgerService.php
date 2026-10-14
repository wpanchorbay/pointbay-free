<?php
/**
 * Ledger service for crediting, debiting, and clawing back loyalty points.
 *
 * @package PointBay
 */

namespace PointBay\Services;

use PointBay\Models\LedgerEntry;
use PointBay\Models\LedgerCache;

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

		// Defensive check for every caller (REST layer, hooks, pro add-ons) —
		// runs before any transaction control statement, so it's safe to return
		// early here even on the $in_transaction path; the caller that opened
		// the outer transaction is responsible for rolling it back on WP_Error,
		// which every current caller already does via is_wp_error()+catch.
		if ( ! get_userdata( $user_id ) ) {
			return new \WP_Error( 'invalid_user', 'The specified user does not exist.' );
		}

		if ( ! $in_transaction ) {
			$existing = LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type );
			if ( $existing ) {
				return new \WP_Error( 'duplicate_transaction', 'A transaction for this reference already exists.' );
			}
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
			$wpdb->query( 'BEGIN' );
		}

		try {
			if ( ! $in_transaction ) {
				LedgerCache::lock_for_update( $user_id );
			}

			$existing_locked = LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type );
			if ( $existing_locked ) {
				if ( ! $in_transaction ) {
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
					$wpdb->query( 'ROLLBACK' );
				}
				return new \WP_Error( 'duplicate_transaction', 'A transaction for this reference already exists.' );
			}

			$current_balance = LedgerCache::get_balance( $user_id, true );

			if ( $txn_type === 'debit' && ! $allow_negative && $current_balance < $amount ) {
				if ( ! $in_transaction ) {
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
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

			update_user_meta( $user_id, 'pointbay_balance', $new_balance );

			if ( ! $in_transaction ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
				$wpdb->query( 'COMMIT' );
			}

			if ( $txn_type === 'credit' ) {
				do_action( 'pointbay_points_credited', $user_id, $amount, $entry );
			} else {
				do_action( 'pointbay_points_debited', $user_id, $amount, $entry );
			}

			return $entry;

		} catch ( \Exception $e ) {
			if ( ! $in_transaction ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
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
	 * Fetch a single transaction by its reference.
	 *
	 * Exists so that other plugins reversing their own ledger entries can read
	 * back the amount that was actually credited — rather than the current
	 * setting value, which may have changed since — without reaching into the
	 * model layer. This service is the supported surface for that.
	 *
	 * @since 1.0.0
	 * @param int    $user_id  The ID of the user the transaction belongs to.
	 * @param string $ref_type The reference type for the transaction.
	 * @param int    $ref_id   The reference ID for the transaction.
	 * @param string $txn_type The transaction type, either 'credit' or 'debit'.
	 * @return \PointBay\Models\LedgerEntry|null The entry, or null if not found.
	 */
	public function get_transaction( $user_id, $ref_type, $ref_id, $txn_type ) {
		return LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type );
	}

	/**
	 * Counts a user's transactions of a given reference type.
	 *
	 * The authoritative "has this ever happened to this customer" check. Used
	 * for the first-order bonus in preference to counting past orders, because
	 * order history is not stable across a guest checkout that is later claimed
	 * by a registration — the ledger is.
	 *
	 * @since 1.1.0
	 * @param int    $user_id  The user ID.
	 * @param string $ref_type The reference type to count.
	 * @param string $txn_type Optional. Transaction type to restrict to. Default 'credit'.
	 * @return int The number of matching rows.
	 */
	public function count_by_reference_type( $user_id, $ref_type, $txn_type = 'credit' ) {
		global $wpdb;
		$table = ( new LedgerEntry() )->get_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; an award guard must read live data.
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(*) FROM %i WHERE user_id = %d AND reference_type = %s AND transaction_type = %s',
				$table,
				$user_id,
				$ref_type,
				$txn_type
			)
		);
	}

	/**
	 * Sums the amounts of a user's transactions across a set of reference IDs.
	 *
	 * @since 1.1.0
	 * @param int    $user_id  The user ID.
	 * @param string $ref_type The reference type.
	 * @param array  $ref_ids  The reference IDs to include. An empty list sums to zero.
	 * @param string $txn_type The transaction type.
	 * @return float The summed amount.
	 */
	public function sum_by_reference( $user_id, $ref_type, $ref_ids, $txn_type ) {
		global $wpdb;

		$ref_ids = array_values( array_filter( array_map( 'absint', (array) $ref_ids ) ) );
		if ( ! $ref_ids ) {
			return 0.0;
		}

		$table        = ( new LedgerEntry() )->get_table();
		$placeholders = implode( ',', array_fill( 0, count( $ref_ids ), '%d' ) );

		// phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- The replacements are passed as a single array, which prepare() supports; the sniff can't count a runtime-built placeholder list.
		$sql = $wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $placeholders is a generated list of %d tokens, and every value is bound below.
			"SELECT SUM(amount) FROM %i WHERE user_id = %d AND reference_type = %s AND transaction_type = %s AND reference_id IN ($placeholders)",
			array_merge( array( $table, $user_id, $ref_type, $txn_type ), $ref_ids )
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared -- Custom plugin table; the statement is prepared immediately above.
		return (float) $wpdb->get_var( $sql );
	}

	/**
	 * Sums a user's credits for one reference ID across several reference types.
	 *
	 * An order's award is written as up to three rows — the proratable base plus
	 * the flat and first-order bonuses — so anything reporting or reversing
	 * "what this order earned" has to add them back up.
	 *
	 * @since 1.1.0
	 * @param int    $user_id   The user ID.
	 * @param array  $ref_types The reference types to include.
	 * @param int    $ref_id    The shared reference ID.
	 * @param string $txn_type  Optional. The transaction type. Default 'credit'.
	 * @return float The summed amount.
	 */
	public function sum_by_reference_types( $user_id, $ref_types, $ref_id, $txn_type = 'credit' ) {
		$total = 0.0;

		foreach ( (array) $ref_types as $ref_type ) {
			$entry = LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type );
			if ( $entry ) {
				$total += (float) $entry->amount;
			}
		}

		return $total;
	}

	/**
	 * Writes several credits for one user as a single database transaction.
	 *
	 * An order award is up to three rows. Written one at a time each would open
	 * its own transaction, so a failure partway through would leave the customer
	 * credited for some components and not others, with no way to tell after the
	 * fact which. Wrapping them makes the award atomic.
	 *
	 * @since 1.1.0
	 * @param int    $user_id The user to credit.
	 * @param array  $credits List of arrays with 'amount', 'ref_type', 'ref_id' and optional 'description'.
	 * @param string $origin Optional. Origin of the transactions. Default 'system'.
	 * @return array|\WP_Error The created entries, or a WP_Error if any one failed.
	 */
	public function credit_batch( $user_id, $credits, $origin = 'system' ) {
		global $wpdb;

		$credits = array_values(
			array_filter(
				(array) $credits,
				static function ( $credit ) {
					return isset( $credit['amount'] ) && (float) $credit['amount'] > 0;
				}
			)
		);

		if ( ! $credits ) {
			return array();
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
		$wpdb->query( 'BEGIN' );

		LedgerCache::lock_for_update( $user_id );

		$entries = array();

		foreach ( $credits as $credit ) {
			$entry = $this->process_transaction(
				$user_id,
				'credit',
				(float) $credit['amount'],
				$credit['ref_type'],
				(int) $credit['ref_id'],
				isset( $credit['description'] ) ? $credit['description'] : null,
				true,
				$origin
			);

			if ( is_wp_error( $entry ) ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
				$wpdb->query( 'ROLLBACK' );
				return $entry;
			}

			$entries[] = $entry;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
		$wpdb->query( 'COMMIT' );

		// No do_action() here: process_transaction() fires
		// `pointbay_points_credited` for every row it writes, including on the
		// $in_transaction path, so re-firing it per entry would double-notify
		// every listener.
		return $entries;
	}

	/**
	 * Fetches a page of a user's ledger history, most recent first.
	 *
	 * @since 1.1.0
	 * @param int $user_id The user whose history to read.
	 * @param int $limit   Optional. Maximum rows to return. Default 10.
	 * @param int $offset  Optional. Rows to skip. Default 0.
	 * @return array List of row arrays.
	 */
	public function get_history( $user_id, $limit = 10, $offset = 0 ) {
		global $wpdb;

		$user_id = (int) $user_id;
		if ( $user_id < 1 ) {
			return array();
		}

		/**
		 * Filters how many ledger rows a history view shows.
		 *
		 * @since 1.1.0
		 * @param int $limit   The row limit.
		 * @param int $user_id The user the history is for.
		 */
		$limit = (int) apply_filters( 'pointbay_history_limit', (int) $limit, $user_id );
		$limit = max( 1, min( 500, $limit ) );

		$table = ( new LedgerEntry() )->get_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the customer's own history must be current.
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE user_id = %d ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d',
				$table,
				$user_id,
				$limit,
				max( 0, (int) $offset )
			),
			ARRAY_A
		);

		return is_array( $rows ) ? $rows : array();
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
