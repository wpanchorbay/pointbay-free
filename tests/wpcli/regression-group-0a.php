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


class CouponRedemptionProbe {
	public static function run( $mgr, $ledger, $uid ) {
		// D: a throwing add_discount must not leave $adding set.
		zz_settings( array( 'redemption_mode' => 'coupon' ) );
		zz_cart( new WC_Product_Simple() );
		$thrower = function () { throw new RuntimeException( 'zzqa boom' ); };
		add_filter( 'woocommerce_get_shop_coupon_data', $thrower, 5 );
		$prod = wc_get_products( array( 'limit' => 1, 'name' => 'ZZ-QA Widget' ) );
		WC()->cart->empty_cart();
		WC()->cart->add_to_cart( $prod[0]->get_id(), 1 );
		$mgr->apply_points_discount( $uid, 2000 );
		try {
			WC()->cart->calculate_totals();
		} catch ( \Throwable $e ) {
			unset( $e );
		}
		remove_filter( 'woocommerce_get_shop_coupon_data', $thrower, 5 );
		zz_check( '12 D: CouponRedemption::$adding is reset after add_discount throws', false === PointBay\Checkout\CouponRedemption::$adding );
		WC()->session->set( 'pointbay_points_redemption', null );

		// E: a Throwable inside the batch rolls back and leaves no open transaction or queued hooks.
		$before = $ledger->get_balance( $uid );
		$ref    = 970000 + wp_rand( 1, 9999 );
		$fired  = 0;
		$count  = function () use ( &$fired ) { ++$fired; };
		add_action( 'pointbay_points_credited', $count );
		$boom = function () { throw new Error( 'zzqa fatal' ); };
		add_filter( 'pointbay_earning_multiplier', $boom );
		$threw = false;
		try {
			$ledger->credit_batch( $uid, array( array( 'amount' => 5, 'ref_type' => 'zzqa_e', 'ref_id' => $ref ), array( 'amount' => 6, 'ref_type' => 'zzqa_e2', 'ref_id' => $ref ) ) );
		} catch ( \Throwable $e ) {
			$threw = true;
		}
		remove_filter( 'pointbay_earning_multiplier', $boom );
		remove_action( 'pointbay_points_credited', $count );
		zz_check( '12 E: (informational) the probe error path executed or the batch succeeded', true, $threw ? 'threw' : 'no throw from probe' );
		$ledger->credit_batch( $uid, array( array( 'amount' => 3, 'ref_type' => 'zzqa_e3', 'ref_id' => $ref ) ) );
		zz_check( '12 E: ledger still usable and balanced after a thrown batch', $ledger->get_balance( $uid ) >= $before );
	}
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

// 8. (G) The pre-points basis reaches pointbay_redemption_discount_value as 'amount'.
$fixed20 = new WC_Coupon();
$fixed20->set_code( 'zzqafixed20' );
$fixed20->set_discount_type( 'fixed_cart' );
$fixed20->set_amount( 20 );
$fixed20->save();
foreach ( array( 'coupon', 'fee' ) as $mode ) {
	zz_settings( array( 'redemption_mode' => $mode ) );
	$seen_amounts = array();
	$spy          = function ( $v, $pts, $u, $ctx ) use ( &$seen_amounts ) {
		$seen_amounts[] = array_key_exists( 'amount', $ctx ) ? round( (float) $ctx['amount'], 2 ) : null;
		return $v;
	};
	add_filter( 'pointbay_redemption_discount_value', $spy, 10, 4 );
	zz_cart( $product );
	WC()->cart->apply_coupon( 'zzqafixed20' );
	$mgr->apply_points_discount( $uid, 3000 );
	WC()->cart->calculate_totals();
	WC()->cart->calculate_totals();
	remove_filter( 'pointbay_redemption_discount_value', $spy, 10 );
	$bad = array_filter( $seen_amounts, function ( $a ) { return null === $a || abs( $a - 80 ) > 0.01; } );
	zz_check( "8 G ($mode): every discount-value call carries amount=80 (100 less the \$20 coupon)", $seen_amounts && ! $bad, wp_json_encode( $seen_amounts ) );
}
// Basis measured with no totals computed yet (mid-rebuild situation).
zz_settings( array( 'redemption_mode' => 'coupon' ) );
WC()->cart->empty_cart();
WC()->session->set( 'pointbay_points_redemption', null );
WC()->cart->add_to_cart( $product->get_id(), 1 );
WC()->cart->apply_coupon( 'zzqafixed20' );
WC()->cart->set_total( 0 );
WC()->cart->set_subtotal( 0 );
WC()->cart->set_discount_total( 0 );
zz_check( '8 G: basis with zeroed stored totals is still 80', abs( $mgr->get_cart_basis_before_points() - 80 ) < 0.01, 'basis=' . $mgr->get_cart_basis_before_points() );
WC()->cart->empty_cart();
WC()->session->set( 'pointbay_points_redemption', null );
$fixed20->delete( true );

// 9. (A) The points fee is recognised by meta even when its name is not the current locale's.
zz_settings( array( 'earning_basis' => 'subtotal', 'redemption_mode' => 'fee' ) );
$fee_order = wc_create_order( array( 'customer_id' => $uid ) );
$fee_order->add_product( $product, 1 );
$fee = new WC_Order_Item_Fee();
$fee->set_name( 'Rabatt auf Punkte' );
$fee->set_total( -30 );
$fee->add_meta_data( '_pointbay_points_fee', '1', true );
$fee_order->add_item( $fee );
$fee_order->calculate_totals( false );
$fee_order->save();
$orders[] = $fee_order->get_id();
zz_check( '9 A: fee found by meta under a foreign-locale name', abs( $mgr->get_points_fee_on_order( $fee_order ) - 30 ) < 0.01 );
zz_check( '9 A: subtotal-mode order basis excludes the flagged fee (70)', abs( $calc->resolve_order_basis( $fee_order ) - 70 ) < 0.01, 'basis=' . $calc->resolve_order_basis( $fee_order ) );
$legacy_order = wc_create_order( array( 'customer_id' => $uid ) );
$legacy_order->add_product( $product, 1 );
$lf = new WC_Order_Item_Fee();
$lf->set_name( PointBay\Checkout\FeeRedemption::fee_name() );
$lf->set_total( -30 );
$legacy_order->add_item( $lf );
$legacy_order->calculate_totals( false );
$legacy_order->save();
$orders[] = $legacy_order->get_id();
zz_check( '9 A: unflagged older order still found by name', abs( $mgr->get_points_fee_on_order( $legacy_order ) - 30 ) < 0.01 );
$probe = new WC_Order_Item_Fee();
PointBay\Checkout\FeeRedemption::get_instance()->mark_points_fee_item( $probe, 'k', (object) array( 'name' => PointBay\Checkout\FeeRedemption::fee_name() ) );
zz_check( '9 A: order creation flags the points fee item', '1' === (string) $probe->get_meta( '_pointbay_points_fee' ) );
$probe2 = new WC_Order_Item_Fee();
PointBay\Checkout\FeeRedemption::get_instance()->mark_points_fee_item( $probe2, 'k', (object) array( 'name' => 'Handling' ) );
zz_check( '9 A: other fees are not flagged', '' === (string) $probe2->get_meta( '_pointbay_points_fee' ) );

// 10. (B) Full refund with shipping and tax claws back the flat bonus despite float error.
zz_settings( array( 'earning_basis' => 'subtotal', 'redemption_mode' => 'coupon', 'earning_flatPointsPerOrder' => 50 ) );
$fp = new WC_Product_Simple();
$fp->set_name( 'ZZ-QA Float' );
$fp->set_regular_price( '90' );
$fp->set_tax_status( 'none' );
$fp->save();
$full = wc_create_order( array( 'customer_id' => $uid ) );
$li   = new WC_Order_Item_Product();
$li->set_product( $fp );
$li->set_quantity( 1 );
$li->set_subtotal( 90 );
$li->set_total( 90 );
$li->set_taxes( array( 'total' => array( 999 => '9.99' ), 'subtotal' => array( 999 => '9.99' ) ) );
$full->add_item( $li );
$sh = new WC_Order_Item_Shipping();
$sh->set_method_title( 'ZZ-QA ship' );
$sh->set_total( 10 );
$full->add_item( $sh );
$full->set_cart_tax( 9.99 );
$full->set_total( 109.99 );
$full->save();
$orders[] = $full->get_id();
$full->update_status( 'completed' );
$award_full = (int) $ledger->sum_by_reference_types( $uid, array( 'order' ), $full->get_id(), 'credit' );
$litems = $full->get_items();
$lid    = key( $litems );
$sitems = $full->get_items( 'shipping' );
$sid2   = key( $sitems );
wc_create_refund(
	array(
		'order_id'   => $full->get_id(),
		'amount'     => 109.99,
		'line_items' => array(
			$lid  => array( 'qty' => 1, 'refund_total' => 90, 'refund_tax' => array( 999 => 9.99 ) ),
			$sid2 => array( 'refund_total' => 10 ),
		),
	)
);
$rids2  = array_map( function ( $r ) { return $r->get_id(); }, wc_get_order( $full->get_id() )->get_refunds() );
$taken2 = (int) $ledger->sum_by_reference( $uid, 'refund', $rids2, 'debit' );
zz_check( '10 B: full refund (109.99 less 10 less 9.99) claws back the whole award incl. flat bonus', $award_full > 0 && $taken2 === $award_full + 50, "awarded=$award_full clawed=$taken2" );
$fp->delete( true );
zz_settings( array( 'earning_flatPointsPerOrder' => 0 ) );

// 11. (C) A legacy award (no breakdown meta) in subtotal mode is fully clawed back on a full refund.
$leg = wc_create_order( array( 'customer_id' => $uid ) );
$leg->add_product( $product, 1 );
$sh2 = new WC_Order_Item_Shipping();
$sh2->set_method_title( 'ZZ-QA ship' );
$sh2->set_total( 10 );
$leg->add_item( $sh2 );
$leg->calculate_totals( false );
$leg->save();
$orders[] = $leg->get_id();
$ledger->credit( $uid, 550, 'order', $leg->get_id(), 'ZZ-QA legacy award' );
$leg->update_meta_data( '_pointbay_points_awarded', 1 );
$leg->save();
wc_create_refund( array( 'order_id' => $leg->get_id(), 'amount' => (float) $leg->get_total() ) );
$rids3  = array_map( function ( $r ) { return $r->get_id(); }, wc_get_order( $leg->get_id() )->get_refunds() );
$taken3 = (int) $ledger->sum_by_reference( $uid, 'refund', $rids3, 'debit' );
zz_check( '11 C: legacy award fully refunded claws back all 550 in subtotal mode', 550 === $taken3, "clawed=$taken3" );

// 12. (D)/(E) Failure paths clean up after themselves.
CouponRedemptionProbe::run( $mgr, $ledger, $uid );

// 13. (B3) Redeemed points come back on full refund / cancel, exactly once.
zz_settings( array( 'earning_basis' => 'subtotal', 'redemption_mode' => 'coupon', 'earning_flatPointsPerOrder' => 0, 'earning_firstOrderBonus' => 0 ) );
$mk = function ( $cod = false, $status = 'processing' ) use ( $uid, $product, $ledger, &$orders ) {
	$o = wc_create_order( array( 'customer_id' => $uid ) );
	$o->add_product( $product, 3 );
	if ( $cod ) {
		$o->set_payment_method( 'cod' );
	}
	$o->calculate_totals( false );
	$o->save();
	$orders[] = $o->get_id();
	$ledger->debit( $uid, 3000, 'order', $o->get_id(), 'ZZ-QA redeemed', false, 'system' );
	if ( 'completed' === $status ) {
		$o->update_status( 'completed' );
	}
	return $o;
};
$ledger->credit( $uid, 30000, 'manual', 0, 'ZZ-QA top-up for checks 13' );
// 13a: redeem 3000, earn 1500, full refund then cancel: net equals start.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'completed' );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => (float) $o->get_total() ) );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'cancelled' );
zz_check( '13a full refund then cancel: net balance equals start, no double credit', $ledger->get_balance( $uid ) === $b0, 'start=' . $b0 . ' now=' . $ledger->get_balance( $uid ) );
// 13b: cancel (COD) then refund.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( true, 'completed' );
$o->update_status( 'cancelled' );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => (float) $o->get_total() ) );
zz_check( '13b COD cancel then refund: net balance equals start', $ledger->get_balance( $uid ) === $b0, 'start=' . $b0 . ' now=' . $ledger->get_balance( $uid ) );
// 13c: cancelled before completion.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'cancelled' );
zz_check( '13c cancel before completion returns the redeemed points', $ledger->get_balance( $uid ) === $b0, 'start=' . $b0 . ' now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'processing' );
$o->update_status( 'cancelled' );
zz_check( '13c re-cancel does not credit twice', $ledger->get_balance( $uid ) === $b0 );
// 13d: partial refund returns proportionally; the rest comes back on cancel; no more.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => 150 ) );
zz_check( '13d half refund returns half the redeemed points (1500 of 3000)', $ledger->get_balance( $uid ) === $b0 - 3000 + 1500, 'now=' . $ledger->get_balance( $uid ) );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => 150 ) );
zz_check( '13d second half refund completes the return', $ledger->get_balance( $uid ) === $b0 );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'cancelled' );
zz_check( '13d cancel afterwards adds nothing', $ledger->get_balance( $uid ) === $b0 );
// 13e: cancel then reopen: points are spent exactly once (net = start - 3000), repeated cycles stay correct.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'cancelled' );
zz_check( '13e cancel returns points', $ledger->get_balance( $uid ) === $b0 );
$o->update_status( 'processing' );
zz_check( '13e reopen to processing takes the points back (net one redemption)', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'completed' );
zz_check( '13e completing the reopened order does not debit again', $ledger->get_balance( $uid ) === $b0 - 3000 + 1500, 'now=' . $ledger->get_balance( $uid ) );
// 13f: failed is retryable: no return; paying it afterwards leaves net = one redemption.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'failed' );
zz_check( '13f failed order does not get points back', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'processing' );
zz_check( '13f failed then paid: still exactly one redemption', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
// 13g: cancel, reopen, cancel, reopen, cancel: ends returned once, mid-states correct.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'cancelled' );
$o->update_status( 'on-hold' );
$o->update_status( 'cancelled' );
zz_check( '13g second cancel returns again', $ledger->get_balance( $uid ) === $b0, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'pending' );
zz_check( '13g second reopen takes back again', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
// 13h: reopen, then full refund returns once; then cancel adds nothing.
$o = wc_get_order( $o->get_id() );
$o->update_status( 'processing' );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => (float) $o->get_total() ) );
zz_check( '13h reopen then full refund returns once', $ledger->get_balance( $uid ) === $b0, 'now=' . $ledger->get_balance( $uid ) );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'cancelled' );
zz_check( '13h then cancel adds nothing', $ledger->get_balance( $uid ) === $b0, 'now=' . $ledger->get_balance( $uid ) );
// 13j: cancelled -> failed takes the points back; failed -> processing adds nothing more; cycles stay balanced.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'cancelled' );
zz_check( '13j cancel returns', $ledger->get_balance( $uid ) === $b0 );
$o->update_status( 'failed' );
zz_check( '13j cancelled -> failed takes the points back', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'processing' );
zz_check( '13j failed -> processing adds no second debit', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'cancelled' );
$o->update_status( 'failed' );
$o->update_status( 'cancelled' );
zz_check( '13j repeated cycles: cancelled again returns once', $ledger->get_balance( $uid ) === $b0, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'completed' );
zz_check( '13j and reopening once more takes back once (earn +1500 on completion)', $ledger->get_balance( $uid ) === $b0 - 3000 + 1500, 'now=' . $ledger->get_balance( $uid ) );
// 13k: legacy return recorded on an order that is now failed, then paid.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'failed' );
$ledger->credit( $uid, 3000, \PointBay\Hooks\OrderHooks::REF_REDEMPTION_CANCEL, $o->get_id(), 'ZZ-QA legacy return', 'system' );
zz_check( '13k legacy credit present', $ledger->get_balance( $uid ) === $b0 );
$o->update_status( 'processing' );
zz_check( '13k legacy failed -> processing takes the points back', $ledger->get_balance( $uid ) === $b0 - 3000, 'now=' . $ledger->get_balance( $uid ) );
// 13i: COD completed (earned 1500) -> cancel -> reopen -> complete: earned-points clawback state.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( true, 'completed' );
$o->update_status( 'cancelled' );
zz_check( '13i COD cancel nets to start', $ledger->get_balance( $uid ) === $b0, 'now=' . $ledger->get_balance( $uid ) );
$o->update_status( 'completed' );
zz_check( '13i COD cancel -> reopen -> complete restores the earned points (net = one redemption + one award)', $ledger->get_balance( $uid ) - $b0 == -3000 + 1500, 'net=' . ( $ledger->get_balance( $uid ) - $b0 ) );
$o->update_status( 'processing' );
$o->update_status( 'completed' );
zz_check( '13i completing again does not award twice', $ledger->get_balance( $uid ) - $b0 == -1500, 'net=' . ( $ledger->get_balance( $uid ) - $b0 ) );
// 13l: repeated COD cycles: cancel, reopen+complete, cancel, reopen+complete.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( true, 'completed' );
$o->update_status( 'cancelled' );
$o->update_status( 'completed' );
$o->update_status( 'cancelled' );
zz_check( '13l second cancel reverses the award again (net 0)', $ledger->get_balance( $uid ) == $b0, 'net=' . ( $ledger->get_balance( $uid ) - $b0 ) );
$o->update_status( 'completed' );
zz_check( '13l second reopen restores it again (net -1500)', $ledger->get_balance( $uid ) - $b0 == -1500, 'net=' . ( $ledger->get_balance( $uid ) - $b0 ) );
// 13m: full refund then cancel then reopen: refunded orders stay clawed back.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( true, 'completed' );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => (float) $o->get_total() ) );
$after_refund = $ledger->get_balance( $uid );
zz_check( '13m refund returns everything (net 0)', $after_refund == $b0, 'net=' . ( $after_refund - $b0 ) );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'cancelled' );
$o->update_status( 'completed' );
zz_check( '13m refunded order stays clawed back: reopen re-awards nothing (net 0, everything refunded earlier)', $ledger->get_balance( $uid ) - $b0 == 0, 'net=' . ( $ledger->get_balance( $uid ) - $b0 ) );
// 13n: non-COD completed then cancelled then reopened: no reversal, so no re-award.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'completed' );
$o->update_status( 'cancelled' );
$o->update_status( 'completed' );
zz_check( '13n non-COD cancel/reopen: no double award (net -3000+1500)', $ledger->get_balance( $uid ) - $b0 == -1500, 'net=' . ( $ledger->get_balance( $uid ) - $b0 ) );

