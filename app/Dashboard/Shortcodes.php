<?php
/**
 * Shortcodes for placing the rewards UI anywhere on the site.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard;

use PointBay\Referrals\ReferralManager;
use PointBay\Core\Settings;
use PointBay\Checkout\EarnNotice;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the customer-facing shortcodes.
 *
 * Every callback returns a string built by RewardsRenderer, so a shortcode and
 * the My Account tab cannot drift apart. Each one handles the logged-out case
 * explicitly: unlike the account endpoint, a shortcode can be dropped on any
 * page a visitor can reach.
 *
 * @since 1.1.0
 */
class Shortcodes {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var Shortcodes|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return Shortcodes
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers the hooks handled by this class.
	 *
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'init', $this, 'register_shortcodes' );
	}

	/**
	 * Registers each shortcode tag.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function register_shortcodes() {
		/**
		 * Filters the shortcodes PointBay registers.
		 *
		 * Keyed by tag, valued by callable. An add-on can register its own
		 * rewards shortcode here rather than calling add_shortcode() separately,
		 * which keeps the whole set discoverable in one place.
		 *
		 * @since 1.1.0
		 * @param array $shortcodes Map of shortcode tag to callback.
		 */
		$shortcodes = apply_filters(
			'pointbay_shortcodes',
			array(
				'pointbay_balance'       => array( $this, 'render_balance' ),
				'pointbay_rewards'       => array( $this, 'render_rewards' ),
				'pointbay_history'       => array( $this, 'render_history' ),
				'pointbay_referral_link' => array( $this, 'render_referral_link' ),
				'pointbay_earn_notice'   => array( $this, 'render_earn_notice' ),
			)
		);

		foreach ( $shortcodes as $tag => $callback ) {
			if ( is_callable( $callback ) ) {
				add_shortcode( $tag, $callback );
			}
		}
	}

	/**
	 * `[pointbay_balance]` — the customer's point balance.
	 *
	 * @since 1.1.0
	 * @param array $atts Shortcode attributes.
	 * @return string The rendered markup.
	 */
	public function render_balance( $atts ) {
		$atts = shortcode_atts( array( 'format' => 'number' ), $atts, 'pointbay_balance' );

		if ( ! is_user_logged_in() ) {
			return RewardsRenderer::login_prompt();
		}

		$user_id = get_current_user_id();

		if ( 'full' === $atts['format'] ) {
			return RewardsRenderer::balance_card( $user_id );
		}

		return RewardsRenderer::balance( $user_id );
	}

	/**
	 * `[pointbay_rewards]` — the whole rewards dashboard.
	 *
	 * @since 1.1.0
	 * @param array $atts Shortcode attributes.
	 * @return string The rendered markup.
	 */
	public function render_rewards( $atts ) {
		$atts = shortcode_atts( array( 'history' => 10 ), $atts, 'pointbay_rewards' );

		return RewardsRenderer::dashboard( get_current_user_id(), (int) $atts['history'] );
	}

	/**
	 * `[pointbay_history]` — the recent activity table.
	 *
	 * @since 1.1.0
	 * @param array $atts Shortcode attributes.
	 * @return string The rendered markup.
	 */
	public function render_history( $atts ) {
		$atts = shortcode_atts( array( 'limit' => 10 ), $atts, 'pointbay_history' );

		if ( ! is_user_logged_in() ) {
			return RewardsRenderer::login_prompt();
		}

		return RewardsRenderer::history( get_current_user_id(), (int) $atts['limit'] );
	}

	/**
	 * `[pointbay_referral_link]` — the customer's referral link.
	 *
	 * @since 1.1.0
	 * @return string The rendered markup.
	 */
	public function render_referral_link() {
		if ( ! Settings::get_instance()->get_settings( 'referrals_enabled' ) ) {
			return '';
		}

		if ( ! is_user_logged_in() ) {
			return RewardsRenderer::login_prompt();
		}

		$url = ReferralManager::get_instance()->get_referral_url( get_current_user_id() );

		if ( ! $url ) {
			return '';
		}

		return '<span class="pointbay-referral-link"><input type="text" readonly value="' . esc_attr( $url ) . '" /></span>';
	}

	/**
	 * `[pointbay_earn_notice]` — what the current cart would earn.
	 *
	 * @since 1.1.0
	 * @return string The rendered markup.
	 */
	public function render_earn_notice() {
		if ( ! is_user_logged_in() ) {
			return '';
		}

		$notice = new EarnNotice();
		$points = $notice->get_notice_points();

		if ( $points <= 0 ) {
			return '';
		}

		ob_start();
		$notice->render( $points );
		return ob_get_clean();
	}
}
