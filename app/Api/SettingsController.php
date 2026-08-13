<?php
/**
 * REST API controller for managing settings.
 *
 * @package    PointBay
 * @subpackage Api
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Api;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use PointBay\Core\Settings;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * REST API controller for managing settings.
 *
 * @since      1.0.0
 * @package    PointBay
 * @subpackage PointBay/Api
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class SettingsController extends ApiController {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var   SettingsController
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @static
	 * @access public
	 * @return SettingsController
	 * @since 1.0.0
	 */
	public static function get_instance() {
		static $instance = null;
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register the routes for this controller.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		$namespace = $this->namespace . $this->version;

		// GET endpoint: Retrieve settings
		register_rest_route(
			$namespace,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
				),
			)
		);

		// POST endpoint: Update settings
		register_rest_route(
			$namespace,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
			)
		);
	}

	/**
	 * Handle GET request for settings.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_REST_Response
	 */
	public function get_settings( $request ) {
		$settings = $this->filter_settings_response( Settings::get_instance()->get_settings() );

		return new WP_REST_Response(
			array(
				'success' => true,
				'data'    => $settings,
			),
			200
		);
	}

	/**
	 * Filter a settings array before it leaves the plugin in a REST response.
	 *
	 * Applied only at this display/API-response boundary, never inside
	 * Settings::get_settings() itself — that method is the internal read path
	 * used throughout business logic (including single-key scalar reads), so
	 * filtering there would risk breaking internal callers or handing
	 * redacted data to code that needs the real value.
	 *
	 * @since 1.0.0
	 * @hook pointbay_settings_response
	 * @param array $settings The full settings array about to be sent to the client.
	 * @return array The filtered settings array.
	 *
	 * Read/display-only: a caller (e.g. the pro add-on masking `license_key`)
	 * that redacts a value here must be able to recognize its own redaction
	 * sentinel on a subsequent save, since update_settings()'s response also
	 * flows through this filter — otherwise the sentinel could round-trip
	 * back in as the new stored value.
	 */
	private function filter_settings_response( $settings ) {
		return apply_filters( 'pointbay_settings_response', $settings );
	}

	/**
	 * Filter a settings array just before it's persisted.
	 *
	 * The write-side counterpart to filter_settings_response() above: a
	 * caller that redacts a value on the way out (e.g. pro masking
	 * `license_key`) needs a chance here to recognize its own redaction
	 * sentinel coming back in — the admin settings page keeps one shared
	 * settings object client-side and its Save button POSTs the whole
	 * thing, masked fields included, on every save.
	 *
	 * @since 1.0.0
	 * @hook pointbay_settings_update_request
	 * @param array $settings The sanitized settings array about to be saved.
	 * @return array The filtered settings array.
	 */
	private function filter_settings_update_request( $settings ) {
		return apply_filters( 'pointbay_settings_update_request', $settings );
	}

	/**
	 * Handle POST request to update settings.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_REST_Response
	 */
	public function update_settings( $request ) {
		$body = $request->get_json_params();

		$settings_instance = Settings::get_instance();

		// Since Settings class sanitizes input via sanitize_settings_object,
		// we can pass the body directly or re-sanitize it.
		$sanitized_body = $settings_instance->sanitize_settings_object( $body );
		$sanitized_body = $this->filter_settings_update_request( $sanitized_body );
		$settings_instance->update_settings( $sanitized_body );

		$res = $this->filter_settings_response( $settings_instance->get_settings() );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Settings updated successfully.', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'data'    => $res,
			),
			200
		);
	}
}
