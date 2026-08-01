<?php
/**
 * Settings Configuration
 *
 * This file defines the default settings and REST API validation schema for the plugin.
 *
 * @package    PointBay
 * @subpackage Config
 * @since      1.0.0
 */

// Prevent direct access.
if ( ! defined( 'WPINC' ) ) {
	die;
}

return array(
	'defaults' => array(
		'earning_pointsPerDollar'       => 1,
		'earning_pointsForRegistration' => 0,
		'earning_pointsForReview'       => 0,
		'earning_orderStatusTrigger'    => 'completed',
		'redemption_pointsValue'        => 0.01,
		'redemption_mode'               => 'fee',
		'redemption_minPoints'          => 100,
		'display_guestNoticeEnabled'    => true,
		'advanced_deleteAllOnUninstall' => false,
		'debug_enableMode'              => false,
	),
	'schema'   => array(
		'earning_pointsPerDollar'       => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 1,
		),
		'earning_pointsForRegistration' => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_pointsForReview'       => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_orderStatusTrigger'    => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'completed',
		),
		'redemption_pointsValue'        => array(
			'type'              => 'number',
			'sanitize_callback' => 'floatval',
			'default'           => 0.01,
		),
		'redemption_mode'               => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'fee',
		),
		'redemption_minPoints'          => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 100,
		),
		'display_guestNoticeEnabled'    => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'advanced_deleteAllOnUninstall' => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'debug_enableMode'              => array(
			'type'    => 'boolean',
			'default' => false,
		),
	),
);
