<?php
/**
 * Core Configuration
 *
 * Use this file to register your Core classes that need to be initialized.
 * Each class should implement a run($loader) method or similar logic
 * to register its hooks with the Loader.
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
	\PointBay\Admin\Admin::class,
	\PointBay\Core\Settings::class,
	\PointBay\Core\Cron::class,
	\PointBay\Hooks\OrderHooks::class,
	\PointBay\Checkout\FeeRedemption::class,
	\PointBay\Checkout\CouponRedemption::class,
	\PointBay\Checkout\CheckoutProcessor::class,
	\PointBay\Checkout\RedemptionController::class,
	\PointBay\Checkout\ClassicCheckoutUI::class,
	\PointBay\Hooks\RegistrationHooks::class,
	\PointBay\Hooks\ReviewHooks::class,
	\PointBay\Dashboard\MyRewardsEndpoint::class,
	\PointBay\Referrals\ReferralManager::class,
	\PointBay\Referrals\ReferralProcessor::class,
	\PointBay\Referrals\ReferralDashboard::class,
	\PointBay\Admin\LedgerController::class,
	\PointBay\Admin\UserPointsController::class,
	\PointBay\Checkout\GuestNotice::class,
	\PointBay\Checkout\EarnNotice::class,
	\PointBay\Checkout\BlockCheckoutUI::class,
	\PointBay\Checkout\BlockCartUI::class,
);
