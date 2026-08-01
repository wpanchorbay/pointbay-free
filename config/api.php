<?php
/**
 * API Configuration
 *
 * Use this file to register your API controllers.
 * Each controller must extend PointBay\Api\ApiController
 * and implement get_instance() and run().
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
	\PointBay\Api\SettingsController::class,
);
