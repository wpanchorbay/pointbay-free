<?php
namespace LoyaltyBay\Admin;

use LoyaltyBay\Api\ApiController;

class LedgerController extends ApiController {

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

		$order_sql = "ORDER BY {$orderby} {$order}";

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		// $table is derived from $wpdb->prefix (not user input); $where/$order_sql are built only from %d/%s
		// placeholders and values whitelisted against self::SORTABLE_COLUMNS/self::REFERENCE_TYPES/fixed enums above.
		if ( ! empty( $args ) ) {
			$query       = $wpdb->prepare( "SELECT * FROM {$table} WHERE {$where} {$order_sql} LIMIT %d OFFSET %d", array_merge( $args, array( $per_page, $offset ) ) );
			$count_query = $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE {$where}", $args );
		} else {
			$query       = $wpdb->prepare( "SELECT * FROM {$table} {$order_sql} LIMIT %d OFFSET %d", $per_page, $offset );
			$count_query = "SELECT COUNT(*) FROM {$table}";
		}

		$items = $wpdb->get_results( $query );
		$total = $wpdb->get_var( $count_query );
		// phpcs:enable

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