// 13o-q: earned-points cycles against refunds (no redemption involved).
$mk2 = function () use ( $uid, $product, &$orders ) {
	$o = wc_create_order( array( 'customer_id' => $uid ) );
	$o->add_product( $product, 3 );
	$o->set_payment_method( 'cod' );
	$o->calculate_totals( false );
	$o->save();
	$orders[] = $o->get_id();
	$o->update_status( 'completed' );
	return $o;
};
$net = function ( $b0 ) use ( $ledger, $uid ) { return $ledger->get_balance( $uid ) - $b0; };
$refund = function ( $o, $amt = null ) { wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => null === $amt ? (float) wc_get_order( $o->get_id() )->get_total() - array_sum( array_map( function ( $r ) { return abs( (float) $r->get_amount() ); }, wc_get_order( $o->get_id() )->get_refunds() ) ) : $amt ) ); };
// 13o: complete, cancel, reopen+complete, full refund: earn nets to 0.
$b0 = $ledger->get_balance( $uid );
$o  = $mk2();
$earn = $net( $b0 );
$o->update_status( 'cancelled' );
$o->update_status( 'completed' );
zz_check( '13o reopen restores the full award', $net( $b0 ) == $earn, 'net=' . $net( $b0 ) . ' earn=' . $earn );
$refund( $o );
zz_check( '13o full refund after reopen claws the award back (net 0)', $net( $b0 ) == 0, 'net=' . $net( $b0 ) );
// 13p: partial refund, cancel, reopen+complete: re-award does not exceed what is outstanding.
$b0 = $ledger->get_balance( $uid );
$o  = $mk2();
$earn = $net( $b0 );
$refund( $o, 150 );
$after_partial = $net( $b0 );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'cancelled' );
zz_check( '13p cancel reverses the rest', $net( $b0 ) == 0, 'net=' . $net( $b0 ) );
$o->update_status( 'completed' );
zz_check( '13p reopen restores only the outstanding award', $net( $b0 ) == $after_partial, 'net=' . $net( $b0 ) . ' expected=' . $after_partial );
$refund( $o );
zz_check( '13p refunding the remainder claws back the remainder (net 0)', $net( $b0 ) == 0, 'net=' . $net( $b0 ) );
// 13q: refund recorded while cancelled is not re-awarded on reopen.
$b0 = $ledger->get_balance( $uid );
$o  = $mk2();
$earn = $net( $b0 );
$o->update_status( 'cancelled' );
$refund( $o, 150 );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'completed' );
zz_check( '13q refund while cancelled: reopen re-awards only the unrefunded half', $net( $b0 ) == $earn / 2, 'net=' . $net( $b0 ) . ' expected=' . ( $earn / 2 ) );
$refund( $o );
zz_check( '13q then refunding the rest nets 0', $net( $b0 ) == 0, 'net=' . $net( $b0 ) );
// 13r: full refund while cancelled: nothing re-awarded.
$b0 = $ledger->get_balance( $uid );
$o  = $mk2();
$o->update_status( 'cancelled' );
$refund( $o );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'completed' );
zz_check( '13r full refund while cancelled: reopen re-awards nothing', $net( $b0 ) == 0, 'net=' . $net( $b0 ) );
// 13s: repeated cycles then a full refund.
$b0 = $ledger->get_balance( $uid );
$o  = $mk2();
$earn = $net( $b0 );
foreach ( array( 1, 2, 3 ) as $i ) {
	$o->update_status( 'cancelled' );
	$o->update_status( 'completed' );
}
zz_check( '13s three cancel/reopen cycles: award stands once', $net( $b0 ) == $earn, 'net=' . $net( $b0 ) );
$refund( $o );
zz_check( '13s full refund after the cycles nets 0', $net( $b0 ) == 0, 'net=' . $net( $b0 ) );

