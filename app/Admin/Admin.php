<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @package    PointBay
 * @subpackage Admin
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Admin;

use PointBay\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The admin-specific functionality of the plugin.
 *
 * @package    PointBay
 * @subpackage PointBay/Admin
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
			$this->config = include \POINTBAY_PATH . 'config/admin.php';
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
		pointbay_log( 'Admin: Registering PointBay menus', 'INFO' );

		$config      = $this->get_config();
		$menu_config = $config['menu'] ?? array();
		// Plugin-level master switch AND the live user-facing setting both
		// have to allow it — Settings::get_settings() merges filtered
		// defaults over the stored option, so this is safe to read this
		// early (a plain get_option() under the hood, no register_setting()
		// dependency).
		$show_main = ( $config['show_main_menu'] ?? true ) && (bool) Settings::get_instance()->get_settings( 'display_showAdminMenu' );

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

			// No self-registered submenu is added here on purpose: WordPress
			// only auto-adds its own duplicate first row (titled the same as
			// the top-level menu) when NOTHING is registered with a matching
			// parent slug. The sub-menus loop below always registers
			// "Points History" first, so that becomes the flyout's first row
			// with no separate placeholder needed.
		}

		// 2. Add sub-menus
		/**
		 * Filters the list of sub-menu pages this plugin registers.
		 *
		 * Lets any other plugin (namely PointBay Pro) register its own
		 * submenu page without this plugin needing any prior knowledge of
		 * it. Each entry supports the same shape as the built-in
		 * config/admin.php entries, plus an optional 'callback' (defaults to
		 * add_setting_root_div) so an add-on can render its own root div /
		 * mount point instead of the default.
		 *
		 * An entry's 'parent_slug' controls where it lives:
		 * - Anything other than PointBay's own top-level menu slug (e.g.
		 *   'woocommerce') registers under that parent AND is automatically
		 *   mirrored under PointBay's own top-level menu too, so both
		 *   navigation paths work. Use the optional 'page_title_top' /
		 *   'menu_title_top' to give the mirrored copy a different label
		 *   (e.g. dropping a now-redundant "Loyalty" qualifier once it's
		 *   already scoped under the "PointBay" menu) — both fall back to
		 *   'page_title' / 'menu_title' when omitted.
		 * - PointBay's own top-level menu slug registers ONLY there (no
		 *   mirroring, since it's already on the top-level menu) — use this
		 *   for a page that has no reason to also live under WooCommerce.
		 *
		 * @since 1.0.0
		 * @hook pointbay_admin_sub_menus
		 * @param array $sub_menus The array of sub-menu definitions.
		 * @return array The filtered array of sub-menu definitions.
		 */
		$sub_menus = apply_filters( 'pointbay_admin_sub_menus', $menu_config['sub_menus'] ?? array() );

		if ( ! empty( $sub_menus ) ) {
			$top_level_slug = $menu_config['top_level']['menu_slug'] ?? '';

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

				// Mirror the same page under PointBay's own top-level menu
				// too (same callback -> same screen), so both navigation
				// paths work. Skipped when the entry's own parent_slug
				// already IS the top-level slug, to avoid registering it
				// twice. 'menu_slug_top' lets an entry reuse the top-level
				// menu's own slug instead of its regular one — required for
				// exactly one entry (the first row) so WordPress recognizes
				// it as that menu's self-referencing item and skips
				// auto-inserting its own duplicate first row.
				if ( $show_main && '' !== $top_level_slug && $sub['parent_slug'] !== $top_level_slug ) {
					add_submenu_page(
						$top_level_slug,
						$sub['page_title_top'] ?? $sub['page_title'],
						$sub['menu_title_top'] ?? $sub['menu_title'],
						$sub['capability'],
						$sub['menu_slug_top'] ?? $sub['menu_slug'],
						$callback
					);
				}
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
		$sub_menus = apply_filters( 'pointbay_admin_sub_menus', $menu_config['sub_menus'] ?? array() );
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
		if ( 'woocommerce_page_wc-settings' === $base && \POINTBAY_PLUGIN_NAME === $current_tab ) {
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
		if ( $this->is_dashboard_screen() ) {
			\PointBay\Admin\Wizard\WizardController::get_instance()->render_dashboard_prompt();
		}

		echo '<div id="' . esc_attr( \POINTBAY_PLUGIN_NAME ) . '">
			<div class="pointbay-loader-container">
				<p>' . esc_html__( 'Loading...', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</p>
			</div>
		</div>';
	}

	/**
	 * Is the current request PointBay's own dashboard (the Points History
	 * ledger, reachable both as the top-level menu's own page and as the
	 * WooCommerce-nested "Points History" entry — both render via this same
	 * callback). Narrower than is_menu_page(), which also matches the
	 * Loyalty Settings / WooCommerce tab screens the dashboard prompt has no
	 * business appearing on.
	 *
	 * @since 1.1.0
	 * @access private
	 * @return bool
	 */
	private function is_dashboard_screen() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['page'] ) ? sanitize_text_field( wp_unslash( $_GET['page'] ) ) : '';
		return in_array( $page, array( \POINTBAY_PLUGIN_NAME, 'pointbay-ledger' ), true );
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
		$handle  = \POINTBAY_PLUGIN_NAME . '-' . $context;

		pointbay_log( "Admin: Enqueueing resources for context: {$context}", 'DEBUG' );

		$deps_file  = \POINTBAY_PATH . "build/{$context}.asset.php";
		$dependency = array( 'wp-i18n' );
		$version    = \POINTBAY_VERSION;
		if ( file_exists( $deps_file ) ) {
			$deps_file  = require $deps_file;
			$dependency = $deps_file['dependencies'];
			$version    = $deps_file['version'];
		}

		$admin_script = apply_filters( "pointbay_admin_script_{$context}", \POINTBAY_URL . "build/{$context}.js" );
		wp_enqueue_script( $handle, $admin_script, $dependency, $version, true );
		wp_enqueue_editor();
		wp_enqueue_media();

		$admin_css = apply_filters( "pointbay_admin_css_{$context}", \POINTBAY_URL . "build/{$context}.css" );
		wp_enqueue_style( $handle, $admin_css, array(), $version );
		wp_style_add_data( $handle, 'rtl', 'replace' );

		$localize = apply_filters(
			'pointbay_admin_localize',
			array(
				'version'         => $version,
				'root_id'         => \POINTBAY_PLUGIN_NAME,
				'nonce'           => wp_create_nonce( 'wp_rest' ),
				'store'           => \POINTBAY_PLUGIN_NAME,
				'rest_url'        => get_rest_url( null, \POINTBAY_REST_NAMESPACE . '/v1' ),
				'pluginData'      => $this->get_plugin_data(),
				'wpSettings'      => array(
					'dateFormat' => get_option( 'date_format' ),
					'timeFormat' => get_option( 'time_format' ),
				),
				/**
				 * Filters the settings array inlined into every PointBay admin
				 * screen. Same seam as SettingsController's REST responses —
				 * see that filter's docblock for why this isn't applied inside
				 * Settings::get_settings() itself.
				 *
				 * @since 1.0.0
				 * @hook pointbay_settings_response
				 * @param array $settings The full settings array being localized to the browser.
				 */
				'plugin_settings' => apply_filters( 'pointbay_settings_response', Settings::get_instance()->get_settings() ),
				'products_url'    => admin_url( 'edit.php?post_type=product' ),
				'settings_url'    => admin_url( 'admin.php?page=wc-settings&tab=' . \POINTBAY_PLUGIN_NAME ),
				'context'         => $context,
			)
		);

		wp_localize_script( $handle, 'pointbay_Localize', $localize );

		$path_to_check = \POINTBAY_PATH . 'languages';
		wp_set_script_translations(
			$handle,
			'pointbay-loyalty-points-referral-rewards-woo',
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
			$target = ! empty( $link['target'] ) ? sprintf( ' target="%s" rel="noopener"', esc_attr( $link['target'] ) ) : '';
			$style  = ! empty( $link['style'] ) ? sprintf( ' style="%s"', esc_attr( $link['style'] ) ) : '';
			$html   = sprintf(
				'<a href="%1$s"%2$s%3$s>%4$s</a>',
				esc_url( $link['url'] ),
				$target,
				$style,
				esc_html( $link['text'] )
			);

			// Preserve a stable key when provided so other plugins (Pro) can
			// target the link for removal; fall back to an appended entry.
			if ( ! empty( $link['key'] ) ) {
				$actions[ $link['key'] ] = $html;
			} else {
				$actions[] = $html;
			}
		}

		return $actions;
	}

	/**
	 * Append informational row-meta links under the plugin description.
	 *
	 * @since 1.1.0
	 * @param string[] $meta        Existing row meta links.
	 * @param string   $plugin_file The plugin file being rendered.
	 * @return string[]
	 */
	public function add_plugin_row_meta( $meta, $plugin_file ) {
		if ( plugin_basename( \POINTBAY_PATH . 'pointbay-loyalty-points-referral-rewards-woo.php' ) !== $plugin_file ) {
			return $meta;
		}

		$config = $this->get_config();
		$links  = $config['plugin_row_meta'] ?? array();

		foreach ( $links as $link ) {
			$meta[] = sprintf(
				'<a href="%s" target="_blank" rel="noopener">%s</a>',
				esc_url( $link['url'] ),
				esc_html( $link['text'] )
			);
		}

		return $meta;
	}

	/**
	 * Register the hooks for the admin area.
	 *
	 * @since    1.0.0
	 * @param    \PointBay\Core\Plugin $plugin The Plugin instance.
	 * @return   void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'admin_menu', $this, 'add_admin_menu' );
		$loader->add_filter( 'woocommerce_get_settings_pages', $this, 'add_wc_settings_tab' );
		$loader->add_filter( 'admin_body_class', $this, 'add_has_sticky_header' );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'enqueue_resources' );

		$loader->add_filter( 'plugin_action_links_' . \POINTBAY_PLUGIN_BASENAME, $this, 'add_plugin_action_links', 10, 1 );
		$loader->add_filter( 'plugin_row_meta', $this, 'add_plugin_row_meta', 10, 2 );
	}
}
