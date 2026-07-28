<?php
/**
 * Cron job runner with state tracking and retries.
 *
 * @package    LoyaltyBay
 * @subpackage Core
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace LoyaltyBay\Core;

/**
 * Executes cron jobs with full state tracking, retries and dead-lettering.
 *
 * @since      1.0.0
 * @package    LoyaltyBay
 * @subpackage LoyaltyBay/Core
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */
class CronJobRunner {

	/**
	 * Executes a cron job with full state tracking and fail-safes.
	 *
	 * @param string   $job_name The name of the job.
	 * @param callable $callback The callback to execute.
	 * @param array    $payload  Optional payload for the job.
	 * @param int      $max_retries Maximum retries before dead-lettering.
	 * @return mixed
	 */
	public static function execute( $job_name, $callback, $payload = array(), $max_retries = 3 ) {
		global $wpdb;
		$table = $wpdb->prefix . 'loyaltybay_cron_log';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; job state must be read live.
		$existing = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM %i WHERE job_name = %s AND status IN ('failed', 'running') AND retry_count < %d ORDER BY id DESC LIMIT 1",
				$table,
				$job_name,
				$max_retries
			)
		);

		if ( $existing ) {
			$log_id = $existing->id;
			// Increment atomically in SQL rather than read-modify-write in PHP, so
			// two overlapping executions of the same job_name can't both compute the
			// same retry_count and silently lose an increment.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; the atomic increment has no core API equivalent.
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE %i SET status = 'running', retry_count = retry_count + 1 WHERE id = %d",
					$table,
					$log_id
				)
			);
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table; must read back the value just written.
			$retry_count = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT retry_count FROM %i WHERE id = %d', $table, $log_id ) );
		} else {
			$payload_json = wp_json_encode( $payload );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; writes must not be cached.
			$wpdb->insert(
				$table,
				array(
					'job_name' => $job_name,
					'status'   => 'running',
					'payload'  => $payload_json,
				)
			);
			$log_id      = $wpdb->insert_id;
			$retry_count = 0;
		}

		try {
			$result = call_user_func( $callback, $payload );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; writes must not be cached.
			$wpdb->update(
				$table,
				array(
					'status'       => 'success',
					'completed_at' => current_time( 'mysql' ),
				),
				array( 'id' => $log_id )
			);

			return $result;

		} catch ( \Throwable $e ) {
			$status = ( $retry_count >= $max_retries ) ? 'dead_letter' : 'failed';

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom plugin table, no core API available; writes must not be cached.
			$wpdb->update(
				$table,
				array(
					'status'        => $status,
					'error_message' => $e->getMessage() . "\n" . $e->getTraceAsString(),
					'completed_at'  => current_time( 'mysql' ),
				),
				array( 'id' => $log_id )
			);

			loyaltybay_log( sprintf( 'Cron Job %s failed: %s', $job_name, $e->getMessage() ), 'error' );

			return false;
		}
	}
}
