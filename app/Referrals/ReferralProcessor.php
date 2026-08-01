<?php
/**
 * Awards and reverses the referrer's bonus.
 *
 * The reward fires on the referred customer's first completed order, and is
 * clawed back if that same order is later cancelled, failed or fully refunded.
 *
 * @package    PointBay
 * @subpackage Referrals
 * @since      1.0.0
 */

namespace PointBay\Referrals;

use PointBay\Core\Settings;
use PointBay\Services\LedgerService;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Owns the referrer side of the referral programme.
 *
 * Anything rewarded to the referred customer themselves is left to whatever
 * hooks `pointbay_referral_awarded`, which keeps the reference types that
 * describe those rewards out of this plugin entirely.
 *
 * @since 1.0.0
 */
class ReferralProcessor {

	/**
	 * Ledger reference type for the referrer's bonus.
	 */
	const REF_TYPE_AWARD = 'referral';

	/**
	 * Ledger reference type for the clawback of that bonus.
	 */
	const REF_TYPE_REVERSAL = 'referral_reversal';

	/**
	 * Singleton instance.
	 *
	 * @var ReferralProcessor|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @since 1.0.0
	 * @return ReferralProcessor
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register hooks.
	 *
	 * Priority 30 is deliberate: OrderHooks earns and reverses order points at
	 * 20, and the referral reward should settle after the order's own points.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_order_status_completed', $this, 'maybe_process_referral', 30, 2 );
		$loader->add_action( 'woocommerce_order_status_changed', $this, 'maybe_reverse_referral', 30, 4 );
		$loader->add_action( 'woocommerce_order_refunded', $this, 'maybe_reverse_referral_on_refund', 30, 2 );
	}

	/**
	 * Award the referrer once the customer they referred completes a first order.
	 *
	 * @since 1.0.0
	 * @param int       $order_id The order that just completed.
	 * @param \WC_Order $order    The order object.
	 * @return void
	 */
	public function maybe_process_referral( $order_id, $order ) {
		$settings = Settings::get_instance();
		if ( ! $settings->get_settings( 'referrals_enabled' ) ) {
			return;
		}

		if ( ! $order instanceof \WC_Order ) {
			$order = wc_get_order( $order_id );
		}
		if ( ! $order ) {
			return;
		}

		$buyer_id = (int) $order->get_customer_id();
		if ( ! $buyer_id ) {
			return; // Guest checkout cannot be attributed.
		}

		// Only the buyer's very first completed order qualifies. Asking for two
		// and counting is enough to tell "first" from "not first".
		$completed_orders = wc_get_orders(
			array(
				'customer_id' => $buyer_id,
				'status'      => 'completed',
				'limit'       => 2,
				'return'      => 'ids',
			)
		);
		if ( count( $completed_orders ) > 1 ) {
			return;
		}

		$referrer_id = (int) get_user_meta( $buyer_id, ReferralManager::META_REFERRED_BY, true );
		if ( ! $referrer_id ) {
			return;
		}

		// Guard against re-awarding if the order re-enters completed.
		if ( get_user_meta( $buyer_id, ReferralManager::META_REFERRAL_REWARDED, true ) ) {
			return;
		}

		$bonus = (int) $settings->get_settings( 'referrals_bonusPoints' );
		if ( $bonus > 0 ) {
			LedgerService::get_instance()->credit(
				$referrer_id,
				$bonus,
				self::REF_TYPE_AWARD,
				$buyer_id,
				sprintf(
					/* translators: %d: the referred customer's user ID. */
					__( 'Referral bonus for referring user #%d.', 'pointbay-loyalty-points-referral-rewards-woo' ),
					$buyer_id
				),
				'system'
			);
		}

		update_user_meta( $buyer_id, ReferralManager::META_REFERRAL_REWARDED, 1 );
		update_user_meta( $buyer_id, ReferralManager::META_REFERRAL_ORDER_ID, $order_id );

		/**
		 * Fires once a referral has qualified and the referrer has been credited.
		 *
		 * Deliberately fires even when the referrer bonus is zero and no ledger
		 * entry was written: anything rewarding the referred customer is a
		 * separate amount, and must not be switched off by the referrer's
		 * bonus being set to zero.
		 *
		 * Fired after this plugin's own state is durable, so a callback that
		 * fatals cannot leave a half-recorded referral behind.
		 *
		 * @since 1.0.0
		 * @hook pointbay_referral_awarded
		 * @param int $referrer_id The user who referred.
		 * @param int $buyer_id    The referred customer.
		 * @param int $order_id    The qualifying order.
		 */
		do_action( 'pointbay_referral_awarded', $referrer_id, $buyer_id, (int) $order_id );
	}

