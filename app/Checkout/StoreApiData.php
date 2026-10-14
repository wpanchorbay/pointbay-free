<?php
/**
 * Exposes PointBay's cart figures through the WooCommerce Store API.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Services\EarningCalculator;
use PointBay\Services\LedgerService;
use PointBay\Core\Settings;
use PointBay\Hooks\OrderHooks;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Publishes the earn preview and redemption ceiling onto the Store API cart.
 *
 * The block checkout used to receive the *inputs* — a per-currency rate and a
 * tier multiplier — and multiply them in JavaScript. That only worked while the
 * award was a single multiplication. Once earning could come from a band table,
 * a flat bonus or a one-time first-order bonus, a browser-side reimplementation
 * would have had to duplicate all of it and would have drifted the first time
 * either side changed.
 *
 * So the server sends the answer instead. WooCommerce recomputes this on every
 * cart mutation, which means the figure the shopper sees is the figure
 * EarningCalculator produces, by construction rather than by agreement.
 *
 * @since 1.1.0
 */
class StoreApiData {

	/**
	 * The namespace the data is published under.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const NAMESPACE_KEY = 'pointbay';

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var StoreApiData|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return StoreApiData
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers the hooks handled by this class.
	 *
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_blocks_loaded', $this, 'register_endpoint_data' );
	}

	/**
	 * Registers the extension data against the Store API cart endpoint.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function register_endpoint_data() {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			return;
		}

		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema::IDENTIFIER,
				'namespace'       => self::NAMESPACE_KEY,
				'data_callback'   => array( $this, 'get_cart_data' ),
				'schema_callback' => array( $this, 'get_cart_schema' ),
				'schema_type'     => ARRAY_A,
			)
		);
	}

	/**
	 * Builds the data published with each cart response.
	 *
	 * @since 1.1.0
	 * @return array The cart extension data.
	 */
	public function get_cart_data() {
		$user_id    = get_current_user_id();
		$calculator = EarningCalculator::get_instance();
		$manager    = RedemptionManager::get_instance();
		$settings   = Settings::get_instance();

		$basis = $calculator->resolve_cart_basis();

		if ( $user_id > 0 ) {
			$is_first_order = $calculator->is_first_order( $user_id );

			$earn_points = $calculator->total(
				array(
					'amount'              => $basis,
					'user_id'             => $user_id,
					'include_first_order' => $is_first_order,
					'context'             => 'cart',
				)
			);
		} else {
			// Mirrors GuestNotice: no tier multiplier for a visitor with no
			// account, and the registration incentive shown alongside rather
			// than folded into the order's own earning.
			$earn_points = $calculator->total(
				array(
					'amount'           => $basis,
					'user_id'          => 0,
					'apply_multiplier' => false,
					'context'          => 'guest',
				)
			);

			$reg_points = (int) $settings->get_settings( 'earning_pointsForRegistration' );
			if ( $reg_points > 0 ) {
				$earn_points += $reg_points;
			}
		}

		return array(
			'earn_points'        => (int) $earn_points,
			'max_redeemable'     => (int) $manager->get_max_redeemable_points( $user_id ),
			'redemption_applied' => (int) $manager->get_applied_points(),
			'allow_partial'      => (bool) $settings->get_settings( 'redemption_allowPartial' ),
			'can_redeem'         => (bool) $manager->can_redeem( $user_id, array( 'source' => 'cart' ) ),
		);
	}

	/**
	 * Describes the published data for the Store API schema.
	 *
	 * @since 1.1.0
	 * @return array The schema definition.
	 */
	public function get_cart_schema() {
		return array(
			'earn_points'        => array(
				'description' => __( 'Points this cart will earn when the order completes.', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'type'        => 'integer',
				'readonly'    => true,
			),
			'max_redeemable'     => array(
				'description' => __( 'Maximum points the customer may redeem against this cart.', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'type'        => 'integer',
				'readonly'    => true,
			),
			'redemption_applied' => array(
				'description' => __( 'Points currently applied to this cart.', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'type'        => 'integer',
				'readonly'    => true,
			),
			'allow_partial'      => array(
				'description' => __( 'Whether the customer may choose how many points to spend.', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'type'        => 'boolean',
				'readonly'    => true,
			),
			'can_redeem'         => array(
				'description' => __( 'Whether this customer is permitted to redeem points.', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'type'        => 'boolean',
				'readonly'    => true,
			),
		);
	}
}
