<?php
/**
 * Admin Configuration
 *
 * This file defines the menu structure, plugin action links, and other admin-specific
 * metadata. You can customize these values without changing the Admin class logic.
 *
 * @package    LoyaltyBay
 * @subpackage Config
 * @since      1.0.0
 * @author     LoyaltyBay <loyaltybay@gmail.com>
 */

return array(

	/**
	 * Toggle the main top-level menu.
	 *
	 * Set to true to show a dedicated "LoyaltyBay" menu in the sidebar.
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
			'page_title' => __( 'LoyaltyBay', 'loyaltybay' ),
			'menu_title' => __( 'LoyaltyBay', 'loyaltybay' ),
			'capability' => 'manage_loyaltybay',
			'menu_slug'  => \LOYALTYBAY_PLUGIN_NAME,
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
				'page_title'  => __( 'Points History', 'loyaltybay' ),
				'menu_title'  => __( 'Points History', 'loyaltybay' ),
				'capability'  => 'manage_loyaltybay',
				'menu_slug'   => 'loyaltybay-ledger',
			),
			array(
				'parent_slug' => 'woocommerce',
				'page_title'  => __( 'Loyalty', 'loyaltybay' ),
				'menu_title'  => __( 'Loyalty', 'loyaltybay' ),
				'capability'  => 'manage_loyaltybay',
				'menu_slug'   => 'admin.php?page=wc-settings&tab=' . \LOYALTYBAY_PLUGIN_NAME,
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
		array(
			'text' => __( 'Settings', 'loyaltybay' ),
			'url'  => admin_url( 'admin.php?page=wc-settings&tab=' . \LOYALTYBAY_PLUGIN_NAME ),
		),
		/**
		 * EXAMPLE: Add a Support Link
		 *
		 * array(
		 *     'text' => __( 'Support', 'loyaltybay' ),
		 *     'url'  => 'https://example.com/support',
		 * ),
		 */
	),

	/**
	 * Plugin Metadata
	 *
	 * General data used throughout the admin dashboard and JS localization.
	 */
	'plugin_data'         => array(
		'plugin_name' => esc_html__( 'LoyaltyBay', 'loyaltybay' ),
		'short_name'  => esc_html__( 'LoyaltyBay', 'loyaltybay' ),
		'menu_label'  => esc_html__( 'LoyaltyBay', 'loyaltybay' ),
		'custom_icon' => \LOYALTYBAY_URL . 'assets/img/icon.svg',
		'menu_icon'   => 'dashicons-awards',
		'author_name' => 'LoyaltyBay',
		'author_uri'  => 'https://loyaltybay.com',
		'support_uri' => 'https://loyaltybay.com/support',
		'docs_uri'    => 'https://docs.loyaltybay.com/' . \LOYALTYBAY_PLUGIN_NAME . '/',
		'position'    => 57,
	),
);