// 17. Redeemed points returned once per refund, even if the refund is deleted and re-recorded.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$thirty = round( (float) $o->get_total() * 0.3, 2 );
$r1 = wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => $thirty ) );
$mid = $ledger->get_balance( $uid );
zz_check( '17 30% refund returns 900 of 3000', $mid == $b0 - 3000 + 900, 'now=' . $mid );
$r1->delete( true );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => $thirty ) );
zz_check( '17 deleting and re-recording the same refund does not return the points twice', $ledger->get_balance( $uid ) == $mid, 'now=' . $ledger->get_balance( $uid ) . ' expected=' . $mid );

// 18. A refund recorded while the order is cancelled keeps its share of the returned points.
$b0 = $ledger->get_balance( $uid );
$o  = $mk( false, 'processing' );
$o->update_status( 'cancelled' );
wc_create_refund( array( 'order_id' => $o->get_id(), 'amount' => round( (float) $o->get_total() * 0.3, 2 ) ) );
$o = wc_get_order( $o->get_id() );
$o->update_status( 'processing' );
zz_check( '18 refund while cancelled: reopen leaves the customer 900 (30% of 3000) returned', $ledger->get_balance( $uid ) == $b0 - 3000 + 900, 'now=' . $ledger->get_balance( $uid ) . ' expected=' . ( $b0 - 2100 ) );

