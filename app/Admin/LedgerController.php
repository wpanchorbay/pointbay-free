<?php
/**
 * REST API controller for the points ledger.
 *
 * @package    PointBay
 * @subpackage Admin
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Admin;

use PointBay\Api\ApiController;

/**
 * REST API controller for the points ledger.
 *
 * @since      1.0.0
 * @package    PointBay
 * @subpackage PointBay/Admin
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

		register_rest_route(
			$this->namespace . $this->version,
			'/ledger/(?P<id>\d+)/reverse',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'reverse_entry' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
			)
		);
	}

	const SORTABLE_COLUMNS = array( 'id', 'amount', 'created_at' );
	const REFERENCE_TYPES  = array( 'order', 'order_reversal', 'refund', 'review', 'referral', 'referral_signup', 'referral_reversal', 'referral_signup_reversal', 'admin', 'reversal' );

	/**
	 * Retrieve a paginated, filtered list of ledger entries.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response The ledger entries and the total row count.
	 */
	public function get_items( $request ) {
		global $wpdb;
		$table = $wpdb->prefix . 'pointbay_ledger';

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

		// One bulk query for the whole page rather than a per-row lookup, to flag
		// which of these entries already have a reversal recorded against them.
		$item_ids     = array_map(
			function ( $item ) {
				return (int) $item->id;
			},
			$items
		);
		$reversed_ids = array();
		if ( $item_ids ) {
			// Same fixed-string-query approach as the FIND_IN_SET filters above:
			// the id list travels in as one bound comma-separated string rather
			// than a variable-length placeholder list, so the SQL stays a hard-coded
			// literal no matter how many rows are on the page.
			$item_ids_csv = implode( ',', array_map( 'absint', $item_ids ) );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; must reflect the live reversal state for this page.
			$reversed_ids = $wpdb->get_col(
				$wpdb->prepare(
					'SELECT reference_id FROM %i WHERE reference_type = %s AND FIND_IN_SET( reference_id, %s ) > 0',
					$table,
					'reversal',
					$item_ids_csv
				)
			);
			$reversed_ids = array_map( 'absint', $reversed_ids );
		}

		foreach ( $items as &$item ) {
			$user              = get_userdata( $item->user_id );
			$item->user_email  = $user ? $user->user_email : 'Unknown';
			$item->user_name   = $user ? $user->display_name : 'Unknown';
			$item->is_reversal = 'reversal' === $item->reference_type;
			$item->is_reversed = in_array( (int) $item->id, $reversed_ids, true );
		}

		$response = new \WP_REST_Response(
			array(
				'data'  => $items,
				'total' => (int) $total,
			)
		);
		return $response;
	}

	/**
	 * Reverse a ledger entry by inserting a compensating transaction.
	 *
	 * Ledger rows are append-only (enforced by the unique_transaction
	 * constraint), so this never deletes or mutates the original row — it
	 * records an offsetting credit/debit keyed to the original entry's own
	 * ID, which both keeps a full audit trail and gives idempotent
	 * "already reversed" detection via the same uniqueness constraint every
	 * other transaction path relies on.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response The result of the reversal.
	 */
	public function reverse_entry( $request ) {
		$id    = absint( $request['id'] );
		$entry = \PointBay\Models\LedgerEntry::find( $id );

		if ( ! $entry ) {
			return new \WP_REST_Response( array( 'message' => __( 'Ledger entry not found.', 'pointbay-loyalty-points-referral-rewards-woo' ) ), 404 );
		}

		if ( 'reversal' === $entry->reference_type ) {
			return new \WP_REST_Response( array( 'message' => __( 'A reversal entry cannot itself be reversed.', 'pointbay-loyalty-points-referral-rewards-woo' ) ), 400 );
		}

		if ( ! get_userdata( $entry->user_id ) ) {
			return new \WP_REST_Response( array( 'message' => __( 'The user for this entry no longer exists.', 'pointbay-loyalty-points-referral-rewards-woo' ) ), 400 );
		}

		$opposite_type     = 'credit' === $entry->transaction_type ? 'debit' : 'credit';
		$existing_reversal = \PointBay\Models\LedgerEntry::find_by_reference( $entry->user_id, 'reversal', $entry->id, $opposite_type );

		if ( $existing_reversal ) {
			return new \WP_REST_Response( array( 'message' => __( 'This entry has already been reversed.', 'pointbay-loyalty-points-referral-rewards-woo' ) ), 409 );
		}

		$reason = $request->get_param( 'reason' ) ?
			sanitize_text_field( $request->get_param( 'reason' ) ) :
			// translators: %d: the original ledger entry ID being reversed.
			sprintf( __( 'Reversal of ledger entry #%d.', 'pointbay-loyalty-points-referral-rewards-woo' ), $entry->id );

		$ledger = \PointBay\Services\LedgerService::get_instance();

		// Reversing a credit must be allowed to drive the balance negative —
		// the points may have already been spent elsewhere — so it goes
		// through clawback(), not debit(). Reversing a debit is a plain credit.
		if ( 'credit' === $entry->transaction_type ) {
			$result = $ledger->clawback( $entry->user_id, $entry->amount, 'reversal', $entry->id, $reason, false, 'admin' );
		} else {
			$result = $ledger->credit( $entry->user_id, $entry->amount, 'reversal', $entry->id, $reason, 'admin' );
		}

		if ( is_wp_error( $result ) ) {
			$status = 'duplicate_transaction' === $result->get_error_code() ? 409 : 400;
			return new \WP_REST_Response( array( 'message' => $result->get_error_message() ), $status );
		}

		/**
		 * Fires after a ledger entry has been reversed via the admin UI/API.
		 *
		 * @since 1.0.0
		 * @param int                              $user_id The ID of the user the entry belonged to.
		 * @param int                              $entry_id The original entry's ID (also the new reversal's reference_id).
		 * @param \PointBay\Models\LedgerEntry|null $result   The newly created reversal entry.
		 */
		do_action( 'pointbay_ledger_entry_reversed', $entry->user_id, $entry->id, $result );

		return new \WP_REST_Response( array( 'success' => true ), 200 );
	}
}
