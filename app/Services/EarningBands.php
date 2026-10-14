<?php
/**
 * Validation and lookup for order-value earning bands.
 *
 * @package PointBay
 */

namespace PointBay\Services;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sanitizes and queries the `earning_bands` setting.
 *
 * A band is a half-open money range with an award attached:
 * `array( 'id' => string, 'min' => float, 'max' => float|null, 'points' => float )`.
 * `max === null` marks the open-ended top band. Matching is `[min, max)`, so an
 * order of exactly 50.00 against bands of 0-50 and 50-100 falls in the second.
 *
 * What `points` means is decided by the `earning_bandMode` setting, not here:
 * `fixed` awards the value verbatim, `rate` treats it as points per currency unit.
 *
 * @since 1.1.0
 */
class EarningBands {

	/**
	 * Hard ceiling on the number of bands a store may configure.
	 *
	 * @since 1.1.0
	 * @var int
	 */
	const MAX_BANDS = 50;

	/**
	 * Sanitizes the raw `earning_bands` value coming from a settings save.
	 *
	 * Registered as the schema `sanitize_callback` for `earning_bands`, so this
	 * is the single authoritative gate — the admin UI sorts and warns for the
	 * operator's benefit, but nothing it does is trusted here.
	 *
	 * Rows that cannot be repaired are dropped rather than rejected wholesale,
	 * so one malformed row can never cost the operator the rest of the ladder.
	 *
	 * @since 1.1.0
	 * @param mixed $value The raw submitted value.
	 * @return array The sanitized, ascending, non-overlapping band list.
	 */
	public static function sanitize( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$rows = array();

		foreach ( $value as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			if ( ! isset( $row['min'] ) || ! is_numeric( $row['min'] ) ) {
				continue;
			}

			if ( ! isset( $row['points'] ) || ! is_numeric( $row['points'] ) ) {
				continue;
			}

			$min = max( 0.0, (float) $row['min'] );

			// An absent, empty or non-numeric max means "open ended", which is
			// how the top band is expressed. A numeric max is clamped to a
			// strictly positive width below.
			$max = null;
			if ( isset( $row['max'] ) && '' !== $row['max'] && null !== $row['max'] && is_numeric( $row['max'] ) ) {
				$max = (float) $row['max'];
			}

			if ( null !== $max && $max <= $min ) {
				continue;
			}

			$rows[] = array(
				'id'     => isset( $row['id'] ) ? sanitize_key( (string) $row['id'] ) : '',
				'min'    => $min,
				'max'    => $max,
				'points' => max( 0.0, (float) $row['points'] ),
			);
		}

		if ( ! $rows ) {
			return array();
		}

		// Sort ascending by lower bound. Open-ended rows sort last so the
		// overlap pass below can treat them uniformly.
		usort(
			$rows,
			static function ( $a, $b ) {
				if ( $a['min'] === $b['min'] ) {
					if ( null === $a['max'] ) {
						return 1;
					}
					if ( null === $b['max'] ) {
						return -1;
					}
					return $a['max'] <=> $b['max'];
				}
				return $a['min'] <=> $b['min'];
			}
		);

		$resolved = array();
		$cursor   = null;
		$seen_ids = array();

		foreach ( $rows as $row ) {
			// Once an open-ended band has been accepted, everything after it is
			// unreachable — a second open-ended row would silently shadow it.
			if ( null !== $cursor && null === $cursor['max'] ) {
				break;
			}

			if ( null !== $cursor ) {
				// Overlaps are resolved by moving this row's floor up to the
				// previous row's ceiling, rather than discarding it, so a
				// slightly-wrong ladder still behaves the way it reads.
				$row['min'] = max( $row['min'], $cursor['max'] );

				if ( null !== $row['max'] && $row['max'] <= $row['min'] ) {
					continue;
				}
			}

			if ( '' === $row['id'] || isset( $seen_ids[ $row['id'] ] ) ) {
				$row['id'] = 'band_' . count( $resolved );
			}
			$seen_ids[ $row['id'] ] = true;

			$resolved[] = $row;
			$cursor     = $row;

			if ( count( $resolved ) >= self::MAX_BANDS ) {
				break;
			}
		}

		return $resolved;
	}

	/**
	 * Finds the band covering a given money amount.
	 *
	 * @since 1.1.0
	 * @param array $bands  A sanitized band list.
	 * @param float $amount The money amount to match.
	 * @return array|null The matching band, or null when no band covers the amount.
	 */
	public static function find_for_amount( $bands, $amount ) {
		if ( ! is_array( $bands ) || ! $bands ) {
			return null;
		}

		$amount = (float) $amount;

		foreach ( $bands as $band ) {
			if ( ! isset( $band['min'] ) ) {
				continue;
			}

			if ( $amount < (float) $band['min'] ) {
				continue;
			}

			$max = isset( $band['max'] ) ? $band['max'] : null;

			if ( null === $max || $amount < (float) $max ) {
				return $band;
			}
		}

		return null;
	}
}