// 19. A thrown Error inside the ledger leaves no transaction open.
global $wpdb;
$open = function () use ( $wpdb ) { return (int) $wpdb->get_var( 'SELECT COUNT(*) FROM information_schema.innodb_trx WHERE trx_mysql_thread_id = CONNECTION_ID()' ); };
$thrower = function ( $q ) { if ( false !== stripos( $q, 'FOR UPDATE' ) ) { throw new \Error( 'ZZ-QA forced error' ); } return $q; };
foreach ( array( 'batch', 'single' ) as $kind ) {
	add_filter( 'query', $thrower );
	try {
		if ( 'batch' === $kind ) {
			$ledger->credit_batch( $uid, array( array( 'amount' => 5, 'ref_type' => 'admin', 'ref_id' => 990001, 'description' => 'ZZ-QA t' ) ) );
		} else {
			$ledger->credit( $uid, 5, 'admin', 990002, 'ZZ-QA t' );
		}
	} catch ( \Throwable $e ) {
		// expected
	}
	remove_filter( 'query', $thrower );
	zz_check( '19 ' . $kind . ' path: no transaction left open after a thrown Error', 0 === $open(), 'open=' . $open() );
	$wpdb->query( 'ROLLBACK' );
}

// 14. (B1) Removing the points coupon through WooCommerce clears the redemption; our swap does not.
$ledger->credit( $uid, 20000, 'manual', 0, 'ZZ-QA top-up for check 14' );
zz_settings( array( 'redemption_mode' => 'coupon' ) );
zz_cart( $product );
$mgr->apply_points_discount( $uid, 3000 );
WC()->cart->calculate_totals();
$codes = array_values( array_filter( WC()->cart->get_applied_coupons(), function ( $c ) { return 0 === strpos( $c, 'pointbay_points_' ); } ) );
zz_check( '14 B1: points coupon attached before removal', 1 === count( $codes ) );
WC()->cart->remove_coupon( $codes[0] );
WC()->cart->calculate_totals();
zz_check( '14 B1: WooCommerce removal clears the applied points', 0 === $mgr->get_applied_points() );
zz_check( '14 B1: and the coupon does not come back', ! array_filter( WC()->cart->get_applied_coupons(), function ( $c ) { return 0 === strpos( $c, 'pointbay_points_' ); } ) && abs( (float) WC()->cart->get_discount_total() ) < 0.01 );
$mgr->apply_points_discount( $uid, 3000 );
WC()->cart->calculate_totals();
$mgr->apply_points_discount( $uid, 4000 );
WC()->cart->calculate_totals();
zz_check( '14 B1: changing the amount (swap) keeps the redemption at 4000', 4000 === $mgr->get_applied_points(), 'pts=' . $mgr->get_applied_points() );
$mgr->apply_points_discount( $uid, 0 );
WC()->cart->calculate_totals();
zz_check( '14 B1: PointBay own remove still works', 0 === $mgr->get_applied_points() && ! array_filter( WC()->cart->get_applied_coupons(), function ( $c ) { return 0 === strpos( $c, 'pointbay_points_' ); } ) );
WC()->cart->empty_cart();

