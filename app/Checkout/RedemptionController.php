<?php
/**
 * REST controller for applying and removing point redemptions at checkout.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

/**
 * Registers and handles the REST routes used to redeem loyalty points.
 *
 * @since 1.0.0
 */
class RedemptionController {

	/**
	 * Registers the WordPress hooks handled by this class.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'rest_api_init', $this, 'register_routes' );
	}

	/**
	 * Registers the redemption REST routes.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			'pointbay/v1',
			'/redeem',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'apply_points' ),
					'permission_callback' => array( $this, 'check_permission' ),
					'args'                => array(
						'points' => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'remove_points' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
		);
	}

	/**
	 * Checks whether the current request is allowed to redeem points.
	 *
	 * Login is the only requirement at the permission layer. The
	 * `pointbay_can_redeem` gate is enforced in RedemptionManager when points
	 * are applied, so a restriction cannot be sidestepped by posting to the
	 * endpoint directly, while removal stays possible.
	 *
	 * @since 1.0.0
	 * @return bool True when the current user may redeem points.
	 */
	public function check_permission() {
		// nonce check is handled by WP REST API if using X-WP-Nonce header
		if ( ! is_user_logged_in() ) {
			return false;
		}

		// Login only. The can_redeem() gate is enforced inside
		// apply_points_discount(), which still lets a points = 0 removal through;
		// gating here would 403 a customer who is trying to take points OFF.
		return true;
	}

	/**
	 * Applies a points discount to the current cart.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request instance.
	 * @return \WP_REST_Response The REST response describing the result.
	 */
	public function apply_points( $request ) {
		if ( null === WC()->session ) {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Applying WooCommerce's own core filter.
			$session_class = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
			WC()->session  = new $session_class();
			WC()->session->init();
		}

		if ( null === WC()->cart ) {
			WC()->cart = new \WC_Cart();
		}

		if ( ! did_action( 'woocommerce_load_cart' ) ) {
			WC()->cart->get_cart();
		}

		$points  = $request->get_param( 'points' );
		$user_id = get_current_user_id();

		$manager = RedemptionManager::get_instance();

		$result = $manager->apply_points_discount( $user_id, $points );

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response( array( 'message' => $result->get_error_message() ), 400 );
		}

		return new \WP_REST_Response(
			array(
				'success'  => true,
				// What the applied points are worth under the active valuation, for the UI to state.
				'discount' => $manager->calculate_discount_value(
					(int) $points,
					$user_id,
					array(
						'source' => 'cart',
						'amount' => $manager->get_cart_basis_before_points(),
					)
				),
			),
			200
		);
	}

	/**
	 * Removes any points discount from the current cart.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request instance.
	 * @return \WP_REST_Response The REST response describing the result.
	 */
	public function remove_points( $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Required by the REST callback signature.
		if ( null === WC()->session ) {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Applying WooCommerce's own core filter.
			$session_class = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
			WC()->session  = new $session_class();
			WC()->session->init();
		}

		if ( null === WC()->cart ) {
			WC()->cart = new \WC_Cart();
		}

		if ( ! did_action( 'woocommerce_load_cart' ) ) {
			WC()->cart->get_cart();
		}

		$manager = RedemptionManager::get_instance();
		$manager->remove_points_discount();

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}
}
