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
	 * Plugin-level master switch. When true, the top-level "PointBay" menu is
	 * registered subject to the live 'display_showAdminMenu' user setting
	 * (see Admin::add_admin_menu()) — this flag is not itself user-facing.
	 */
	'show_main_menu'      => true,

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
			// PointBay brand icon (assets/img/icon-pointbay.svg), base64-
			// inlined like productbay's menu icon. WordPress's
			// wp-admin/js/svg-painter.js recolors this icon client-side
			// after page load, and its regex-based rewrite wholesale
			// replaces any element's `style="..."` attribute rather than
			// merging into it — so a `style="display:none;..."` element
			// would have its display:none silently stripped and reappear.
			// The source SVG's originally-hidden background rect was
			// therefore deleted outright (not just hidden) so nothing is
			// left for that script to accidentally resurrect; only the
			// white rounded-square-with-star-cutout path remains.
			'icon_url'   => 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgd2lkdGg9IjExOS41NzQyMyIKICAgaGVpZ2h0PSIxMTkuNTU0NjkiCiAgIHZpZXdCb3g9IjAgMCAxMTkuNTc0MjMgMTE5LjU1NDY5IgogICBmaWxsPSJub25lIgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxOCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzMjIiIC8+CiAgPHBhdGgKICAgICBpZD0icmVjdDQxNCIKICAgICBzdHlsZT0iZGlzcGxheTppbmxpbmU7ZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxIgogICAgIGQ9Ik0gMjkuOTE5OTIyLDAgQyAxMy4zNDQ3MTksMCAwLDEyLjY5NjAxMyAwLDI4LjQ2NDg0NCB2IDYyLjYyNjk1MyBjIDAsMTUuNzY4ODIzIDEzLjM0NDcxOSwyOC40NjI4OTMgMjkuOTE5OTIyLDI4LjQ2Mjg5MyBoIDU5LjczNDM3NSBjIDE2LjU3NTE5MywwIDI5LjkxOTkyMywtMTIuNjk0MDcgMjkuOTE5OTIzLC0yOC40NjI4OTMgViAyOC40NjQ4NDQgQyAxMTkuNTc0MjIsMTIuNjk2MDEzIDEwNi4yMjk0OSwwIDg5LjY1NDI5NywwIFogTSA1OS44NzY5NTMsMjAuODM3ODkxIFYgNjMuOTQ1MzEzIEwgNjkuNTUwNzgxLDUwLjYzMDg2IEggMTAwLjg3Njk1IEwgNzUuNDkyMTg3LDY5LjAyMzQzOCA1OS44NzY5NTMsNjMuOTQ1MzEzIDg1LjE2NjAxNSw5OC44MTQ0NTMgNTkuODc2OTUzLDgwLjQyMTg3NSAzNC41ODc4OTEsOTguODE0NDUzIDQ0LjI2MTcxOSw2OS4wMjM0MzggMTguODc2OTUzLDUwLjYzMDg2IGggMzEuMzI0MjE5IHoiIC8+Cjwvc3ZnPgo=',
			'position'   => 57,
		),

		/**
		 * Sub-menu configuration.
		 * You can register submenus under your own main menu or under external menus.
		 */
		'sub_menus' => array(
			array(
				'parent_slug'   => 'woocommerce',
				'page_title'    => __( 'Points History', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'menu_title'    => __( 'Points History', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'capability'    => 'manage_pointbay',
				'menu_slug'     => 'pointbay-ledger',
				// When mirrored under PointBay's own top-level menu, reuse
				// the top-level menu's own slug (PointBay\Core, resolved in
				// Admin::add_admin_menu()) instead of 'pointbay-ledger' —
				// this is the same screen add_menu_page() already renders,
				// and WordPress only skips auto-inserting its own duplicate
				// first row when a submenu's slug exactly matches the
				// parent's own slug.
				'menu_slug_top' => \POINTBAY_PLUGIN_NAME,
			),
			array(
				'parent_slug'    => 'woocommerce',
				'page_title'     => __( 'Loyalty Settings', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'menu_title'     => __( 'Loyalty Settings', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'capability'     => 'manage_pointbay',
				'menu_slug'      => 'admin.php?page=wc-settings&tab=' . \POINTBAY_PLUGIN_NAME,
				'is_link'        => true,
				// Used instead of page_title/menu_title only when this entry
				// is mirrored under PointBay's own top-level menu — "Loyalty"
				// is redundant there since the whole menu is already scoped
				// to PointBay.
				'page_title_top' => __( 'Settings', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'menu_title_top' => __( 'Settings', 'pointbay-loyalty-points-referral-rewards-woo' ),
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
