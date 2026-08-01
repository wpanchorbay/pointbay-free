/**
 * My Rewards account page behaviour.
 *
 * Currently just the referral link copy button. Delegated from the document so
 * it keeps working regardless of when the block is rendered into the page.
 *
 * @package PointBay
 * @since   1.1.0
 */
( function () {
	'use strict';

	var strings = window.pointbay_my_rewards || {};

	/**
	 * Briefly replace the status text, then clear it.
	 *
	 * @param {HTMLElement} el      Status element.
	 * @param {string}      message Message to announce.
	 */
	function announce( el, message ) {
		if ( ! el ) {
			return;
		}
		el.textContent = message;
		window.setTimeout( function () {
			el.textContent = '';
		}, 2000 );
	}

	/**
	 * Copy an input's value without the async Clipboard API.
	 *
	 * navigator.clipboard is unavailable outside secure contexts, which
	 * includes plain-http staging sites, so this stays as the fallback.
	 *
	 * @param {HTMLInputElement} input The field to copy from.
	 * @return {boolean} Whether the copy succeeded.
	 */
	function legacyCopy( input ) {
		input.focus();
		input.select();
		input.setSelectionRange( 0, 99999 );

		try {
			return document.execCommand( 'copy' );
		} catch ( e ) {
			return false;
		}
	}

	document.addEventListener( 'click', function ( event ) {
		var button = event.target.closest( '.pointbay-copy-referral' );
		if ( ! button ) {
			return;
		}

		event.preventDefault();

		var input = document.getElementById( button.getAttribute( 'data-pointbay-target' ) );
		var status = document.getElementById( button.getAttribute( 'data-pointbay-status' ) );

		if ( ! input ) {
			return;
		}

		if ( navigator.clipboard && window.isSecureContext ) {
			navigator.clipboard.writeText( input.value ).then(
				function () {
					announce( status, strings.copied || 'Copied!' );
				},
				function () {
					announce(
						status,
						legacyCopy( input )
							? strings.copied || 'Copied!'
							: strings.failed || 'Press Ctrl+C to copy'
					);
				}
			);
			return;
		}

		announce(
			status,
			legacyCopy( input ) ? strings.copied || 'Copied!' : strings.failed || 'Press Ctrl+C to copy'
		);
	} );
}() );
