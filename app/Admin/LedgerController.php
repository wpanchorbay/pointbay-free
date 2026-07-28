<?php
/**
 * REST API controller for the points ledger.
 *
 * @package    LoyaltyBay
 * @subpackage Admin
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace LoyaltyBay\Admin;

use LoyaltyBay\Api\ApiController;

/**
 * REST API controller for the points ledger.
 *
 * @since      1.0.0
 * @package    LoyaltyBay
 * @subpackage LoyaltyBay/Admin
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class LedgerController extends ApiController {

	/**
	 * Register the REST routes for this controller.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace . $this->version,
			'/ledger',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
				),
			)
		);
	}

	const SORTABLE_COLUMNS = array( 'id', 'amount', 'created_at' );
	const REFERENCE_TYPES  = array( 'order', 'order_reversal', 'refund', 'review', 'referral', 'referral_signup', 'referral_reversal', 'referral_signup_reversal', 'admin' );

	/**
	 * Retrieve a paginated, filtered list of ledger entries.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response The ledger entries and the total row count.
	 */
	public function get_items( $request ) {
		global $wpdb;
		$table = $wpdb->prefix . 'loyaltybay_ledger';

		$per_page         = $request->get_param( 'per_page' ) ? absint( $request->get_param( 'per_page' ) ) : 20;
		$page             = $request->get_param( 'page' ) ? absint( $request->get_param( 'page' ) ) : 1;
		$offset           = ( $page - 1 ) * $per_page;
		$user_id          = $request->get_param( 'user_id' ) ? absint( $request->get_param( 'user_id' ) ) : 0;
		$search           = $request->get_param( 'search' ) ? sanitize_text_field( $request->get_param( 'search' ) ) : '';
		$transaction_type = $request->get_param( 'transaction_type' ) ? sanitize_key( $request->get_param( 'transaction_type' ) ) : '';
		$reference_type   = $request->get_param( 'reference_type' ) ? sanitize_key( $request->get_param( 'reference_type' ) ) : '';
		$orderby          = $request->get_param( 'orderby' );
		$orderby          = in_array( $orderby, self::SORTABLE_COLUMNS, true ) ? $orderby : 'id';
		$order            = strtoupper( (string) $request->get_param( 'order' ) ) === 'ASC' ? 'ASC' : 'DESC';

		// Unrecognised filter values are reduced to the "no filter" state rather
		// than being passed through, so the queries below never see them.
		$transaction_type = in_array( $transaction_type, array( 'credit', 'debit' ), true ) ? $transaction_type : '';
		$reference_type   = in_array( $reference_type, self::REFERENCE_TYPES, true ) ? $reference_type : '';

		// Resolve a name/email search to the matching user IDs. They travel into
		// the query as ONE bound comma-separated string tested with FIND_IN_SET,
		// rather than as a generated "IN (%d, %d, ...)" fragment -- that keeps the
		// SQL a fixed string no matter how many users match.
		$search_ids = '';

		if ( '' !== $search ) {
			$matching_users = get_users(
				array(
					'search'         => '*' . $search . '*',
					'search_columns' => array( 'user_login', 'user_email', 'display_name' ),
					'fields'         => 'ID',
				)
			);

			// No match must return no rows, so fall back to an ID that cannot exist.
			$search_ids = implode( ',', array_map( 'absint', $matching_users ) );

			if ( '' === $search_ids ) {
				$search_ids = '0';
			}
		}

		/*
		 * Each filter is a self-cancelling condition: a bound flag of 0 makes the
		 * left side of the OR true and the filter drops out. That lets both queries
		 * be FIXED strings -- no fragment is concatenated or interpolated, so every
		 * value, the table and the sort column arrive purely as bound parameters.
		 */
		$has_type   = '' === $transaction_type ? 0 : 1;
		$has_ref    = '' === $reference_type ? 0 : 1;
		$has_search = '' === $search_ids ? 0 : 1;

		// The sort direction cannot be a bound parameter, so each direction gets
		// its own complete literal query instead of a concatenated fragment. Every
		// replacement is passed individually rather than as one array, so the
		// placeholder count is verifiable by reading the call.
		if ( 'ASC' === $order ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the admin ledger list must show live data.
			$items = $wpdb->get_results(
				$wpdb->prepare(
					'SELECT * FROM %i WHERE ( %d = 0 OR user_id = %d ) AND ( %d = 0 OR transaction_type = %s ) AND ( %d = 0 OR reference_type = %s ) AND ( %d = 0 OR FIND_IN_SET( user_id, %s ) > 0 ) ORDER BY %i ASC LIMIT %d OFFSET %d',
					$table,
					$user_id,
					$user_id,
					$has_type,
					$transaction_type,
					$has_ref,
					$reference_type,
					$has_search,
					$search_ids,
					$orderby,
					$per_page,
					$offset
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the admin ledger list must show live data.
			$items = $wpdb->get_results(
				$wpdb->prepare(
					'SELECT * FROM %i WHERE ( %d = 0 OR user_id = %d ) AND ( %d = 0 OR transaction_type = %s ) AND ( %d = 0 OR reference_type = %s ) AND ( %d = 0 OR FIND_IN_SET( user_id, %s ) > 0 ) ORDER BY %i DESC LIMIT %d OFFSET %d',
					$table,
					$user_id,
					$user_id,
					$has_type,
					$transaction_type,
					$has_ref,
					$reference_type,
					$has_search,
					$search_ids,
					$orderby,
					$per_page,
					$offset
				)
			);
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the row count must match the list above.
		$total = $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(*) FROM %i WHERE ( %d = 0 OR user_id = %d ) AND ( %d = 0 OR transaction_type = %s ) AND ( %d = 0 OR reference_type = %s ) AND ( %d = 0 OR FIND_IN_SET( user_id, %s ) > 0 )',
				$table,
				$user_id,
				$user_id,
				$has_type,
				$transaction_type,
				$has_ref,
				$reference_type,
				$has_search,
				$search_ids
			)
		);

		foreach ( $items as &$item ) {
			$user             = get_userdata( $item->user_id );
			$item->user_email = $user ? $user->user_email : 'Unknown';
			$item->user_name  = $user ? $user->display_name : 'Unknown';
		}

		$response = new \WP_REST_Response(
			array(
				'data'  => $items,
				'total' => (int) $total,
			)
		);
		return $response;
	}
}
