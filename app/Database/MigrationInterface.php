<?php
/**
 * Database Migration Interface.
 *
 * @package    LoyaltyBay
 * @subpackage Database
 * @since      1.0.0
 * @author     LoyaltyBay <loyaltybay@gmail.com>
 */

namespace LoyaltyBay\Database;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface MigrationInterface {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up();

	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down();
}
