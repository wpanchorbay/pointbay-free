<?php
/**
 * Hooks for awarding points on user registration.
 *
 * @package    LoyaltyBay
 * @subpackage Hooks
 * @since      1.0.0
 */

namespace LoyaltyBay\Hooks;

use LoyaltyBay\Services\LedgerService;
use LoyaltyBay\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class RegistrationHooks {

	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

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

		LedgerService::get_instance()->credit(
			$user_id,
			$points,
			'registration',
			$user_id,
			__( 'Points awarded for registration.', 'loyaltybay' ),
			'system'
		);
	}
}
