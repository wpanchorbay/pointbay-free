<?php
/**
 * REST API controller for managing user points.
 *
 * @package    PointBay
 * @subpackage Admin
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Admin;

use PointBay\Api\ApiController;
use PointBay\Services\LedgerService;

/**
 * REST API controller for managing user points.
 *
 * @since      1.0.0
 * @package    PointBay
 * @subpackage PointBay/Admin
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class UserPointsController extends ApiController {

	/**
	 * Register the REST routes for this controller.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace . $this->version,
			'/user-points',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'adjust_points' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
			)
		);

		register_rest_route(
			$this->namespace . $this->version,
			'/user-points/search-users',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'search_users' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
			)
		);
	}

	/**
	 * Search users for the admin points UI.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response The matched users formatted for a select control.
	 */
	public function search_users( $request ) {
		$search = $request->get_param( 'search' );
		$ids    = $request->get_param( 'ids' );

		$args = array(
			'number'  => 20,
			'orderby' => 'display_name',
			'order'   => 'ASC',
		);

		if ( ! empty( $search ) ) {
			$args['search']         = '*' . sanitize_text_field( $search ) . '*';
			$args['search_columns'] = array( 'user_login', 'user_email', 'user_nicename', 'display_name' );
		}

		if ( ! empty( $ids ) ) {
			$args['include'] = array_map( 'intval', explode( ',', $ids ) );
		}

		$user_query = new \WP_User_Query( $args );
		$users      = $user_query->get_results();

		$formatted = array();
		foreach ( $users as $user ) {
			$formatted[] = array(
				'value' => $user->ID,
				'label' => $user->display_name . ' (' . $user->user_email . ')',
			);
		}

		return rest_ensure_response( $formatted );
	}

	/**
	 * Credit or debit a user's points balance.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response The result of the adjustment.
	 */
	public function adjust_points( $request ) {
		$validated = $this->validate(
			$request,
			array(
				'user_id' => 'required|integer',
				'amount'  => 'required|integer|min:1',
				'type'    => 'required|in:credit,debit',
				'reason'  => 'required|min:3',
			)
		);

		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		$ledger = LedgerService::get_instance();

		$ref_id = time() + wp_rand( 100, 999 );

		if ( $validated['type'] === 'credit' ) {
			$result = $ledger->credit( $validated['user_id'], $validated['amount'], 'admin', $ref_id, $validated['reason'], 'admin' );
		} else {
			$result = $ledger->debit( $validated['user_id'], $validated['amount'], 'admin', $ref_id, $validated['reason'], false, 'admin' );
		}

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response( array( 'message' => $result->get_error_message() ), 400 );
		}

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}
}
