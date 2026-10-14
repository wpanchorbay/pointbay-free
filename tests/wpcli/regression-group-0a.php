<?php
/**
 * Regression checks for the Free 1.1.0 earning and redemption fixes.
 *
 * Run: wp eval-file tests/wpcli/regression-group-0a.php
 *
 * Settings are overridden in-process only (the stored option is never written).
 * Creates ZZ-QA users, products, coupons and orders, and removes them at the end.
 *
 * @package PointBay
 */

use PointBay\Core\Settings;
use PointBay\Checkout\RedemptionManager;
use PointBay\Checkout\RedemptionController;
use PointBay\Services\EarningCalculator;
use PointBay\Services\LedgerService;

$GLOBALS['zz_fail'] = 0;
function zz_check( $label, $ok, $detail = '' ) {
	if ( ! $ok ) {
		++$GLOBALS['zz_fail'];
	}
	echo ( $ok ? 'PASS' : 'FAIL' ) . ' ' . $label . ( $detail ? '  [' . $detail . ']' : '' ) . "\n";
}
function zz_settings( $over ) {
	$s   = Settings::get_instance();
	$ref = new ReflectionProperty( $s, 'settings' );
	$ref->setAccessible( true );
	$s->get_settings();
	$cur = $ref->getValue( $s );
	$ref->setValue( $s, array_merge( $cur, $over ) );
}
function zz_cart( $product, $qty = 1 ) {
	WC()->cart->empty_cart();
	WC()->session->set( 'pointbay_points_redemption', null );
	WC()->cart->add_to_cart( $product->get_id(), $qty );
	WC()->cart->calculate_totals();
}

// Isolate from Pro and other add-ons: this exercises the free defaults.
foreach ( array( 'pointbay_redemption_discount_value', 'pointbay_max_redeemable', 'pointbay_can_redeem', 'pointbay_earning_multiplier' ) as $h ) {
	remove_all_filters( $h );
}

// CampaignBay (when active) rewrites cart prices and invalidates other plugins'
// virtual coupons while its own discount applies; take it out of the picture.
foreach ( $GLOBALS['wp_filter'] as $hook_name => $hook_obj ) {
	foreach ( $hook_obj->callbacks as $prio => $cbs ) {
		foreach ( $cbs as $cb ) {
			$fn = $cb['function'];
			if ( is_array( $fn ) && is_object( $fn[0] ) && 0 === strpos( get_class( $fn[0] ), 'WpabCampaignBay' ) ) {
				remove_filter( $hook_name, $fn, $prio );
			}
		}
	}
}

$base = array(
	'redemption_mode'           => 'coupon',
	'redemption_conversionMode' => 'fixed',
	'redemption_pointsValue'    => 0.01,
	'redemption_minPoints'      => 100,
	'redemption_allowPartial'   => true,
	'redemption_hideCouponForm' => false,
	'earning_pointsPerDollar'   => 5,
	'earning_basis'             => 'subtotal',
	'earning_bands'             => array(),
	'earning_flatPointsPerOrder' => 0,
	'earning_firstOrderBonus'   => 0,
	'earning_orderStatusTrigger' => 'completed',
);
zz_settings( $base );

$uid = wp_insert_user( array( 'user_login' => 'zzqa_reg0a_' . wp_rand( 100, 999 ), 'user_pass' => wp_generate_password(), 'user_email' => 'zzqa-reg0a-' . wp_rand( 100, 999 ) . '@example.test', 'role' => 'customer' ) );
wp_set_current_user( $uid );
$ledger = LedgerService::get_instance();
$ledger->credit( $uid, 10000, 'zzqa_seed', 1, 'ZZ-QA seed' );

$product = new WC_Product_Simple();
$product->set_name( 'ZZ-QA Widget' );
$product->set_regular_price( '100' );
$product->set_tax_status( 'none' );
$product->save();

wc_load_cart();
$mgr = RedemptionManager::get_instance();
$orders = array();

// 1. Coupon-mode ceiling must not be circular.
zz_cart( $product );
$r = $mgr->apply_points_discount( $uid, 6000 );
WC()->cart->calculate_totals();
$max = $mgr->get_max_redeemable_points( $uid );
$rec = $mgr->reconcile_applied_points( $uid );
zz_check( '1 coupon mode: 6000 pts on $100 cart keeps ceiling 10000', 10000 === $max, "max=$max" );
zz_check( '1 coupon mode: reconcile keeps 6000', 6000 === $rec, "applied=$rec" );
$mgr->apply_points_discount( $uid, 10000 );
WC()->cart->calculate_totals();
zz_check( '1 coupon mode: full 10000 pts is not wiped by reconcile', 10000 === $mgr->reconcile_applied_points( $uid ) );

