<?php
/**
 * Renders the loyalty points redemption UI on the classic (shortcode) checkout.
 *
 * @package LoyaltyBay
 */

namespace LoyaltyBay\Checkout;

/**
 * Renders the loyalty points redemption form and scripts on the classic checkout.
 *
 * @since 1.0.0
 */
class ClassicCheckoutUI {

	/**
	 * Register the hooks that render the redemption UI.
	 *
	 * @since 1.0.0
	 * @param \LoyaltyBay\Core\Plugin $plugin The plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'woocommerce_checkout_before_order_review', $this, 'display_redemption_form' );
		$loader->add_action( 'wp_enqueue_scripts', $this, 'enqueue_scripts' );
	}

	/**
	 * Enqueue and localize the classic checkout redemption script.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function enqueue_scripts() {
		if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
			return;
		}

		wp_enqueue_script(
			'loyaltybay-classic-checkout',
			\LOYALTYBAY_URL . 'assets/js/classic-checkout.js',
			array( 'jquery' ),
			filemtime( \LOYALTYBAY_DIR . 'assets/js/classic-checkout.js' ),
			true
		);

		$settings     = \LoyaltyBay\Core\Settings::get_instance();
		$points_value = (float) $settings->get_settings( 'redemption_pointsValue' );

		wp_localize_script(
			'loyaltybay-classic-checkout',
			'loyaltybay_checkout_data',
			array(
				'rest_url'     => esc_url_raw( rest_url( 'loyaltybay/v1/redeem' ) ),
				'nonce'        => wp_create_nonce( 'wp_rest' ),
				'points_value' => $points_value,
				'currency_sym' => get_woocommerce_currency_symbol(),
				'currency_pos' => get_option( 'woocommerce_currency_pos' ),
			)
		);
	}

	/**
	 * Output the loyalty points redemption form on the checkout page.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function display_redemption_form() {
		$user_id        = get_current_user_id();
		$manager        = RedemptionManager::get_instance();
		$max_points     = $manager->get_max_redeemable_points( $user_id );
		$applied_points = $manager->get_applied_points();

		if ( ! $user_id ) {
			return;
		}

		if ( $max_points <= 0 && $applied_points <= 0 ) {
			return;
		}

		$balance      = \LoyaltyBay\Services\LedgerService::get_instance()->get_balance( $user_id );
		$points_value = (float) \LoyaltyBay\Core\Settings::get_instance()->get_settings( 'redemption_pointsValue' );
		$max_discount = $max_points * $points_value;

		?>
		<div class="loyaltybay-redemption-wrapper" style="margin-bottom: 2em;">
			<h3 id="loyaltybay-redemption-heading"><?php esc_html_e( 'Redeem Loyalty Points', 'loyaltybay-loyalty-points-referral-rewards-woo' ); ?></h3>
			<?php if ( $applied_points > 0 ) : ?>
				<?php $applied_discount = wc_price( $applied_points * $points_value ); ?>
				<div class="woocommerce-info">
					<p>
						<?php
						// translators: 1: number of redeemed points, 2: formatted discount amount.
						printf( esc_html__( 'Awesome! You have redeemed %1$s points for a %2$s discount.', 'loyaltybay-loyalty-points-referral-rewards-woo' ), '<strong>' . esc_html( $applied_points ) . '</strong>', '<strong>' . wp_kses_post( $applied_discount ) . '</strong>' );
						?>
					</p>
					<p><button type="button" class="button" id="loyaltybay-remove-points"><?php esc_html_e( 'Remove Points', 'loyaltybay-loyalty-points-referral-rewards-woo' ); ?></button></p>
				</div>
			<?php else : ?>
				<p>
					<?php
					// translators: 1: available points balance, 2: maximum redeemable points for this order.
					printf( esc_html__( 'You have %1$s points available. (Max %2$s points for this order).', 'loyaltybay-loyalty-points-referral-rewards-woo' ), '<strong>' . esc_html( $balance ) . '</strong>', '<strong>' . esc_html( $max_points ) . '</strong>' );
					?>
				</p>
				
				<div class="loyaltybay-slider-container" style="margin-bottom: 1em;">
					<label for="loyaltybay-points-range" style="display:flex; justify-content: space-between; margin-bottom: 0.5em;">
						<span><?php esc_html_e( 'Slide to adjust points:', 'loyaltybay-loyalty-points-referral-rewards-woo' ); ?></span>
						<span>1 pt = <?php echo wp_kses_post( wc_price( $points_value ) ); ?></span>
					</label>
					<input type="range" id="loyaltybay-points-range" min="0" max="<?php echo esc_attr( $max_points ); ?>" value="<?php echo esc_attr( $max_points ); ?>" style="width: 100%; cursor: pointer;">
				</div>

				<div style="display:flex; align-items: center; flex-wrap: wrap; gap: 1em;">
					<div style="display: flex; align-items: center; gap: 0.5em;">
						<input type="number" class="input-text" id="loyaltybay-points-input" min="0" max="<?php echo esc_attr( $max_points ); ?>" value="<?php echo esc_attr( $max_points ); ?>" style="width: 100px; text-align: center;">
						<span> <?php esc_html_e( 'points for', 'loyaltybay-loyalty-points-referral-rewards-woo' ); ?> </span>
						<strong id="loyaltybay-discount-display"><?php echo wp_kses_post( wc_price( $max_discount ) ); ?></strong>
					</div>
					<button type="button" class="button alt" id="loyaltybay-apply-points"><?php esc_html_e( 'Apply Discount', 'loyaltybay-loyalty-points-referral-rewards-woo' ); ?></button>
				</div>
			<?php endif; ?>
			<div id="loyaltybay-redemption-message" class="woocommerce-error" style="display: none; margin-top: 1em;"></div>
		</div>
		<?php
	}
}
