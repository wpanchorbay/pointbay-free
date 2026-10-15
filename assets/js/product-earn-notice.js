/**
 * Keeps the product-page earn notice in step with the chosen variation.
 *
 * Deliberately does no arithmetic. Every figure it displays was computed on the
 * server by EarningCalculator and handed over as a lookup table keyed by
 * variation ID, because that is the only way the notice can promise the number
 * the order will actually award. Recomputing a rate here would reintroduce
 * exactly the drift this feature was built to remove, and could not reproduce
 * band ladders or per-order bonuses in any case.
 */
( function ( $ ) {
	'use strict';

	if ( typeof window.pointbay_product_earn === 'undefined' ) {
		return;
	}

	var data = window.pointbay_product_earn;

	function notice() {
		return document.querySelector( '.pointbay-product-earn-notice' );
	}

	function render( template, points ) {
		var el = notice();

		if ( ! el ) {
			return;
		}

		// The templates are translated strings carrying a single %s and a
		// <strong> wrapper, both authored server-side.
		el.innerHTML = template.replace( '%s', String( points ) );
	}

	$( document ).on( 'found_variation', 'form.variations_form', function ( event, variation ) {
		if ( ! variation || ! variation.variation_id ) {
			return;
		}

		var points = data.points[ variation.variation_id ];

		// A variation missing from the table (unpurchasable, or priced at zero
		// when the page rendered) leaves the existing text alone rather than
		// showing a wrong or empty figure.
		if ( typeof points === 'undefined' ) {
			return;
		}

		render( data.selected, points );
	} );

	$( document ).on( 'reset_data', 'form.variations_form', function () {
		var el = notice();

		if ( ! el ) {
			return;
		}

		render( data.range, el.getAttribute( 'data-pointbay-default' ) );
	} );
} )( jQuery );
