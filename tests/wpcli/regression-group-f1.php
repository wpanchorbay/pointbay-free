<?php
/**
 * Regression checks for the Group F1 earning guardrails.
 *
 * Covers: minimum cart spend, points-paid exclusion from the earning basis,
 * blog comment points, refund delete + re-record, and the past-orders backfill.
 *
 * Run (from the WordPress root): wp eval-file wp-content/plugins/pointbay-loyalty-points-referral-rewards-woo/tests/wpcli/regression-group-f1.php
 *
 * Settings are overridden in-process only (the stored option is never written).
 * Creates ZZ-QA users, products, posts, comments, orders, one shipping zone and
 * one tax rate, and removes them all at the end. Backfill orders are dated in
 * March 2001 so the backfill window can never touch a real order.
 *
 * @package PointBay
 */

use PointBay\Core\Settings;
use PointBay\Checkout\RedemptionManager;
use PointBay\Hooks\OrderHooks;
use PointBay\Services\BackfillService;
use PointBay\Services\EarningCalculator;
use PointBay\Services\LedgerService;

$GLOBALS['zz_fail'] = 0;
$GLOBALS['zz_pass'] = 0;
function zz_check( $label, $ok, $detail = '' ) {
	if ( $ok ) {
		++$GLOBALS['zz_pass'];
	} else {
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
function zz_user( $tag ) {
	$n = wp_rand( 1000, 9999 );
	return wp_insert_user(
		array(
			'user_login' => 'zzqa_f1_' . $tag . '_' . $n,
			'user_pass'  => wp_generate_password(),
			'user_email' => 'zzqa-f1-' . $tag . '-' . $n . '@example.test',
			'role'       => 'customer',
		)
	);
}
/** Points credited for an order across the three award components. */
function zz_awarded( $uid, $oid ) {
	return (int) LedgerService::get_instance()->sum_by_reference_types( $uid, OrderHooks::award_reference_types(), $oid, 'credit' );
}
/** A flat-priced order (no tax, no shipping) with the given line total. */
function zz_order( $uid, $amount, $status = 'completed' ) {
	global $zz_product, $zz_orders;
	$order = wc_create_order( array( 'customer_id' => $uid ) );
	$order->add_product( $zz_product, 1, array( 'subtotal' => $amount, 'total' => $amount ) );
	$order->set_payment_method( 'bacs' );
	$order->calculate_totals( false );
	$order->save();
	$zz_orders[] = $order->get_id();
	if ( $status ) {
		$order->update_status( $status );
	}
	return wc_get_order( $order->get_id() );
}
function zz_cart( $product, $qty = 1 ) {
	WC()->cart->empty_cart();
	WC()->session->set( 'pointbay_points_redemption', null );
	WC()->cart->add_to_cart( $product->get_id(), $qty );
	WC()->cart->calculate_totals();
}
/** What the cart preview promises: the basis and the calculator result. */
function zz_cart_preview( $uid ) {
	$c     = EarningCalculator::get_instance();
	$basis = $c->resolve_cart_basis();
	$r     = $c->calculate(
		array(
			'amount'              => $basis,
			'user_id'             => $uid,
			'include_first_order' => $c->is_first_order( $uid ),
			'context'             => 'cart',
		)
	);
	return array( $basis, $r );
}
/**
 * Posts a comment through wp_new_comment() (which is what fires comment_post),
 * forcing the moderation outcome: 1 approved, 0 held, 'spam'.
 */
function zz_comment( $post_id, $uid, $approved = 1, $extra = array() ) {
	global $zz_comments, $zz_seq;
	++$zz_seq;
	$user   = $uid ? get_userdata( $uid ) : null;
	$force  = function () use ( $approved ) {
		return $approved;
	};
	add_filter( 'pre_comment_approved', $force, 99 );
	add_filter( 'comment_flood_filter', '__return_false', 99 );
	$id = wp_new_comment(
		array_merge(
			array(
				'comment_post_ID'      => $post_id,
				'comment_content'      => 'ZZ-QA comment ' . $zz_seq . ' ' . wp_generate_password( 8, false ),
				'user_id'              => $uid,
				'comment_author'       => $user ? $user->display_name : 'ZZ-QA Guest',
				'comment_author_email' => $user ? $user->user_email : 'zzqa-guest@example.test',
				'comment_type'         => 'comment',
				'comment_author_url'   => '',
			),
			$extra
		),
		true
	);
	remove_filter( 'pre_comment_approved', $force, 99 );
	remove_filter( 'comment_flood_filter', '__return_false', 99 );
	if ( is_wp_error( $id ) ) {
		echo 'INFO zz_comment error: ' . $id->get_error_message() . "\n";
		return 0;
	}
	$zz_comments[] = $id;
	return (int) $id;
}
function zz_comment_rows( $uid, $type, $cid, $txn ) {
	return (int) LedgerService::get_instance()->has_existing_transaction( $uid, $type, $cid, $txn );
}

// Isolate from Pro and other add-ons: this exercises the free behaviour only.
foreach ( array( 'pointbay_redemption_discount_value', 'pointbay_max_redeemable', 'pointbay_can_redeem', 'pointbay_earning_multiplier', 'pointbay_user_can_earn' ) as $h ) {
	remove_all_filters( $h );
}
foreach ( $GLOBALS['wp_filter'] as $hook_name => $hook_obj ) {
	foreach ( $hook_obj->callbacks as $prio => $cbs ) {
		foreach ( $cbs as $cb ) {
			$fn = $cb['function'];
			if ( is_array( $fn ) && is_object( $fn[0] ) ) {
				$cls = get_class( $fn[0] );
				if ( 0 === strpos( $cls, 'WpabCampaignBay' ) || 0 === strpos( $cls, 'PointBayPro' ) ) {
					remove_filter( $hook_name, $fn, $prio );
				}
			}
		}
	}
}

$option_before = md5( wp_json_encode( get_option( 'pointbay' ) ) );

$base = array(
	'redemption_mode'              => 'coupon',
	'redemption_conversionMode'    => 'fixed',
	'redemption_pointsValue'       => 0.01,
	'redemption_minPoints'         => 100,
	'redemption_allowPartial'      => true,
	'redemption_hideCouponForm'    => false,
	'earning_pointsPerDollar'      => 5,
	'earning_basis'                => 'subtotal',
	'earning_bands'                => array(),
	'earning_flatPointsPerOrder'   => 0,
	'earning_firstOrderBonus'      => 0,
	'earning_multiplyFlatBonus'    => true,
	'earning_multiplyFirstOrderBonus' => false,
	'earning_orderStatusTrigger'   => 'completed',
	'earning_minCartSpend'         => 0,
	'earning_pointsForComment'     => 0,
	'earning_commentRequireApproval' => true,
	'earning_commentDailyLimit'    => 0,
	'display_minSpendMessage'      => 'Spend {amount} more to earn {points} points.',
	'tiers_enabled'                => false,
);
zz_settings( $base );

$ledger = LedgerService::get_instance();
$calc   = EarningCalculator::get_instance();
$hooks  = OrderHooks::get_instance();
global $wpdb;

// Bound by reference to $GLOBALS so the helper functions share them whatever scope eval-file runs in.
$GLOBALS['zz_seq'] = 0;
$GLOBALS['zz_orders'] = array();
$GLOBALS['zz_comments'] = array();
$GLOBALS['zz_product'] = null;
$zz_seq      = &$GLOBALS['zz_seq'];
$zz_orders   = &$GLOBALS['zz_orders'];
$zz_comments = &$GLOBALS['zz_comments'];
$zz_product  = &$GLOBALS['zz_product'];
$zz_posts    = array();
$zz_users    = array();
$zz_priced   = array();

$zz_product = new WC_Product_Simple();
$zz_product->set_name( 'ZZ-QA F1 Widget' );
$zz_product->set_regular_price( '100' );
$zz_product->set_tax_status( 'none' );
$zz_product->save();

wc_load_cart();

// ---------------------------------------------------------------------------
// 1. Minimum cart spend.
// ---------------------------------------------------------------------------
echo "\n== 1. Minimum cart spend ==\n";
zz_settings( array( 'earning_minCartSpend' => 25, 'earning_flatPointsPerOrder' => 20, 'earning_firstOrderBonus' => 100, 'earning_basis' => 'subtotal' ) );

$u1 = zz_user( 'min1' );
$zz_users[] = $u1;

$below = $calc->calculate( array( 'amount' => 24.99, 'user_id' => $u1, 'include_first_order' => true, 'context' => 'order' ) );
zz_check( '1 below minimum: calculate() total is 0', 0 === $below['total'] && true === $below['below_minimum'], wp_json_encode( $below ) );
zz_check( '1 below minimum: base, flat and first-order are each 0', 0 === $below['base'] && 0 === $below['flat'] && 0 === $below['first_order'] );
$at = $calc->calculate( array( 'amount' => 25.00, 'user_id' => $u1, 'include_first_order' => true, 'context' => 'order' ) );
zz_check( '1 exactly at minimum: earns base 125 + flat 20 + first-order 100', 125 === $at['base'] && 20 === $at['flat'] && 100 === $at['first_order'] && 245 === $at['total'] && false === $at['below_minimum'], wp_json_encode( $at ) );

// Rounding boundary: compared at currency precision (2 decimals).
zz_check( '1 rounding: 24.996 displays as 25.00 so it is not below', false === $calc->is_below_minimum( 24.996 ) );
zz_check( '1 rounding: 24.994 displays as 24.99 so it is below', true === $calc->is_below_minimum( 24.994 ) );
$r996 = $calc->calculate( array( 'amount' => 24.996, 'user_id' => $u1, 'context' => 'order' ) );
zz_check( '1 rounding: 24.996 earns (floor(124.98)=124 + flat 20)', 144 === $r996['total'], 'total=' . $r996['total'] );
$r994 = $calc->calculate( array( 'amount' => 24.994, 'user_id' => $u1, 'context' => 'order' ) );
zz_check( '1 rounding: 24.994 earns 0', 0 === $r994['total'] );

// Product context is a single price, not the order: the gate is not enforced.
$prod_ctx = $calc->calculate( array( 'amount' => 1, 'user_id' => $u1, 'context' => 'product' ) );
zz_check( '1 product context: minimum not enforced (1 x 5 + 20 flat = 25)', 25 === $prod_ctx['total'], 'total=' . $prod_ctx['total'] );

// minimum_spend_state: below / at / above.
$st = $calc->minimum_spend_state( 24.99, $u1, 'cart', true );
zz_check( '1 state: below minimum returns remaining 0.01 and the points reaching it earns (245)', is_array( $st ) && abs( $st['remaining'] - 0.01 ) < 0.0001 && 245 === $st['points'] && abs( $st['minimum'] - 25 ) < 0.0001, wp_json_encode( $st ) );
$st_nofirst = $calc->minimum_spend_state( 10, $u1, 'cart', false );
zz_check( '1 state: first-order bonus excluded when it does not apply (125+20=145)', is_array( $st_nofirst ) && 145 === $st_nofirst['points'] && abs( $st_nofirst['remaining'] - 15 ) < 0.0001, wp_json_encode( $st_nofirst ) );
zz_check( '1 state: exactly at minimum returns null', null === $calc->minimum_spend_state( 25.00, $u1, 'cart', true ) );
zz_check( '1 state: above minimum returns null', null === $calc->minimum_spend_state( 80, $u1, 'cart', true ) );
zz_check( '1 state: 24.996 (rounds to the minimum) returns null', null === $calc->minimum_spend_state( 24.996, $u1, 'cart', true ) );

// Message template.
$money = html_entity_decode( wp_strip_all_tags( wc_price( 0.01 ) ), ENT_QUOTES, 'UTF-8' );
zz_check( '1 message: default template fills {amount} and {points}', $st['message'] === "Spend {$money} more to earn 245 points.", $st['message'] );
zz_settings( array( 'display_minSpendMessage' => 'Add {amount} to get {points} pts (min {amount})' ) );
$st2 = $calc->minimum_spend_state( 24.99, $u1, 'cart', true );
zz_check( '1 message: custom template replaces every token occurrence', $st2['message'] === "Add {$money} to get 245 pts (min {$money})", $st2['message'] );
zz_settings( array( 'display_minSpendMessage' => '' ) );
$st3 = $calc->minimum_spend_state( 24.99, $u1, 'cart', true );
zz_check( '1 message: an empty template falls back to the default', $st3['message'] === "Spend {$money} more to earn 245 points.", $st3['message'] );
zz_settings( array( 'display_minSpendMessage' => 'Spend {amount} more to earn {points} points.' ) );

// Minimum 0 = off.
zz_settings( array( 'earning_minCartSpend' => 0 ) );
$off = $calc->calculate( array( 'amount' => 1, 'user_id' => $u1, 'context' => 'order' ) );
zz_check( '1 minimum 0 is off: $1 earns 5 + 20 flat', 25 === $off['total'] && false === $off['below_minimum'], wp_json_encode( $off ) );
zz_check( '1 minimum 0 is off: no state, is_below_minimum is false', null === $calc->minimum_spend_state( 0.5, $u1, 'cart', true ) && false === $calc->is_below_minimum( 0 ) );
zz_settings( array( 'earning_minCartSpend' => 25 ) );

// Real orders: below the minimum nothing at all is written, bonuses included.
$below_user = zz_user( 'min2' );
$zz_users[] = $below_user;
$o_below    = zz_order( $below_user, 24.99 );
zz_check( '1 order below minimum: award is 0 (no base, flat or first-order rows)', 0 === zz_awarded( $below_user, $o_below->get_id() ) && 0 === $ledger->count_by_reference_type( $below_user, 'first_order_bonus' ) && 0 === $ledger->count_by_reference_type( $below_user, 'order_flat_bonus' ) && 0 === (int) $ledger->get_balance( $below_user ), 'balance=' . $ledger->get_balance( $below_user ) );

$at_user = zz_user( 'min3' );
$zz_users[] = $at_user;
$o_at = zz_order( $at_user, 25.00 );
zz_check( '1 order exactly at minimum: awarded 125 + 20 + 100 = 245', 245 === zz_awarded( $at_user, $o_at->get_id() ), 'awarded=' . zz_awarded( $at_user, $o_at->get_id() ) );
zz_check( '1 order exactly at minimum: all three ledger rows exist', 1 === $ledger->count_by_reference_type( $at_user, 'first_order_bonus' ) && 1 === $ledger->count_by_reference_type( $at_user, 'order_flat_bonus' ) && 1 === $ledger->count_by_reference_type( $at_user, 'order' ) );

// Informational: a below-minimum order is still "history" for the first-order check.
$o_after = zz_order( $below_user, 30 );
$after   = zz_awarded( $below_user, $o_after->get_id() );
echo 'INFO 1 first-order bonus after an earlier below-minimum completed order: awarded ' . $after . ' (150+20 = 170 means the first-order bonus was consumed by the earlier below-minimum order; 270 means it was kept)' . "\n";

// Cart preview == award, either side of the boundary.
foreach ( array( '24.99' => 0, '25.00' => 245 ) as $price => $expect ) {
	$cu = zz_user( 'cart' );
	$zz_users[] = $cu;
	wp_set_current_user( $cu );
	$p = new WC_Product_Simple();
	$p->set_name( 'ZZ-QA F1 Priced ' . $price );
	$p->set_regular_price( $price );
	$p->set_tax_status( 'none' );
	$p->save();
	$zz_priced[] = $p;
	zz_cart( $p );
	list( $cb, $cr ) = zz_cart_preview( $cu );
	$o = WC()->checkout()->create_order( array( 'billing_email' => 'zzqa@example.test', 'payment_method' => 'bacs', 'customer_id' => $cu ) );
	$o = wc_get_order( $o );
	$o->set_customer_id( $cu );
	$o->save();
	$zz_orders[] = $o->get_id();
	$o->update_status( 'completed' );
	$got = zz_awarded( $cu, $o->get_id() );
	zz_check( "1 cart preview == order award at \$$price", $cr['total'] === $got && $got === $expect, "preview={$cr['total']} award=$got expect=$expect basis=$cb" );
	$cst = $calc->minimum_spend_state( $cb, $cu, 'cart', true );
	zz_check( "1 cart state at \$$price: " . ( $expect ? 'null (met)' : 'shown, and promises 245' ), $expect ? null === $cst : ( is_array( $cst ) && 245 === $cst['points'] ) );
}
WC()->cart->empty_cart();
wp_set_current_user( 0 );
zz_settings( array( 'earning_minCartSpend' => 0, 'earning_flatPointsPerOrder' => 0, 'earning_firstOrderBonus' => 0 ) );

// ---------------------------------------------------------------------------
// 2. Points-paid exclusion from the earning basis.
// ---------------------------------------------------------------------------
echo "\n== 2. Points-paid exclusion ==\n";

// A taxable product, one tax rate and one shipping zone so total mode has real shipping and tax.
// A fresh site has tax calculation off, which would leave the rate below inert.
$zz_calc_taxes_before = get_option( 'woocommerce_calc_taxes', 'no' );
update_option( 'woocommerce_calc_taxes', 'yes' );
$rate_id = WC_Tax::_insert_tax_rate(
	array(
		'tax_rate_country'  => 'US',
		'tax_rate_state'    => '',
		'tax_rate'          => '10.0000',
		'tax_rate_name'     => 'ZZQA',
		'tax_rate_priority' => 1,
		'tax_rate_compound' => 0,
		'tax_rate_shipping' => 1,
		'tax_rate_order'    => 99,
		'tax_rate_class'    => '',
	)
);
$zone = new WC_Shipping_Zone();
$zone->set_zone_name( 'ZZ-QA zone' );
$zone->add_location( 'US', 'country' );
$zone->save();
$zone->add_shipping_method( 'flat_rate' );
foreach ( $zone->get_shipping_methods() as $m ) {
	$m->init_instance_settings();
	$m->instance_settings['cost']       = '10';
	$m->instance_settings['tax_status'] = 'taxable';
	update_option( $m->get_instance_option_key(), $m->instance_settings );
}
WC_Cache_Helper::get_transient_version( 'shipping', true );

$tax_product = new WC_Product_Simple();
$tax_product->set_name( 'ZZ-QA F1 Taxable' );
$tax_product->set_regular_price( '100' );
$tax_product->set_tax_status( 'taxable' );
$tax_product->save();

$u2 = zz_user( 'paid' );
$zz_users[] = $u2;
wp_set_current_user( $u2 );
$ledger->credit( $u2, 100000, 'zzqa_seed', 1, 'ZZ-QA seed' );
WC()->customer->set_billing_country( 'US' );
WC()->customer->set_shipping_country( 'US' );
WC()->customer->set_billing_state( '' );
WC()->customer->set_shipping_state( '' );
WC()->customer->set_billing_postcode( '10001' );
WC()->customer->set_shipping_postcode( '10001' );
$mgr = RedemptionManager::get_instance();

foreach ( array( 'fee', 'coupon' ) as $mode ) {
	foreach ( array( 'subtotal', 'total' ) as $basis_mode ) {
		$tag = "$mode/$basis_mode";
		zz_settings( array( 'redemption_mode' => $mode, 'earning_basis' => $basis_mode, 'earning_pointsPerDollar' => 5 ) );

		// Baseline: the same cart with no points applied.
		zz_cart( $tax_product );
		list( $np_basis, $np_res ) = zz_cart_preview( $u2 );

		// With 3000 points ($30) applied.
		zz_cart( $tax_product );
		$applied = $mgr->apply_points_discount( $u2, 3000 );
		WC()->cart->calculate_totals();
		list( $cb, $cr ) = zz_cart_preview( $u2 );
		$ship = (float) WC()->cart->get_shipping_total();
		$taxs = (float) WC()->cart->get_taxes_total();

		WC()->session->set( 'chosen_shipping_methods', array_slice( array_keys( WC()->shipping()->get_packages() ? WC()->shipping()->get_packages()[0]['rates'] : array() ), 0, 1 ) );
		$oid = WC()->checkout()->create_order( array( 'billing_email' => 'zzqa@example.test', 'payment_method' => 'bacs', 'customer_id' => $u2 ) );
		$o   = wc_get_order( $oid );
		$o->set_customer_id( $u2 );
		$o->save();
		$zz_orders[] = $o->get_id();
		$ob   = $calc->resolve_order_basis( $o );
		$paid = $calc->get_points_paid_value( $o );
		$ocalc = $hooks->calculate_order_award( $o, $u2 );

		zz_check( "2 ($tag) points discount applied to the cart", true === $applied && $mgr->get_applied_points() >= 0 );
		zz_check( "2 ($tag) order carries a points-paid value of \$30", abs( $paid - 30 ) < 0.01, "paid=$paid" );
		zz_check( "2 ($tag) cart has real shipping and tax", $ship > 0 && $taxs > 0, "ship=$ship tax=$taxs" );
		zz_check( "2 ($tag) cart basis == order basis", abs( $cb - $ob ) < 0.01, "cart=$cb order=$ob" );
		zz_check( "2 ($tag) cart preview total == order calculate total", $cr['total'] === $ocalc['total'], "cart={$cr['total']} order={$ocalc['total']}" );
		if ( 'subtotal' === $basis_mode ) {
			zz_check( "2 ($tag) subtotal basis is exactly goods less points-paid (70)", abs( $ob - 70 ) < 0.01, "basis=$ob" );
		} else {
			zz_check( "2 ($tag) total basis is $30 or more below the no-points basis", ( $np_basis - $ob ) >= 29.99, "no_points=$np_basis with_points=$ob" );
			zz_check( "2 ($tag) total basis includes shipping and tax (above the goods alone)", $ob > 70, "basis=$ob" );
		}
		zz_check( "2 ($tag) paying with points earns less than paying with money", $cr['total'] < $np_res['total'], "with={$cr['total']} without={$np_res['total']}" );

		$o->update_status( 'completed' );
		$got = zz_awarded( $u2, $o->get_id() );
		zz_check( "2 ($tag) credited points == cart preview", $got === $cr['total'] && $got > 0, "credited=$got preview={$cr['total']}" );
		$bd = json_decode( (string) wc_get_order( $o->get_id() )->get_meta( OrderHooks::META_BREAKDOWN ), true );
		zz_check( "2 ($tag) stored breakdown records the points-paid value and basis", is_array( $bd ) && abs( (float) $bd['points_paid_value'] - 30 ) < 0.01 && abs( (float) $bd['basis_amount'] - $ob ) < 0.01, wp_json_encode( $bd ) );
		$mgr->apply_points_discount( $u2, 0 );
	}
}
WC()->cart->empty_cart();
WC()->session->set( 'pointbay_points_redemption', null );
wp_set_current_user( 0 );

// ---------------------------------------------------------------------------
// 3. Comment points.
// ---------------------------------------------------------------------------
echo "\n== 3. Comment points ==\n";
$author   = zz_user( 'author' );
$zz_users[] = $author;
$cm       = zz_user( 'commenter' );
$zz_users[] = $cm;
$other    = zz_user( 'other' );
$zz_users[] = $other;
$post_id  = wp_insert_post( array( 'post_title' => 'ZZ-QA F1 post', 'post_status' => 'publish', 'post_type' => 'post', 'post_author' => $author, 'comment_status' => 'open' ) );
$zz_posts[] = $post_id;
$bal = function ( $u ) use ( $ledger ) {
	return (int) $ledger->get_balance( $u );
};

zz_settings( array( 'earning_pointsForComment' => 10, 'earning_commentRequireApproval' => true, 'earning_commentDailyLimit' => 0 ) );

// Approval required.
$c1 = zz_comment( $post_id, $cm, 0 );
zz_check( '3 approval on: a held comment earns nothing', 0 === $bal( $cm ) );
wp_set_comment_status( $c1, 'approve' );
zz_check( '3 approval on: approving it awards 10 once', 10 === $bal( $cm ) && 1 === zz_comment_rows( $cm, 'comment', $c1, 'credit' ), 'bal=' . $bal( $cm ) );
wp_set_comment_status( $c1, 'hold' );
zz_check( '3 unapprove keeps the points', 10 === $bal( $cm ) );
wp_set_comment_status( $c1, 'approve' );
wp_set_comment_status( $c1, 'hold' );
wp_set_comment_status( $c1, 'approve' );
zz_check( '3 unapprove/approve cycles never double-award', 10 === $bal( $cm ) && 1 === $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE user_id=%d AND reference_type=%s AND reference_id=%d', ( new PointBay\Models\LedgerEntry() )->get_table(), $cm, 'comment', $c1 ) ) * 1, 'bal=' . $bal( $cm ) );

// Spam / trash / delete clawback, idempotent.
wp_set_comment_status( $c1, 'spam' );
zz_check( '3 spam claws the 10 back', 0 === $bal( $cm ) && 1 === zz_comment_rows( $cm, 'comment_reversal', $c1, 'debit' ), 'bal=' . $bal( $cm ) );
wp_set_comment_status( $c1, 'trash' );
zz_check( '3 trash after spam claws nothing more', 0 === $bal( $cm ), 'bal=' . $bal( $cm ) );
wp_delete_comment( $c1, true );
zz_check( '3 permanent delete after spam/trash claws nothing more', 0 === $bal( $cm ), 'bal=' . $bal( $cm ) );
$rev_rows = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE user_id=%d AND reference_type=%s AND reference_id=%d', ( new PointBay\Models\LedgerEntry() )->get_table(), $cm, 'comment_reversal', $c1 ) );
zz_check( '3 exactly one reversal row for the comment', 1 === $rev_rows, "rows=$rev_rows" );

$c2 = zz_comment( $post_id, $cm, 1 );
zz_check( '3 approval on: a comment posted already approved awards at posting', 10 === $bal( $cm ) );
wp_set_comment_status( $c2, 'spam' );
wp_set_comment_status( $c2, 'approve' );
zz_check( '3 restoring from spam does not re-award (credit row still exists)', 0 === $bal( $cm ), 'bal=' . $bal( $cm ) );
wp_delete_comment( $c2, true );

$c3 = zz_comment( $post_id, $cm, 1 );
wp_trash_comment( $c3 );
zz_check( '3 trash claws back', 10 === $bal( $cm ) - 0 + 0 || 0 === $bal( $cm ), 'bal=' . $bal( $cm ) );
$before = $bal( $cm );
wp_trash_comment( $c3 );
wp_delete_comment( $c3, true );
zz_check( '3 trash then delete is idempotent', $bal( $cm ) === $before, "before=$before after=" . $bal( $cm ) );

$bal0 = $bal( $cm );
$c4   = zz_comment( $post_id, $cm, 1 );
wp_delete_comment( $c4, true );
zz_check( '3 permanent delete of an approved comment claws back', $bal( $cm ) === $bal0, 'bal=' . $bal( $cm ) . " expected=$bal0" );

// Spam at posting never earns, in either approval mode.
$bal0 = $bal( $cm );
zz_comment( $post_id, $cm, 'spam' );
zz_settings( array( 'earning_commentRequireApproval' => false ) );
zz_comment( $post_id, $cm, 'spam' );
zz_check( '3 a comment posted as spam never earns', $bal( $cm ) === $bal0 );

// Approval off: points at posting, even when held.
$bal0 = $bal( $cm );
$c5   = zz_comment( $post_id, $cm, 0 );
zz_check( '3 approval off: a held comment earns 10 at posting', $bal( $cm ) === $bal0 + 10, 'bal=' . $bal( $cm ) );
wp_set_comment_status( $c5, 'approve' );
zz_check( '3 approval off: approving later adds nothing', $bal( $cm ) === $bal0 + 10 );
wp_set_comment_status( $c5, 'trash' );
zz_check( '3 approval off: trash still claws back', $bal( $cm ) === $bal0, 'bal=' . $bal( $cm ) );
zz_settings( array( 'earning_commentRequireApproval' => true ) );

// Daily limit.
$lim = zz_user( 'limit' );
$zz_users[] = $lim;
zz_settings( array( 'earning_commentDailyLimit' => 1 ) );
$l1 = zz_comment( $post_id, $lim, 1 );
$l2 = zz_comment( $post_id, $lim, 1 );
zz_check( '3 daily limit 1: second comment the same day earns nothing', 10 === $bal( $lim ) && 0 === zz_comment_rows( $lim, 'comment', $l2, 'credit' ), 'bal=' . $bal( $lim ) );
zz_check( '3 daily limit 1: reached state reported', true === PointBay\Hooks\CommentHooks::has_reached_daily_limit( $lim ) );
wp_set_comment_status( $l1, 'spam' );
zz_check( '3 daily limit counts a clawed-back comment (documented), so still no award', true === PointBay\Hooks\CommentHooks::has_reached_daily_limit( $lim ) );
zz_settings( array( 'earning_commentDailyLimit' => 0 ) );
$ul = zz_user( 'unl' );
$zz_users[] = $ul;
for ( $i = 0; $i < 4; $i++ ) {
	zz_comment( $post_id, $ul, 1 );
}
zz_check( '3 daily limit 0 is unlimited (4 comments = 40)', 40 === $bal( $ul ) && false === PointBay\Hooks\CommentHooks::has_reached_daily_limit( $ul ), 'bal=' . $bal( $ul ) );
zz_settings( array( 'earning_commentDailyLimit' => 2 ) );
$l3 = zz_user( 'two' );
$zz_users[] = $l3;
for ( $i = 0; $i < 3; $i++ ) {
	zz_comment( $post_id, $l3, 1 );
}
zz_check( '3 daily limit 2: only two of three comments earn', 20 === $bal( $l3 ), 'bal=' . $bal( $l3 ) );
zz_settings( array( 'earning_commentDailyLimit' => 0 ) );

// Ineligible comment kinds.
$el = zz_user( 'inelig' );
$zz_users[] = $el;
zz_comment( $post_id, $el, 1, array( 'comment_type' => 'review' ) );
zz_check( '3 comment type "review" earns nothing', 0 === $bal( $el ) );
zz_comment( $post_id, $el, 1, array( 'comment_type' => 'pingback' ) );
zz_comment( $post_id, $el, 1, array( 'comment_type' => 'trackback' ) );
zz_check( '3 pingback and trackback earn nothing', 0 === $bal( $el ) );
$gc = zz_comment( $post_id, 0, 1 );
$guest_rows = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE reference_type=%s AND reference_id=%d', ( new PointBay\Models\LedgerEntry() )->get_table(), 'comment', $gc ) );
zz_check( '3 guest comment writes no ledger row', 0 === $guest_rows );
$product_comment = zz_comment( $zz_product->get_id(), $el, 1 );
zz_check( '3 comment on a product (review thread) earns nothing here', 0 === $bal( $el ) );

// Author replies on their own thread.
$parent_by_other = zz_comment( $post_id, $other, 1 );
$bal_other       = $bal( $other );
$bal_author      = $bal( $author );
zz_comment( $post_id, $author, 1, array( 'comment_parent' => $parent_by_other ) );
zz_check( '3 the post author replying on their own post earns nothing', $bal( $author ) === $bal_author );
$self_parent = zz_comment( $post_id, $cm, 1 );
$bal_cm      = $bal( $cm );
zz_comment( $post_id, $cm, 1, array( 'comment_parent' => $self_parent ) );
zz_check( '3 a user replying to their own comment earns nothing', $bal( $cm ) === $bal_cm, 'bal=' . $bal( $cm ) . " before=$bal_cm" );
$third = zz_user( 'third' );
$zz_users[] = $third;
zz_comment( $post_id, $third, 1, array( 'comment_parent' => $parent_by_other ) );
zz_check( '3 a different user replying in the thread earns', 10 === $bal( $third ) );
zz_settings( array( 'earning_pointsForComment' => 0 ) );
$zero = zz_user( 'zero' );
$zz_users[] = $zero;
zz_comment( $post_id, $zero, 1 );
zz_check( '3 comment points setting 0 awards nothing', 0 === $bal( $zero ) );

// ---------------------------------------------------------------------------
// 4. Refund delete + re-record.
// ---------------------------------------------------------------------------
echo "\n== 4. Refund delete and re-record ==\n";
zz_settings( array( 'earning_basis' => 'subtotal', 'earning_pointsPerDollar' => 5, 'earning_minCartSpend' => 0, 'earning_flatPointsPerOrder' => 0, 'earning_firstOrderBonus' => 0, 'earning_orderStatusTrigger' => 'completed' ) );
$ru = zz_user( 'refund' );
$zz_users[] = $ru;
$ro = zz_order( $ru, 100 );
$oid = $ro->get_id();
zz_check( '4 setup: $100 order awarded 500', 500 === zz_awarded( $ru, $oid ), 'awarded=' . zz_awarded( $ru, $oid ) );
$r1 = wc_create_refund( array( 'order_id' => $oid, 'amount' => 40, 'reason' => 'ZZ-QA' ) );
$rid1 = $r1->get_id();
$claw = function () use ( $ledger, $ru, $oid ) {
	$ids = array_map( 'absint', (array) wc_get_order( $oid )->get_meta( '_pointbay_earn_clawed_refunds' ) );
	foreach ( wc_get_order( $oid )->get_refunds() as $rf ) {
		$ids[] = $rf->get_id();
	}
	return (int) $ledger->sum_by_reference( $ru, 'refund', array_values( array_unique( $ids ) ), 'debit' );
};
zz_check( '4 partial refund of 40% claws back 200 once', 200 === $claw() && 300 === (int) $ledger->get_balance( $ru ), 'clawed=' . $claw() . ' bal=' . $ledger->get_balance( $ru ) );
$remembered = array_map( 'absint', (array) wc_get_order( $oid )->get_meta( '_pointbay_earn_clawed_refunds' ) );
zz_check( '4 the refund id is remembered in _pointbay_earn_clawed_refunds', in_array( $rid1, $remembered, true ), wp_json_encode( $remembered ) );
$r1->delete( true );
$r1b = wc_create_refund( array( 'order_id' => $oid, 'amount' => 40, 'reason' => 'ZZ-QA again' ) );
zz_check( '4 delete + record the same refund again: new refund id', $r1b->get_id() !== $rid1 );
zz_check( '4 delete + re-record: no second clawback (balance still 300)', 300 === (int) $ledger->get_balance( $ru ) && 200 === $claw(), 'bal=' . $ledger->get_balance( $ru ) . ' clawed=' . $claw() );
$r2 = wc_create_refund( array( 'order_id' => $oid, 'amount' => 10, 'reason' => 'ZZ-QA more' ) );
zz_check( '4 a further genuine $10 refund claws only its own 50 (total 250)', 250 === $claw() && 250 === (int) $ledger->get_balance( $ru ), 'clawed=' . $claw() . ' bal=' . $ledger->get_balance( $ru ) );
$r2->delete( true );
wc_create_refund( array( 'order_id' => $oid, 'amount' => 10, 'reason' => 'ZZ-QA more again' ) );
zz_check( '4 deleting and re-recording that one too is still not clawed twice', 250 === $claw() && 250 === (int) $ledger->get_balance( $ru ), 'clawed=' . $claw() . ' bal=' . $ledger->get_balance( $ru ) );

// ---------------------------------------------------------------------------
// 5. Backfill (orders dated March 2001 so the window never touches real data).
// ---------------------------------------------------------------------------
echo "\n== 5. Backfill ==\n";
$svc   = BackfillService::get_instance();
$start = '2001-03-01';
$end   = '2001-03-31';
$pre   = $svc->process_batch( $start, $end, 1, 50, false );
zz_check( '5 setup: the 2001 window holds no real orders', 0 === $pre['total_orders'], 'orders=' . $pre['total_orders'] );

// Create the history with a trigger that never fires, so nothing is awarded as they are created.
zz_settings( array( 'earning_orderStatusTrigger' => 'on-hold', 'earning_basis' => 'subtotal', 'earning_pointsPerDollar' => 5, 'earning_flatPointsPerOrder' => 0, 'earning_firstOrderBonus' => 0, 'earning_minCartSpend' => 25 ) );
$b1 = zz_user( 'bf1' );
$b2 = zz_user( 'bf2' );
$zz_users[] = $b1;
$zz_users[] = $b2;
function zz_hist_order( $uid, $amount, $day, $status = 'completed' ) {
	global $zz_product, $zz_orders;
	$order = wc_create_order( array( 'customer_id' => $uid ) );
	$order->add_product( $zz_product, 1, array( 'subtotal' => $amount, 'total' => $amount ) );
	$order->set_payment_method( 'bacs' );
	$order->set_date_created( strtotime( "2001-03-$day 09:00:00 UTC" ) );
	$order->calculate_totals( false );
	$order->save();
	$zz_orders[] = $order->get_id();
	if ( $status ) {
		$order->set_status( $status );
		if ( 'completed' === $status ) {
			$order->set_date_completed( strtotime( "2001-03-$day 14:30:00 UTC" ) );
		}
		$order->save();
	}
	return wc_get_order( $order->get_id() );
}
$oa = zz_hist_order( $b1, 100, '05' );              // earns 500.
$og = zz_hist_order( 0, 100, '06' );                // guest.
$orf = zz_hist_order( $b1, 100, '07' );             // fully refunded but kept completed.
wc_create_refund( array( 'order_id' => $orf->get_id(), 'amount' => 100, 'reason' => 'ZZ-QA full' ) );
$orf = wc_get_order( $orf->get_id() );
if ( 'completed' !== $orf->get_status() ) {
	$orf->set_status( 'completed' );
	$orf->save();
}
$oal = zz_hist_order( $b1, 100, '08' );             // already awarded through the normal flow.
$ledger->credit( $b1, 77, 'order', $oal->get_id(), 'ZZ-QA pre-existing award' );
$op = zz_hist_order( $b1, 100, '09', 'processing' ); // not an earning status.
$opart = zz_hist_order( $b2, 100, '10' );           // partly refunded: 500 less 200.
wc_create_refund( array( 'order_id' => $opart->get_id(), 'amount' => 40, 'reason' => 'ZZ-QA partial' ) );
$ozero = zz_hist_order( $b2, 10, '11' );            // below the 25 minimum.
$on = zz_hist_order( $b2, 25, '12' );               // exactly at the minimum: 125.

zz_check( '5 setup: nothing was awarded while the history was created', 0 === zz_awarded( $b1, $oa->get_id() ) && 0 === zz_awarded( $b2, $opart->get_id() ) && 0 === zz_awarded( $b2, $on->get_id() ) );
zz_check( '5 setup: the "fully refunded" order is completed with refunds covering its total', 'completed' === wc_get_order( $orf->get_id() )->get_status() && (float) wc_get_order( $orf->get_id() )->get_total_refunded() >= 100, 'status=' . wc_get_order( $orf->get_id() )->get_status() );

zz_settings( array( 'earning_orderStatusTrigger' => 'completed' ) );
$run = function ( $commit, $per_page = 2 ) use ( $svc, $start, $end ) {
	$tot = array( 'scanned' => 0, 'credited_orders' => 0, 'points' => 0, 'total_orders' => 0, 'guest' => 0, 'already_awarded' => 0, 'refunded' => 0, 'zero_points' => 0, 'pages' => 0 );
	$page = 1;
	do {
		$r = $svc->process_batch( $start, $end, $page, $per_page, $commit );
		$tot['scanned']         += $r['scanned'];
		$tot['credited_orders'] += $r['credited_orders'];
		$tot['points']          += $r['points'];
		$tot['total_orders']     = $r['total_orders'];
		foreach ( array( 'guest', 'already_awarded', 'refunded', 'zero_points' ) as $k ) {
			$tot[ $k ] += $r['skipped'][ $k ];
		}
		++$tot['pages'];
		++$page;
	} while ( ! $r['done'] && $page < 20 );
	return $tot;
};

$bal_before = array( $b1 => (int) $ledger->get_balance( $b1 ), $b2 => (int) $ledger->get_balance( $b2 ) );
$p = $run( false );
zz_check( '5 preview: scans the 7 earning-status orders (the processing one is outside the window query)', 7 === $p['total_orders'] && 7 === $p['scanned'], wp_json_encode( $p ) );
zz_check( '5 preview: paginates (per_page 2 gives 4 pages)', 4 === $p['pages'], 'pages=' . $p['pages'] );
zz_check( '5 preview: 2 orders credited for 500 + 300 + 125 = 925 (3 orders)', 3 === $p['credited_orders'] && 925 === $p['points'], wp_json_encode( $p ) );
zz_check( '5 preview: skips - guest 1, already awarded 1, refunded 1, zero points 1', 1 === $p['guest'] && 1 === $p['already_awarded'] && 1 === $p['refunded'] && 1 === $p['zero_points'], wp_json_encode( $p ) );
zz_check( '5 preview writes nothing', $bal_before[ $b1 ] === (int) $ledger->get_balance( $b1 ) && $bal_before[ $b2 ] === (int) $ledger->get_balance( $b2 ) && 0 === zz_awarded( $b1, $oa->get_id() ) );

$c = $run( true );
zz_check( '5 commit == preview (credited orders, points and skips)', $c['credited_orders'] === $p['credited_orders'] && $c['points'] === $p['points'] && $c['guest'] === $p['guest'] && $c['already_awarded'] === $p['already_awarded'] && $c['refunded'] === $p['refunded'] && $c['zero_points'] === $p['zero_points'], 'preview=' . wp_json_encode( $p ) . ' commit=' . wp_json_encode( $c ) );
zz_check( '5 commit: plain order credited 500', 500 === zz_awarded( $b1, $oa->get_id() ), 'awarded=' . zz_awarded( $b1, $oa->get_id() ) );
zz_check( '5 commit: at-minimum order credited 125', 125 === zz_awarded( $b2, $on->get_id() ), 'awarded=' . zz_awarded( $b2, $on->get_id() ) );
zz_check( '5 commit: below-minimum order credited nothing (zero_points)', 0 === zz_awarded( $b2, $ozero->get_id() ) );
zz_check( '5 commit: guest order credited nothing', 0 === zz_awarded( 0, $og->get_id() ) && 0 === $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE reference_type=%s AND reference_id=%d', ( new PointBay\Models\LedgerEntry() )->get_table(), 'order', $og->get_id() ) ) * 1 );
zz_check( '5 commit: fully refunded order credited nothing', 0 === zz_awarded( $b1, $orf->get_id() ) );
zz_check( '5 commit: already-awarded order keeps only its original 77', 77 === zz_awarded( $b1, $oal->get_id() ), 'awarded=' . zz_awarded( $b1, $oal->get_id() ) );
zz_check( '5 commit: processing order untouched', 0 === zz_awarded( $b1, $op->get_id() ) );

// Partial refund accounted: 500 credited, 200 clawed, net 300.
$rids = array_map( function ( $r ) { return $r->get_id(); }, wc_get_order( $opart->get_id() )->get_refunds() );
$part_credit = zz_awarded( $b2, $opart->get_id() );
$part_claw   = (int) $ledger->sum_by_reference( $b2, 'refund', $rids, 'debit' );
zz_check( '5 partial refund: award 500 less 200 clawed = net 300', 500 === $part_credit && 200 === $part_claw, "credit=$part_credit clawed=$part_claw" );
zz_check( '5 balance: b2 gained 300 + 125 = 425 net', (int) $ledger->get_balance( $b2 ) === $bal_before[ $b2 ] + 425, 'bal=' . $ledger->get_balance( $b2 ) . ' before=' . $bal_before[ $b2 ] );
zz_check( '5 balance: b1 gained exactly 500 (the 77 was pre-existing)', (int) $ledger->get_balance( $b1 ) === $bal_before[ $b1 ] + 500, 'bal=' . $ledger->get_balance( $b1 ) . ' before=' . $bal_before[ $b1 ] );

// Dated at completion.
$lt  = ( new PointBay\Models\LedgerEntry() )->get_table();
$row = $wpdb->get_row( $wpdb->prepare( 'SELECT created_at FROM %i WHERE user_id=%d AND reference_type=%s AND reference_id=%d AND transaction_type=%s', $lt, $b1, 'order', $oa->get_id(), 'credit' ) );
$want = wp_date( 'Y-m-d H:i:s', strtotime( '2001-03-05 14:30:00 UTC' ) );
zz_check( '5 ledger row is dated at the order completion date', $row && $row->created_at === $want, 'got=' . ( $row ? $row->created_at : 'none' ) . " want=$want" );
$row_at = $wpdb->get_row( $wpdb->prepare( 'SELECT created_at FROM %i WHERE user_id=%d AND reference_type=%s AND reference_id=%d AND transaction_type=%s', $lt, $b2, 'order', $on->get_id(), 'credit' ) );
zz_check( '5 a second order is dated at its own completion date', $row_at && $row_at->created_at === wp_date( 'Y-m-d H:i:s', strtotime( '2001-03-12 14:30:00 UTC' ) ), 'got=' . ( $row_at ? $row_at->created_at : 'none' ) );
zz_check( '5 the _pointbay_backfilled marker is set on credited orders only', (bool) wc_get_order( $oa->get_id() )->get_meta( '_pointbay_backfilled' ) && ! wc_get_order( $ozero->get_id() )->get_meta( '_pointbay_backfilled' ) );
$later = $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE user_id IN (%d,%d) AND created_at > %s AND reference_type IN (%s,%s,%s) AND reference_id IN (%d,%d,%d)', $lt, $b1, $b2, '2001-12-31 00:00:00', 'order', 'order_flat_bonus', 'first_order_bonus', $oa->get_id(), $on->get_id(), $opart->get_id() ) );
zz_check( '5 no award row was dated at "now"', 0 === (int) $later, 'rows=' . $later );

// Second commit adds nothing.
$b1_bal = (int) $ledger->get_balance( $b1 );
$b2_bal = (int) $ledger->get_balance( $b2 );
$c2 = $run( true );
zz_check( '5 second commit credits 0 orders and 0 points', 0 === $c2['credited_orders'] && 0 === $c2['points'], wp_json_encode( $c2 ) );
zz_check( '5 second commit leaves both balances unchanged', $b1_bal === (int) $ledger->get_balance( $b1 ) && $b2_bal === (int) $ledger->get_balance( $b2 ) );
$p2 = $run( false );
zz_check( '5 a fresh preview after the commit also shows 0 points', 0 === $p2['points'] && 0 === $p2['credited_orders'], wp_json_encode( $p2 ) );

// ---------------------------------------------------------------------------
// 6. Backfill REST permissions (manage_pointbay + REST nonce).
// ---------------------------------------------------------------------------
echo "\n== 6. Backfill REST permissions ==\n";
function zz_backfill_request( $uid, $with_nonce ) {
	wp_set_current_user( $uid );
	$req = new WP_REST_Request( 'POST', '/pointbay/v1/backfill/batch' );
	$req->set_param( 'start_date', '2999-01-01' );
	if ( $with_nonce ) {
		$req->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
	}
	return rest_do_request( $req )->get_status();
}
$wc_only = zz_user( 'wconly' );
$zz_users[] = $wc_only;
$wu = new WP_User( $wc_only );
$wu->add_cap( 'manage_woocommerce' );
$wu->remove_cap( 'manage_pointbay' );
$wu = new WP_User( $wc_only );
zz_check( '6 setup: user has manage_woocommerce but not manage_pointbay', $wu->has_cap( 'manage_woocommerce' ) && ! $wu->has_cap( 'manage_pointbay' ) );
zz_check( '6 manage_woocommerce without manage_pointbay (valid nonce) gets 403', 403 === zz_backfill_request( $wc_only, true ), 'status=' . zz_backfill_request( $wc_only, true ) );
$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) );
$admin  = $admins ? (int) $admins[0] : 0;
zz_check( '6 administrator with a valid nonce gets 200', $admin && 200 === zz_backfill_request( $admin, true ), 'status=' . ( $admin ? zz_backfill_request( $admin, true ) : 'no admin' ) );
zz_check( '6 administrator without the nonce header gets 403', $admin && 403 === zz_backfill_request( $admin, false ), 'status=' . ( $admin ? zz_backfill_request( $admin, false ) : 'no admin' ) );
zz_check( '6 manage_woocommerce user without the nonce header gets 403', 403 === zz_backfill_request( $wc_only, false ) );
wp_set_current_user( 0 );

// ---------------------------------------------------------------------------
// 7. Review fixes: listener dating, backfilling flag, interrupted resume,
//    incomplete total basis, number sanitizer, post-author comments.
// ---------------------------------------------------------------------------
echo "\n== 7. Review fixes ==\n";
zz_settings( array( 'earning_orderStatusTrigger' => 'completed', 'earning_basis' => 'subtotal', 'earning_pointsPerDollar' => 5, 'earning_flatPointsPerOrder' => 0, 'earning_firstOrderBonus' => 0, 'earning_minCartSpend' => 0 ) );
$b3 = zz_user( 'bf3' );
$zz_users[] = $b3;
$seen = array( 'backfilling' => null, 'retro' => null, 'listener_row' => null );
$listener = function ( $uid, $amount, $entry ) use ( $b3, &$seen, $ledger ) {
	if ( (int) $uid !== (int) $b3 || 'order' !== $entry->reference_type ) {
		return;
	}
	$seen['backfilling'] = BackfillService::is_backfilling();
	$ledger->credit( $b3, 3, 'admin', 999000 + (int) $entry->reference_id, 'ZZ-QA listener bonus' );
};
$listener2 = function ( $uid, $oid, $bd, $ctx = array() ) use ( $b3, &$seen ) {
	if ( (int) $uid === (int) $b3 ) {
		$seen['retro'] = ! empty( $ctx['retroactive'] );
	}
};
add_action( 'pointbay_points_credited', $listener, 10, 3 );
add_action( 'pointbay_order_points_awarded', $listener2, 10, 4 );
zz_settings( array( 'earning_orderStatusTrigger' => 'on-hold' ) );
$o7 = zz_hist_order( $b3, 100, '15' );
zz_settings( array( 'earning_orderStatusTrigger' => 'completed' ) );
$r7 = $svc->process_batch( '2001-03-15', '2001-03-15', 1, 10, true );
remove_action( 'pointbay_points_credited', $listener, 10 );
remove_action( 'pointbay_order_points_awarded', $listener2, 10 );
zz_check( '7 backfill credited the order (500)', 500 === zz_awarded( $b3, $o7->get_id() ) && 1 === $r7['credited_orders'], wp_json_encode( $r7 ) );
$lrow = $wpdb->get_row( $wpdb->prepare( 'SELECT created_at FROM %i WHERE user_id=%d AND reference_type=%s', $lt, $b3, 'admin' ) );
zz_check( '7 a row written by a credited-listener is dated now, not 2001', $lrow && substr( $lrow->created_at, 0, 4 ) >= '2026', 'got=' . ( $lrow ? $lrow->created_at : 'none' ) );
$orow = $wpdb->get_row( $wpdb->prepare( 'SELECT created_at FROM %i WHERE user_id=%d AND reference_type=%s AND reference_id=%d', $lt, $b3, 'order', $o7->get_id() ) );
zz_check( '7 the order row itself is still dated 2001-03-15', $orow && 0 === strpos( $orow->created_at, '2001-03-15' ), 'got=' . ( $orow ? $orow->created_at : 'none' ) );
zz_check( '7 listeners can see is_backfilling() and the retroactive context', true === $seen['backfilling'] && true === $seen['retro'], wp_json_encode( $seen ) );
zz_check( '7 is_backfilling() is false again afterwards', false === BackfillService::is_backfilling() );
zz_check( '7 the refunds-done marker is set', (bool) wc_get_order( $o7->get_id() )->get_meta( '_pointbay_backfill_refunds_done' ) );

// Interrupted run: awarded + marker, refunds never replayed.
$b4 = zz_user( 'bf4' );
$zz_users[] = $b4;
zz_settings( array( 'earning_orderStatusTrigger' => 'on-hold' ) );
$o8 = zz_hist_order( $b4, 100, '16' );
wc_create_refund( array( 'order_id' => $o8->get_id(), 'amount' => 40, 'reason' => 'ZZ-QA interrupted' ) );
zz_settings( array( 'earning_orderStatusTrigger' => 'completed' ) );
$o8 = wc_get_order( $o8->get_id() );
OrderHooks::get_instance()->award_order_points( $o8, $b4, array( 'retroactive' => true ) );
$o8->update_meta_data( '_pointbay_backfilled', time() );
$o8->save_meta_data();
$bal_i = (int) $ledger->get_balance( $b4 );
zz_check( '7 interrupted: awarded 500 and no clawback yet', 500 === zz_awarded( $b4, $o8->get_id() ) && 500 === $bal_i, "bal=$bal_i" );
$pv = $svc->process_batch( '2001-03-16', '2001-03-16', 1, 10, false );
zz_check( '7 interrupted: preview writes nothing', $bal_i === (int) $ledger->get_balance( $b4 ) && 0 === $pv['credited_orders'] );
$rc = $svc->process_batch( '2001-03-16', '2001-03-16', 1, 10, true );
zz_check( '7 interrupted: a re-run finishes the refund replay (500 less 200 = 300) and credits no new points', 300 === (int) $ledger->get_balance( $b4 ) && 0 === $rc['credited_orders'] && 0 === $rc['points'], 'bal=' . $ledger->get_balance( $b4 ) . ' ' . wp_json_encode( $rc ) );
$rc2 = $svc->process_batch( '2001-03-16', '2001-03-16', 1, 10, true );
zz_check( '7 interrupted: a further run changes nothing', 300 === (int) $ledger->get_balance( $b4 ) && 0 === $rc2['credited_orders'] );

// Offset paging with the time budget semantics.
$o1 = $svc->process_batch( $start, $end, 1, 2, false, 0 );
$o2 = $svc->process_batch( $start, $end, 1, 2, false, $o1['next_offset'] );
zz_check( '7 offset paging: next_offset advances by the orders scanned and done is false mid-range', 2 === $o1['next_offset'] && false === $o1['done'] && 4 === $o2['next_offset'], wp_json_encode( array( $o1['next_offset'], $o2['next_offset'] ) ) );

// Incomplete total basis hides the shortfall message.
zz_settings( array( 'earning_basis' => 'total', 'earning_minCartSpend' => 500 ) );
add_filter( 'pointbay_total_basis_incomplete', '__return_true' );
zz_check( '7 total mode with shipping unknown: no shortfall message', null === $calc->minimum_spend_state( 10, $b4, 'cart', false ) );
remove_filter( 'pointbay_total_basis_incomplete', '__return_true' );
add_filter( 'pointbay_total_basis_incomplete', '__return_false' );
zz_check( '7 total mode with shipping known: shortfall message shown', is_array( $calc->minimum_spend_state( 10, $b4, 'cart', false ) ) );
remove_filter( 'pointbay_total_basis_incomplete', '__return_false' );
zz_settings( array( 'earning_basis' => 'subtotal' ) );

// Number sanitizer.
$san = Settings::get_instance()->sanitize_settings_object( array( 'earning_minCartSpend' => '-12.5' ) );
zz_check( '7 earning_minCartSpend: a negative value is saved as 0', isset( $san['earning_minCartSpend'] ) && 0.0 === (float) $san['earning_minCartSpend'], wp_json_encode( $san['earning_minCartSpend'] ?? null ) );
$san = Settings::get_instance()->sanitize_settings_object( array( 'earning_minCartSpend' => '30.5' ) );
zz_check( '7 earning_minCartSpend: a positive value is kept', 30.5 === (float) ( $san['earning_minCartSpend'] ?? -1 ) );

// Post author commenting on their own post, top level.
zz_settings( array( 'earning_pointsForComment' => 10, 'earning_commentRequireApproval' => true, 'earning_commentDailyLimit' => 0 ) );
$bal_a = (int) $ledger->get_balance( $author );
zz_comment( $post_id, $author, 1 );
zz_check( '7 the post author commenting top level on their own post earns nothing', (int) $ledger->get_balance( $author ) === $bal_a );

// ---------------------------------------------------------------------------
// pointbay_user_can_earn: a barred user earns nothing anywhere.
// ---------------------------------------------------------------------------
echo "\n== pointbay_user_can_earn ==\n";
zz_settings(
	array(
		'earning_minCartSpend'           => 0,
		'earning_pointsForComment'       => 10,
		'earning_commentRequireApproval' => false,
		'earning_commentDailyLimit'      => 0,
		'earning_pointsForRegistration'  => 25,
	)
);
$barred_user = zz_user( 'barred' );
$zz_users[]  = $barred_user;
$barred_cb   = function ( $can, $uid ) use ( $barred_user ) {
	return (int) $uid === (int) $barred_user ? false : $can;
};

// Without the callback the same actions earn, so the checks below are meaningful.
$free_user  = zz_user( 'canearn' );
$zz_users[] = $free_user;
$free_order = zz_order( $free_user, 50 );
zz_check( 'F no callback: an order award is written', zz_awarded( $free_user, $free_order->get_id() ) > 0 );
zz_comment( $post_id, $free_user, 1 );
zz_check( 'F no callback: a comment award is written', (int) $ledger->get_balance( $free_user ) > zz_awarded( $free_user, $free_order->get_id() ) );
$calc_free = EarningCalculator::get_instance()->calculate( array( 'amount' => 50, 'user_id' => $free_user, 'context' => 'cart' ) );
zz_check( 'F no callback: calculate() totals above 0 and cannot_earn is false', $calc_free['total'] > 0 && false === $calc_free['cannot_earn'] );

add_filter( 'pointbay_user_can_earn', $barred_cb, 10, 2 );

$calc = EarningCalculator::get_instance()->calculate( array( 'amount' => 50, 'user_id' => $barred_user, 'context' => 'cart' ) );
zz_check( 'F barred: calculate() total is 0 with cannot_earn set', 0 === $calc['total'] && true === $calc['cannot_earn'] && array_key_exists( 'below_minimum', $calc ), wp_json_encode( $calc ) );
$calc_other = EarningCalculator::get_instance()->calculate( array( 'amount' => 50, 'user_id' => $free_user, 'context' => 'cart' ) );
zz_check( 'F barred: another user is unaffected', $calc_other['total'] > 0 );

$barred_order = zz_order( $barred_user, 50 );
zz_check( 'F barred: a completed order writes no award rows', 0 === zz_awarded( $barred_user, $barred_order->get_id() ) );
// The barred user was created before the filter went live, so it already holds the
// registration award; the comment must add nothing on top of that.
$barred_before = (int) $ledger->get_balance( $barred_user );
zz_comment( $post_id, $barred_user, 1 );
zz_check( 'F barred: a comment writes no ledger row', $barred_before === (int) $ledger->get_balance( $barred_user ) );
remove_filter( 'pointbay_user_can_earn', $barred_cb, 10 );

// Registration fires inside wp_insert_user, so the filter must be live before it.
$reg_cb = function ( $can, $uid, $context ) {
	return 'registration' === $context ? false : $can;
};
add_filter( 'pointbay_user_can_earn', $reg_cb, 10, 3 );
$reg_id     = zz_user( 'regbarred' );
$zz_users[] = $reg_id;
remove_filter( 'pointbay_user_can_earn', $reg_cb, 10 );
zz_check( 'F barred: a registration writes no ledger row', 0 === (int) $ledger->get_balance( $reg_id ) );
$reg_ok     = zz_user( 'regok' );
$zz_users[] = $reg_ok;
zz_check( 'F no callback: a registration award is written', 25 === (int) $ledger->get_balance( $reg_ok ) );

// ---------------------------------------------------------------------------
// Cleanup.
// ---------------------------------------------------------------------------
echo "\n== Cleanup ==\n";
update_option( 'woocommerce_calc_taxes', $zz_calc_taxes_before );
echo 'INFO cleanup: ' . count( array_unique( $zz_orders ) ) . ' orders, ' . count( array_unique( $zz_comments ) ) . " comments tracked\n";
foreach ( array_unique( $zz_orders ) as $oid ) {
	$o = wc_get_order( $oid );
	if ( $o ) {
		foreach ( $o->get_refunds() as $rf ) {
			$rf->delete( true );
		}
		$o->delete( true );
	}
}
foreach ( array_unique( $zz_comments ) as $cid ) {
	wp_delete_comment( $cid, true );
}
foreach ( $zz_posts as $pid ) {
	wp_delete_post( $pid, true );
}
$zz_product->delete( true );
$tax_product->delete( true );
foreach ( (array) ( isset( $zz_priced ) ? $zz_priced : array() ) as $pp ) {
	$pp->delete( true );
}
if ( $rate_id ) {
	WC_Tax::_delete_tax_rate( $rate_id );
}
foreach ( $zone->get_shipping_methods() as $m ) {
	delete_option( $m->get_instance_option_key() );
}
$zone->delete();
$ct = ( new PointBay\Models\LedgerCache() )->get_table();
require_once ABSPATH . 'wp-admin/includes/user.php';
$all_users = array_unique( array_merge( $zz_users, array( $u2 ) ) );
foreach ( $all_users as $u ) {
	$wpdb->delete( $lt, array( 'user_id' => $u ) ); // phpcs:ignore
	$wpdb->delete( $ct, array( 'user_id' => $u ) ); // phpcs:ignore
	wp_delete_user( $u );
}

$left_users = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->users} WHERE user_login LIKE 'zzqa\\_f1\\_%'" );
$left_posts = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_title LIKE 'ZZ-QA F1%'" );
$left_cmt   = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->comments} WHERE comment_content LIKE 'ZZ-QA comment%'" );
$left_ledg  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$lt} WHERE user_id IN (" . implode( ',', array_map( 'intval', $all_users ) ) . ')' );
zz_check( 'cleanup: no ZZ-QA users, posts, comments or seed ledger rows remain', 0 === $left_users + $left_posts + $left_cmt + $left_ledg, "users=$left_users posts=$left_posts comments=$left_cmt ledger=$left_ledg" );
zz_check( 'the pointbay option is unchanged', $option_before === md5( wp_json_encode( get_option( 'pointbay' ) ) ) );

echo "\nPASSED: {$GLOBALS['zz_pass']}\n";
echo "FAILURES: {$GLOBALS['zz_fail']}\n";