	/**
	 * Reverse the reward when the qualifying order is cancelled or fails.
	 *
	 * Refunds do not travel through this hook; they arrive at
	 * maybe_reverse_referral_on_refund() instead.
	 *
	 * @since 1.0.0
	 * @param int       $order_id   The order.
	 * @param string    $old_status Previous status.
	 * @param string    $new_status New status.
	 * @param \WC_Order $order      The order object.
	 * @return void
	 */
	public function maybe_reverse_referral( $order_id, $old_status, $new_status, $order ) {
		if ( ! in_array( $new_status, array( 'cancelled', 'failed' ), true ) ) {
			return;
		}
		$this->reverse_referral_for_order( $order_id, $order );
	}

	/**
	 * Reverse the reward when the qualifying order is refunded in full.
	 *
	 * @since 1.0.0
	 * @param int $order_id  The order.
	 * @param int $refund_id The refund that was just created.
	 * @return void
	 */
	public function maybe_reverse_referral_on_refund( $order_id, $refund_id ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Required by the WooCommerce action callback signature.
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		// This hook also fires for partial refunds, which must not claw back a
		// flat bonus that was never proportional to the order total.
		if ( $order->get_total() > $order->get_total_refunded() ) {
			return;
		}

		$this->reverse_referral_for_order( $order_id, $order );
	}

	/**
	 * Claw back the referrer's bonus for a specific order.
	 *
	 * @since 1.0.0
	 * @param int            $order_id The order triggering the reversal.
	 * @param \WC_Order|null $order    The order object.
	 * @return void
	 */
	private function reverse_referral_for_order( $order_id, $order ) {
		$order_id = (int) $order_id;
		$buyer_id = $order ? (int) $order->get_customer_id() : 0;
		if ( ! $buyer_id ) {
			return;
		}

		// Only the order that actually qualified the referral can reverse it.
		$qualifying_order_id = (int) get_user_meta( $buyer_id, ReferralManager::META_REFERRAL_ORDER_ID, true );
		if ( ! $qualifying_order_id || $qualifying_order_id !== $order_id ) {
			return;
		}

		if ( ! get_user_meta( $buyer_id, ReferralManager::META_REFERRAL_REWARDED, true ) ) {
			return;
		}

		$referrer_id = (int) get_user_meta( $buyer_id, ReferralManager::META_REFERRED_BY, true );
		$ledger      = LedgerService::get_instance();

		if ( $referrer_id ) {
			// Claw back what was actually credited, not what the setting says
			// today — the bonus amount may have been changed since.
			$credit = $ledger->get_transaction( $referrer_id, self::REF_TYPE_AWARD, $buyer_id, 'credit' );

			$already_reversed = $ledger->has_existing_transaction(
				$referrer_id,
				self::REF_TYPE_REVERSAL,
				$order_id,
				'debit'
			);

			if ( $credit && ! $already_reversed ) {
				$ledger->clawback(
					$referrer_id,
					(int) $credit->amount,
					self::REF_TYPE_REVERSAL,
					// Keyed on the order, unlike the credit which is keyed on the
					// buyer. The ledger's unique key spans (user, type, ref, txn),
					// and a buyer can re-qualify on a later order, so keying the
					// reversal on the buyer too would collide the second time.
					$order_id,
					sprintf(
						/* translators: %d: the order ID that was cancelled or refunded. */
						__( 'Referral bonus reversed: order #%d was cancelled or refunded.', 'pointbay-loyalty-points-referral-rewards-woo' ),
						$order_id
					),
					false,
					'system'
				);
			}
		}

		/**
		 * Fires while a referral reward is being reversed.
		 *
		 * Fired before the rewarded flag is cleared, so callbacks can still see
		 * the state that qualified the referral.
		 *
		 * @since 1.0.0
		 * @hook pointbay_referral_reversing
		 * @param int $referrer_id The user who referred.
		 * @param int $buyer_id    The referred customer.
		 * @param int $order_id    The order triggering the reversal.
		 */
		do_action( 'pointbay_referral_reversing', $referrer_id, $buyer_id, $order_id );

		// Left re-armable rather than deleted: a later genuine first completed
		// order should be able to qualify the same referral again.
		update_user_meta( $buyer_id, ReferralManager::META_REFERRAL_REWARDED, 0 );
	}
}
