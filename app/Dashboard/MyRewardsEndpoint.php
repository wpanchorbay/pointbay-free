<?php
/**
 * The "My Rewards" WooCommerce account endpoint.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard;

/**
 * Registers and renders the "My Rewards" WooCommerce account endpoint.
 *
 * @since 1.0.0
 */
class MyRewardsEndpoint {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var MyRewardsEndpoint
	 */
	private static $instance = null;
	const ENDPOINT           = 'my-rewards';

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return MyRewardsEndpoint The singleton instance.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers the endpoint hooks with the plugin loader.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'init', $this, 'add_endpoint' );
		$loader->add_filter( 'query_vars', $this, 'add_query_vars' );
		$loader->add_filter( 'woocommerce_account_menu_items', $this, 'add_menu_item' );
		$loader->add_action( 'woocommerce_account_' . self::ENDPOINT . '_endpoint', $this, 'endpoint_content' );
	}

	/**
	 * Registers the rewrite endpoint.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function add_endpoint() {
		add_rewrite_endpoint( self::ENDPOINT, EP_ROOT | EP_PAGES );
	}

	/**
	 * Registers the endpoint query var.
	 *
	 * @since 1.0.0
	 * @param array $vars The registered query vars.
	 * @return array The filtered query vars.
	 */
	public function add_query_vars( $vars ) {
		$vars[] = self::ENDPOINT;
		return $vars;
	}

	/**
	 * Adds the "My Rewards" item to the account menu.
	 *
	 * @since 1.0.0
	 * @param array $items The account menu items.
	 * @return array The filtered account menu items.
	 */
	public function add_menu_item( $items ) {
		$new_items = array();
		foreach ( $items as $key => $value ) {
			$new_items[ $key ] = $value;
			if ( 'orders' === $key ) {
				$new_items[ self::ENDPOINT ] = __( 'My Rewards', 'pointbay-loyalty-points-referral-rewards-woo' );
			}
		}
		if ( ! array_key_exists( self::ENDPOINT, $new_items ) ) {
			$new_items[ self::ENDPOINT ] = __( 'My Rewards', 'pointbay-loyalty-points-referral-rewards-woo' );
		}
		return $new_items;
	}

	/**
	 * Renders the "My Rewards" endpoint content.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function endpoint_content() {
		// The markup lives in RewardsRenderer so the shortcodes and widgets can
		// render the identical dashboard rather than keeping a second copy of it.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- RewardsRenderer escapes every value it interpolates and returns ready-to-print markup.
		echo RewardsRenderer::dashboard( get_current_user_id() );
	}
}
