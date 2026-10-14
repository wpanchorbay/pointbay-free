<?php
/**
 * Registers PointBay's classic widgets.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard\Widgets;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Hooks the widgets into WordPress.
 *
 * @since 1.1.0
 */
class WidgetRegistrar {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var WidgetRegistrar|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return WidgetRegistrar
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
		$loader->add_action( 'widgets_init', $this, 'register_widgets' );
	}

	/**
	 * Registers each widget class.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function register_widgets() {
		register_widget( BalanceWidget::class );
		register_widget( RewardsWidget::class );
	}
}
