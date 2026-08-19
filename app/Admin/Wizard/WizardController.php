<?php
/**
 * First-run setup wizard.
 *
 * Plain PHP, no build step, no REST -- multi-step query-arg navigation,
 * POST-per-step, persisted through PointBay\Core\Settings. Hidden from every
 * menu (a self-referencing parent/slug page), reached only via the
 * activation redirect, the dashboard prompt, or the "Run Setup Wizard"
 * button in Settings.
 *
 * @package    PointBay
 * @subpackage Admin
 * @since      1.1.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Admin\Wizard;

use PointBay\Core\Settings;
use WP_Error;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * First-run setup wizard.
 *
 * @since      1.1.0
 * @package    PointBay
 * @subpackage PointBay/Admin/Wizard
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class WizardController {

	const PAGE_SLUG = 'pointbay-setup-wizard';

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var   WizardController
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return WizardController
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register the hooks for the wizard.
	 *
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'admin_menu', $this, 'register_page' );
		$loader->add_action( 'admin_init', $this, 'maybe_redirect_to_wizard' );
		$loader->add_action( 'admin_init', $this, 'maybe_snooze_dashboard_prompt' );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'maybe_enqueue_assets' );
	}

	/**
	 * Register the wizard page. Self-referencing parent/slug is the
	 * standard WordPress trick for a page reachable by URL but absent from
	 * every menu -- deliberately not driven through config/admin.php's
	 * menu.sub_menus, since that array drives the *visible* menu.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function register_page() {
		add_submenu_page(
			self::PAGE_SLUG,
			__( 'PointBay Setup Wizard', 'pointbay-loyalty-points-referral-rewards-woo' ),
			__( 'Setup Wizard', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'manage_pointbay',
			self::PAGE_SLUG,
			array( $this, 'render' )
		);
	}

	/**
	 * Enqueue the wizard's plain, hand-written stylesheet -- gated on
	 * $_GET['page'] rather than a guessed $hook_suffix, since the suffix
	 * WordPress generates for a self-referencing parent/slug page isn't
	 * guaranteed without dumping it live. Also loaded on PointBay's own
	 * dashboard (Points History), since that's where render_dashboard_prompt()
	 * renders -- without this it has no styling at all there.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function maybe_enqueue_assets() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['page'] ) ? $_GET['page'] : '';
		if ( ! in_array( $page, array( self::PAGE_SLUG, \POINTBAY_PLUGIN_NAME, 'pointbay-ledger' ), true ) ) {
			return;
		}
		wp_enqueue_style( 'pointbay-setup-wizard', \POINTBAY_URL . 'assets/css/setup-wizard.css', array(), \POINTBAY_VERSION );
	}

	/**
	 * Redirect to the wizard once, right after activation.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function maybe_redirect_to_wizard() {
		if ( ! is_admin() || wp_doing_ajax() || is_network_admin() ) {
			return;
		}
		if ( ! current_user_can( 'manage_pointbay' ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['activate-multi'] ) ) {
			return;
		}
		if ( ! get_transient( 'pointbay_activation_redirect' ) ) {
			return;
		}
		delete_transient( 'pointbay_activation_redirect' );

		if ( Settings::get_instance()->get_settings( 'setup_wizard_completed' ) ) {
			return;
		}

		wp_safe_redirect( $this->wizard_url() );
		exit;
	}

	/**
	 * Handle the dashboard prompt's own "Snooze" action -- deliberately
	 * named/handled apart from the in-wizard "Skip setup" link: this one
	 * only hides the reminder for a while, it never marks the wizard
	 * complete.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function maybe_snooze_dashboard_prompt() {
		if ( ! isset( $_GET['pointbay_snooze_wizard'] ) || ! check_admin_referer( 'pointbay_snooze_wizard' ) ) {
			return;
		}
		set_transient( 'pointbay_wizard_snoozed_until', true, 2 * HOUR_IN_SECONDS );
		wp_safe_redirect( remove_query_arg( array( 'pointbay_snooze_wizard', '_wpnonce' ) ) );
		exit;
	}

	/**
	 * Render the "finish setup up" prompt embedded on PointBay's own
	 * dashboard (Admin::add_setting_root_div(), before the React mount
	 * div) -- not an admin_notices banner, so it reads as part of the page
	 * rather than a floating WP notice.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render_dashboard_prompt() {
		// Deliberately NOT using WordPress's `.notice` class here: this
		// plugin's own src/styles/index.scss hides
		// `.toplevel_page_pointbay #wpbody-content .notice` outright (to
		// keep WP-core/WooCommerce's generic notices off the React
		// dashboard), which would silently swallow this too. Custom classes
		// only, styled in assets/css/setup-wizard.css.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['pointbay_wizard_done'] ) ) {
			echo '<div class="pointbay-dashboard-notice pointbay-dashboard-notice--success"><p>' .
				esc_html__( 'PointBay is set up and ready to go!', 'pointbay-loyalty-points-referral-rewards-woo' ) .
				'</p></div>';
			return;
		}

		if ( Settings::get_instance()->get_settings( 'setup_wizard_completed' ) ) {
			return;
		}
		if ( get_transient( 'pointbay_wizard_snoozed_until' ) ) {
			return;
		}

		$snooze_url = wp_nonce_url( add_query_arg( 'pointbay_snooze_wizard', '1' ), 'pointbay_snooze_wizard' );
		?>
		<div class="pointbay-dashboard-notice">
			<p><strong><?php esc_html_e( 'Finish setting up PointBay', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></strong></p>
			<p><?php esc_html_e( 'Complete the quick setup wizard to configure how customers earn and redeem points.', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></p>
			<p>
				<a href="<?php echo esc_url( $this->wizard_url() ); ?>" class="button button-primary"><?php esc_html_e( 'Get Started', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></a>
				<a href="<?php echo esc_url( $snooze_url ); ?>" class="button"><?php esc_html_e( 'Snooze', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></a>
			</p>
		</div>
		<?php
	}

	/**
	 * Render the wizard page itself.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render() {
		if ( ! current_user_can( 'manage_pointbay' ) ) {
			wp_die( esc_html__( 'You do not have permission to access this page.', 'pointbay-loyalty-points-referral-rewards-woo' ) );
		}

		// In-wizard "Skip setup": completes immediately, applying config
		// defaults for whatever step wasn't visited (every field involved
		// already has a default in config/settings.php).
		if ( isset( $_GET['pointbay_skip'] ) && check_admin_referer( 'pointbay_wizard_skip' ) ) {
			$this->complete_wizard();
			wp_safe_redirect( $this->finish_redirect_url() );
			exit;
		}

		$steps = $this->get_steps();
		$keys  = wp_list_pluck( $steps, 'key' );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$requested_key = isset( $_GET['step'] ) ? sanitize_key( wp_unslash( $_GET['step'] ) ) : $keys[0];
		if ( ! in_array( $requested_key, $keys, true ) ) {
			$requested_key = $keys[0];
		}
		$current_index = array_search( $requested_key, $keys, true );
		$current       = $steps[ $current_index ];

		$error = null;

		if ( 'POST' === ( isset( $_SERVER['REQUEST_METHOD'] ) ? $_SERVER['REQUEST_METHOD'] : '' )
			&& isset( $_POST['pointbay_wizard_nonce'] )
			&& wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['pointbay_wizard_nonce'] ) ), 'pointbay_wizard_step_' . $current['key'] )
		) {
			$result = call_user_func( $current['process'] );

			if ( is_wp_error( $result ) ) {
				$error = $result;
			} elseif ( isset( $keys[ $current_index + 1 ] ) ) {
				wp_safe_redirect( add_query_arg( 'step', $keys[ $current_index + 1 ], $this->wizard_url() ) );
				exit;
			} else {
				// No next step in the (filtered) list -- this was Finish.
				$this->complete_wizard();
				wp_safe_redirect( $this->finish_redirect_url() );
				exit;
			}
		}

		$this->render_shell( $steps, $current, $error );
	}

	/**
	 * Render the wizard's shared chrome (step indicator, form, nonce, skip
	 * link) around one step's own field markup.
	 *
	 * @since 1.1.0
	 * @param array         $steps   All (filtered) steps, for the indicator.
	 * @param array         $current The step currently being rendered.
	 * @param WP_Error|null $error   Validation error from a failed POST, if any.
	 * @return void
	 */
	private function render_shell( $steps, $current, $error ) {
		?>
		<div class="wrap pointbay-wizard">
			<h1><?php esc_html_e( 'PointBay Setup', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></h1>

			<ol class="pointbay-wizard__steps">
				<?php foreach ( $steps as $step ) : ?>
					<li class="<?php echo ( $step['key'] === $current['key'] ) ? 'is-current' : ''; ?>">
						<?php echo esc_html( $step['label'] ); ?>
					</li>
				<?php endforeach; ?>
			</ol>

			<?php if ( $error instanceof WP_Error ) : ?>
				<div class="notice notice-error"><p><?php echo esc_html( $error->get_error_message() ); ?></p></div>
			<?php endif; ?>

			<form method="post" class="pointbay-wizard__form">
				<?php wp_nonce_field( 'pointbay_wizard_step_' . $current['key'], 'pointbay_wizard_nonce' ); ?>
				<?php call_user_func( $current['render'] ); ?>
				<?php submit_button( isset( $current['submit_label'] ) ? $current['submit_label'] : __( 'Continue', 'pointbay-loyalty-points-referral-rewards-woo' ) ); ?>
			</form>

			<?php if ( 'finish' !== $current['key'] ) : ?>
				<p>
					<a href="<?php echo esc_url( wp_nonce_url( add_query_arg( 'pointbay_skip', '1', $this->wizard_url() ), 'pointbay_wizard_skip' ) ); ?>">
						<?php esc_html_e( 'Skip setup', 'pointbay-loyalty-points-referral-rewards-woo' ); ?>
					</a>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Filters the list of steps rendered by PointBay's setup wizard.
	 *
	 * Lets an add-on (namely PointBay Pro) insert its own step into the
	 * wizard without this plugin needing any prior knowledge of it. Called
	 * fresh on every wizard page render -- never cached -- so a step
	 * registered on plugins_loaded (i.e. any normal add-on bootstrap) is
	 * always picked up. Each entry:
	 *   'key'          (string)   unique, stable identifier. 'finish' is
	 *                             reserved and MUST remain the last entry
	 *                             in the array; splice new entries in
	 *                             before it.
	 *   'label'        (string)   shown in the step indicator.
	 *   'render'       (callable) echoes this step's own <table
	 *                             class="form-table"> rows -- no wrapping
	 *                             <form>/nonce/submit button, the wizard
	 *                             shell (render_shell()) adds those.
	 *   'process'      (callable) called on this step's own verified POST;
	 *                             reads/sanitizes/saves $_POST itself and
	 *                             returns true to advance to whatever's
	 *                             next in this (filtered) array, or a
	 *                             WP_Error to redisplay the same step with
	 *                             that error message.
	 *   'submit_label' (string, optional) overrides the default "Continue"
	 *                             submit button text.
	 *
	 * @since 1.1.0
	 * @hook pointbay_setup_wizard_steps
	 * @return array The filtered array of step definitions.
	 */
	private function get_steps() {
		return apply_filters( 'pointbay_setup_wizard_steps', $this->get_default_steps() );
	}

	/**
	 * The wizard's built-in steps.
	 *
	 * @since 1.1.0
	 * @return array
	 */
	private function get_default_steps() {
		return array(
			array(
				'key'          => 'welcome',
				'label'        => __( 'Welcome', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'render'       => array( $this, 'render_welcome' ),
				'process'      => array( $this, 'process_welcome' ),
				'submit_label' => __( 'Get Started', 'pointbay-loyalty-points-referral-rewards-woo' ),
			),
			array(
				'key'     => 'earning',
				'label'   => __( 'Earning Points', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'render'  => array( $this, 'render_earning' ),
				'process' => array( $this, 'process_earning' ),
			),
			array(
				'key'     => 'redemption',
				'label'   => __( 'Redemption', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'render'  => array( $this, 'render_redemption' ),
				'process' => array( $this, 'process_redemption' ),
			),
			array(
				'key'     => 'referrals',
				'label'   => __( 'Referrals', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'render'  => array( $this, 'render_referrals' ),
				'process' => array( $this, 'process_referrals' ),
			),
			array(
				'key'          => 'finish',
				'label'        => __( 'Finish', 'pointbay-loyalty-points-referral-rewards-woo' ),
				'render'       => array( $this, 'render_finish' ),
				'process'      => array( $this, 'process_finish' ),
				'submit_label' => __( 'Go to Points History', 'pointbay-loyalty-points-referral-rewards-woo' ),
			),
		);
	}

	/**
	 * Welcome step.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render_welcome() {
		echo '<p>' . esc_html__( "Welcome to PointBay! Let's set up your loyalty program in a few quick steps.", 'pointbay-loyalty-points-referral-rewards-woo' ) . '</p>';
	}

	/**
	 * Welcome step has no fields to save.
	 *
	 * @since 1.1.0
	 * @return true
	 */
	public function process_welcome() {
		return true;
	}

	/**
	 * Earning Points step.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render_earning() {
		$settings = Settings::get_instance()->get_settings();
		?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="pointbay_earning_pointsPerDollar"><?php esc_html_e( 'Points per $1 spent', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td><input type="number" min="0" step="1" id="pointbay_earning_pointsPerDollar" name="earning_pointsPerDollar" value="<?php echo esc_attr( $settings['earning_pointsPerDollar'] ); ?>" class="small-text" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="pointbay_earning_pointsForRegistration"><?php esc_html_e( 'Points for creating an account', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td><input type="number" min="0" step="1" id="pointbay_earning_pointsForRegistration" name="earning_pointsForRegistration" value="<?php echo esc_attr( $settings['earning_pointsForRegistration'] ); ?>" class="small-text" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="pointbay_earning_pointsForReview"><?php esc_html_e( 'Points for leaving a product review', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td><input type="number" min="0" step="1" id="pointbay_earning_pointsForReview" name="earning_pointsForReview" value="<?php echo esc_attr( $settings['earning_pointsForReview'] ); ?>" class="small-text" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="pointbay_earning_orderStatusTrigger"><?php esc_html_e( 'Award points when order status becomes', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td>
					<select id="pointbay_earning_orderStatusTrigger" name="earning_orderStatusTrigger">
						<?php foreach ( array( 'completed', 'processing', 'on-hold' ) as $status ) : ?>
							<option value="<?php echo esc_attr( $status ); ?>" <?php selected( $settings['earning_orderStatusTrigger'], $status ); ?>><?php echo esc_html( ucfirst( $status ) ); ?></option>
						<?php endforeach; ?>
					</select>
				</td>
			</tr>
		</table>
		<?php
	}

	/**
	 * Save the Earning Points step.
	 *
	 * @since 1.1.0
	 * @return true
	 */
	public function process_earning() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- nonce verified centrally in render() before this is ever called.
		$order_status_trigger = isset( $_POST['earning_orderStatusTrigger'] ) ? sanitize_text_field( wp_unslash( $_POST['earning_orderStatusTrigger'] ) ) : 'completed';
		if ( ! in_array( $order_status_trigger, array( 'completed', 'processing', 'on-hold' ), true ) ) {
			$order_status_trigger = 'completed';
		}

		$data = array(
			'earning_pointsPerDollar'       => isset( $_POST['earning_pointsPerDollar'] ) ? absint( wp_unslash( $_POST['earning_pointsPerDollar'] ) ) : 0,
			'earning_pointsForRegistration' => isset( $_POST['earning_pointsForRegistration'] ) ? absint( wp_unslash( $_POST['earning_pointsForRegistration'] ) ) : 0,
			'earning_pointsForReview'       => isset( $_POST['earning_pointsForReview'] ) ? absint( wp_unslash( $_POST['earning_pointsForReview'] ) ) : 0,
			'earning_orderStatusTrigger'    => $order_status_trigger,
		);
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		$settings = Settings::get_instance()->get_settings();
		Settings::get_instance()->update_settings( array_merge( $settings, $data ) );

		return true;
	}

	/**
	 * Redemption step.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render_redemption() {
		$settings = Settings::get_instance()->get_settings();
		?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="pointbay_redemption_mode"><?php esc_html_e( 'Redemption method', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td>
					<select id="pointbay_redemption_mode" name="redemption_mode">
						<option value="fee" <?php selected( $settings['redemption_mode'], 'fee' ); ?>><?php esc_html_e( 'Discount at checkout', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></option>
						<option value="coupon" <?php selected( $settings['redemption_mode'], 'coupon' ); ?>><?php esc_html_e( 'Generate a coupon', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></option>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="pointbay_redemption_pointsValue"><?php esc_html_e( 'Value of 1 point', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td><input type="number" min="0" step="0.0001" id="pointbay_redemption_pointsValue" name="redemption_pointsValue" value="<?php echo esc_attr( $settings['redemption_pointsValue'] ); ?>" class="small-text" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="pointbay_redemption_minPoints"><?php esc_html_e( 'Minimum points required to redeem', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td><input type="number" min="0" step="1" id="pointbay_redemption_minPoints" name="redemption_minPoints" value="<?php echo esc_attr( $settings['redemption_minPoints'] ); ?>" class="small-text" /></td>
			</tr>
		</table>
		<?php
	}

	/**
	 * Save the Redemption step.
	 *
	 * @since 1.1.0
	 * @return true
	 */
	public function process_redemption() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- nonce verified centrally in render() before this is ever called.
		$mode = isset( $_POST['redemption_mode'] ) ? sanitize_text_field( wp_unslash( $_POST['redemption_mode'] ) ) : 'fee';
		if ( ! in_array( $mode, array( 'fee', 'coupon' ), true ) ) {
			$mode = 'fee';
		}

		$data = array(
			'redemption_mode'        => $mode,
			'redemption_pointsValue' => isset( $_POST['redemption_pointsValue'] ) ? floatval( wp_unslash( $_POST['redemption_pointsValue'] ) ) : 0.01,
			'redemption_minPoints'   => isset( $_POST['redemption_minPoints'] ) ? absint( wp_unslash( $_POST['redemption_minPoints'] ) ) : 100,
		);
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		$settings = Settings::get_instance()->get_settings();
		Settings::get_instance()->update_settings( array_merge( $settings, $data ) );

		return true;
	}

	/**
	 * Referrals step.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render_referrals() {
		$settings = Settings::get_instance()->get_settings();
		?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><?php esc_html_e( 'Referral program', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></th>
				<td>
					<label>
						<input type="checkbox" name="referrals_enabled" value="1" <?php checked( ! empty( $settings['referrals_enabled'] ) ); ?> />
						<?php esc_html_e( 'Reward customers for referring new customers', 'pointbay-loyalty-points-referral-rewards-woo' ); ?>
					</label>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="pointbay_referrals_bonusPoints"><?php esc_html_e( 'Bonus points per successful referral', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label></th>
				<td><input type="number" min="0" step="1" id="pointbay_referrals_bonusPoints" name="referrals_bonusPoints" value="<?php echo esc_attr( $settings['referrals_bonusPoints'] ); ?>" class="small-text" /></td>
			</tr>
		</table>
		<?php
	}

	/**
	 * Save the Referrals step.
	 *
	 * @since 1.1.0
	 * @return true
	 */
	public function process_referrals() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- nonce verified centrally in render() before this is ever called.
		$data = array(
			'referrals_enabled'     => ! empty( $_POST['referrals_enabled'] ),
			'referrals_bonusPoints' => isset( $_POST['referrals_bonusPoints'] ) ? absint( wp_unslash( $_POST['referrals_bonusPoints'] ) ) : 0,
		);
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		$settings = Settings::get_instance()->get_settings();
		Settings::get_instance()->update_settings( array_merge( $settings, $data ) );

		return true;
	}

	/**
	 * Finish step.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function render_finish() {
		echo '<p>' . esc_html__( "You're all set! PointBay is ready to start rewarding your customers.", 'pointbay-loyalty-points-referral-rewards-woo' ) . '</p>';
	}

	/**
	 * Finish step has no fields of its own -- reaching it with no further
	 * step in the array is what render() uses to complete the wizard.
	 *
	 * @since 1.1.0
	 * @return true
	 */
	public function process_finish() {
		return true;
	}

	/**
	 * Mark the wizard complete and clear any pending snooze.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	private function complete_wizard() {
		Settings::get_instance()->update_settings( 'setup_wizard_completed', true );
		delete_transient( 'pointbay_wizard_snoozed_until' );
	}

	/**
	 * The wizard page's own URL.
	 *
	 * @since 1.1.0
	 * @return string
	 */
	private function wizard_url() {
		return admin_url( 'admin.php?page=' . self::PAGE_SLUG );
	}

	/**
	 * Where Finish (and in-wizard Skip) redirect to.
	 *
	 * @since 1.1.0
	 * @return string
	 */
	private function finish_redirect_url() {
		return add_query_arg( 'pointbay_wizard_done', '1', admin_url( 'admin.php?page=' . \POINTBAY_PLUGIN_NAME ) );
	}
}
