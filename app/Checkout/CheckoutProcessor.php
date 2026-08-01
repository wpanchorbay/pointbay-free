<?php
/**
 * Debits redemption points when an order is processed at checkout.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Services\LedgerService;

/**
 * Handles debiting applied redemption points for classic and block checkout.
 *
 * @since 1.0.0
 */
class CheckoutProcessor {
	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var CheckoutProcessor
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return CheckoutProcessor The single instance of the class.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register the checkout hooks for both classic and block checkout.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		// Classic checkout: fires after the order is created but before payment
		// redirect. Passes ( $order_id, $posted_data, $order ).
		$loader->add_action( 'woocommerce_checkout_order_processed', $this, 'process_redemption_classic', 10, 3 );
		// Block checkout / Store API: the classic hook above never fires for
		// orders placed through the block checkout. The Store API fires its own
		// action (only $order is passed) at the equivalent point — before
		// payment. Without hooking it, the redemption discount fee is still
		// applied (woocommerce_cart_calculate_fees does fire for the Store API)
		// but the points are never debited, so a customer would keep their
		// points AND get the discount.
		$loader->add_action( 'woocommerce_store_api_checkout_order_processed', $this, 'process_redemption_blocks', 10, 1 );
	}

	/**
	 * Classic checkout handler. Throwing aborts checkout — WC_Checkout surfaces
	 * the exception message to the customer.
	 *
	 * @since 1.0.0
	 * @param int       $order_id    The processed order ID.
	 * @param array     $posted_data The posted checkout form data.
	 * @param \WC_Order $order      The order object.
	 * @return void
	 * @throws \Exception On insufficient balance or debit failure.
	 */
	public function process_redemption_classic( $order_id, $posted_data, $order ) {
		$this->debit_for_order( $order );
	}

	/**
	 * Block checkout / Store API handler. Converts a debit failure into a
	 * RouteException so the block checkout shows a clean error and aborts the
	 * order, mirroring the classic path.
	 *
	 * @since 1.0.0
	 * @param \WC_Order $order The order object.
	 * @return void
	 * @throws \Automattic\WooCommerce\StoreApi\Exceptions\RouteException When a debit failure occurs during block checkout.
	 * @throws \Exception When a debit failure occurs and the Store API exception class is unavailable.
	 */
	public function process_redemption_blocks( $order ) {
		try {
			$this->debit_for_order( $order );
		} catch ( \Exception $e ) {
			if ( class_exists( '\Automattic\WooCommerce\StoreApi\Exceptions\RouteException' ) ) {
				throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
					'pointbay_redemption_failed',
					esc_html( $e->getMessage() ),
					409
				);
			}
			throw $e;
		}
	}

	/**
	 * Debit the applied redemption points for an order under a row lock.
	 * Shared by both the classic and block checkout paths.
	 *
	 * @since 1.0.0
	 * @param \WC_Order $order The order to debit points for.
	 * @return void
	 * @throws \Exception On insufficient balance or debit failure.
	 */
	private function debit_for_order( $order ) {
		$redemption_manager = RedemptionManager::get_instance();
		$points             = $redemption_manager->get_applied_points();

		if ( $points <= 0 ) {
			return;
		}

		$user_id = $order->get_customer_id();
		if ( ! $user_id ) {
			return;
		}

		$order_id = $order->get_id();

		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
		$wpdb->query( 'BEGIN' );

		try {
			// Lock the cache row (blocks until lock is acquired)
			$balance = \PointBay\Models\LedgerCache::lock_for_update( $user_id );

			if ( $balance < $points ) {
				throw new \Exception( __( 'Insufficient points balance. Your points may have been used elsewhere.', 'pointbay-loyalty-points-referral-rewards-woo' ) );
			}

			// Debit points (runs inside our manual transaction)
			$result = LedgerService::get_instance()->debit( $user_id, $points, 'order', $order_id, 'Points redeemed at checkout for order #' . $order_id, true, 'system' );

			if ( is_wp_error( $result ) ) {
				throw new \Exception( 'PointBay Error: Failed to debit points. ' . $result->get_error_message() );
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
			$wpdb->query( 'COMMIT' );
			$redemption_manager->remove_points_discount();
		} catch ( \Exception $e ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Transaction control statement; not a data query and not cacheable.
			$wpdb->query( 'ROLLBACK' );
			throw $e;
		}
	}
}
