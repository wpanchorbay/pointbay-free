<?php
/**
 * Reusable functions.
 *
 * @package    LoyaltyBay
 * @since 1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}





if ( ! function_exists( 'loyaltybay_log' ) ) {
	/**
	 * Log a message through the WooCommerce logging system.
	 *
	 * Entries are written by WooCommerce under the 'loyaltybay' source and are
	 * viewable in WooCommerce > Status > Logs. WooCommerce owns the storage
	 * location, file rotation and retention, so the plugin keeps no log files
	 * of its own.
	 *
	 * Messages are only recorded when the 'debug_enableMode' setting is on,
	 * except for the 'error' level, which is always recorded.
	 *
	 * @since 1.0.0
	 * @param mixed  $message The message to log. Arrays/objects are JSON encoded.
	 * @param string $level   A PSR-3 log level (e.g. 'debug', 'info', 'error').
	 * @return void
	 */
	function loyaltybay_log( $message, $level = 'INFO' ) {
		$level_lower = is_string( $level ) ? strtolower( $level ) : 'info';

		$enable_logging = LoyaltyBay\Core\Settings::get_instance()->get_settings( 'debug_enableMode' );
		if ( ! $enable_logging && $level_lower !== 'error' ) {
			return;
		}

		// WooCommerce is a hard requirement, but logging can be reached before
		// WooCommerce has loaded, so degrade to a no-op rather than fatal.
		if ( ! function_exists( 'wc_get_logger' ) ) {
			return;
		}

		$valid_levels = array( 'emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug' );
		if ( ! in_array( $level_lower, $valid_levels, true ) ) {
			$level_lower = 'info';
		}

		if ( is_array( $message ) || is_object( $message ) ) {
			$message = wp_json_encode( $message );
		}

		wc_get_logger()->log(
			$level_lower,
			(string) $message,
			array( 'source' => \LOYALTYBAY_TEXT_DOMAIN )
		);
	}
}


if ( ! function_exists( 'loyaltybay_get_value' ) ) {
	/**
	 * Safely retrieve a value from a nested array or object using dot notation.
	 * Returns default if key is missing OR if value is an empty string.
	 *
	 * @since 1.0.0
	 * @param array|object $target  The array or object to search.
	 * @param string|array $key     The key path (e.g., 'settings.color').
	 * @param mixed        $default_val The default value if key is not found.
	 * @return mixed
	 */
	function loyaltybay_get_value( $target, $key, $default_val = null ) {
		if ( is_null( $key ) || ( is_string( $key ) && trim( $key ) === '' ) ) {
			return $default_val;
		}

		$keys = is_array( $key ) ? $key : explode( '.', $key );

		foreach ( $keys as $segment ) {
			if ( is_array( $target ) && isset( $target[ $segment ] ) ) {
				$target = $target[ $segment ];
			} elseif ( is_object( $target ) && isset( $target->{$segment} ) ) {
				$target = $target->{$segment};
			} else {
				return $default_val;
			}
		}

		if ( $target === '' ) {
			return $default_val;
		}

		return $target;
	}
}
