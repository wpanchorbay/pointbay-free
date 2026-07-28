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

		$where = '1=1';
		$args  = array();

		if ( $user_id > 0 ) {
			$where .= ' AND user_id = %d';
			$args[] = $user_id;
		}

		if ( in_array( $transaction_type, array( 'credit', 'debit' ), true ) ) {
			$where .= ' AND transaction_type = %s';
			$args[] = $transaction_type;
		}

		if ( in_array( $reference_type, self::REFERENCE_TYPES, true ) ) {
			$where .= ' AND reference_type = %s';
			$args[] = $reference_type;
		}

		if ( $search !== '' ) {
			$matching_users = get_users(
				array(
					'search'         => '*' . $search . '*',
					'search_columns' => array( 'user_login', 'user_email', 'display_name' ),
					'fields'         => 'ID',
				)
			);

			if ( empty( $matching_users ) ) {
				$matching_users = array( 0 );
			}

			$placeholders = implode( ',', array_fill( 0, count( $matching_users ), '%d' ) );
			$where       .= " AND user_id IN ({$placeholders})";
			$args         = array_merge( $args, $matching_users );
		}

		// The sort direction is one of two hard-coded literals and the sort column
		// is bound as an identifier placeholder, so neither is concatenated in.
		$order_sql = 'ASC' === $order ? 'ORDER BY %i ASC' : 'ORDER BY %i DESC';

		// $where and $order_sql are assembled from placeholders only (%d/%s for
		// values, %i for identifiers) -- no request data is ever concatenated into
		// the SQL. The table name, the sort column and every filter value are
		// bound through $wpdb->prepare() in the same call that runs the query.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the admin ledger list must show live data.
		$items = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- The sniff cannot count the placeholders inside $where/$order_sql; the counts do match at runtime.
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $where/$order_sql contain placeholders only; every value is bound here.
				"SELECT * FROM %i WHERE {$where} {$order_sql} LIMIT %d OFFSET %d",
				array_merge( array( $table ), $args, array( $orderby, $per_page, $offset ) )
			)
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; the row count must match the list above.
		$total = $wpdb->get_var(
			// phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber -- The sniff cannot count the placeholders inside $where; the counts do match at runtime.
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $where contains placeholders only; every value is bound here.
				"SELECT COUNT(*) FROM %i WHERE {$where}",
				array_merge( array( $table ), $args )
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
