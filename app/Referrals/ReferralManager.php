<?php
/**
 * Referral link generation, capture and attribution.
 *
 * @package    PointBay
 * @subpackage Referrals
 * @since      1.1.0
 */

namespace PointBay\Referrals;

use PointBay\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Owns a customer's referral code, the link built from it, and the attribution
 * of a new registration back to the referrer who sent them.
 *
 * @since 1.1.0
 */
class ReferralManager {

	const META_REFERRAL_CODE     = 'pointbay_referral_code';
	const META_REFERRED_BY       = 'pointbay_referred_by';
	const META_REFERRAL_REWARDED = 'pointbay_referral_rewarded';
	const META_REFERRAL_ORDER_ID = 'pointbay_referral_order_id';

	/**
	 * Name of the cookie carrying a captured referral code.
	 */
	const COOKIE = 'pointbay_ref';

	/**
	 * How long a captured referral stays valid, in days.
	 */
	const COOKIE_DAYS = 30;

	/**
	 * Length of a generated referral code.
	 */
	const CODE_LENGTH = 8;

	/**
	 * Singleton instance.
	 *
	 * @var ReferralManager|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @since 1.1.0
	 * @return ReferralManager
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register hooks.
	 *
	 * `user_register` runs at 20 so it lands after RegistrationHooks (10),
	 * which credits the signup bonus for the same user.
	 *
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'init', $this, 'capture_referral_cookie' );
		$loader->add_action( 'user_register', $this, 'attach_referral_on_register', 20, 1 );
	}

	/**
	 * Whether the referral programme is switched on.
	 *
	 * @since 1.1.0
	 * @return bool
	 */
	private function is_enabled() {
		return (bool) Settings::get_instance()->get_settings( 'referrals_enabled' );
	}

	/**
	 * Get a user's referral code, generating and persisting one on first use.
	 *
	 * Codes are checked for collisions before being stored: get_user_by_code()
	 * returns the first match, so a duplicate would silently misattribute every
	 * later referral for one of the two users.
	 *
	 * @since 1.1.0
	 * @param int $user_id The user to get a code for.
	 * @return string The referral code, or '' if one could not be generated.
	 */
	public function get_referral_code( $user_id ) {
		$user_id = (int) $user_id;
		if ( $user_id <= 0 ) {
			return '';
		}

		$code = get_user_meta( $user_id, self::META_REFERRAL_CODE, true );
		if ( $code ) {
			return $code;
		}

		for ( $attempt = 0; $attempt < 5; $attempt++ ) {
			$candidate = strtoupper(
				substr( base_convert( sha1( $user_id . wp_rand() ), 16, 36 ), 0, self::CODE_LENGTH )
			);

			if ( ! $candidate || null !== $this->get_user_by_code( $candidate ) ) {
				continue;
			}

			update_user_meta( $user_id, self::META_REFERRAL_CODE, $candidate );
			return $candidate;
		}

		pointbay_log(
			sprintf( 'ReferralManager: could not generate a unique referral code for user %d.', $user_id ),
			'error'
		);

		return '';
	}

	/**
	 * Build the shareable referral URL for a user.
	 *
	 * @since 1.1.0
	 * @param int $user_id The referring user.
	 * @return string The URL, or '' when no code could be generated.
	 */
	public function get_referral_url( $user_id ) {
		$code = $this->get_referral_code( $user_id );
		if ( ! $code ) {
			return '';
		}
		return add_query_arg( 'ref', rawurlencode( $code ), home_url( '/' ) );
	}

	/**
	 * Resolve a referral code back to the user who owns it.
	 *
	 * @since 1.1.0
	 * @param string $code The referral code.
	 * @return int|null The owning user ID, or null when unknown.
	 */
	public function get_user_by_code( $code ) {
		$code = sanitize_text_field( $code );
		if ( ! $code ) {
			return null;
		}

		$users = get_users(
			array(
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- A referral code is only resolvable through user meta; the lookup is capped at one row and runs once per registration.
				'meta_key'    => self::META_REFERRAL_CODE,
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- See above.
				'meta_value'  => $code,
				'number'      => 1,
				'fields'      => 'ID',
				'count_total' => false,
			)
		);

		return ! empty( $users ) ? (int) $users[0] : null;
	}

	/**
	 * Capture a referral code from a visited link into a cookie.
	 *
	 * Gated on the feature being enabled: a disabled programme must not drop a
	 * 30-day cookie on visitors, and nothing would ever read it back.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function capture_referral_cookie() {
		if ( is_admin() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		if ( ! $this->is_enabled() || headers_sent() ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only attribution from a public marketing link; the value is sanitized and only ever compared against stored user meta.
		if ( ! isset( $_GET['ref'] ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- See above.
		$code = sanitize_text_field( wp_unslash( $_GET['ref'] ) );
		if ( ! $code ) {
			return;
		}

		setcookie(
			self::COOKIE,
			$code,
			array(
				'expires'  => time() + ( self::COOKIE_DAYS * DAY_IN_SECONDS ),
				'path'     => COOKIEPATH ? COOKIEPATH : '/',
				'domain'   => COOKIE_DOMAIN,
				'secure'   => is_ssl(),
				'httponly' => true,
				'samesite' => 'Lax',
			)
		);

		// Make it readable within this same request, before the browser echoes it back.
		$_COOKIE[ self::COOKIE ] = $code;
	}

	/**
	 * Attribute a newly registered user to the referrer who sent them.
	 *
	 * @since 1.1.0
	 * @param int $new_user_id The user that was just created.
	 * @return void
	 */
	public function attach_referral_on_register( $new_user_id ) {
		if ( ! $this->is_enabled() ) {
			return;
		}

		$code = isset( $_COOKIE[ self::COOKIE ] )
			? sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE ] ) )
			: '';

		if ( ! $code ) {
			return;
		}

		$referrer_id = $this->get_user_by_code( $code );

		// Unknown code, or someone following their own link.
		if ( ! $referrer_id || $referrer_id === (int) $new_user_id ) {
			return;
		}

		update_user_meta( $new_user_id, self::META_REFERRED_BY, $referrer_id );
	}
}
