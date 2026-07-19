<?php
namespace LoyaltyBay\Checkout;

class RedemptionController {
    public function run( $plugin ) {
        $loader = $plugin->get_loader();
        $loader->add_action( 'rest_api_init', $this, 'register_routes' );
    }

    public function register_routes() {
        register_rest_route( 'loyaltybay/v1', '/redeem', array(
            array(
                'methods'             => \WP_REST_Server::CREATABLE,
                'callback'            => array( $this, 'apply_points' ),
                'permission_callback' => array( $this, 'check_permission' ),
                'args'                => array(
                    'points' => array(
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ),
                ),
            ),
            array(
                'methods'             => \WP_REST_Server::DELETABLE,
                'callback'            => array( $this, 'remove_points' ),
                'permission_callback' => array( $this, 'check_permission' ),
            ),
        ) );
    }

    public function check_permission() {
        // nonce check is handled by WP REST API if using X-WP-Nonce header
        return is_user_logged_in();
    }

    public function apply_points( $request ) {
        if ( null === WC()->session ) {
            $session_class = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
            WC()->session = new $session_class();
            WC()->session->init();
        }

        if ( null === WC()->cart ) {
            WC()->cart = new \WC_Cart();
        }

        if ( ! did_action( 'woocommerce_load_cart' ) ) {
            WC()->cart->get_cart();
        }

        $points = $request->get_param( 'points' );
        $user_id = get_current_user_id();

        $manager = RedemptionManager::get_instance();
        $max_points = $manager->get_max_redeemable_points( $user_id );
        
        $result = $manager->apply_points_discount( $user_id, $points );
        
        $has_session = isset( WC()->session ) ? 'yes' : 'no';
        $session_val = isset( WC()->session ) ? WC()->session->get( RedemptionManager::SESSION_KEY, 0 ) : 'N/A';

        if ( is_wp_error( $result ) ) {
            return new \WP_REST_Response( array( 'message' => $result->get_error_message() ), 400 );
        }

        return new \WP_REST_Response( array( 'success' => true ), 200 );
    }

    public function remove_points( $request ) {
        if ( null === WC()->session ) {
            $session_class = apply_filters( 'woocommerce_session_handler', 'WC_Session_Handler' );
            WC()->session = new $session_class();
            WC()->session->init();
        }

        if ( null === WC()->cart ) {
            WC()->cart = new \WC_Cart();
        }

        if ( ! did_action( 'woocommerce_load_cart' ) ) {
            WC()->cart->get_cart();
        }

        $manager = RedemptionManager::get_instance();
        $manager->remove_points_discount();

        return new \WP_REST_Response( array( 'success' => true ), 200 );
    }
}
