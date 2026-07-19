<?php
namespace LoyaltyBay\Services;

use LoyaltyBay\Models\LedgerEntry;
use LoyaltyBay\Models\LedgerCache;

class LedgerService {
    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Credit points to a user.
     *
     * @param int    $user_id
     * @param float  $amount
     * @param string $ref_type
     * @param int    $ref_id
     * @param string $description
     * @param string $origin
     * @return LedgerEntry|\WP_Error
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
     * @param int    $user_id
     * @param float  $amount
     * @param string $ref_type
     * @param int    $ref_id
     * @param string $description
     * @param bool   $in_transaction
     * @param string $origin
     * @return LedgerEntry|\WP_Error
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
     * @param int    $user_id
     * @param float  $amount
     * @param string $ref_type
     * @param int    $ref_id
     * @param string $description
     * @param bool   $in_transaction
     * @param string $origin
     * @return LedgerEntry|\WP_Error
     */
    public function clawback( $user_id, $amount, $ref_type, $ref_id, $description = null, $in_transaction = false, $origin = 'system' ) {
        if ( $amount <= 0 ) {
            return new \WP_Error( 'invalid_amount', 'Amount must be greater than zero.' );
        }

        return $this->process_transaction( $user_id, 'debit', $amount, $ref_type, $ref_id, $description, $in_transaction, $origin, true );
    }

    /**
     * Core method to process a transaction securely.
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

            $entry = new LedgerEntry( array(
                'user_id'          => $user_id,
                'transaction_type' => $txn_type,
                'origin'           => $origin,
                'amount'           => $amount,
                'reference_type'   => $ref_type,
                'reference_id'     => $ref_id,
                'description'      => $description,
            ) );

            $saved = $entry->save();
            if ( ! $saved ) {
                throw new \Exception( 'Failed to save ledger entry.' );
            }

            $new_balance = $txn_type === 'credit' ? $current_balance + $amount : $current_balance - $amount;

            $cache = new LedgerCache( array(
                'user_id' => $user_id,
                'balance' => $new_balance,
            ) );
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
     */
    public function has_existing_transaction( $user_id, $ref_type, $ref_id, $txn_type ) {
        return LedgerEntry::find_by_reference( $user_id, $ref_type, $ref_id, $txn_type ) !== null;
    }

    /**
     * Get user balance.
     */
    public function get_balance( $user_id ) {
        return LedgerCache::get_balance( $user_id );
    }
}
