<?php
/**
 * Settings Configuration
 *
 * This file defines the default settings and REST API validation schema for the plugin.
 *
 * Every key must appear in BOTH arrays. `sanitize_settings_object()` iterates the
 * schema's properties and skips anything it doesn't find there, so a key present
 * in `defaults` but missing from `schema` is silently dropped on every save.
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
		'earning_pointsPerDollar'         => 1,
		'earning_pointsForRegistration'   => 0,
		'earning_pointsForReview'         => 0,
		'earning_orderStatusTrigger'      => 'completed',
		'earning_basis'                   => 'total',
		'earning_flatPointsPerOrder'      => 0,
		'earning_firstOrderBonus'         => 0,
		'earning_bands'                   => array(),
		'earning_bandMode'                => 'fixed',
		'earning_multiplyFlatBonus'       => true,
		'earning_multiplyFirstOrderBonus' => false,
		'earning_reverseOnCancel'         => true,
		'earning_minCartSpend'            => 0,
		'earning_pointsForComment'        => 0,
		'earning_commentRequireApproval'  => true,
		'earning_commentDailyLimit'       => 1,
		'redemption_pointsValue'          => 0.01,
		'redemption_mode'                 => 'fee',
		'redemption_minPoints'            => 100,
		'redemption_allowPartial'         => true,
		'redemption_hideCouponForm'       => false,
		'referrals_enabled'               => false,
		'referrals_bonusPoints'           => 1000,
		'display_guestNoticeEnabled'      => true,
		'display_productNoticeEnabled'    => true,
		'display_minSpendMessage'         => 'Spend {amount} more to earn {points} points.',
		'display_commentNoticeEnabled'    => true,
		'display_menuBalanceEnabled'      => false,
		'display_menuBalanceLocation'     => 'primary',
		'display_menuBalanceFormat'       => '{points} pts',
		'display_showAdminMenu'           => true,
		'advanced_deleteAllOnUninstall'   => false,
		'debug_enableMode'                => false,
		'setup_wizard_completed'          => false,
	),
	'schema'   => array(
		'earning_pointsPerDollar'         => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 1,
		),
		'earning_pointsForRegistration'   => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_pointsForReview'         => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_orderStatusTrigger'      => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'completed',
			'enum'              => array( 'completed', 'processing', 'on-hold' ),
		),
		'earning_basis'                   => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'total',
			'enum'              => array( 'total', 'subtotal' ),
		),
		'earning_flatPointsPerOrder'      => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_firstOrderBonus'         => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_bands'                   => array(
			'type'              => 'array',
			'sanitize_callback' => array( \PointBay\Services\EarningBands::class, 'sanitize' ),
			'default'           => array(),
		),
		'earning_bandMode'                => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'fixed',
			'enum'              => array( 'fixed', 'rate' ),
		),
		'earning_multiplyFlatBonus'       => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'earning_multiplyFirstOrderBonus' => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'earning_reverseOnCancel'         => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'earning_minCartSpend'            => array(
			'type'              => 'number',
			'minimum'           => 0,
			'sanitize_callback' => array( '\\PointBay\\Services\\EarningCalculator', 'sanitize_amount' ),
			'default'           => 0,
		),
		'earning_pointsForComment'        => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'earning_commentRequireApproval'  => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'earning_commentDailyLimit'       => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 1,
		),
		'redemption_pointsValue'          => array(
			'type'              => 'number',
			'sanitize_callback' => 'floatval',
			'default'           => 0.01,
		),
		'redemption_mode'                 => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'fee',
			'enum'              => array( 'fee', 'coupon' ),
		),
		'redemption_minPoints'            => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 100,
		),
		'redemption_allowPartial'         => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'redemption_hideCouponForm'       => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'referrals_enabled'               => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'referrals_bonusPoints'           => array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 1000,
		),
		'display_guestNoticeEnabled'      => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'display_productNoticeEnabled'    => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'display_minSpendMessage'         => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => 'Spend {amount} more to earn {points} points.',
		),
		'display_commentNoticeEnabled'    => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'display_menuBalanceEnabled'      => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'display_menuBalanceLocation'     => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_key',
			'default'           => 'primary',
		),
		'display_menuBalanceFormat'       => array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '{points} pts',
		),
		'display_showAdminMenu'           => array(
			'type'    => 'boolean',
			'default' => true,
		),
		'advanced_deleteAllOnUninstall'   => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'debug_enableMode'                => array(
			'type'    => 'boolean',
			'default' => false,
		),
		'setup_wizard_completed'          => array(
			'type'    => 'boolean',
			'default' => false,
		),
	),
);
