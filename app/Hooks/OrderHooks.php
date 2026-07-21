<?php
/**
 * Hooks for awarding, reversing and displaying loyalty points on orders.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Hooks;

use LoyaltyBay\Services\LedgerService;
use LoyaltyBay\Core\Settings;

/**
 * Registers the hooks that manage loyalty points across the order lifecycle.
 *
 * @since 1.0.0
 */
class OrderHooks {

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
	 * Registers the WordPress hooks handled by this class.
	 *
	 * @since 1.0.0
	 * @param \LoyaltyBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'process_order_status_changed', 20, 4 );
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'maybe_reverse_order_points', 20, 4 );
		$loader->add_action( 'woocommerce_order_refunded', $this, 'process_order_refunded', 20, 2 );
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

		$ledger_service = LedgerService::get_instance();

		if ( $ledger_service->has_existing_transaction( $user_id, 'order', $order_id, 'credit' ) ) {
			return;
		}

		$points_per_dollar = (int) $settings->get_settings( 'earning_pointsPerDollar' );
		$total             = (float) $order->get_total();

		$multiplier = apply_filters( 'loyaltybay_earning_multiplier', 1.0, $user_id );

		$points_to_award = (int) floor( $total * $points_per_dollar * $multiplier );

		if ( $points_to_award > 0 ) {
			$ledger_service->credit( $user_id, $points_to_award, 'order', $order_id, 'Points earned for order #' . $order_id, 'system' );
		}
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

		if ( $ledger_service->has_existing_transaction( $user_id, 'order_reversal', $order_id, 'debit' ) ) {
			return;
		}

		$credit = \LoyaltyBay\Models\LedgerEntry::find_by_reference( $user_id, 'order', $order_id, 'credit' );
		if ( ! $credit || (int) $credit->amount <= 0 ) {
			return;
		}

		$ledger_service->clawback(
			$user_id,
			(int) $credit->amount,
			'order_reversal',
			$order_id,
			// translators: 1: order ID, 2: new order status.
			sprintf( __( 'Points reversed: COD order #%1$d was %2$s.', 'loyaltybay-loyalty-points-referral-rewards-woo' ), $order_id, $new_status ),
			false,
			'system'
		);

		do_action( 'loyaltybay_order_points_reversed', $user_id, $order_id );
	}

	/**
	 * Claws back points proportional to a refunded amount.
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

		if ( $ledger_service->has_existing_transaction( $user_id, 'refund', $refund_id, 'debit' ) ) {
			return;
		}

		$refund = wc_get_order( $refund_id );
		if ( ! $refund ) {
			return;
		}

		$refund_amount   = (float) $refund->get_amount();
		$original_credit = \LoyaltyBay\Models\LedgerEntry::find_by_reference( $user_id, 'order', $order_id, 'credit' );

		if ( $original_credit ) {
			$original_points = (int) $original_credit->amount;

			$settings          = Settings::get_instance();
			$points_per_dollar = (int) $settings->get_settings( 'earning_pointsPerDollar' );
			$multiplier        = apply_filters( 'loyaltybay_earning_multiplier', 1.0, $user_id );

			$points_to_claw_back = (int) floor( $refund_amount * $points_per_dollar * $multiplier );
			$points_to_claw_back = min( $points_to_claw_back, $original_points );

			if ( $points_to_claw_back > 0 ) {
				$ledger_service->clawback( $user_id, $points_to_claw_back, 'refund', $refund_id, 'Points clawback for refund #' . $refund_id, false, 'system' );
			}
		}
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

		// Find credit entry (points earned)
		$credit = \LoyaltyBay\Models\LedgerEntry::find_by_reference( $user_id, 'order', $order_id, 'credit' );
		// Find debit entry (points redeemed)
		$debit = \LoyaltyBay\Models\LedgerEntry::find_by_reference( $user_id, 'order', $order_id, 'debit' );

		if ( $credit && (int) $credit->amount > 0 ) {
			$total_rows['loyaltybay_points_earned'] = array(
				'label' => __( 'Points Earned:', 'loyaltybay-loyalty-points-referral-rewards-woo' ),
				// translators: %d: number of points earned.
				'value' => sprintf( __( '+%d points', 'loyaltybay-loyalty-points-referral-rewards-woo' ), $credit->amount ),
			);
		} else {
			$status = $order->get_status();
			if ( ! in_array( $status, array( 'cancelled', 'failed', 'refunded', 'completed' ), true ) ) {
				$settings          = Settings::get_instance();
				$points_per_dollar = (int) $settings->get_settings( 'earning_pointsPerDollar' );
				$total             = (float) $order->get_total();

				$multiplier = apply_filters( 'loyaltybay_earning_multiplier', 1.0, $user_id );

				$points_to_award = (int) floor( $total * $points_per_dollar * $multiplier );

				if ( $points_to_award > 0 ) {
					$total_rows['loyaltybay_points_pending'] = array(
						'label' => __( 'Pending Points:', 'loyaltybay-loyalty-points-referral-rewards-woo' ),
						// translators: %d: number of points the customer will earn.
						'value' => sprintf( __( 'You will earn %d points', 'loyaltybay-loyalty-points-referral-rewards-woo' ), $points_to_award ),
					);
				}
			}
		}

		if ( $debit && (int) $debit->amount > 0 ) {
			$total_rows['loyaltybay_points_redeemed'] = array(
				'label' => __( 'Points Redeemed:', 'loyaltybay-loyalty-points-referral-rewards-woo' ),
				// translators: %d: number of points redeemed.
				'value' => sprintf( __( '-%d points', 'loyaltybay-loyalty-points-referral-rewards-woo' ), $debit->amount ),
			);
		}

		return $total_rows;
	}
}
