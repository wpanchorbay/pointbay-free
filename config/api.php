<?php
/**
 * API Configuration
 *
 * Use this file to register your API controllers.
 * Each controller must extend LoyaltyBay\Api\ApiController
 * and implement get_instance() and run().
 *
 * @package    LoyaltyBay
 * @subpackage Config
 * @since      1.0.0
 * @author     LoyaltyBay <loyaltybay@gmail.com>
 */

return array(
	\LoyaltyBay\Api\SettingsController::class,
);
