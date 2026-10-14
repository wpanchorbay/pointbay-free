// @ts-nocheck
import { __ } from '@wordpress/i18n';

/**
 * Replaces the raw `pointbay_points_<hash>` coupon label with a friendly one in
 * the block cart and checkout. Only the label changes; the coupon code, which
 * the server uses to recognise the points coupon, is left alone.
 */
export const registerPointsCouponLabel = () => {
	const registerCheckoutFilters = window.wc?.blocksCheckout?.registerCheckoutFilters;
	if ( ! registerCheckoutFilters ) {
		return;
	}

	registerCheckoutFilters( 'pointbay-coupon-label', {
		coupons: ( coupons ) =>
			Array.isArray( coupons )
				? coupons.map( ( coupon ) => {
						const text = String( coupon?.label || coupon?.code || '' ).toLowerCase();
						return text.indexOf( 'pointbay_points_' ) === -1
							? coupon
							: {
									...coupon,
									label: __( 'Points discount', 'pointbay-loyalty-points-referral-rewards-woo' ),
							  };
				  } )
				: coupons,
	} );
};
