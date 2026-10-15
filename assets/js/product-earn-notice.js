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
	var initial = null;

	function notice() {
		return document.querySelector( '.pointbay-product-earn-notice' );
	}

	// The server-rendered state is what reset_data restores; it is captured once
	// rather than recomputed, so the script never has to know how it was built.
	function capture() {
		var el = notice();

		if ( el && ! initial ) {
			initial = {
				html: el.innerHTML,
				className: el.className,
				display: el.style.display
			};
		}
	}

	function render( template, points ) {
		var el = notice();

		if ( ! el ) {
			return;
		}

		// The template is a translated string carrying a single %s and a
		// <strong> wrapper, authored server-side.
		el.className = 'pointbay-product-earn-notice';
		el.style.display = '';
		el.innerHTML = template.replace( '%s', String( points ) );
	}

	function renderMessage( text ) {
		var el = notice();

		if ( ! el ) {
			return;
		}

		// Plain text from the server: never parsed as HTML.
		el.className = 'pointbay-product-earn-notice pointbay-product-earn-notice--minimum';
		el.style.display = text === '' ? 'none' : '';
		el.textContent = text;
	}

	capture();

	$( document ).on( 'found_variation', 'form.variations_form', function ( event, variation ) {
		if ( ! variation || ! variation.variation_id ) {
			return;
		}

		capture();

		var id = variation.variation_id;

		if ( data.messages && Object.prototype.hasOwnProperty.call( data.messages, id ) ) {
			renderMessage( String( data.messages[ id ] ) );
			return;
		}

		var points = data.points[ id ];

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

		if ( ! el || ! initial ) {
			return;
		}

		el.className = initial.className;
		el.style.display = initial.display;
		el.innerHTML = initial.html;
	} );
} )( jQuery );
