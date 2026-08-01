<?php
/**
 * Database Migrations Configuration
 *
 * Register your database migration classes here. They will be executed
 * in the order listed on plugin activation, and in reverse order on uninstallation.
 *
 * @package    PointBay
 * @subpackage Config
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

// Prevent direct access.
if ( ! defined( 'WPINC' ) ) {
	die;
}

return array(
	\PointBay\Database\Migrations\CreateLedgerTable::class,
	\PointBay\Database\Migrations\CreateLedgerCacheTable::class,
	\PointBay\Database\Migrations\CreateCronLogTable::class,
);
