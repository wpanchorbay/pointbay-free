<?php
/**
 * REST API controller for the "award points for past orders" tool.
 *
 * @package    PointBay
 * @subpackage Admin
 * @since      1.1.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Admin;

use PointBay\Api\ApiController;
use PointBay\Services\BackfillService;

/**
 * Runs the retroactive award in batches, as a preview or for real.
 *
 * @since      1.1.0
 * @package    PointBay
 * @subpackage PointBay/Admin
 */
class BackfillController extends ApiController {

	/**
	 * Register the REST routes for this controller.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace . $this->version,
			'/backfill/batch',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'run_batch' ),
					'permission_callback' => array( $this, 'backfill_permissions_check' ),
					'args'                => array(
						'start_date' => array(
							'required' => true,
							'type'     => 'string',
						),
						'end_date'   => array(
							'required' => false,
							'type'     => 'string',
						),
						'page'       => array(
							'type'    => 'integer',
							'default' => 1,
							'minimum' => 1,
						),
						'offset'     => array(
							'type'    => 'integer',
							'minimum' => 0,
						),
						'per_page'   => array(
							'type'    => 'integer',
							'default' => 25,
							'minimum' => 1,
							'maximum' => 50,
						),
						'commit'     => array(
							'type'    => 'boolean',
							'default' => false,
						),
					),
				),
			)
		);
	}

	/**
	 * Same gate as every other PointBay admin endpoint (manage_pointbay plus REST nonce).
	 *
	 * @since 1.1.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return bool|\WP_Error True when allowed, a WP_Error otherwise.
	 */
	public function backfill_permissions_check( $request ) {
		return $this->update_item_permissions_check( $request );
	}

	/**
	 * Whether a string is a real Y-m-d calendar date.
	 *
	 * @since 1.1.0
	 * @param mixed $value The value to test.
	 * @return bool True for a valid date.
	 */
	private function is_valid_date( $value ) {
		if ( ! is_string( $value ) ) {
			return false;
		}
		$date = \DateTime::createFromFormat( '!Y-m-d', $value );
		return $date && $date->format( 'Y-m-d' ) === $value;
	}

	/**
	 * Processes one batch of past orders.
	 *
	 * @since 1.1.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response|\WP_Error The batch result, or a 400 for bad dates.
	 */
	public function run_batch( $request ) {
		$start = $request->get_param( 'start_date' );
		$end   = $request->get_param( 'end_date' );
		$end   = ( null === $end || '' === $end ) ? null : $end;

		if ( ! $this->is_valid_date( $start ) ) {
			return new \WP_Error( 'pointbay_invalid_start_date', __( 'Enter a valid start date.', 'pointbay-loyalty-points-referral-rewards-woo' ), array( 'status' => 400 ) );
		}

		if ( null !== $end && ( ! $this->is_valid_date( $end ) || $end < $start ) ) {
			return new \WP_Error( 'pointbay_invalid_end_date', __( 'The end date must be a valid date on or after the start date.', 'pointbay-loyalty-points-referral-rewards-woo' ), array( 'status' => 400 ) );
		}

		$result = BackfillService::get_instance()->process_batch(
			$start,
			$end,
			max( 1, (int) $request->get_param( 'page' ) ),
			max( 1, min( 50, (int) $request->get_param( 'per_page' ) ) ),
			rest_sanitize_boolean( $request->get_param( 'commit' ) ),
			null !== $request->get_param( 'offset' ) ? max( 0, (int) $request->get_param( 'offset' ) ) : null
		);

		return rest_ensure_response( $result );
	}
}
