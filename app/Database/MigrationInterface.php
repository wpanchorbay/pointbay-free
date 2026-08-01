<?php
/**
 * Database Migration Interface.
 *
 * @package    PointBay
 * @subpackage Database
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

namespace PointBay\Database;

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