// 2. Hidden coupon form must not break coupon-mode redemption.
zz_settings( array( 'redemption_hideCouponForm' => true ) );
zz_cart( $product );
$mgr->apply_points_discount( $uid, 6000 );
WC()->cart->calculate_totals();
zz_check( '2 hideCouponForm + coupon mode: discount still applied', abs( (float) WC()->cart->get_discount_total() - 60 ) < 0.01, 'discount=' . WC()->cart->get_discount_total() . ' coupons=' . implode( ',', WC()->cart->get_applied_coupons() ) . ' pts=' . $mgr->get_applied_points() );
zz_check( '2 hideCouponForm: coupons reported disabled while points applied', ! wc_coupons_enabled() );
zz_settings( array( 'redemption_hideCouponForm' => false ) );

// 3. Preview basis equals award basis (cart vs the order created from it).
$coupon = new WC_Coupon();
$coupon->set_code( 'zzqa20' );
$coupon->set_discount_type( 'percent' );
$coupon->set_amount( 20 );
$coupon->save();
foreach ( array( 'coupon', 'fee' ) as $mode ) {
	foreach ( array( 'total', 'subtotal' ) as $basis ) {
		zz_settings( array( 'redemption_mode' => $mode, 'earning_basis' => $basis ) );
		zz_cart( $product );
		WC()->cart->apply_coupon( 'zzqa20' );
		$mgr->apply_points_discount( $uid, 3000 );
		WC()->cart->calculate_totals();
		$cart_basis = EarningCalculator::get_instance()->resolve_cart_basis();
		$order      = WC()->checkout()->create_order( array( 'billing_email' => 'zzqa@example.test', 'payment_method' => 'cod', 'customer_id' => $uid ) );
		$order      = wc_get_order( $order );
		$order->set_customer_id( $uid );
		$order->save();
		$orders[]    = $order->get_id();
		$order_basis = EarningCalculator::get_instance()->resolve_order_basis( $order );
		zz_check( "3 preview==award basis ($mode/$basis)", abs( $cart_basis - $order_basis ) < 0.01, "cart=$cart_basis order=$order_basis" );
	}
}
WC()->cart->empty_cart();

// 4. First-order bonus requires no earlier orders.
$calc = EarningCalculator::get_instance();
$old  = wc_create_order( array( 'customer_id' => $uid ) );
$old->set_date_created( time() - 86400 * 30 );
$old->set_status( 'completed' );
$old->save();
$orders[] = $old->get_id();
$legacy   = 0 === $ledger->count_by_reference_type( $uid, 'first_order_bonus' );
$now      = method_exists( $calc, 'is_first_order' ) ? $calc->is_first_order( $uid ) : $legacy;
zz_check( '4 customer with an earlier completed order is not "first order"', false === $now );
$fresh = wp_insert_user( array( 'user_login' => 'zzqa_fresh_' . wp_rand( 100, 999 ), 'user_pass' => wp_generate_password(), 'user_email' => 'zzqa-fresh-' . wp_rand( 100, 999 ) . '@example.test', 'role' => 'customer' ) );
zz_check( '4 brand-new customer is "first order"', method_exists( $calc, 'is_first_order' ) ? $calc->is_first_order( $fresh ) : true );

// 5. Partial redemption off is enforced server side.
zz_settings( array( 'redemption_allowPartial' => false, 'redemption_mode' => 'fee' ) );
zz_cart( $product );
$res = $mgr->apply_points_discount( $uid, 3000 );
zz_check( '5 partial off: 3000 of 10000 is rejected', is_wp_error( $res ) );
$res = $mgr->apply_points_discount( $uid, $mgr->get_max_redeemable_points( $uid ) );
zz_check( '5 partial off: the full amount is accepted', true === $res );
zz_settings( array( 'redemption_allowPartial' => true ) );

// 6. Removal is not blocked when can_redeem flips to false.
$ctl = new RedemptionController();
add_filter( 'pointbay_can_redeem', '__return_false' );
zz_check( '6 permission gate is login-only', true === $ctl->check_permission() );
zz_check( '6 removing points (0) still allowed when ineligible', true === $mgr->apply_points_discount( $uid, 0 ) );
remove_filter( 'pointbay_can_redeem', '__return_false' );

