<?php
/**
 * Plugin Name:       PointBay - Loyalty Points & Referral Rewards for WooCommerce
 * Plugin URI:        https://wpanchorbay.com/plugins/pointbay-loyalty-points-referral-rewards-woo/
 * Description:       Reward WooCommerce customers with loyalty points they earn on purchases and referrals, and redeem for discounts at checkout.
 * Requires at least: 6.8
 * Requires PHP:      7.0
 * Requires Plugins:  woocommerce
 * WC requires at least: 6.1
 * Version:           1.0.1
 * Author:            WPAnchorBay
 * Author URI:        https://wpanchorbay.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pointbay-loyalty-points-referral-rewards-woo
 * Domain Path:       /languages
 *
 * @package PointBay
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'POINTBAY_PATH', plugin_dir_path( __FILE__ ) );
define( 'POINTBAY_DIR', plugin_dir_path( __FILE__ ) );
define( 'POINTBAY_URL', plugin_dir_url( __FILE__ ) );
define( 'POINTBAY_VERSION', '1.0.1' );
define( 'POINTBAY_PLUGIN_NAME', 'pointbay' );
define( 'POINTBAY_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
define( 'POINTBAY_REST_NAMESPACE', 'pointbay' );
define( 'POINTBAY_OPTION_NAME', 'pointbay' );

/*
 * The WordPress.org directory slug. This differs from POINTBAY_PLUGIN_NAME
 * ('pointbay'), which is the short internal prefix used for the settings tab id,
 * REST namespace and option key. Anything that has to line up with wordpress.org
 * — support and review URLs, the deactivation-feedback record keys — uses this.
 */
define( 'POINTBAY_WPORG_SLUG', 'pointbay-loyalty-points-referral-rewards-woo' );

// Composer autoloader.
if ( file_exists( POINTBAY_PATH . 'vendor/autoload.php' ) ) {
	require_once POINTBAY_PATH . 'vendor/autoload.php';
}



require_once POINTBAY_PATH . 'app/functions.php';

/*
 * Declare WooCommerce feature compatibility.
 *
 * Orders are only ever read through the wc_get_order() CRUD layer and no data
 * is stored in order meta — everything lives in this plugin's own tables — so
 * High-Performance Order Storage is fully supported. The cart and checkout
 * blocks are supported through the registered block integrations.
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);

/**
 * Begins execution of the plugin.
 *
 * @since 1.0.0
 */
function pointbay_run() {
	\PointBay\Core\Plugin::get_instance();

	// Deferred to 'init' so the translated strings below aren't loaded too early.
	add_action( 'init', 'pointbay_init_deactivation_feedback' );
}
pointbay_run();

/**
 * Registers the deactivation feedback modal shown on the Plugins screen.
 *
 * Nothing is transmitted unless the store owner selects a reason and presses
 * submit; "Skip & Deactivate" sends nothing. What a submission does contain is
 * spelled out in the modal's disclosure and in the readme's Privacy section.
 *
 * @since 1.0.0
 * @return void
 */
function pointbay_init_deactivation_feedback() {
	if ( ! is_admin() || ! class_exists( '\WPAB\DeactivationFeedback\DeactivationFeedback' ) ) {
		return;
	}

	new \WPAB\DeactivationFeedback\DeactivationFeedback(
		array(
			'plugin_file'           => POINTBAY_PLUGIN_BASENAME,
			'plugin_slug'           => POINTBAY_WPORG_SLUG,
			// The receiver only answers on this route; the bare origin returns 400,
			// and the POST is non-blocking so that failure would never surface.
			'remote_endpoint'       => 'https://dfs.wpanchorbay.com/wp-json/wpab/v1/feedback',
			'disclosure_label'      => __( 'What information is sent?', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'disclosure_text'       => __( 'Pressing submit sends the reason you select and any note you type, together with your site address, the email address of your account, and your WordPress version. Choose "Skip & Deactivate" to send nothing.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'reasons'               => array(
				array(
					'id'          => 'couldnt_get_working',
					'label'       => __( "I couldn't get it working", 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'What were you trying to configure?', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
				array(
					'id'          => 'missing_feature',
					'label'       => __( "It's missing a feature I need", 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'What feature?', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
				array(
					'id'          => 'conflict',
					'label'       => __( 'It conflicted with my theme or another plugin', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'Which theme/plugin?', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
				array(
					'id'          => 'slowed_site',
					'label'       => __( 'It slowed down my site', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'Please describe what felt slow', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
				array(
					'id'          => 'better_alternative',
					'label'       => __( 'I found a better alternative', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'Which plugin?', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
				array(
					'id'          => 'too_complicated',
					'label'       => __( "It's too complicated to set up", 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'What part was confusing?', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
				array(
					'id'        => 'no_longer_needed',
					'label'     => __( 'I no longer need a loyalty program on my store', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input' => false,
				),
				array(
					'id'        => 'temporary',
					'label'     => __( "It's temporary — I'm troubleshooting/debugging", 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input' => false,
				),
				array(
					'id'          => 'other',
					'label'       => __( 'Other', 'pointbay-loyalty-points-referral-rewards-woo' ),
					'has_input'   => true,
					'placeholder' => __( 'Please share the reason', 'pointbay-loyalty-points-referral-rewards-woo' ),
				),
			),
			'review_notice_enabled' => true,
			'review_delay_days'     => 3,
			'review_snooze_days'    => 7,
			'review_url'            => 'https://wordpress.org/support/plugin/' . POINTBAY_WPORG_SLUG . '/reviews/#new-post',
			'support_url'           => 'https://wordpress.org/support/plugin/' . POINTBAY_WPORG_SLUG . '/',
			'review_notice_title'   => __( 'Enjoying PointBay?', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'review_notice_message' => __( "You've been using PointBay for a few days now. If it's been helpful, would you mind leaving a quick review? It really helps!", 'pointbay-loyalty-points-referral-rewards-woo' ),
		)
	);
}

/**
 * Activate the plugin.
 *
 * @since 1.0.0
 */
function pointbay_activate() {
	\PointBay\Core\Activator::activate();

	/*
	 * Stamp the first activation so the review notice knows when to appear.
	 * Deliberately after Activator::activate(), which wp_die()s when WooCommerce
	 * is missing — on that path there is no install to ask for a review of.
	 */
	$activated_at_key = 'wpab_activated_at_' . POINTBAY_WPORG_SLUG;
	if ( ! get_option( $activated_at_key ) ) {
		update_option( $activated_at_key, time(), false );
	}
}

/**
 * Deactivate the plugin.
 *
 * @since 1.0.0
 */
function pointbay_deactivate() {
	\PointBay\Core\Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'pointbay_activate' );
register_deactivation_hook( __FILE__, 'pointbay_deactivate' );
