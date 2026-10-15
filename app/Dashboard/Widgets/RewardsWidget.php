<?php
/**
 * Classic sidebar widget showing the full rewards dashboard.
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
 * Renders the rewards dashboard in a classic widget area.
 *
 * @since 1.1.0
 */
class RewardsWidget extends \WP_Widget {

	/**
	 * Registers the widget with WordPress.
	 *
	 * @since 1.1.0
	 */
	public function __construct() {
		parent::__construct(
			'pointbay_rewards_widget',
			__( 'PointBay: Rewards Summary', 'pointbay-loyalty-points-referral-rewards-woo' ),
			array( 'description' => __( 'Shows the balance and recent points activity.', 'pointbay-loyalty-points-referral-rewards-woo' ) )
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
		if ( ! is_user_logged_in() ) {
			return;
		}

		$title = ! empty( $instance['title'] ) ? $instance['title'] : __( 'My Rewards', 'pointbay-loyalty-points-referral-rewards-woo' );
		$limit = ! empty( $instance['limit'] ) ? absint( $instance['limit'] ) : 5;

		echo wp_kses_post( $args['before_widget'] );
		echo wp_kses_post( $args['before_title'] . apply_filters( 'widget_title', $title ) . $args['after_title'] );
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- RewardsRenderer returns escaped markup.
		echo RewardsRenderer::dashboard( get_current_user_id(), $limit );
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
		$title = isset( $instance['title'] ) ? $instance['title'] : __( 'My Rewards', 'pointbay-loyalty-points-referral-rewards-woo' );
		$limit = isset( $instance['limit'] ) ? absint( $instance['limit'] ) : 5;
		?>
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>"><?php esc_html_e( 'Title:', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label>
			<input class="widefat" id="<?php echo esc_attr( $this->get_field_id( 'title' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'title' ) ); ?>" type="text" value="<?php echo esc_attr( $title ); ?>" />
		</p>
		<p>
			<label for="<?php echo esc_attr( $this->get_field_id( 'limit' ) ); ?>"><?php esc_html_e( 'History rows to show:', 'pointbay-loyalty-points-referral-rewards-woo' ); ?></label>
			<input class="tiny-text" id="<?php echo esc_attr( $this->get_field_id( 'limit' ) ); ?>" name="<?php echo esc_attr( $this->get_field_name( 'limit' ) ); ?>" type="number" min="1" step="1" value="<?php echo esc_attr( $limit ); ?>" />
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
		$instance['limit'] = absint( $new_instance['limit'] );

		return $instance;
	}
}
