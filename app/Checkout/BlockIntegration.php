<?php
/**
 * WooCommerce Checkout block integration for the redemption UI.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;

/**
 * Integrates the PointBay redemption UI with the WooCommerce Checkout block.
 *
 * @since 1.0.0
 */
class BlockIntegration implements IntegrationInterface {

	/**
	 * Get the unique name of this block integration.
	 *
	 * @since 1.0.0
	 * @return string The integration name.
	 */
	public function get_name() {
		return 'pointbay_checkout';
	}

	/**
	 * Register the block script and resolve its dependencies and version.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function initialize() {
		$script_url  = \POINTBAY_URL . 'build/block-checkout.js';
		$script_path = \POINTBAY_DIR . 'build/block-checkout.js';
		$asset_path  = \POINTBAY_DIR . 'build/block-checkout.asset.php';

		$dependencies = array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins' );
		$version      = \POINTBAY_VERSION;

		if ( file_exists( $asset_path ) ) {
			$asset        = require $asset_path;
			$dependencies = array_merge( $asset['dependencies'], array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins', 'wc-blocks-checkout' ) );
			$version      = $asset['version'];
		} elseif ( file_exists( $script_path ) ) {
			$dependencies = array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins', 'wc-blocks-checkout' );
			$version      = filemtime( $script_path );
		} else {
			$dependencies = array( 'wp-element', 'wp-components', 'wp-i18n', 'wp-plugins', 'wc-blocks-checkout' );
		}

		wp_register_script(
			'pointbay-block-checkout',
			$script_url,
			$dependencies,
			$version,
			true
		);

		// Without this the block's __() strings stay untranslated even when a
		// language pack is installed -- the script has no translation source.
		wp_set_script_translations(
			'pointbay-block-checkout',
			'pointbay-loyalty-points-referral-rewards-woo',
			\POINTBAY_PATH . 'languages'
		);
	}

	/**
	 * Get the script handles loaded on the frontend.
	 *
	 * @since 1.0.0
	 * @return string[] The frontend script handles.
	 */
	public function get_script_handles() {
		return array( 'pointbay-block-checkout' );
	}

	/**
	 * Get the script handles loaded in the block editor.
	 *
	 * @since 1.0.0
	 * @return string[] The editor script handles.
	 */
	public function get_editor_script_handles() {
		return array( 'pointbay-block-checkout' );
	}

	/**
	 * Get the data passed to the block script for the current request.
	 *
	 * @since 1.0.0
	 * @return array The redemption data exposed to the block script.
	 */
	public function get_script_data() {
		$user_id  = get_current_user_id();
		$manager  = \PointBay\Checkout\RedemptionManager::get_instance();
		$settings = \PointBay\Core\Settings::get_instance();

		// Clamp before publishing: the figures the UI renders must be the same
		// ones the order-time debit will accept.
		$manager->reconcile_applied_points( $user_id );

		// points_per_dollar and earning_multiplier are deliberately no longer
		// sent. The earn preview is computed server-side and published on the
		// cart by StoreApiData; shipping the raw inputs as well would invite a
		// second, drifting implementation in the browser.
		return array(
			'rest_url'         => esc_url_raw( rest_url( 'pointbay/v1/redeem' ) ),
			'nonce'            => wp_create_nonce( 'wp_rest' ),
			'max_points'       => $manager->get_max_redeemable_points( $user_id ),
			'applied_points'   => $manager->get_applied_points(),
			'balance'          => \PointBay\Services\LedgerService::get_instance()->get_balance( $user_id ),
			'is_logged_in'     => is_user_logged_in(),
			'can_redeem'       => $manager->can_redeem( $user_id, array( 'source' => 'cart' ) ),
			'allow_partial'    => (bool) $settings->get_settings( 'redemption_allowPartial' ),
			'hide_coupon_form' => (bool) $settings->get_settings( 'redemption_hideCouponForm' ),
			'points_value'     => (float) $settings->get_settings( 'redemption_pointsValue' ),
			'currency_sym'     => get_woocommerce_currency_symbol(),
			'currency_pos'     => get_option( 'woocommerce_currency_pos' ),
		);
	}
}
