<?php
/**
 * Core Configuration
 *
 * Use this file to register your Core classes that need to be initialized.
 * Each class should implement a run($loader) method or similar logic
 * to register its hooks with the Loader.
 *
 * @package    LoyaltyBay
 * @subpackage Config
 * @since      1.0.0
 * @author     WPAnchorBay <https://wpanchorbay.com>
 */

// Prevent direct access.
if ( ! defined( 'WPINC' ) ) {
	die;
}

return array(
	\LoyaltyBay\Admin\Admin::class,
	\LoyaltyBay\Core\Settings::class,
	\LoyaltyBay\Core\Cron::class,
	\LoyaltyBay\Hooks\OrderHooks::class,
	\LoyaltyBay\Checkout\FeeRedemption::class,
	\LoyaltyBay\Checkout\CouponRedemption::class,
	\LoyaltyBay\Checkout\CheckoutProcessor::class,
	\LoyaltyBay\Checkout\RedemptionController::class,
	\LoyaltyBay\Checkout\ClassicCheckoutUI::class,
	\LoyaltyBay\Hooks\RegistrationHooks::class,
	\LoyaltyBay\Hooks\ReviewHooks::class,
	\LoyaltyBay\Dashboard\MyRewardsEndpoint::class,
	\LoyaltyBay\Admin\LedgerController::class,
	\LoyaltyBay\Admin\UserPointsController::class,
	\LoyaltyBay\Checkout\GuestNotice::class,
	\LoyaltyBay\Checkout\EarnNotice::class,
	\LoyaltyBay\Checkout\BlockCheckoutUI::class,
	\LoyaltyBay\Checkout\BlockCartUI::class,
);
