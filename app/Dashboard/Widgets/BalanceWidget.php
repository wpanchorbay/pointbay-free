<?php
/**
 * Classic sidebar widget showing the customer's point balance.
 *
 * @package PointBay
 */

namespace PointBay\Dashboard\Widgets;

use PointBay\Dashboard\RewardsRenderer;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders the point balance in a classic widget area.
 *
 * @since 1.1.0
 */
class BalanceWidget extends \WP_Widget {

	/**
	 * Registers the widget with WordPress.
	 *
	 * @since 1.1.0
	 */
	public function __construct() {
		parent::__construct(
			'pointbay_balance_widget',
			__( 'PointBay: Points Balance', 'pointbay-loyalty-points-referral-rewards-woo' ),
			array( 'description' => __( "Shows the logged-in customer's point balance.", 'pointbay-loyalty-points-referral-rewards-woo' ) )
		);
	}

	/**
	 * Outputs the widget.
	 *
	 * @since 1.1.0
	 * @param array $args     Display arguments from the sidebar.
	 * @param array $instance The widget's saved settings.
	 * @return void
	 */
	public function widget( $args, $instance ) {
		// A balance is meaningless to a visitor with no account, and a sidebar
		// is the wrong place to ask them to log in — render nothing.
		if ( ! is_user_logged_in() ) {
			return;
		}

		$title = ! empty( $instance['title'] ) ? $instance['title'] : __( 'Your Points', 'pointbay-loyalty-points-referral-rewards-woo' );

		echo wp_kses_post( $args['before_widget'] );
		echo wp_kses_post( $args['before_title'] . apply_filters( 'widget_title', $title ) . $args['after_title'] );
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- RewardsRenderer returns escaped markup.
		echo RewardsRenderer::balance_card( get_current_user_id() );
		echo wp_kses_post( $args['after_widget'] );
	}

	/**
	 * Outputs the widget's admin form.
	 *
	 * @since 1.1.0
	 * @param array $instance The widget's saved settings.
	 * @return void
	 */
	public function form( $instance ) {
		$title = isset( $instance['title'] ) ? $instance['title'] : __( 'Your Points', 'pointbay-loyalty-points-referral-rewards-woo' );
		?>
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>"><?php esc_html_e( 'Title:', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label>
			<input class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'title' ) ); ?>" type="text" value="<?php echo esc_attr( $title ); ?>" />
		</p>
		<?php
	}

	/**
	 * Sanitizes the widget's settings on save.
	 *
	 * @since 1.1.0
	 * @param array $new_instance The submitted settings.
	 * @param array $old_instance The previously saved settings.
	 * @return array The settings to store.
	 */
	public function update( $new_instance, $old_instance ) {
		$instance          = $old_instance;
		$instance['title'] = sanitize_text_field( $new_instance['title'] );

		return $instance;
	}
}
