<?php
namespace LoyaltyBay\Admin;

use LoyaltyBay\Api\ApiController;
use LoyaltyBay\Services\LedgerService;

class UserPointsController extends ApiController {

    public function register_routes() {
        register_rest_route( $this->namespace . $this->version, '/user-points', array(
            array(
                'methods'             => \WP_REST_Server::CREATABLE,
                'callback'            => array( $this, 'adjust_points' ),
                'permission_callback' => array( $this, 'update_item_permissions_check' ),
            ),
        ) );

        register_rest_route( $this->namespace . $this->version, '/user-points/search-users', array(
            array(
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => array( $this, 'search_users' ),
                'permission_callback' => array( $this, 'update_item_permissions_check' ),
            ),
        ) );
    }

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

    public function adjust_points( $request ) {
        $validated = $this->validate( $request, array(
            'user_id' => 'required|integer',
            'amount'  => 'required|integer|min:1',
            'type'    => 'required|in:credit,debit',
            'reason'  => 'required|min:3'
        ) );

        if ( is_wp_error( $validated ) ) {
            return $validated;
        }

        $ledger = LedgerService::get_instance();
        
        $ref_id = time() + rand(100, 999);

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
