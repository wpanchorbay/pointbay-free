<?php
/**
 * Shows the customer's point balance in the site navigation and admin bar.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard;

use PointBay\Services\LedgerService;
use PointBay\Core\Settings;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Places the point balance where a shopper will see it on every page.
 *
 * Two mechanisms, because neither covers every site on its own:
 *
 * - A nav menu item, appended via `wp_nav_menu_items`. This works on classic
 *   themes and does nothing at all on block/FSE themes, which never call
 *   `wp_nav_menu()`. That is a real limitation, not a bug to be worked around
 *   here — the `[pointbay_balance]` shortcode in a header block is the answer
 *   for those sites.
 * - An admin-bar node, which is theme-independent and works everywhere the bar
 *   is shown.
 *
 * Off by default: this injects markup into the theme's navigation, which is not
 * something a plugin should do to a site without being asked.
 *
 * @since 1.1.0
 */
class MenuBalance {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var MenuBalance|null
	 */
	private static $instance = null;

	/**
	 * Cached balance for this request.
	 *
	 * @since 1.1.0
	 * @var array
	 */
	private $cache = array();

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return MenuBalance
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
		$loader->add_filter( 'wp_nav_menu_items', $this, 'append_menu_item', 10, 2 );
		$loader->add_action( 'admin_bar_menu', $this, 'add_admin_bar_node', 100 );
	}

	/**
	 * Whether the feature is switched on.
	 *
	 * @since 1.1.0
	 * @return bool True when enabled.
	 */
	private function is_enabled() {
		return (bool) Settings::get_instance()->get_settings( 'display_menuBalanceEnabled' );
	}

	/**
	 * The balance text for the current user, formatted per the setting.
	 *
	 * Cached per request: this renders on every page load, and the nav filter
	 * can fire more than once on a page with several menus.
	 *
	 * @since 1.1.0
	 * @return string The formatted text, or an empty string when unavailable.
	 */
	private function get_label() {
		if ( ! is_user_logged_in() ) {
			return '';
		}

		$user_id = get_current_user_id();

		if ( isset( $this->cache[ $user_id ] ) ) {
			return $this->cache[ $user_id ];
		}

		$balance = LedgerService::get_instance()->get_balance( $user_id );
		$format  = Settings::get_instance()->get_settings( 'display_menuBalanceFormat' );
		$format  = $format ? (string) $format : '{points} pts';

		$this->cache[ $user_id ] = str_replace( '{points}', (string) (int) $balance, $format );

		return $this->cache[ $user_id ];
	}

	/**
	 * Appends the balance to the configured nav menu.
	 *
	 * @since 1.1.0
	 * @param string $items The menu's existing item markup.
	 * @param object $args  The wp_nav_menu arguments.
	 * @return string The filtered markup.
	 */
	public function append_menu_item( $items, $args ) {
		if ( ! $this->is_enabled() ) {
			return $items;
		}

		$location = Settings::get_instance()->get_settings( 'display_menuBalanceLocation' );
		$location = $location ? (string) $location : 'primary';

		$theme_location = isset( $args->theme_location ) ? $args->theme_location : '';

		if ( $theme_location !== $location ) {
			return $items;
		}

		$label = $this->get_label();

		if ( '' === $label ) {
			return $items;
		}

		$url = function_exists( 'wc_get_account_endpoint_url' ) ? wc_get_account_endpoint_url( 'my-rewards' ) : '';

		$link = $url
			? '<a href="' . esc_url( $url ) . '">' . esc_html( $label ) . '</a>'
			: '<span>' . esc_html( $label ) . '</span>';

		return $items . '<li class="menu-item pointbay-menu-balance">' . $link . '</li>';
	}

	/**
	 * Adds the balance to the admin bar.
	 *
	 * @since 1.1.0
	 * @param \WP_Admin_Bar $admin_bar The admin bar instance.
	 * @return void
	 */
	public function add_admin_bar_node( $admin_bar ) {
		if ( ! $this->is_enabled() ) {
			return;
		}

		$label = $this->get_label();

		if ( '' === $label ) {
			return;
		}

		$url = function_exists( 'wc_get_account_endpoint_url' ) ? wc_get_account_endpoint_url( 'my-rewards' ) : '';

		$admin_bar->add_node(
			array(
				'id'    => 'pointbay-balance',
				'title' => esc_html( $label ),
				'href'  => $url ? esc_url( $url ) : false,
				'meta'  => array( 'title' => __( 'Your points balance', 'pointbay-loyalty-points-referral-rewards-woo' ) ),
			)
		);
	}
}
