<?php
/**
 * Retroactive ("backfill") award of points for past orders.
 *
 * @package PointBay
 */

namespace PointBay\Services;

use PointBay\Core\Settings;
use PointBay\Hooks\OrderHooks;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Awards points for orders placed before earning was set up.
 *
 * Preview and commit run the very same decision code (`process_batch()` with
 * `$commit` false or true), so the numbers a merchant confirms are the numbers
 * that get written. Each order is credited at most once: the ledger's unique key
 * rejects a repeat, orders already awarded through the normal flow are skipped,
 * and a `_pointbay_backfilled` order meta marker is left behind.
 *
 * @since 1.1.0
 */
class BackfillService {

	/**
	 * Order meta marking an order as credited by the backfill.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const META_BACKFILLED = '_pointbay_backfilled';

	/**
	 * Order meta set once an order's existing refunds have been replayed.
	 *
	 * An order carrying META_BACKFILLED without this marker was interrupted
	 * between the award and the refund replay; a re-run finishes it.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const META_REFUNDS_DONE = '_pointbay_backfill_refunds_done';

	/**
	 * Seconds a committing batch may run before it stops early and hands the
	 * rest back to the caller (guards against PHP/proxy time-outs).
	 *
	 * @since 1.1.0
	 * @var int
	 */
	const TIME_BUDGET = 15;

	/**
	 * Whether a backfill commit is currently writing awards.
	 *
	 * @since 1.1.0
	 * @var bool
	 */
	private static $running = false;

	/**
	 * Whether the current request is a retroactive (backfill) award.
	 *
	 * Listeners of the live award hooks (customer emails, notifications, SMS,
	 * Pro bonus messages) should check this and stay silent, so a merchant who
	 * backfills hundreds of old orders does not mail customers about them.
	 *
	 * @since 1.1.0
	 * @return bool True while a backfill commit is awarding.
	 */
	public static function is_backfilling() {
		return self::$running;
	}

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var BackfillService|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return BackfillService The single instance of the service.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Order statuses that count as earning, with wc- prefix.
	 *
	 * The configured earning status plus every later happy-path status, so an
	 * order that moved on from "processing" to "completed" is still covered.
	 *
	 * @since 1.1.0
	 * @return string[] Statuses such as 'wc-completed'.
	 */
	public function qualifying_statuses() {
		$trigger = Settings::get_instance()->get_settings( 'earning_orderStatusTrigger' );
		$trigger = $trigger ? strtolower( str_replace( 'wc-', '', (string) $trigger ) ) : 'completed';

		switch ( $trigger ) {
			case 'on-hold':
				$statuses = array( 'on-hold', 'processing', 'completed' );
				break;
			case 'processing':
				$statuses = array( 'processing', 'completed' );
				break;
			default:
				$statuses = array( $trigger );
				break;
		}

		return array_map(
			static function ( $status ) {
				return 'wc-' . $status;
			},
			$statuses
		);
	}

	/**
	 * Processes one page of past orders, as a preview or for real.
	 *
	 * @since 1.1.0
	 * @param string      $start    Start date, Y-m-d, site timezone.
	 * @param string|null $end      Optional end date, Y-m-d, site timezone.
	 * @param int         $page     Page number, 1-based.
	 * @param int         $per_page Orders per page, clamped to 1-50.
	 * @param bool        $commit   Whether to write the awards. False only counts.
	 * @param int|null    $offset   Optional. Orders to skip from the start of the range. When given it replaces $page, and the batch may stop early on its time budget; continue from `next_offset`.
	 * @return array page, total_pages, total_orders, next_offset, scanned, credited_orders, points, customer_ids, skipped (guest, already_awarded, refunded, zero_points) and done.
	 */
	public function process_batch( $start, $end, $page, $per_page, $commit, $offset = null ) {
		$started  = microtime( true );
		$page     = max( 1, (int) $page );
		$per_page = max( 1, min( 50, (int) $per_page ) );
		$tz       = wp_timezone();

		$from = ( new \DateTimeImmutable( $start . ' 00:00:00', $tz ) )->getTimestamp();
		if ( $end ) {
			$to           = ( new \DateTimeImmutable( $end . ' 23:59:59', $tz ) )->getTimestamp();
			$date_created = $from . '...' . $to;
		} else {
			$date_created = '>=' . $from;
		}

		$query = array(
			'status'       => $this->qualifying_statuses(),
			'type'         => 'shop_order',
			'date_created' => $date_created,
			'orderby'      => 'date',
			'order'        => 'ASC',
			'limit'        => $per_page,
			'paginate'     => true,
		);
		if ( null !== $offset ) {
			$offset          = max( 0, (int) $offset );
			$query['offset'] = $offset;
		} else {
			$query['paged'] = $page;
		}
		$result = wc_get_orders( $query );

		$summary = array(
			'page'            => $page,
			'total_pages'     => (int) $result->max_num_pages,
			'total_orders'    => (int) $result->total,
			'next_offset'     => 0,
			'scanned'         => 0,
			'credited_orders' => 0,
			'points'          => 0,
			'customer_ids'    => array(),
			'skipped'         => array(
				'guest'           => 0,
				'already_awarded' => 0,
				'refunded'        => 0,
				'zero_points'     => 0,
			),
			'done'            => true,
		);

		foreach ( $result->orders as $order ) {
			if ( $commit && null !== $offset && $summary['scanned'] > 0 && ( microtime( true ) - $started ) > self::TIME_BUDGET ) {
				break;
			}
			++$summary['scanned'];
			$points = $this->process_order( $order, $commit, $summary['skipped'] );
			if ( $points > 0 ) {
				++$summary['credited_orders'];
				$summary['points']        += $points;
				$summary['customer_ids'][] = (int) $order->get_customer_id();
			}
		}

		$summary['customer_ids'] = array_values( array_unique( $summary['customer_ids'] ) );
		if ( null !== $offset ) {
			$summary['next_offset'] = $offset + $summary['scanned'];
			$summary['done']        = $summary['next_offset'] >= $summary['total_orders'] || 0 === $summary['scanned'];
		} else {
			$summary['next_offset'] = ( ( $page - 1 ) * $per_page ) + $summary['scanned'];
			$summary['done']        = $page >= $summary['total_pages'];
		}

		return $summary;
	}

