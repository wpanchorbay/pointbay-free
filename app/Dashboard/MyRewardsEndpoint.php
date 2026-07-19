<?php
namespace LoyaltyBay\Dashboard;

use LoyaltyBay\Core\Settings;
use LoyaltyBay\Services\LedgerService;

class MyRewardsEndpoint {
    
    private static $instance = null;
    const ENDPOINT = 'my-rewards';

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function run( $plugin ) {
        $loader = $plugin->get_loader();
        $loader->add_action( 'init', $this, 'add_endpoint' );
        $loader->add_filter( 'query_vars', $this, 'add_query_vars' );
        $loader->add_filter( 'woocommerce_account_menu_items', $this, 'add_menu_item' );
        $loader->add_action( 'woocommerce_account_' . self::ENDPOINT . '_endpoint', $this, 'endpoint_content' );
    }

    public function add_endpoint() {
        add_rewrite_endpoint( self::ENDPOINT, EP_ROOT | EP_PAGES );
    }

    public function add_query_vars( $vars ) {
        $vars[] = self::ENDPOINT;
        return $vars;
    }

    public function add_menu_item( $items ) {
        $new_items = array();
        foreach ( $items as $key => $value ) {
            $new_items[ $key ] = $value;
            if ( 'orders' === $key ) {
                $new_items[ self::ENDPOINT ] = __( 'My Rewards', 'loyaltybay' );
            }
        }
        if ( ! array_key_exists( self::ENDPOINT, $new_items ) ) {
            $new_items[ self::ENDPOINT ] = __( 'My Rewards', 'loyaltybay' );
        }
        return $new_items;
    }

    public function endpoint_content() {
        $user_id = get_current_user_id();
        $ledger = LedgerService::get_instance();
        $balance = $ledger->get_balance( $user_id );
        
        $settings = Settings::get_instance();

        echo '<div class="loyaltybay-dashboard">';
        echo '<h2>' . esc_html__( 'My Loyalty Rewards', 'loyaltybay' ) . '</h2>';
        echo '<div style="background:#f7f7f7; padding:20px; border-radius:8px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">';
        echo '<div>';
        echo '<h3 style="margin-top:0;">' . esc_html__( 'Current Balance', 'loyaltybay' ) . '</h3>';
        echo '<p style="font-size:32px; font-weight:bold; margin:0; color:#5c35b6;"><span class="lb-balance-value">' . esc_html( $balance ) . '</span> <span style="font-size:16px; font-weight:normal;">' . esc_html__( 'Points', 'loyaltybay' ) . '</span></p>';
        echo '</div>';

        /**
         * Filters in a tier-progress badge/summary block (HTML string) for the
         * customer dashboard. Returns '' by default (no tier module installed).
         *
         * @since 1.0.0
         * @hook loyaltybay_tier_progress_html
         * @param string $html    The HTML to render (empty by default).
         * @param int    $user_id The current user's ID.
         * @return string
         */
        echo apply_filters( 'loyaltybay_tier_progress_html', '', $user_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

        echo '</div>';

        /**
         * Filters in a "Refer a Friend" block (HTML string) for the customer
         * dashboard. Returns '' by default (no referrals module installed).
         *
         * @since 1.0.0
         * @hook loyaltybay_referral_html
         * @param string $html    The HTML to render (empty by default).
         * @param int    $user_id The current user's ID.
         * @return string
         */
        echo apply_filters( 'loyaltybay_referral_html', '', $user_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

        echo '<h3>' . esc_html__( 'Recent History', 'loyaltybay' ) . '</h3>';
        
        global $wpdb;
        $table = $wpdb->prefix . 'loyaltybay_ledger';
        $history = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$table} WHERE user_id = %d ORDER BY created_at DESC LIMIT 10",
            $user_id
        ) );

        if ( ! empty( $history ) ) {
            echo '<table class="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table">';
            echo '<thead><tr><th>' . esc_html__( 'Date', 'loyaltybay' ) . '</th><th>' . esc_html__( 'Description', 'loyaltybay' ) . '</th><th>' . esc_html__( 'Points', 'loyaltybay' ) . '</th></tr></thead><tbody>';
            
            foreach ( $history as $row ) {
                $sign = $row->transaction_type === 'credit' ? '+' : '-';
                $color = $row->transaction_type === 'credit' ? 'green' : 'red';
                
                echo '<tr>';
                echo '<td><time datetime="' . esc_attr( $row->created_at ) . '">' . esc_html( wp_date( get_option('date_format'), strtotime( $row->created_at ) ) ) . '</time></td>';
                echo '<td>' . esc_html( $row->description ) . '</td>';
                echo '<td style="color:' . esc_attr( $color ) . '; font-weight:bold;">' . esc_html( $sign . $row->amount ) . '</td>';
                echo '</tr>';
            }
            
            echo '</tbody></table>';
        } else {
            echo '<p>' . esc_html__( 'No activity yet.', 'loyaltybay' ) . '</p>';
        }

        echo '</div>';
    }
}
