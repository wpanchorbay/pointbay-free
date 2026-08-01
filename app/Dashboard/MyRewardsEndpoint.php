<?php
/**
 * The "My Rewards" WooCommerce account endpoint.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard;

use PointBay\Core\Settings;
use PointBay\Services\LedgerService;

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
		$user_id = get_current_user_id();
		$ledger  = LedgerService::get_instance();
		$balance = $ledger->get_balance( $user_id );

		$settings = Settings::get_instance();

		echo '<div class="pointbay-dashboard">';
		echo '<h2>' . esc_html__( 'My Loyalty Rewards', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</h2>';
		echo '<div style="background:#f7f7f7; padding:20px; border-radius:8px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">';
		echo '<div>';
		echo '<h3 style="margin-top:0;">' . esc_html__( 'Current Balance', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</h3>';
		echo '<p style="font-size:32px; font-weight:bold; margin:0; color:#5c35b6;"><span class="pointbay-balance-value">' . esc_html( $balance ) . '</span> <span style="font-size:16px; font-weight:normal;">' . esc_html__( 'Points', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</span></p>';
		echo '</div>';

		/**
		 * Filters in a tier-progress badge/summary block (HTML string) for the
		 * customer dashboard. Returns '' by default; any other plugin can hook
		 * in to supply the markup.
		 *
		 * @since 1.0.0
		 * @hook pointbay_tier_progress_html
		 * @param string $html    The HTML to render (empty by default).
		 * @param int    $user_id The current user's ID.
		 * @return string
		 */
		echo apply_filters( 'pointbay_tier_progress_html', '', $user_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		echo '</div>';

		/**
		 * Filters in a "Refer a Friend" block (HTML string) for the customer
		 * dashboard. Returns '' by default; any other plugin can hook in to
		 * supply the markup.
		 *
		 * @since 1.0.0
		 * @hook pointbay_referral_html
		 * @param string $html    The HTML to render (empty by default).
		 * @param int    $user_id The current user's ID.
		 * @return string
		 */
		echo apply_filters( 'pointbay_referral_html', '', $user_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		echo '<h3>' . esc_html__( 'Recent History', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</h3>';

		global $wpdb;
		$table = $wpdb->prefix . 'pointbay_ledger';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the customer's history must reflect the latest ledger write.
		$history = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE user_id = %d ORDER BY created_at DESC LIMIT 10',
				$table,
				$user_id
			)
		);

		if ( ! empty( $history ) ) {
			echo '<table class="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table">';
			echo '<thead><tr><th>' . esc_html__( 'Date', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</th><th>' . esc_html__( 'Description', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</th><th>' . esc_html__( 'Points', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</th></tr></thead><tbody>';

			foreach ( $history as $row ) {
				$sign  = $row->transaction_type === 'credit' ? '+' : '-';
				$color = $row->transaction_type === 'credit' ? 'green' : 'red';

				echo '<tr>';
				echo '<td><time datetime="' . esc_attr( $row->created_at ) . '">' . esc_html( wp_date( get_option( 'date_format' ), strtotime( $row->created_at ) ) ) . '</time></td>';
				echo '<td>' . esc_html( $row->description ) . '</td>';
				echo '<td style="color:' . esc_attr( $color ) . '; font-weight:bold;">' . esc_html( $sign . $row->amount ) . '</td>';
				echo '</tr>';
			}

			echo '</tbody></table>';
		} else {
			echo '<p>' . esc_html__( 'No activity yet.', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</p>';
		}

		echo '</div>';
	}
}
