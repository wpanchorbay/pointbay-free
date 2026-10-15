<?php
/**
 * Hooks for awarding points on ordinary blog comments.
 *
 * @package    PointBay
 * @subpackage Hooks
 * @since      1.1.0
 */

namespace PointBay\Hooks;

use PointBay\Core\Settings;
use PointBay\Models\LedgerEntry;
use PointBay\Services\LedgerService;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Awards loyalty points to logged-in users for blog comments.
 *
 * Product reviews are not handled here; see ReviewHooks and the
 * earning_pointsForReview setting.
 *
 * Rules worth knowing:
 *
 * - One credit per comment, ever. The ledger lookup plus the ledger's unique key
 *   guarantee it, so approve / unapprove / approve cycles never re-award. Restoring
 *   a comment from spam or trash after its points were reversed does not re-award
 *   either, because the original credit row still exists.
 * - Unapproving a comment does not take its points back. Only spam, trash and
 *   permanent deletion do.
 * - The daily limit counts 'comment' credit rows written today (site time). The day
 *   is the day the points are given, not the day the comment was written. Comments
 *   whose points were later clawed back still count towards the limit. Two comments
 *   landing at the same instant could both pass the check and exceed the limit by
 *   one; this race is accepted.
 *
 * @since 1.1.0
 */
class CommentHooks {

	/**
	 * Ledger reference type for a comment credit.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_COMMENT = 'comment';

	/**
	 * Ledger reference type for a comment reversal.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const REF_COMMENT_REVERSAL = 'comment_reversal';

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var CommentHooks|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return CommentHooks
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
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'comment_post', $this, 'handle_comment_post', 20, 3 );
		$loader->add_action( 'transition_comment_status', $this, 'handle_status_transition', 10, 3 );
		$loader->add_action( 'delete_comment', $this, 'handle_comment_deleted', 10, 1 );
		$loader->add_filter( 'comment_form_defaults', $this, 'add_comment_form_notice', 10, 1 );
	}

	/**
	 * Awards points for a comment on insertion.
	 *
	 * @since 1.1.0
	 * @param int        $comment_id       The comment ID.
	 * @param int|string $comment_approved 1 if approved, 0 if held for moderation, or 'spam'.
	 * @param array      $commentdata      The raw comment data. Unused; kept for the comment_post signature.
	 * @return void
	 */
	public function handle_comment_post( $comment_id, $comment_approved, $commentdata ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Required by the comment_post action signature.
		if ( 'spam' === $comment_approved ) {
			return;
		}

		if ( 1 === (int) $comment_approved || ! self::requires_approval() ) {
			$this->maybe_award( $comment_id );
		}
	}

	/**
	 * Reacts to a comment changing status.
	 *
	 * @since 1.1.0
	 * @param string      $new_status The new status.
	 * @param string      $old_status The old status. Unused.
	 * @param \WP_Comment $comment    The comment object.
	 * @return void
	 */
	public function handle_status_transition( $new_status, $old_status, $comment ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Required by the transition_comment_status action signature.
		if ( empty( $comment->comment_ID ) ) {
			return;
		}

		if ( 'approved' === $new_status ) {
			$this->maybe_award( (int) $comment->comment_ID );
		} elseif ( 'spam' === $new_status || 'trash' === $new_status ) {
			$this->maybe_reverse( (int) $comment->comment_ID );
		}
	}

	/**
	 * Reverses the points when a comment is permanently deleted.
	 *
	 * @since 1.1.0
	 * @param int|string $comment_id The comment ID.
	 * @return void
	 */
	public function handle_comment_deleted( $comment_id ) {
		$this->maybe_reverse( (int) $comment_id );
	}

	/**
	 * Adds the "earn points" notice under the logged-in-as line of the comment form.
	 *
	 * @since 1.1.0
	 * @param array $defaults The comment form defaults.
	 * @return array The filtered defaults.
	 */
	public function add_comment_form_notice( $defaults ) {
		if ( ! is_user_logged_in() || ! is_array( $defaults ) ) {
			return $defaults;
		}

		$settings = Settings::get_instance();
		$points   = (int) $settings->get_settings( 'earning_pointsForComment' );
		if ( $points <= 0 || ! $settings->get_settings( 'display_commentNoticeEnabled' ) ) {
			return $defaults;
		}

		$post = get_post();
		if ( ! $post || 'product' === $post->post_type ) {
			return $defaults;
		}

		if ( self::has_reached_daily_limit( get_current_user_id() ) ) {
			return $defaults;
		}

		if ( self::requires_approval() ) {
			/* translators: %d: number of points. */
			$message = __( 'Earn <strong>%d</strong> points when your comment is approved.', 'pointbay-loyalty-points-referral-rewards-woo' );
		} else {
			/* translators: %d: number of points. */
			$message = __( 'Earn <strong>%d</strong> points for commenting.', 'pointbay-loyalty-points-referral-rewards-woo' );
		}

		$notice = '<p class="pointbay-comment-notice">' . sprintf( $message, $points ) . '</p>';

		$defaults['logged_in_as'] = ( isset( $defaults['logged_in_as'] ) ? $defaults['logged_in_as'] : '' ) . wp_kses_post( $notice );

		return $defaults;
	}