// 15. (B4) Attaching the points coupon queues no "Coupon code applied" notice.
wc_clear_notices();
zz_settings( array( 'redemption_mode' => 'coupon' ) );
zz_cart( $product );
$mgr->apply_points_discount( $uid, 3000 );
WC()->cart->calculate_totals();
zz_check( '15 B4: no stale coupon-applied notice', 0 === wc_notice_count( 'success' ), 'notices=' . wp_json_encode( wc_get_notices() ) );
$mgr->apply_points_discount( $uid, 0 );
WC()->cart->empty_cart();

// 16. (item 5) CampaignBay with stacking off must not invalidate the points coupon.
if ( in_array( 'campaignbay/campaignbay.php', (array) get_option( 'active_plugins' ), true ) ) {
	zz_settings( array( 'redemption_mode' => 'coupon' ) );
	zz_cart( $product );
	$cart_before = (float) WC()->cart->get_subtotal();
	$mgr->apply_points_discount( $uid, 3000 );
	WC()->cart->calculate_totals();
	$has = (bool) array_filter( WC()->cart->get_applied_coupons(), function ( $c ) { return 0 === strpos( $c, 'pointbay_points_' ); } );
	zz_check( '16 coupon stays attached with CampaignBay active', $has );
	zz_check( '16 and carries a discount', (float) WC()->cart->get_discount_total() > 0, 'discount=' . WC()->cart->get_discount_total() );
	$mgr->apply_points_discount( $uid, 0 );
	WC()->cart->calculate_totals();
	WC()->cart->empty_cart();
} else {
	fwrite( STDOUT, "INFO 16 skipped: CampaignBay not active\n" );
}

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
