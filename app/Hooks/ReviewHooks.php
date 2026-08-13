<?php
/**
 * Hooks for awarding points on approved product reviews.
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
 * Registers the hooks that award loyalty points for approved product reviews.
 *
 * @since 1.0.0
 */
class ReviewHooks {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var ReviewHooks
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.0.0
	 * @return ReviewHooks
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
		// WordPress fires comment_{$new_status}_{$comment->comment_type} on approval.
		// WooCommerce stores product reviews with comment_type = 'review', so that's
		// the hook that actually fires for moderated reviews; 'comment_approved_comment'
		// is also registered defensively in case a review ever has the default type.
		$loader->add_action( 'comment_approved_review', $this, 'award_review_points', 10, 2 );
		$loader->add_action( 'comment_approved_comment', $this, 'award_review_points', 10, 2 );
		// Also catch comments that are approved on creation (status = 1). Hooked
		// to comment_post, not wp_insert_comment: WordPress fires wp_insert_comment
		// *inside* wp_insert_comment() and comment_post afterwards (see
		// wp_new_comment() in wp-includes/comment.php), and WooCommerce's own
		// rating-meta write (WC_Comments::add_comment_rating(), also on
		// comment_post, priority 1) only happens in that gap — so hooking
		// wp_insert_comment would read the 'rating' meta before WooCommerce has
		// written it. Priority 20 keeps this safely after WC's priority-1 write.
		$loader->add_action( 'comment_post', $this, 'maybe_award_on_insert', 20, 3 );
	}

	/**
	 * Award points when a product review is approved.
	 *
	 * @param int         $comment_id The comment ID.
	 * @param \WP_Comment $comment    The comment object.
	 */
	public function award_review_points( $comment_id, $comment ) {
		$this->process_review( $comment );
	}

	/**
	 * Award points if a comment is approved immediately on insertion.
	 *
	 * Hooked to comment_post, which passes the raw approval status and
	 * commentdata array rather than a WP_Comment — fetch the actual comment
	 * object for process_review() once we know it's worth processing.
	 *
	 * @param int        $comment_id       The comment ID.
	 * @param int|string $comment_approved 1 if approved, 0 if held for moderation, or 'spam'.
	 * @param array      $commentdata      The raw comment data. Unused; kept for the comment_post signature.
	 */
	public function maybe_award_on_insert( $comment_id, $comment_approved, $commentdata ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Required by the comment_post action signature.
		if ( (int) $comment_approved !== 1 ) {
			return;
		}

		$comment = get_comment( $comment_id );
		if ( $comment ) {
			$this->process_review( $comment );
		}
	}

	/**
	 * Core logic: validate and award review points.
	 *
	 * @param \WP_Comment $comment The comment object to evaluate and reward.
	 */
	private function process_review( $comment ) {
		pointbay_log( "ReviewHooks: Processing comment {$comment->comment_ID} for post {$comment->comment_post_ID} type {$comment->comment_type}", 'DEBUG' );

		// Must be a genuine product review. WooCommerce retypes *any* approved
		// comment on a product to comment_type 'review' (see WC_Comments::update_comment_type()),
		// so comment_type alone can't distinguish a review from an ordinary comment.
		// The 'rating' postmeta is only ever written for a submission that included
		// a star rating, so that's the one signal that actually gates this. Trade-off:
		// on a store where wc_review_ratings_enabled() is false, or ratings are
		// enabled but not required and the reviewer skips the stars, no 'rating'
		// meta is ever written — earning_pointsForReview then never pays out on
		// that submission. That's an accepted consequence of this gate, not a bug.
		if ( 'product' !== get_post_type( $comment->comment_post_ID ) || ! get_comment_meta( $comment->comment_ID, 'rating', true ) ) {
			return;
		}

		$user_id = (int) $comment->user_id;
		pointbay_log( "ReviewHooks: User ID: $user_id", 'DEBUG' );

		if ( ! $user_id ) {
			return; // Guest reviews do not earn points.
		}

		$settings = Settings::get_instance();
		$points   = (int) $settings->get_settings( 'earning_pointsForReview' );
		pointbay_log( "ReviewHooks: Points to award: $points", 'DEBUG' );

		if ( $points <= 0 ) {
			return;
		}

		$ledger = LedgerService::get_instance();

		// Idempotency: one credit per review comment.
		if ( $ledger->has_existing_transaction( $user_id, 'review', (int) $comment->comment_ID, 'credit' ) ) {
			pointbay_log( "ReviewHooks: Transaction already exists for comment {$comment->comment_ID}", 'DEBUG' );
			return;
		}

		$result = $ledger->credit(
			$user_id,
			$points,
			'review',
			(int) $comment->comment_ID,
			__( 'Points awarded for product review.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'system'
		);

		if ( is_wp_error( $result ) ) {
			pointbay_log( "ReviewHooks: Failed to credit {$points} points for comment {$comment->comment_ID} (user {$user_id}): " . $result->get_error_message(), 'ERROR' );
			return;
		}

		pointbay_log( "ReviewHooks: Credited $points points for comment {$comment->comment_ID}", 'DEBUG' );
	}
}