	/**
	 * Decides one order and, when committing, awards it.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order   The order.
	 * @param bool      $commit  Whether to write the award.
	 * @param array     $skipped Skip counters, updated in place.
	 * @return int Net points the order is (or would be) credited; 0 when skipped.
	 */
	private function process_order( $order, $commit, &$skipped ) {
		$user_id = (int) $order->get_customer_id();
		if ( $user_id < 1 ) {
			++$skipped['guest'];
			return 0;
		}

		if ( $this->is_already_awarded( $order, $user_id ) ) {
			if ( $commit && $order->get_meta( self::META_BACKFILLED ) && ! $order->get_meta( self::META_REFUNDS_DONE ) ) {
				// An earlier run was interrupted after the award: finish the
				// refund replay (idempotent per refund) without crediting again.
				self::$running = true;
				try {
					$this->replay_refunds( $order );
				} finally {
					self::$running = false;
				}
			}
			++$skipped['already_awarded'];
			return 0;
		}

		if ( $this->is_fully_refunded( $order ) ) {
			++$skipped['refunded'];
			return 0;
		}

		$hooks   = OrderHooks::get_instance();
		$preview = $hooks->preview_net_award( $order, $user_id );

		if ( $preview['net'] <= 0 ) {
			++$skipped['zero_points'];
			return 0;
		}

		if ( ! $commit ) {
			return (int) $preview['net'];
		}

		self::$running = true;
		try {
			$awarded = $hooks->award_order_points(
				$order,
				$user_id,
				array(
					'retroactive' => true,
					'created_at'  => $this->order_award_datetime( $order ),
				)
			);

			if ( $awarded <= 0 ) {
				// Lost a race with another run, or the credit failed: nothing was
				// written by this call, so nothing is counted.
				++$skipped['already_awarded'];
				return 0;
			}

			// Marked straight after the award, before the refund replay, so an
			// interruption in between is recognised and finished by a re-run
			// instead of being skipped as already awarded.
			$order->update_meta_data( self::META_BACKFILLED, time() );
			$order->save_meta_data();

			$this->replay_refunds( $order );
		} finally {
			self::$running = false;
		}

		return (int) $preview['net'];
	}

	/**
	 * Replays an order's existing refunds through the live clawback, oldest first.
	 *
	 * Each refund is dated at the refund itself. The clawback is idempotent per
	 * refund id, so replaying twice never claws twice.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order The order.
	 * @return void
	 */
	private function replay_refunds( $order ) {
		$hooks   = OrderHooks::get_instance();
		$ledger  = LedgerService::get_instance();
		$refunds = $order->get_refunds();
		usort(
			$refunds,
			static function ( $a, $b ) {
				return $a->get_date_created()->getTimestamp() <=> $b->get_date_created()->getTimestamp();
			}
		);
		foreach ( $refunds as $refund ) {
			try {
				$ledger->set_created_at_override( $this->datetime_to_site( $refund->get_date_created() ) );
				$hooks->process_order_refunded( $order->get_id(), $refund->get_id() );
			} finally {
				$ledger->set_created_at_override( null );
			}
		}

		$order->update_meta_data( self::META_REFUNDS_DONE, time() );
		$order->save_meta_data();
	}

	/**
	 * Whether an order has already been awarded, normally or by an earlier run.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order   The order.
	 * @param int       $user_id The customer.
	 * @return bool True when it must not be credited again.
	 */
	private function is_already_awarded( $order, $user_id ) {
		if ( $order->get_meta( self::META_BACKFILLED ) ) {
			return true;
		}

		$ledger = LedgerService::get_instance();
		foreach ( OrderHooks::award_reference_types() as $ref_type ) {
			if ( $ledger->has_existing_transaction( $user_id, $ref_type, $order->get_id(), 'credit' ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether an order has been refunded in full.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order The order.
	 * @return bool True for a refunded status, or refunds covering the whole total.
	 */
	private function is_fully_refunded( $order ) {
		if ( 'refunded' === $order->get_status() ) {
			return true;
		}

		$decimals = (int) wc_get_price_decimals();
		$total    = round( (float) $order->get_total(), $decimals );
		if ( $total <= 0 ) {
			return false;
		}

		return round( (float) $order->get_total_refunded(), $decimals ) >= $total;
	}

	/**
	 * The moment an order's award should be dated at.
	 *
	 * @since 1.1.0
	 * @param \WC_Order $order The order.
	 * @return string Site-local 'Y-m-d H:i:s'.
	 */
	private function order_award_datetime( $order ) {
		$date = $order->get_date_completed();
		if ( ! $date ) {
			$date = $order->get_date_paid();
		}
		if ( ! $date ) {
			$date = $order->get_date_created();
		}

		return $this->datetime_to_site( $date );
	}

	/**
	 * Converts a WooCommerce date to the site-local MySQL format.
	 *
	 * @since 1.1.0
	 * @param \WC_DateTime|null $date The date.
	 * @return string|null Site-local 'Y-m-d H:i:s', or null when there is no date.
	 */
	private function datetime_to_site( $date ) {
		return $date ? wp_date( 'Y-m-d H:i:s', $date->getTimestamp() ) : null;
	}
}
