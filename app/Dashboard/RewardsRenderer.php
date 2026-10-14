<?php
/**
 * Reusable renderers for the customer-facing rewards UI.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard;

use PointBay\Services\LedgerService;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Builds the customer rewards markup as strings.
 *
 * Extracted from MyRewardsEndpoint, which used to echo the whole dashboard from
 * one method. Returning strings rather than printing is what lets shortcodes and
 * widgets reuse the exact same markup instead of growing a second, slowly
 * diverging copy of it.
 *
 * The two extension slots — `pointbay_tier_progress` and
 * `pointbay_my_rewards_after_balance` — are actions whose callbacks echo, so
 * they are captured with output buffering here. That is transparent to the
 * callbacks: they still echo, and the account page still receives byte-identical
 * markup.
 *
 * A note on the seam: the balance and the tier badge are NOT independently
 * renderable. The tier slot fires inside the balance card's flex container, so
 * the balance is its left column and the badge its right. The card is therefore
 * the smallest honest unit, and `balance_card()` owns the wrapper.
 *
 * @since 1.1.0
 */
class RewardsRenderer {

	/**
	 * Renders the balance card, including the tier-progress slot.
	 *
	 * @since 1.1.0
	 * @param int $user_id The customer.
	 * @return string The card markup.
	 */
	public static function balance_card( $user_id ) {
		$user_id = (int) $user_id;
		$balance = LedgerService::get_instance()->get_balance( $user_id );

		$html  = '<div class="pointbay-balance-card">';
		$html .= '<div>';
		$html .= '<h3 class="pointbay-balance-card__heading">' . esc_html__( 'Current Balance', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</h3>';
		$html .= '<p class="pointbay-balance-amount"><span class="pointbay-balance-value">' . esc_html( $balance ) . '</span> <span class="pointbay-balance-unit">' . esc_html__( 'Points', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</span></p>';
		$html .= '</div>';

		ob_start();
		/**
		 * Fires inside the balance card, for a tier-progress badge or summary.
		 *
		 * An action rather than an HTML filter: each callback echoes and escapes
		 * its own markup, so nothing here has to trust — or sanitise — a string
		 * built somewhere else. Callbacks print in priority order.
		 *
		 * @since 1.0.0
		 * @hook pointbay_tier_progress
		 * @param int $user_id The current user's ID.
		 */
		do_action( 'pointbay_tier_progress', $user_id );
		$html .= ob_get_clean();

		$html .= '</div>';

		return $html;
	}

	/**
	 * Renders just the numeric balance, for compact placements.
	 *
	 * @since 1.1.0
	 * @param int $user_id The customer.
	 * @return string The balance markup.
	 */
	public static function balance( $user_id ) {
		$balance = LedgerService::get_instance()->get_balance( (int) $user_id );

		return '<span class="pointbay-balance-value">' . esc_html( $balance ) . '</span>';
	}

	/**
	 * Renders the recent-activity table.
	 *
	 * @since 1.1.0
	 * @param int $user_id The customer.
	 * @param int $limit   Optional. How many rows to show. Default 10.
	 * @return string The history markup, heading included.
	 */
	public static function history( $user_id, $limit = 10 ) {
		$user_id = (int) $user_id;
		$history = LedgerService::get_instance()->get_history( $user_id, $limit );

		$html = '<h3>' . esc_html__( 'Recent History', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</h3>';

		if ( ! empty( $history ) ) {
			$html .= '<table class="woocommerce-orders-table woocommerce-MyAccount-orders shop_table shop_table_responsive my_account_orders account-orders-table">';
			$html .= '<thead><tr><th>' . esc_html__( 'Date', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</th><th>' . esc_html__( 'Description', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</th><th>' . esc_html__( 'Points', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</th></tr></thead><tbody>';

			foreach ( $history as $row ) {
				$is_credit = $row['transaction_type'] === 'credit';
				$sign      = $is_credit ? '+' : '-';
				$modifier  = $is_credit ? 'credit' : 'debit';

				$html .= '<tr>';
				$html .= '<td><time datetime="' . esc_attr( $row['created_at'] ) . '">' . esc_html( wp_date( get_option( 'date_format' ), strtotime( $row['created_at'] ) ) ) . '</time></td>';
				$html .= '<td>' . esc_html( $row['description'] ) . '</td>';
				$html .= '<td class="pointbay-history-amount pointbay-history-amount--' . esc_attr( $modifier ) . '">' . esc_html( $sign . $row['amount'] ) . '</td>';
				$html .= '</tr>';
			}

			$html .= '</tbody></table>';
		} else {
			$html .= '<p>' . esc_html__( 'No activity yet.', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</p>';
		}

		return $html;
	}

	/**
	 * Renders whatever is hooked beneath the balance card.
	 *
	 * @since 1.1.0
	 * @param int $user_id The customer.
	 * @return string The captured markup.
	 */
	public static function after_balance( $user_id ) {
		ob_start();
		/**
		 * Fires directly beneath the balance card, before the history table.
		 *
		 * Used by this plugin to render the referral block, and available to
		 * others on the same terms: echo your own escaped markup.
		 *
		 * @since 1.0.0
		 * @hook pointbay_my_rewards_after_balance
		 * @param int $user_id The current user's ID.
		 */
		do_action( 'pointbay_my_rewards_after_balance', $user_id );

		return ob_get_clean();
	}

	/**
	 * The prompt shown to a visitor who is not logged in.
	 *
	 * The account endpoint gets its logged-in guard from WooCommerce. Shortcodes
	 * and widgets get one from nowhere, so every entry point here must supply
	 * its own — otherwise a logged-out visitor is shown a balance of zero as
	 * though it were theirs.
	 *
	 * @since 1.1.0
	 * @return string The prompt markup.
	 */
	public static function login_prompt() {
		$url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : wp_login_url();

		$prompt = sprintf(
			/* translators: %1$s: opening link tag, %2$s: closing link tag. */
			esc_html__( 'Please %1$slog in%2$s to view your rewards.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'<a href="' . esc_url( $url ) . '">',
			'</a>'
		);

		/**
		 * Filters the prompt shown to logged-out visitors on a rewards surface.
		 *
		 * @since 1.1.0
		 * @param string $html The prompt markup.
		 */
		return apply_filters( 'pointbay_rewards_login_prompt', '<p class="pointbay-login-prompt">' . $prompt . '</p>' );
	}

	/**
	 * Renders the whole rewards dashboard.
	 *
	 * @since 1.1.0
	 * @param int $user_id The customer.
	 * @param int $limit   Optional. History rows to show. Default 10.
	 * @return string The dashboard markup.
	 */
	public static function dashboard( $user_id, $limit = 10 ) {
		$user_id = (int) $user_id;

		if ( $user_id < 1 ) {
			return self::login_prompt();
		}

		$html  = '<div class="pointbay-dashboard">';
		$html .= '<h2>' . esc_html__( 'My Loyalty Rewards', 'pointbay-loyalty-points-referral-rewards-woo' ) . '</h2>';
		$html .= self::balance_card( $user_id );
		$html .= self::after_balance( $user_id );
		$html .= self::history( $user_id, $limit );
		$html .= '</div>';

		return $html;
	}
}