	/**
	 * Whether the user has already received today's maximum comment awards.
	 *
	 * @since 1.1.0
	 * @param int $user_id The user ID.
	 * @return bool True when the daily limit is set and reached.
	 */
	public static function has_reached_daily_limit( $user_id ) {
		$limit = (int) Settings::get_instance()->get_settings( 'earning_commentDailyLimit' );
		if ( $limit <= 0 ) {
			return false;
		}

		global $wpdb;
		$table = ( new LedgerEntry() )->get_table();
		$since = current_time( 'Y-m-d' ) . ' 00:00:00';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; a limit guard must read live data.
		$count = (int) $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(*) FROM %i WHERE user_id = %d AND reference_type = %s AND transaction_type = %s AND created_at >= %s',
				$table,
				(int) $user_id,
				self::REF_COMMENT,
				'credit',
				$since
			)
		);

		return $count >= $limit;
	}

	/**
	 * Whether comments must be approved before they earn points.
	 *
	 * @since 1.1.0
	 * @return bool
	 */
	private static function requires_approval() {
		return (bool) Settings::get_instance()->get_settings( 'earning_commentRequireApproval' );
	}

	/**
	 * Awards points for a comment if it is eligible and not yet rewarded.
	 *
	 * @since 1.1.0
	 * @param int $comment_id The comment ID.
	 * @return void
	 */
	private function maybe_award( $comment_id ) {
		$comment = get_comment( $comment_id );
		if ( ! $comment ) {
			return;
		}

		$points = (int) Settings::get_instance()->get_settings( 'earning_pointsForComment' );
		if ( $points <= 0 ) {
			return;
		}

		$user_id = (int) $comment->user_id;
		if ( $user_id <= 0 ) {
			return; // Guests never earn.
		}

		if ( ! in_array( $comment->comment_type, array( 'comment', '' ), true ) ) {
			return;
		}

		if ( 'product' === get_post_type( $comment->comment_post_ID ) ) {
			return; // Product reviews are handled by ReviewHooks.
		}

		if ( (int) $comment->comment_parent > 0 ) {
			$parent      = get_comment( (int) $comment->comment_parent );
			$post_author = (int) get_post_field( 'post_author', $comment->comment_post_ID );
			if ( ( $parent && (int) $parent->user_id === $user_id ) || $post_author === $user_id ) {
				return; // Authors replying on their own thread do not earn.
			}
		}

		$status = (string) $comment->comment_approved;
		if ( self::requires_approval() ) {
			if ( '1' !== $status ) {
				return;
			}
		} elseif ( '1' !== $status && '0' !== $status ) {
			return; // Spam and trash never earn.
		}

		$ledger = LedgerService::get_instance();

		if ( $ledger->has_existing_transaction( $user_id, self::REF_COMMENT, $comment_id, 'credit' ) ) {
			return;
		}

		if ( self::has_reached_daily_limit( $user_id ) ) {
			return;
		}

		$result = $ledger->credit(
			$user_id,
			$points,
			self::REF_COMMENT,
			$comment_id,
			__( 'Points awarded for blog comment.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'system'
		);

		if ( is_wp_error( $result ) ) {
			pointbay_log( "CommentHooks: Failed to credit {$points} points for comment {$comment_id} (user {$user_id}): " . $result->get_error_message(), 'ERROR' );
			return;
		}

		/**
		 * Fires after points are awarded for a blog comment.
		 *
		 * @since 1.1.0
		 * @param int $user_id    The user who earned the points.
		 * @param int $comment_id The comment ID.
		 * @param int $points     The points awarded.
		 */
		do_action( 'pointbay_comment_points_awarded', $user_id, $comment_id, $points );
	}

	/**
	 * Takes back the points awarded for a comment, once.
	 *
	 * Reverses the amount actually credited, not the current setting value.
	 * The balance may go negative if the points were already spent.
	 *
	 * @since 1.1.0
	 * @param int $comment_id The comment ID.
	 * @return void
	 */
	private function maybe_reverse( $comment_id ) {
		$comment = get_comment( $comment_id );
		if ( ! $comment || (int) $comment->user_id <= 0 ) {
			return;
		}

		$user_id = (int) $comment->user_id;
		$ledger  = LedgerService::get_instance();

		$credit = $ledger->get_transaction( $user_id, self::REF_COMMENT, $comment_id, 'credit' );
		if ( ! $credit || (float) $credit->amount <= 0 ) {
			return;
		}

		if ( $ledger->has_existing_transaction( $user_id, self::REF_COMMENT_REVERSAL, $comment_id, 'debit' ) ) {
			return;
		}

		$result = $ledger->clawback(
			$user_id,
			(float) $credit->amount,
			self::REF_COMMENT_REVERSAL,
			$comment_id,
			__( 'Points reversed: blog comment was removed.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			false,
			'system'
		);

		if ( is_wp_error( $result ) ) {
			pointbay_log( "CommentHooks: Failed to reverse points for comment {$comment_id} (user {$user_id}): " . $result->get_error_message(), 'ERROR' );
		}
	}
}
