<?php
/**
 * WC Settings Tab — integrates PointBay settings into WooCommerce settings.
 *
 * @since      1.0.0
 * @package    PointBay
 * @subpackage PointBay/Admin
 */

namespace PointBay\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WooCommerce Settings Tab for PointBay.
 */
class WCSettingsTab extends \WC_Settings_Page {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->id    = \POINTBAY_PLUGIN_NAME;
		$this->label = __( 'Loyalty Points', 'pointbay-loyalty-points-referral-rewards-woo' );

		parent::__construct();
	}

	/**
	 * Output the settings.
	 */
	public function output() {
		Admin::get_instance()->add_setting_root_div();
	}

	/**
	 * Save settings.
	 *
	 * We don't need this because React handles saving via REST API.
	 */
	public function save() {
		// Logic is handled by React/REST API.
	}
}
