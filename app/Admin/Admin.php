<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @package    LoyaltyBay
 * @subpackage Admin
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace LoyaltyBay\Admin;

use LoyaltyBay\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The admin-specific functionality of the plugin.
 *
 * @package    LoyaltyBay
 * @subpackage LoyaltyBay/Admin
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class Admin {


	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var   Admin
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Menu info.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      array
	 */
	private $menu_info;

	/**
	 * Admin configuration.
	 *
	 * @since 1.0.0
	 * @access private
	 * @var array
	 */
	private $config = null;

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 */
	private function __construct() {
		// Configuration is lazy-loaded via get_config() to avoid early translation calls.
	}

	/**
	 * Get Admin configuration (Lazy Loaded).
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_config() {
		if ( null === $this->config ) {
			$this->config = include \LOYALTYBAY_PATH . 'config/admin.php';
		}
		return $this->config;
	}

	/**
	 * Gets an instance of this object.
	 *
	 * @access public
	 * @return Admin
	 * @since 1.0.0
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Get plugin data (formerly white label options).
	 *
	 * @since 1.0.0
	 * @access private
	 * @return array
	 */
	private function get_plugin_data() {
		return $this->get_config()['plugin_data'] ?? array();
	}

	/**
	 * Add Admin Page Menu page.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function add_admin_menu() {
		loyaltybay_log( 'Admin: Registering LoyaltyBay menus', 'INFO' );

		$config      = $this->get_config();
		$menu_config = $config['menu'] ?? array();
		$show_main   = $config['show_main_menu'] ?? true;

		// 1. Add top-level menu
		if ( $show_main && ! empty( $menu_config['top_level'] ) ) {
			$top = $menu_config['top_level'];
			add_menu_page(
				$top['page_title'],
				$top['menu_title'],
				$top['capability'],
				$top['menu_slug'],
				array( $this, 'add_setting_root_div' ),
				$top['icon_url'],
				$top['position']
			);
		}

		// 2. Add sub-menus
		/**
		 * Filters the list of WooCommerce sub-menu pages this plugin registers.
		 *
		 * Lets any other plugin register its own submenu page without this
		 * plugin needing any prior knowledge of it. Each entry supports the
		 * same shape as the built-in config/admin.php entries, plus an
		 * optional 'callback' (defaults to add_setting_root_div) so an add-on
		 * can render its own root div / mount point instead of the default.
		 *
		 * @since 1.0.0
		 * @hook loyaltybay_admin_sub_menus
		 * @param array $sub_menus The array of sub-menu definitions.
		 * @return array The filtered array of sub-menu definitions.
		 */
		$sub_menus = apply_filters( 'loyaltybay_admin_sub_menus', $menu_config['sub_menus'] ?? array() );

		if ( ! empty( $sub_menus ) ) {
			foreach ( $sub_menus as $sub ) {
				// A sub-menu flagged 'is_link' points at an existing admin URL
				// (e.g. the WooCommerce Settings tab) rather than rendering its
				// own page — passing an empty callback makes WordPress render
				// it as a plain link instead of trying to route it as a page.
				if ( ! empty( $sub['is_link'] ) ) {
					$callback = '';
				} elseif ( ! empty( $sub['callback'] ) && is_callable( $sub['callback'] ) ) {
					$callback = $sub['callback'];
				} else {
					$callback = array( $this, 'add_setting_root_div' );
				}

				add_submenu_page(
					$sub['parent_slug'],
					$sub['page_title'],
					$sub['menu_title'],
					$sub['capability'],
					$sub['menu_slug'],
					$callback
				);
			}
		}
	}

	/**
	 * Add to WooCommerce settings pages.
	 *
	 * @since 1.0.0
	 * @param array $settings The settings pages.
	 * @return array
	 */
	public function add_wc_settings_tab( $settings ) {
		$settings[] = new WCSettingsTab();
		return $settings;
	}

	/**
	 * Redirect to the main dashboard.
	 *
	 * @return void
	 */
	public function redirect_to_dashboard() {
		$config      = $this->get_config();
		$menu_config = $config['menu'] ?? array();
		$show_main   = $config['show_main_menu'] ?? true;

		$slug = \LOYALTYBAY_PLUGIN_NAME;

		if ( $show_main && ! empty( $menu_config['top_level']['menu_slug'] ) ) {
			$slug = $menu_config['top_level']['menu_slug'];
		} elseif ( ! empty( $menu_config['sub_menus'] ) ) {
			foreach ( $menu_config['sub_menus'] as $sub ) {
				if ( empty( $sub['is_link'] ) && ! empty( $sub['menu_slug'] ) ) {
					$slug = $sub['menu_slug'];
					break;
				}
			}
		}

		$redirect_url = admin_url( 'admin.php?page=' . $slug );
		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Check if current page is our menu page.
	 *
	 * @access public
	 * @since 1.0.0
	 * @return bool
	 */
	public function is_menu_page() {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return false;
		}

		$base        = $screen->base;
		$config      = $this->get_config();
		$menu_config = $config['menu'] ?? array();

		// 1. Check Top-level menu slug
		if ( ! empty( $menu_config['top_level']['menu_slug'] ) ) {
			$top_slug = $menu_config['top_level']['menu_slug'];
			if ( 'toplevel_page_' . $top_slug === $base || $top_slug . '_page_' . $top_slug === $base ) {
				return true;
			}
		}

		// 2. Check all sub-menu slugs dynamically
		$sub_menus = apply_filters( 'loyaltybay_admin_sub_menus', $menu_config['sub_menus'] ?? array() );
		if ( ! empty( $sub_menus ) ) {
			foreach ( $sub_menus as $sub ) {
				$sub_slug = $sub['menu_slug'];
				// WordPress base for submenus is usually "parent_page_subslug" or just "subslug"
				if ( strpos( $base, '_page_' . $sub_slug ) !== false || $base === $sub_slug ) {
					return true;
				}
			}
		}

		// 3. Handle WooCommerce Settings tab
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$current_tab = isset( $_GET['tab'] ) ? sanitize_text_field( wp_unslash( $_GET['tab'] ) ) : '';
		if ( 'woocommerce_page_wc-settings' === $base && \LOYALTYBAY_PLUGIN_NAME === $current_tab ) {
			return true;
		}

		return false;
	}

	/**
	 * Add has sticky header class.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string $classes The classes.
	 * @return string
	 */
	public function add_has_sticky_header( $classes ) {
		if ( $this->is_menu_page() ) {
			$classes .= ' at-has-hdr-stky ';
		}
		return $classes;
	}

	/**
	 * Add setting root div.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function add_setting_root_div() {
		echo '<div id="' . esc_attr( \LOYALTYBAY_PLUGIN_NAME ) . '">
			<div class="loyaltybay-loader-container">
				<p>' . esc_html__( 'Loading...', 'loyaltybay-loyalty-points-referral-rewards-woo' ) . '</p>
			</div>
		</div>';
	}

	/**
	 * Enqueue resources.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function enqueue_resources() {
		if ( ! $this->is_menu_page() ) {
			return;
		}

		$screen = get_current_screen();

		$context = ( isset( $screen->base ) && 'woocommerce_page_wc-settings' === $screen->base ) ? 'settings' : 'admin';
		$handle  = \LOYALTYBAY_PLUGIN_NAME . '-' . $context;

		loyaltybay_log( "Admin: Enqueueing resources for context: {$context}", 'DEBUG' );

		$deps_file  = \LOYALTYBAY_PATH . "build/{$context}.asset.php";
		$dependency = array( 'wp-i18n' );
		$version    = \LOYALTYBAY_VERSION;
		if ( file_exists( $deps_file ) ) {
			$deps_file  = require $deps_file;
			$dependency = $deps_file['dependencies'];
			$version    = $deps_file['version'];
		}

		$admin_script = apply_filters( "loyaltybay_admin_script_{$context}", \LOYALTYBAY_URL . "build/{$context}.js" );
		wp_enqueue_script( $handle, $admin_script, $dependency, $version, true );
		wp_enqueue_editor();
		wp_enqueue_media();

		$admin_css = apply_filters( "loyaltybay_admin_css_{$context}", \LOYALTYBAY_URL . "build/{$context}.css" );
		wp_enqueue_style( $handle, $admin_css, array(), $version );
		wp_style_add_data( $handle, 'rtl', 'replace' );

		$localize = apply_filters(
			'loyaltybay_admin_localize',
			array(
				'version'         => $version,
				'root_id'         => \LOYALTYBAY_PLUGIN_NAME,
				'nonce'           => wp_create_nonce( 'wp_rest' ),
				'store'           => \LOYALTYBAY_PLUGIN_NAME,
				'rest_url'        => get_rest_url( null, \LOYALTYBAY_TEXT_DOMAIN . '/v1' ),
				'pluginData'      => $this->get_plugin_data(),
				'wpSettings'      => array(
					'dateFormat' => get_option( 'date_format' ),
					'timeFormat' => get_option( 'time_format' ),
				),
				'plugin_settings' => Settings::get_instance()->get_settings(),
				'products_url'    => admin_url( 'edit.php?post_type=product' ),
				'settings_url'    => admin_url( 'admin.php?page=wc-settings&tab=' . \LOYALTYBAY_PLUGIN_NAME ),
				'context'         => $context,
			)
		);

		wp_localize_script( $handle, 'loyaltybay_Localize', $localize );

		$path_to_check = \LOYALTYBAY_PATH . 'languages';
		wp_set_script_translations(
			$handle,
			'loyaltybay-loyalty-points-referral-rewards-woo',
			$path_to_check
		);
	}

	/**
	 * Add plugin action links.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string[] $actions Plugin action links.
	 * @return array
	 */
	public function add_plugin_action_links( $actions ) {
		$config = $this->get_config();
		$links  = $config['plugin_action_links'] ?? array();

		foreach ( $links as $link ) {
			$actions[] = sprintf(
				'<a href="%s">%s</a>',
				esc_url( $link['url'] ),
				esc_html( $link['text'] )
			);
		}

		return $actions;
	}

	/**
	 * Register the hooks for the admin area.
	 *
	 * @since    1.0.0
	 * @param    \LoyaltyBay\Core\Plugin $plugin The Plugin instance.
	 * @return   void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'admin_menu', $this, 'add_admin_menu' );
		$loader->add_filter( 'woocommerce_get_settings_pages', $this, 'add_wc_settings_tab' );
		$loader->add_filter( 'admin_body_class', $this, 'add_has_sticky_header' );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'enqueue_resources' );

		$plugin_basename = plugin_basename( \LOYALTYBAY_PATH . 'loyaltybay-loyalty-points-referral-rewards-woo.php' );
		$loader->add_filter( 'plugin_action_links_' . $plugin_basename, $this, 'add_plugin_action_links', 10, 1 );
	}
}
