<?php
/**
 * Hooks for awarding points on user registration.
 *
 * @package    PointBay
 * @subpackage Hooks
 * @since      1.0.0
 */

namespace PointBay\Hooks;

use PointBay\Services\LedgerService;
use PointBay\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the hooks that award loyalty points on user registration.
 *
 * @since 1.0.0
 */
class RegistrationHooks {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var RegistrationHooks
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return RegistrationHooks
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers the WordPress hooks handled by this class.
	 *
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'user_register', $this, 'award_registration_points', 10, 1 );
	}

	/**
	 * Award points when a new user registers.
	 *
	 * @param int $user_id Newly created user ID.
	 */
	public function award_registration_points( $user_id ) {
		$settings = Settings::get_instance();
		$points   = (int) $settings->get_settings( 'earning_pointsForRegistration' );

		if ( $points <= 0 ) {
			return;
		}

		if ( ! EarningCalculator::user_can_earn( $user_id, 'registration' ) ) {
			return;
		}

		$result = LedgerService::get_instance()->credit(
			$user_id,
			$points,
			'registration',
			$user_id,
			__( 'Points awarded for registration.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'system'
		);

		if ( is_wp_error( $result ) ) {
			pointbay_log( "RegistrationHooks: Failed to credit {$points} registration points for user {$user_id}: " . $result->get_error_message(), 'ERROR' );
		}
	}
}
