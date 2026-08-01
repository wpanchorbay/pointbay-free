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
		// Also catch comments that are approved on creation (status = 1).
		$loader->add_action( 'wp_insert_comment', $this, 'maybe_award_on_insert', 10, 2 );
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
	 * @param int         $comment_id The comment ID.
	 * @param \WP_Comment $comment    The comment object.
	 */
	public function maybe_award_on_insert( $comment_id, $comment ) {
		if ( (int) $comment->comment_approved === 1 ) {
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

		// Must be a product review (WooCommerce stores reviews as comments on products).
		if ( 'review' !== $comment->comment_type && get_post_type( $comment->comment_post_ID ) !== 'product' ) {
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

		$ledger->credit(
			$user_id,
			$points,
			'review',
			(int) $comment->comment_ID,
			__( 'Points awarded for product review.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			'system'
		);
		pointbay_log( "ReviewHooks: Credited $points points for comment {$comment->comment_ID}", 'DEBUG' );
	}
}
