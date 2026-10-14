<?php
/**
 * Hooks for awarding, reversing and displaying loyalty points on orders.
 *
 * @package PointBay
 */

namespace PointBay\Hooks;

use PointBay\Services\LedgerService;
use PointBay\Services\EarningCalculator;
use PointBay\Core\Settings;

/**
 * Registers the hooks that manage loyalty points across the order lifecycle.
 *
 * @since 1.0.0
 */
class OrderHooks {

	/**
	 * Reference type for the amount-proportional part of an order award.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_ORDER = 'order';

	/**
	 * Reference type for the flat per-order bonus.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_FLAT_BONUS = 'order_flat_bonus';

	/**
	 * Reference type for the one-time first-order bonus.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_FIRST_ORDER = 'first_order_bonus';

	/**
	 * Reference type for a full COD reversal.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_ORDER_REVERSAL = 'order_reversal';

	/**
	 * Reference type for a refund clawback.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_REFUND = 'refund';

	/**
	 * Ledger reference type for redeemed points handed back on a refund.
	 *
	 * Keyed by refund ID, so each refund is returned at most once.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_REDEMPTION_REFUND = 'redemption_refund';

	/**
	 * Ledger reference type for redeemed points handed back on cancellation.
	 *
	 * Keyed by order ID, so a cancellation is returned at most once.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_REDEMPTION_CANCEL = 'redemption_cancel';

	/**
	 * Ledger reference type for the debit that takes returned points back when a
	 * cancelled order is reopened. Keyed like the cancellation it undoes.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_REDEMPTION_REOPEN = 'redemption_reopen';

	/**
	 * Order meta counting how many times a cancelled order has been reopened.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const META_REOPEN_CYCLE = '_pointbay_redemption_reopen_cycle';

	/**
	 * Order meta listing the refund IDs redeemed points were returned for, kept
	 * so a deleted and re-recorded refund is not paid out twice.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const META_RETURNED_REFUNDS = '_pointbay_redemption_returned_refunds';

	/**
	 * Order meta key holding the award breakdown as JSON.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const META_BREAKDOWN = '_pointbay_award_breakdown';

	/**
	 * Ledger reference type for points re-awarded when an order whose earned
	 * points were reversed on cancellation is reopened to the earning status.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_ORDER_REAWARD = 'order_reaward';

	/**
	 * Order meta counting how many times reversed earned points were re-awarded.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const META_AWARD_CYCLE = '_pointbay_award_cycle';

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var OrderHooks
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return OrderHooks
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Every reference type an order award may be written under.
	 *
	 * @since 1.1.0
	 * @return array List of reference types.
	 */
	private static function award_reference_types() {
		return array( self::REF_ORDER, self::REF_FLAT_BONUS, self::REF_FIRST_ORDER );
	}

