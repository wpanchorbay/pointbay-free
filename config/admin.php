<?php
/**
 * Admin Configuration
 *
 * This file defines the menu structure, plugin action links, and other admin-specific
 * metadata. You can customize these values without changing the Admin class logic.
 *
 * @package    PointBay
 * @subpackage Config
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

// Prevent direct access.
if ( ! defined( 'WPINC' ) ) {
	die;
}

// Defined once and reused below (plugin_action_links + plugin_data) so the
// two never drift apart.
$pointbay_buy_pro_url = 'https://wpanchorbay.com/plugins/pointbay-loyalty-points-referral-rewards-woo/#pricing';

return array(

	/**
	 * Toggle the main top-level menu.
	 *
	 * Set to true to show a dedicated "PointBay" menu in the sidebar.
	 * Set to false if you only want to register submenus under other items (like Products or Tools).
	 */
	'show_main_menu'      => false,

	/**
	 * Menu registration details.
	 */
	'menu'                => array(

		/**
		 * Top-level menu configuration.
		 * Only active if 'show_main_menu' is true.
		 */
		'top_level' => array(
			'page_title' => __( 'PointBay', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'menu_title' => __( 'PointBay', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'capability' => 'manage_pointbay',
			'menu_slug'  => \POINTBAY_PLUGIN_NAME,
			'icon_url'   => 'dashicons-awards',
			'position'   => 57,
		),

		/**
		 * Sub-menu configuration.
		 * You can register submenus under your own main menu or under external menus.
		 */
		'sub_menus' => array(
			array(
				'parent_slug' => 'woocommerce',
				'page_title'  => __( 'Points History', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'menu_title'  => __( 'Points History', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'capability'  => 'manage_pointbay',
				'menu_slug'   => 'pointbay-ledger',
			),
			array(
				'parent_slug' => 'woocommerce',
				'page_title'  => __( 'Loyalty', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'menu_title'  => __( 'Loyalty', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'capability'  => 'manage_pointbay',
				'menu_slug'   => 'admin.php?page=wc-settings&tab=' . \POINTBAY_PLUGIN_NAME,
				'is_link'     => true,
			),
		),
	),

	/**
	 * Plugin Action Links
	 *
	 * These links appear next to "Activate/Deactivate" on the WordPress Plugins page.
	 */
	'plugin_action_links' => array(
		// Keyed 'upgrade' on purpose: PointBay Pro's
		// remove_free_upgrade_link() (app/Core/Plugin.php) unsets this exact
		// key once Pro is active, so an already-paying customer never sees an
		// upgrade nag on their own plugin row. Do not rename this key without
		// updating that removal too.
		array(
			'key'    => 'upgrade',
			'text'   => __( 'Upgrade to Pro', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'url'    => $pointbay_buy_pro_url,
			'target' => '_blank',
			'style'  => 'color:#f02a74;font-weight:600;',
		),
		array(
			'text' => __( 'Settings', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'url'  => admin_url( 'admin.php?page=wc-settings&tab=' . \POINTBAY_PLUGIN_NAME ),
		),
	),

	/**
	 * Plugin Row Meta
	 *
	 * Informational links rendered under the plugin description on the Plugins
	 * screen (alongside "View details"). High-intent actions live in
	 * `plugin_action_links` above; these are references.
	 */
	'plugin_row_meta'     => array(
		array(
			'text' => __( 'Docs', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'url'  => 'https://docs.wpanchorbay.com/pointbay/',
		),
		array(
			'text' => __( 'Support', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'url'  => 'https://wpanchorbay.com/support/',
		),
		array(
			'text' => __( 'Rate ★★★★★', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'url'  => 'https://wordpress.org/support/plugin/' . \POINTBAY_WPORG_SLUG . '/reviews/#new-post',
		),
	),

	/**
	 * Plugin Metadata
	 *
	 * General data used throughout the admin dashboard and JS localization.
	 */
	'plugin_data'         => array(
		'plugin_name' => esc_html__( 'PointBay', 'pointbay-loyalty-points-referral-rewards-woo' ),
		'short_name'  => esc_html__( 'PointBay', 'pointbay-loyalty-points-referral-rewards-woo' ),
		'menu_label'  => esc_html__( 'PointBay', 'pointbay-loyalty-points-referral-rewards-woo' ),
		'custom_icon' => \POINTBAY_URL . 'assets/img/logo-64px.png',
		'menu_icon'   => 'dashicons-awards',
		'author_name' => 'WPAnchorBay',
		'author_uri'  => 'https://wpanchorbay.com',
		'support_uri' => 'https://wpanchorbay.com/support/',
		'docs_uri'    => 'https://docs.wpanchorbay.com/pointbay/',
		'buy_pro_url' => $pointbay_buy_pro_url,
		'position'    => 57,
	),
);