// 7a. COD cancel after a partial refund must not claw back twice.
zz_settings( array( 'earning_basis' => 'subtotal', 'redemption_mode' => 'coupon' ) );
$cod = wc_create_order( array( 'customer_id' => $uid ) );
$cod->add_product( $product, 1 );
$cod->set_payment_method( 'cod' );
$cod->calculate_totals( false );
$cod->save();
$orders[] = $cod->get_id();
$cod->update_status( 'completed' );
$awarded = (int) $ledger->sum_by_reference_types( $uid, array( 'order' ), $cod->get_id(), 'credit' );
wc_create_refund( array( 'order_id' => $cod->get_id(), 'amount' => 30 ) );
$cod = wc_get_order( $cod->get_id() );
$cod->update_status( 'cancelled' );
$rids  = array_map( function ( $r ) { return $r->get_id(); }, wc_get_order( $cod->get_id() )->get_refunds() );
$taken = (int) $ledger->sum_by_reference( $uid, 'refund', $rids, 'debit' ) + (int) $ledger->sum_by_reference( $uid, 'order_reversal', array( $cod->get_id() ), 'debit' );
zz_check( '7a COD: refund clawback + reversal never exceeds the award', $awarded > 0 && $taken === $awarded, "awarded=$awarded taken=$taken" );

// 7c. Subtotal mode: refunding shipping does not claw back product points.
$ship = wc_create_order( array( 'customer_id' => $uid ) );
$ship->add_product( $product, 1 );
$item = new WC_Order_Item_Shipping();
$item->set_method_title( 'ZZ-QA ship' );
$item->set_total( 10 );
$ship->add_item( $item );
$ship->calculate_totals( false );
$ship->save();
$orders[] = $ship->get_id();
$ship->update_status( 'completed' );
$items = $ship->get_items( 'shipping' );
$sid   = key( $items );
wc_create_refund( array( 'order_id' => $ship->get_id(), 'amount' => 10, 'line_items' => array( $sid => array( 'refund_total' => 10 ) ) ) );
$rids  = array_map( function ( $r ) { return $r->get_id(); }, wc_get_order( $ship->get_id() )->get_refunds() );
$taken = (int) $ledger->sum_by_reference( $uid, 'refund', $rids, 'debit' );
zz_check( '7c subtotal mode: shipping-only refund claws back 0', 0 === $taken, "clawed=$taken" );

// 7d. Credited action fires only after COMMIT (a second connection can see the rows).
$seen = array();
$ref_id = 990000 + wp_rand( 1, 9999 );
$cb = function ( $u, $amt, $entry ) use ( &$seen, $ref_id ) {
	$db    = new mysqli( DB_HOST, DB_USER, DB_PASSWORD, DB_NAME );
	$table = ( new PointBay\Models\LedgerEntry() )->get_table();
	$res   = $db->query( 'SELECT COUNT(*) c FROM `' . $table . '` WHERE reference_id = ' . (int) $ref_id . " AND reference_type = 'zzqa_batch'" );
	$seen[] = (int) $res->fetch_assoc()['c'];
	$db->close();
};
add_action( 'pointbay_points_credited', $cb, 10, 3 );
$ledger->credit_batch( $uid, array( array( 'amount' => 5, 'ref_type' => 'zzqa_batch', 'ref_id' => $ref_id ), array( 'amount' => 7, 'ref_type' => 'zzqa_batch2', 'ref_id' => $ref_id ) ) );
remove_action( 'pointbay_points_credited', $cb, 10 );
zz_check( '7d credited action fires after COMMIT (rows visible to another connection)', 2 === count( $seen ) && $seen[0] >= 1, 'seen=' . wp_json_encode( $seen ) );

// Cleanup.
global $wpdb;
foreach ( $orders as $oid ) {
	$o = wc_get_order( $oid );
	if ( $o ) {
		foreach ( $o->get_refunds() as $rf ) {
			$rf->delete( true );
		}
		$o->delete( true );
	}
}
$coupon->delete( true );
$product->delete( true );
$lt = ( new PointBay\Models\LedgerEntry() )->get_table();
$ct = ( new PointBay\Models\LedgerCache() )->get_table();
foreach ( array( $uid, $fresh ) as $u ) {
	$wpdb->delete( $lt, array( 'user_id' => $u ) ); // phpcs:ignore
	$wpdb->delete( $ct, array( 'user_id' => $u ) ); // phpcs:ignore
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( $u );
}
echo "\nFAILURES: {$GLOBALS['zz_fail']}\n";
