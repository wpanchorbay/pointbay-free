<?php
/**
 * Renders the "Refer a Friend" block on the My Rewards account page.
 *
 * @package    PointBay
 * @subpackage Referrals
 * @since      1.0.0
 */

namespace PointBay\Referrals;

use PointBay\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Customer-facing referral block and the script backing its copy button.
 *
 * @since 1.0.0
 */
class ReferralDashboard {

	/**
	 * Script handle for the My Rewards behaviour.
	 */
	const HANDLE = 'pointbay-my-rewards';

	/**
	 * Singleton instance.
	 *
	 * @var ReferralDashboard|null
	 */
	private static $instance = null;

	/**
	 * Get the singleton instance.
	 *
	 * @since 1.0.0
	 * @return ReferralDashboard
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
	 * @since 1.0.0
	 * @param \PointBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'wp_enqueue_scripts', $this, 'register_assets' );
		$loader->add_action( 'pointbay_my_rewards_after_balance', $this, 'render_referral_block' );
	}

	/**
	 * Register (but do not enqueue) the My Rewards script.
	 *
	 * Registering here and enqueueing at render time means the asset can never
	 * drift out of sync with where the block actually appears, and costs
	 * nothing on every other page of the site.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_assets() {
		$path = POINTBAY_PATH . 'assets/js/my-rewards.js';
		$src  = POINTBAY_URL . 'assets/js/my-rewards.js';

		wp_register_script(
			self::HANDLE,
			$src,
			array(),
			file_exists( $path ) ? (string) filemtime( $path ) : POINTBAY_VERSION,
			true
		);

		wp_localize_script(
			self::HANDLE,
			'pointbay_my_rewards',
			array(
				'copied' => __( 'Copied!', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'failed' => __( 'Press Ctrl+C to copy', 'pointbay-loyalty-points-referral-rewards-woo' ),
			)
		);
	}

	/**
	 * Render the referral block.
	 *
	 * @since 1.0.0
	 * @param int $user_id The customer viewing the page.
	 * @return void
	 */
	public function render_referral_block( $user_id ) {
		$user_id = (int) $user_id;
		if ( ! $user_id ) {
			return;
		}

		if ( ! Settings::get_instance()->get_settings( 'referrals_enabled' ) ) {
			return;
		}

		$url = ReferralManager::get_instance()->get_referral_url( $user_id );
		if ( ! $url ) {
			return;
		}

		$bonus     = (int) Settings::get_instance()->get_settings( 'referrals_bonusPoints' );
		$input_id  = 'pointbay-referral-link';
		$status_id = 'pointbay-referral-status';

		wp_enqueue_script( self::HANDLE );
		?>
		<div class="woocommerce-info pointbay-referral-box">
			<h3><?php esc_html_e( 'Refer a Friend', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></h3>

			<?php if ( $bonus > 0 ) : ?>
				<p>
					<?php
					printf(
						/* translators: %d: number of bonus points awarded to the referrer. */
						esc_html__( 'Share this link with your friends. When they make their first purchase, you get %d bonus points!', 'pointbay-loyalty-points-referral-rewards-woo' ),
						absint( $bonus )
					);
					?>
				</p>
			<?php else : ?>
				<p><?php esc_html_e( 'Share this link with your friends.', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></p>
			<?php endif; ?>

			<div class="pointbay-referral-input-wrapper">
				<label class="screen-reader-text" for="<?php echo esc_attr( $input_id ); ?>">
					<?php esc_html_e( 'Your referral link', 'pointbay-loyalty-points-referral-rewards-woo' ); ?>
				</label>
				<input
					type="text"
					id="<?php echo esc_attr( $input_id ); ?>"
					class="pointbay-referral-input"
					readonly="readonly"
					value="<?php echo esc_url( $url ); ?>"
				/>
				<button
					type="button"
					class="button pointbay-copy-referral"
					data-pointbay-target="<?php echo esc_attr( $input_id ); ?>"
					data-pointbay-status="<?php echo esc_attr( $status_id ); ?>"
				>
					<?php esc_html_e( 'Copy URL', 'pointbay-loyalty-points-referral-rewards-woo' ); ?>
				</button>
			</div>

			<span id="<?php echo esc_attr( $status_id ); ?>" class="pointbay-referral-status" aria-live="polite"></span>
		</div>
		<?php
	}
}