	/**
	 * Registers the WordPress hooks handled by this class.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'process_order_status_changed', 20, 4 );
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'maybe_reverse_order_points', 20, 4 );
		$loader->add_action( 'woocommerce_order_refunded', $this, 'process_order_refunded', 20, 2 );
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'return_redeemed_points_on_cancel', 25, 4 );
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'retake_redeemed_points_on_reopen', 24, 4 );
		$loader->add_action( 'woocommerce_order_refunded', $this, 'return_redeemed_points_on_refund', 25, 2 );
		$loader->add_filter( 'woocommerce_get_order_item_totals', $this, 'add_points_to_order_totals', 10, 3 );
	}

	/**
	 * Awards points when an order reaches the configured earning status.
	 *
	 * @since 1.0.0
	 * @param int       $order_id   The order ID.
	 * @param string    $old_status The previous order status.
	 * @param string    $new_status The new order status.
	 * @param \WC_Order $order      The order object.
	 * @return void
	 */
	public function process_order_status_changed( $order_id, $old_status, $new_status, $order ) {
		if ( ! $order ) {
			return;
		}

		$settings       = Settings::get_instance();
		$trigger_status = $settings->get_settings( 'earning_orderStatusTrigger' );
		$trigger_status = $trigger_status ? $trigger_status : 'completed';
		$trigger_status = strtolower( str_replace( 'wc-', '', $trigger_status ) );

		if ( $new_status !== $trigger_status ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$this->award_order_points( $order, $user_id );
	}

	/**
	 * Writes an order's award to the ledger.
	 *
	 * An award is up to three rows rather than one. The ledger's unique key
	 * forbids two credits sharing a reference, and folding the bonuses into the
	 * order credit would make them indistinguishable afterwards — which is
	 * exactly what the refund clawback needs to tell apart, since a partial
	 * refund prorates the amount-proportional part and leaves an all-or-nothing
	 * bonus alone.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order   The order being awarded.
	 * @param int       $user_id The customer.
	 * @return void
	 */
	private function award_order_points( $order, $user_id ) {
		$order_id = $order->get_id();
		$ledger   = LedgerService::get_instance();

		// Any component already present means this order has been awarded; the
		// unique key would reject a repeat anyway, but bailing here keeps a
		// re-fired status transition from re-reading settings and re-saving meta.
		foreach ( self::award_reference_types() as $ref_type ) {
			if ( $ledger->has_existing_transaction( $user_id, $ref_type, $order_id, 'credit' ) ) {
				$this->maybe_reaward_reversed_points( $order, $user_id );
				return;
			}
		}

		$calculator = EarningCalculator::get_instance();

		// The ledger, not the order list, is what says whether this customer has
		// had their first-order bonus: order history is not stable across a
		// guest checkout later claimed by a registration.
		$is_first_order = $calculator->is_first_order( $user_id, $order );

		$breakdown = $calculator->calculate(
			array(
				'amount'              => $calculator->resolve_order_basis( $order ),
				'user_id'             => $user_id,
				'include_first_order' => $is_first_order,
				'context'             => 'order',
				'order'               => $order,
			)
		);

		if ( $breakdown['total'] <= 0 ) {
			return;
		}

		$credits = array();

		if ( $breakdown['base'] > 0 ) {
			$credits[] = array(
				'amount'      => $breakdown['base'],
				'ref_type'    => self::REF_ORDER,
				'ref_id'      => $order_id,
				// translators: %d: order number.
				'description' => sprintf( __( 'Points earned for order #%d', 'pointbay-loyalty-points-referral-rewards-woo' ), $order_id ),
			);
		}

		if ( $breakdown['flat'] > 0 ) {
			$credits[] = array(
				'amount'      => $breakdown['flat'],
				'ref_type'    => self::REF_FLAT_BONUS,
				'ref_id'      => $order_id,
				// translators: %d: order number.
				'description' => sprintf( __( 'Order bonus for order #%d', 'pointbay-loyalty-points-referral-rewards-woo' ), $order_id ),
			);
		}

		if ( $breakdown['first_order'] > 0 ) {
			$credits[] = array(
				'amount'      => $breakdown['first_order'],
				'ref_type'    => self::REF_FIRST_ORDER,
				'ref_id'      => $order_id,
				// translators: %d: order number.
				'description' => sprintf( __( 'First order bonus for order #%d', 'pointbay-loyalty-points-referral-rewards-woo' ), $order_id ),
			);
		}

		$result = $ledger->credit_batch( $user_id, $credits );

		if ( is_wp_error( $result ) ) {
			pointbay_log( "OrderHooks: Failed to credit points for order #{$order_id} (user {$user_id}): " . $result->get_error_message(), 'ERROR' );
			return;
		}

		// Recorded so a later refund prorates against the figures this order was
		// actually awarded on, rather than recomputing from settings that may
		// have changed in between.
		$breakdown['basis_mode'] = $calculator->get_basis_mode();
		$order->update_meta_data( self::META_BREAKDOWN, wp_json_encode( $breakdown ) );
		$order->save();

		/**
		 * Fires after an order's points have been awarded.
		 *
		 * @since 1.1.0
		 * @param int   $user_id   The customer credited.
		 * @param int   $order_id  The order awarded.
		 * @param array $breakdown The award breakdown from EarningCalculator.
		 */
		do_action( 'pointbay_order_points_awarded', $user_id, $order_id, $breakdown );
	}

	/**
	 * Ledger reference ID for the reversal / re-award of a given award cycle.
	 *
	 * Cycle 0 is the plain order ID, so existing reversals keep their reference.
	 *
	 * @since 1.1.0
	 * @param int $order_id The order.
	 * @param int $cycle    Award cycle.
	 * @return int Reference ID.
	 */
	private function award_cycle_ref_id( $order_id, $cycle ) {
		return (int) $order_id + ( (int) $cycle * 10000000000 );
	}

	/**
	 * Gives back earned points that a cancellation reversed, once per cycle.
	 *
	 * Runs when an already-awarded order reaches the earning status again. Only
	 * the amount actually reversed in the current cycle is returned, so an order
	 * whose award was already clawed back by refunds (nothing left to reverse)
	 * gets nothing, and a second pass in the same cycle is a no-op.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order   The order.
	 * @param int       $user_id The customer.
	 * @return void
	 */
	private function maybe_reaward_reversed_points( $order, $user_id ) {
		$ledger = LedgerService::get_instance();
		$cycle  = (int) $order->get_meta( self::META_AWARD_CYCLE );
		$ref_id = $this->award_cycle_ref_id( $order->get_id(), $cycle );

		$reversal = \PointBay\Models\LedgerEntry::find_by_reference( $user_id, self::REF_ORDER_REVERSAL, $ref_id, 'debit' );
		if ( ! $reversal || (int) $reversal->amount <= 0 ) {
			return;
		}

		// Refunds recorded while the order was cancelled were not clawed back (the
		// reversal had already taken everything); what they would have taken is
		// withheld from the re-award, so a refunded order is never re-credited.
		$amount   = (int) $reversal->amount;
		$progress = $this->refund_progress( $order, $user_id );
		if ( $progress ) {
			$missed = max( 0, $progress['target'] - $progress['already_clawed'] - $this->net_reversed_points( $order, $user_id, false ) );
			$amount = max( 0, $amount - $missed );
		}

		if ( $amount > 0 && ! $ledger->has_existing_transaction( $user_id, self::REF_ORDER_REAWARD, $ref_id, 'credit' ) ) {
			$result = $ledger->credit(
				$user_id,
				$amount,
				self::REF_ORDER_REAWARD,
				$ref_id,
				// translators: %d: order ID.
				sprintf( __( 'Points restored: order #%d was reopened.', 'pointbay-loyalty-points-referral-rewards-woo' ), $order->get_id() ),
				'system'
			);
			if ( is_wp_error( $result ) ) {
				return;
			}
		}

		$order->update_meta_data( self::META_AWARD_CYCLE, $cycle + 1 );
		$order->save_meta_data();
	}

	/**
	 * Reads back the breakdown an order was awarded on.
	 *
	 * Orders awarded before the breakdown meta existed get a synthesized one, so
	 * a refund against them still prorates rather than falling back to
	 * recomputing from current settings.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order   The order.
	 * @param int       $user_id The customer.
	 * @return array|null The breakdown, or null when the order was never awarded.
	 */
	private function get_award_breakdown( $order, $user_id ) {
		$stored = $order->get_meta( self::META_BREAKDOWN );

		if ( $stored ) {
			$decoded = json_decode( $stored, true );
			if ( is_array( $decoded ) && isset( $decoded['total'] ) ) {
				return wp_parse_args(
					$decoded,
					array(
						'basis_amount' => (float) $order->get_total(),
						'base'         => 0,
						'flat'         => 0,
						'first_order'  => 0,
					)
				);
			}
		}

		$credit = \PointBay\Models\LedgerEntry::find_by_reference( $user_id, self::REF_ORDER, $order->get_id(), 'credit' );
		if ( ! $credit || (int) $credit->amount <= 0 ) {
			return null;
		}

		return array(
			'basis_amount' => (float) $order->get_total(),
			'base'         => (int) $credit->amount,
			'flat'         => 0,
			'first_order'  => 0,
			'total'        => (int) $credit->amount,
			// The legacy award was measured on the order total.
			'basis_mode'   => 'total',
		);
	}

	/**
	 * Claw back points earned for a COD order if it's cancelled or fails.
	 *
	 * COD orders can't be refunded through a payment gateway, so
	 * process_order_refunded() never fires for them on a plain cancellation —
	 * without this, points earned on a completed COD order would never be
	 * reversed. Non-COD orders are left to the existing refund-based
	 * clawback, since they can go through an actual WooCommerce refund.
	 *
	 * @param int       $order_id   The order ID.
	 * @param string    $old_status The previous order status.
	 * @param string    $new_status The new order status.
	 * @param \WC_Order $order      The order object.
	 */
	public function maybe_reverse_order_points( $order_id, $old_status, $new_status, $order ) {
		if ( ! $order || $order->get_payment_method() !== 'cod' ) {
			return;
		}

		if ( ! in_array( $new_status, array( 'cancelled', 'failed' ), true ) ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$ledger_service = LedgerService::get_instance();

		$award_cycle = (int) $order->get_meta( self::META_AWARD_CYCLE );
		$reversal_id = $this->award_cycle_ref_id( $order_id, $award_cycle );
		if ( $ledger_service->has_existing_transaction( $user_id, self::REF_ORDER_REVERSAL, $reversal_id, 'debit' ) ) {
			return;
		}

		// Sums every component the award was written under — reading only the
		// base credit here would leave the flat and first-order bonuses standing
		// on a cancelled order.
		$awarded = (int) $ledger_service->sum_by_reference_types( $user_id, self::award_reference_types(), $order_id, 'credit' );

		// Earlier partial-refund clawbacks have already taken some of this back;
		// reversing the full award on top would take it twice.
		$refund_ids = array();
		foreach ( $order->get_refunds() as $refund ) {
			$refund_ids[] = $refund->get_id();
		}
		$awarded -= (int) $ledger_service->sum_by_reference( $user_id, self::REF_REFUND, $refund_ids, 'debit' );

		// Earlier cancel/reopen cycles reversed some of the award and gave part of
		// it back; whatever is still reversed from them is not there to reverse
		// again.
		$awarded -= $this->net_reversed_points( $order, $user_id, false );

		if ( $awarded <= 0 ) {
			return;
		}

		$ledger_service->clawback(
			$user_id,
			$awarded,
			self::REF_ORDER_REVERSAL,
			$reversal_id,
			// translators: 1: order ID, 2: new order status.
			sprintf( __( 'Points reversed: COD order #%1$d was %2$s.', 'pointbay-loyalty-points-referral-rewards-woo' ), $order_id, $new_status ),
			false,
			'system'
		);

		do_action( 'pointbay_order_points_reversed', $user_id, $order_id );
	}

	/**
	 * Points the customer spent redeeming on an order.
	 *
	 * @since 1.1.0
	 * @param int $user_id  The customer.
	 * @param int $order_id The order.
	 * @return int Points redeemed; 0 when none.
	 */
	private function get_redeemed_points( $user_id, $order_id ) {
		$debit = \PointBay\Models\LedgerEntry::find_by_reference( $user_id, self::REF_ORDER, $order_id, 'debit' );
		return $debit ? max( 0, (int) $debit->amount ) : 0;
	}

	/**
	 * Ledger reference ID for the cancellation in a given reopen cycle.
	 *
	 * The ledger allows one row per (user, type, reference), so an order that is
	 * cancelled, reopened and cancelled again needs a fresh reference each time.
	 * The first cycle uses the plain order ID.
	 *
	 * @since 1.1.0
	 * @param int $order_id The order.
	 * @param int $cycle    Reopen cycle, 0 for the first cancellation.
	 * @return int Reference ID.
	 */
	private function cancel_ref_id( $order_id, $cycle ) {
		return (int) $order_id + ( (int) $cycle * 10000000000 );
	}

	/**
	 * Points already handed back for an order, by refunds and by cancellation.
	 *
	 * Cancellations that were undone by reopening the order count for nothing.
	 *
	 * @since 1.1.0
	 * @param int       $user_id The customer.
	 * @param \WC_Order $order   The order.
	 * @return int Points returned so far.
	 */
	private function get_returned_points( $user_id, $order ) {
		$ledger = LedgerService::get_instance();

		$cycles     = (int) $order->get_meta( self::META_REOPEN_CYCLE );
		$cancel_ids = array();
		for ( $i = 0; $i <= $cycles; $i++ ) {
			$cancel_ids[] = $this->cancel_ref_id( $order->get_id(), $i );
		}

		return $this->get_refund_returned_points( $user_id, $order )
			+ (int) $ledger->sum_by_reference( $user_id, self::REF_REDEMPTION_CANCEL, $cancel_ids, 'credit' )
			- (int) $ledger->sum_by_reference( $user_id, self::REF_REDEMPTION_REOPEN, $cancel_ids, 'debit' );
	}

	/**
	 * Points handed back through refunds of an order.
	 *
	 * Counts every refund this plugin has ever returned points for, remembered in
	 * order meta, and not only the refunds that still exist: an admin who deletes
	 * a refund and records it again must not be handed the points twice.
	 *
	 * @since 1.1.0
	 * @param int       $user_id The customer.
	 * @param \WC_Order $order   The order.
	 * @return int Points returned through refunds.
	 */
	private function get_refund_returned_points( $user_id, $order ) {
		$refund_ids = array_map( 'absint', (array) $order->get_meta( self::META_RETURNED_REFUNDS ) );
		foreach ( $order->get_refunds() as $refund ) {
			$refund_ids[] = $refund->get_id();
		}

		return (int) LedgerService::get_instance()->sum_by_reference( $user_id, self::REF_REDEMPTION_REFUND, array_unique( $refund_ids ), 'credit' );
	}

	/**
	 * Redeemed points that the refunds on an order say should have come back.
	 *
	 * @since 1.1.0
	 * @param int       $user_id  The customer.
	 * @param \WC_Order $order    The order.
	 * @param int       $redeemed Points redeemed on the order.
	 * @return int Target points.
	 */
	private function get_refund_return_target( $user_id, $order, $redeemed ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Kept for symmetry with the other helpers.
		$decimals       = wc_get_price_decimals();
		$total          = round( (float) $order->get_total(), $decimals );
		$refunded_total = 0.0;
		foreach ( $order->get_refunds() as $refund ) {
			$refunded_total += abs( (float) $refund->get_amount() );
		}
		$refunded_total = round( $refunded_total, $decimals );

		// An order paid entirely with points has nothing to prorate against; a
		// refund of it is full by definition once the status says so.
		if ( $total > 0 ) {
			$ratio = min( 1.0, $refunded_total / $total );
		} else {
			$ratio = ( 'refunded' === $order->get_status() ) ? 1.0 : 0.0;
		}

		return min( (int) round( $redeemed * $ratio ), $redeemed );
	}

	/**
	 * Takes returned points back when an order that had them returned becomes
	 * payable or paid again.
	 *
	 * State based, not transition based: whenever an order lands on any status
	 * other than cancelled or refunded (including 'failed', and including legacy
	 * returns recorded on orders that were failed) while the current cycle still
	 * has a return that has not been undone, the return is debited again.
	 *
	 * A cancelled order can be moved back to pending, on-hold, processing or
	 * completed, and then still gets paid at the points-discounted price. The
	 * points handed back on cancellation are debited again (allowed to take the
	 * balance negative, as the customer may have spent them meanwhile) so the
	 * order costs the points exactly once.
	 *
	 * @since 1.1.0
	 * @param int       $order_id   The order ID.
	 * @param string    $old_status The previous status.
	 * @param string    $new_status The new status.
	 * @param \WC_Order $order      The order.
	 * @return void
	 */
	public function retake_redeemed_points_on_reopen( $order_id, $old_status, $new_status, $order ) {
		if ( ! $order || in_array( $new_status, array( 'cancelled', 'refunded' ), true ) ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$cycle  = (int) $order->get_meta( self::META_REOPEN_CYCLE );
		$ref_id = $this->cancel_ref_id( $order_id, $cycle );
		$entry  = \PointBay\Models\LedgerEntry::find_by_reference( $user_id, self::REF_REDEMPTION_CANCEL, $ref_id, 'credit' );
		if ( ! $entry || (int) $entry->amount <= 0 ) {
			return;
		}

		// A refund recorded while the order was cancelled returned nothing (the
		// cancellation had already handed everything back). Its share is kept by
		// the customer, so only the rest of the cancel return is taken back.
		$retake = (int) $entry->amount;
		$redeemed = $this->get_redeemed_points( $user_id, $order_id );
		if ( $redeemed > 0 ) {
			$earlier_ids = array();
			for ( $i = 0; $i < $cycle; $i++ ) {
				$earlier_ids[] = $this->cancel_ref_id( $order_id, $i );
			}
			$earlier_net = (int) LedgerService::get_instance()->sum_by_reference( $user_id, self::REF_REDEMPTION_CANCEL, $earlier_ids, 'credit' )
				- (int) LedgerService::get_instance()->sum_by_reference( $user_id, self::REF_REDEMPTION_REOPEN, $earlier_ids, 'debit' );
			$missed      = max( 0, $this->get_refund_return_target( $user_id, $order, $redeemed ) - $this->get_refund_returned_points( $user_id, $order ) - $earlier_net );
			$retake      = max( 0, $retake - $missed );
		}

		$ledger = LedgerService::get_instance();
		if ( $retake > 0 && ! $ledger->has_existing_transaction( $user_id, self::REF_REDEMPTION_REOPEN, $ref_id, 'debit' ) ) {
			$result = $ledger->clawback(
				$user_id,
				$retake,
				self::REF_REDEMPTION_REOPEN,
				$ref_id,
				// translators: %d: order ID.
				sprintf( __( 'Redeemed points taken back: order #%d was reopened.', 'pointbay-loyalty-points-referral-rewards-woo' ), $order_id ),
				false,
				'system'
			);
			if ( is_wp_error( $result ) ) {
				return;
			}
		}

		$order->update_meta_data( self::META_REOPEN_CYCLE, $cycle + 1 );
		$order->save_meta_data();
	}

	/**
	 * Hands redeemed points back when an order is cancelled.
	 *
	 * 'failed' is deliberately not handled: WooCommerce lets the customer retry
	 * payment on a failed order, so the discount can still be paid for. Returns
	 * only what has not already come back through refunds, so cancel-after-refund
	 * and refund-after-cancel never credit twice.
	 *
	 * @since 1.1.0
	 * @param int       $order_id   The order ID.
	 * @param string    $old_status The previous status.
	 * @param string    $new_status The new status.
	 * @param \WC_Order $order      The order.
	 * @return void
	 */
	public function return_redeemed_points_on_cancel( $order_id, $old_status, $new_status, $order ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Required by the WooCommerce action signature.
		if ( ! $order || 'cancelled' !== $new_status ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$redeemed = $this->get_redeemed_points( $user_id, $order_id );
		$owed     = $redeemed - $this->get_returned_points( $user_id, $order );
		if ( $owed <= 0 ) {
			return;
		}

		LedgerService::get_instance()->credit(
			$user_id,
			$owed,
			self::REF_REDEMPTION_CANCEL,
			$this->cancel_ref_id( $order_id, (int) $order->get_meta( self::META_REOPEN_CYCLE ) ),
			// translators: %d: order ID.
			sprintf( __( 'Redeemed points returned: order #%d was cancelled.', 'pointbay-loyalty-points-referral-rewards-woo' ), $order_id ),
			'system'
		);
	}

	/**
	 * Hands redeemed points back in proportion to a refund.
	 *
	 * The target is the redeemed total scaled by the refunded share of the order
	 * total, with prior returns subtracted, so repeated partial refunds sum to the
	 * redeemed points exactly once and a full refund returns all of them. Nothing
	 * is returned if the order was already cancelled and returned in full.
	 *
	 * @since 1.1.0
	 * @param int $order_id  The order ID.
	 * @param int $refund_id The refund ID.
	 * @return void
	 */
	public function return_redeemed_points_on_refund( $order_id, $refund_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$redeemed = $this->get_redeemed_points( $user_id, $order_id );
		if ( $redeemed <= 0 ) {
			return;
		}

		$target = $this->get_refund_return_target( $user_id, $order, $redeemed );
		$delta  = $target - $this->get_returned_points( $user_id, $order );
		if ( $delta <= 0 ) {
			return;
		}

		$result = LedgerService::get_instance()->credit(
			$user_id,
			$delta,
			self::REF_REDEMPTION_REFUND,
			$refund_id,
			// translators: %d: refund ID.
			sprintf( __( 'Redeemed points returned for refund #%d.', 'pointbay-loyalty-points-referral-rewards-woo' ), $refund_id ),
			'system'
		);

		if ( ! is_wp_error( $result ) ) {
			$remembered   = array_map( 'absint', (array) $order->get_meta( self::META_RETURNED_REFUNDS ) );
			$remembered[] = (int) $refund_id;
			$order->update_meta_data( self::META_RETURNED_REFUNDS, array_values( array_unique( $remembered ) ) );
			$order->save_meta_data();
		}
	}

	/**
	 * Claws back points proportional to a refunded amount.
	 *
	 * Prorates against what the order was actually awarded, read from the stored
	 * breakdown, rather than recomputing from live settings — a rate changed
	 * between the order and the refund must not change the clawback. Partial
	 * refunds accumulate: the target is always computed against the order's
	 * whole refunded total and prior clawbacks are subtracted, so three 33%
	 * refunds reclaim the award exactly once.
	 *
	 * Bonuses are all-or-nothing. Refunding 30% of an order should not take back
	 * 30% of a "+500 on your first order" incentive; only a full refund does.
	 *
	 * @since 1.0.0
	 * @param int $order_id  The order ID.
	 * @param int $refund_id The refund ID.
	 * @return void
	 */
	public function process_order_refunded( $order_id, $refund_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$ledger_service = LedgerService::get_instance();

		if ( $ledger_service->has_existing_transaction( $user_id, self::REF_REFUND, $refund_id, 'debit' ) ) {
			return;
		}

		$progress = $this->refund_progress( $order, $user_id );
		if ( ! $progress ) {
			return;
		}

		// Points a cancellation already took stand in for the refunds that came
		// before the order was reopened, and the award still outstanding is the
		// ceiling: awards minus refund clawbacks minus net reversals.
		$net_reversed = $this->net_reversed_points( $order, $user_id, true );
		$outstanding  = $progress['total_awarded'] - $progress['already_clawed'] - $net_reversed;
		$delta        = min( $progress['target'] - $progress['already_clawed'] - $net_reversed, $outstanding );

		if ( $delta > 0 ) {
			$ledger_service->clawback(
				$user_id,
				$delta,
				self::REF_REFUND,
				$refund_id,
				// translators: %d: refund number.
				sprintf( __( 'Points clawback for refund #%d', 'pointbay-loyalty-points-referral-rewards-woo' ), $refund_id ),
				false,
				'system'
			);
		}
	}

	/**
	 * Where the refunds on an order say the award should stand.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order   The order.
	 * @param int       $user_id The customer.
	 * @return array|null target (points that should be clawed back in total), total_awarded and already_clawed; null when the order was never awarded.
	 */
	private function refund_progress( $order, $user_id ) {
		$ledger_service = LedgerService::get_instance();

		$breakdown = $this->get_award_breakdown( $order, $user_id );
		if ( ! $breakdown ) {
			return null;
		}

		$base          = (int) $breakdown['base'];
		$fixed         = (int) $breakdown['flat'] + (int) $breakdown['first_order'];
		$total_awarded = $base + $fixed;

		if ( $total_awarded <= 0 ) {
			return null;
		}

		$refunds        = $order->get_refunds();
		$refunded_total = 0.0;
		$refund_ids     = array();

		// Subtotal-mode awards were measured excluding shipping and tax, so the
		// refunded side must be too, or refunding shipping would claw back
		// product points.
		$basis_mode = isset( $breakdown['basis_mode'] ) ? $breakdown['basis_mode'] : EarningCalculator::get_instance()->get_basis_mode();

		foreach ( $refunds as $refund ) {
			$amount = abs( (float) $refund->get_amount() );
			if ( 'subtotal' === $basis_mode ) {
				$amount = max( 0.0, $amount - abs( (float) $refund->get_shipping_total() ) - abs( (float) $refund->get_total_tax() ) );
			}
			$refunded_total += $amount;
			$refund_ids[]    = $refund->get_id();
		}

		// Round both sides to the currency's decimals: 109.99 - 10 - 9.99 is
		// 89.99999999999999 in floating point, which would read as a 99.9999999%
		// refund and skip the fixed-bonus clawback on a full refund.
		$decimals       = wc_get_price_decimals();
		$basis          = round( (float) $breakdown['basis_amount'], $decimals );
		$refunded_total = round( $refunded_total, $decimals );
		$ratio          = $basis > 0 ? min( 1.0, $refunded_total / $basis ) : 1.0;

		// round(), not floor(): repeated partial refunds have to sum back to the
		// full award rather than losing a point to truncation each time.
		$target = (int) round( $base * $ratio );

		if ( $ratio >= 1.0 ) {
			$target += $fixed;
		}

		$already_clawed = (int) $ledger_service->sum_by_reference( $user_id, self::REF_REFUND, $refund_ids, 'debit' );

		return array(
			'target'         => min( $target, $total_awarded ),
			'total_awarded'  => $total_awarded,
			'already_clawed' => $already_clawed,
		);
	}

	/**
	 * Points currently reversed by cancellations: reversals minus re-awards.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order           The order.
	 * @param int       $user_id         The customer.
	 * @param bool      $include_current Whether to include the current cycle (false for earlier cycles only).
	 * @return int Net points reversed.
	 */
	private function net_reversed_points( $order, $user_id, $include_current ) {
		$ledger = LedgerService::get_instance();
		$cycle  = (int) $order->get_meta( self::META_AWARD_CYCLE );
		$last   = $include_current ? $cycle : $cycle - 1;
		$ids    = array();
		for ( $c = 0; $c <= $last; $c++ ) {
			$ids[] = $this->award_cycle_ref_id( $order->get_id(), $c );
		}

		return (int) $ledger->sum_by_reference( $user_id, self::REF_ORDER_REVERSAL, $ids, 'debit' )
			- (int) $ledger->sum_by_reference( $user_id, self::REF_ORDER_REAWARD, $ids, 'credit' );
	}

	/**
	 * Adds earned, pending and redeemed points rows to the order totals.
	 *
	 * @since 1.0.0
	 * @param array     $total_rows  The order item totals rows.
	 * @param \WC_Order $order       The order object.
	 * @param string    $tax_display The tax display mode.
	 * @return array The filtered order item totals rows.
	 */
	public function add_points_to_order_totals( $total_rows, $order, $tax_display ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Required by the WooCommerce filter callback signature.
		$order_id = $order->get_id();
		$user_id  = $order->get_customer_id();
		if ( ! $user_id ) {
			return $total_rows;
		}

		$ledger = LedgerService::get_instance();

		// Points earned, summed across every component of the award.
		$earned = (int) $ledger->sum_by_reference_types( $user_id, self::award_reference_types(), $order_id, 'credit' );

		// Find debit entry (points redeemed)
		$debit = \PointBay\Models\LedgerEntry::find_by_reference( $user_id, self::REF_ORDER, $order_id, 'debit' );

		if ( $earned > 0 ) {
			$total_rows['pointbay_points_earned'] = array(
				'label' => __( 'Points Earned:', 'pointbay-loyalty-points-referral-rewards-woo' ),
				// translators: %d: number of points earned.
				'value' => sprintf( __( '+%d points', 'pointbay-loyalty-points-referral-rewards-woo' ), $earned ),
			);
		} else {
			$status = $order->get_status();
			if ( ! in_array( $status, array( 'cancelled', 'failed', 'refunded', 'completed' ), true ) ) {
				$calculator = EarningCalculator::get_instance();

				$points_to_award = $calculator->total(
					array(
						'amount'              => $calculator->resolve_order_basis( $order ),
						'user_id'             => $user_id,
						'include_first_order' => $calculator->is_first_order( $user_id, $order ),
						'context'             => 'order',
						'order'               => $order,
					)
				);

				if ( $points_to_award > 0 ) {
					$total_rows['pointbay_points_pending'] = array(
						'label' => __( 'Pending Points:', 'pointbay-loyalty-points-referral-rewards-woo' ),
						// translators: %d: number of points the customer will earn.
						'value' => sprintf( __( 'You will earn %d points', 'pointbay-loyalty-points-referral-rewards-woo' ), $points_to_award ),
					);
				}
			}
		}

		if ( $debit && (int) $debit->amount > 0 ) {
			$total_rows['pointbay_points_redeemed'] = array(
				'label' => __( 'Points Redeemed:', 'pointbay-loyalty-points-referral-rewards-woo' ),
				// translators: %d: number of points redeemed.
				'value' => sprintf( __( '-%d points', 'pointbay-loyalty-points-referral-rewards-woo' ), $debit->amount ),
			);
		}

		return $total_rows;
	}
}
