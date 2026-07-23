<?php
/**
 * Database Migrations Configuration
 *
 * Register your database migration classes here. They will be executed
 * in the order listed on plugin activation, and in reverse order on uninstallation.
 *
 * @package    LoyaltyBay
 * @subpackage Config
 * @since      1.0.0
 * @author     LoyaltyBay <loyaltybay@gmail.com>
 */

// Prevent direct access.
if ( ! defined( 'WPINC' ) ) {
	die;
}

return array(
	\LoyaltyBay\Database\Migrations\CreateLedgerTable::class,
	\LoyaltyBay\Database\Migrations\CreateLedgerCacheTable::class,
	\LoyaltyBay\Database\Migrations\CreateCronLogTable::class,
);
