<?php
/**
 * The "you will earn X points" notice on a single product page.
 *
 * @package PointBay
 */

namespace PointBay\Checkout;

use PointBay\Services\EarningCalculator;
use PointBay\Core\Settings;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Shows the points a product would earn, at the point the shopper decides.
 *
 * The figure comes from EarningCalculator, so it is the same computation the
 * award performs — which is the whole reason this is worth showing. A preview
 * that quietly disagreed with what lands in the ledger would be worse than no
 * preview at all.
 *
 * @since 1.1.0
 */
class ProductEarnNotice {

	/**
	 * Script handle for the variation updater.
	 *
	 * @since 1.1.0
	 * @var string
	 */
	const HANDLE = 'pointbay-product-earn-notice';

	/**
	 * Above this many variations the per-variation table is not built.
	 *
	 * @since 1.1.0
	 * @var int
	 */
	const MAX_VARIATIONS = 50;

	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var ProductEarnNotice|null
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @since 1.1.0
	 * @return ProductEarnNotice
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers the hooks handled by this class.
	 *
	 * @since 1.1.0
	 * @param \PointBay\Core\Plugin $plugin The main plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		// Priority 11 puts the notice directly beneath the price, which core
		// renders at 10.
		$loader->add_action( 'woocommerce_single_product_summary', $this, 'display_notice', 11 );
		$loader->add_action( 'wp_enqueue_scripts', $this, 'register_assets' );
	}

	/**
	 * Registers the variation script without enqueueing it.
	 *
	 * Enqueued at render time inside display_notice() instead, following the
	 * same pattern as the referral block: the asset then cannot drift out of
	 * sync with where the notice actually appears, and costs nothing on every
	 * other page of the site.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function register_assets() {
		$path = \POINTBAY_PATH . 'assets/js/product-earn-notice.js';

		wp_register_script(
			self::HANDLE,
			\POINTBAY_URL . 'assets/js/product-earn-notice.js',
			array( 'jquery' ),
			file_exists( $path ) ? (string) filemtime( $path ) : \POINTBAY_VERSION,
			true
		);
	}

	/**
	 * Points each variation of a variable product would earn.
	 *
	 * Computed here, by the same calculator the award uses, and handed to the
	 * browser as a lookup table. The script does no arithmetic of its own —
	 * recomputing a rate client-side is exactly the drift this feature exists
	 * to avoid, and it could not reproduce bands or bonuses anyway.
	 *
	 * @since 1.1.0
	 * @param \WC_Product $product The variable product.
	 * @param array       $messages Receives variation ID => minimum-spend message (empty string
	 *                              hides the notice) for variations under the minimum.
	 * @return array Map of variation ID to points.
	 */
	private function get_variation_points( $product, &$messages = array() ) {
		$messages = array();

		$children = $product->get_children();

		// A product with hundreds of variations would turn this into a large
		// inline payload for a decorative figure. Past the cap the notice keeps
		// its "from" wording and simply does not update on selection.
		if ( ! $children || count( $children ) > self::MAX_VARIATIONS ) {
			return array();
		}

		$calculator = EarningCalculator::get_instance();
		$user_id    = get_current_user_id();
		$map        = array();

		foreach ( $children as $variation_id ) {
			$variation = wc_get_product( $variation_id );

			if ( ! $variation || ! $variation->is_purchasable() ) {
				continue;
			}

			$price = $this->get_price_for_basis( $variation );

			if ( $price <= 0 ) {
				continue;
			}

			$minimum_message = $this->get_minimum_message( $price );

			if ( null !== $minimum_message ) {
				$messages[ (int) $variation_id ] = $minimum_message;
			}

			$map[ (int) $variation_id ] = $calculator->total(
				array(
					'amount'              => $price,
					'user_id'             => $user_id,
					'include_first_order' => false,
					'context'             => 'product',
				)
			);
		}

		return $map;
	}

	/**
	 * The minimum-spend message for adding a price to the current cart.
	 *
	 * The projected basis is the cart as it stands plus this price. Returns null
	 * when the minimum is off or would be met, so the normal notice applies; an
	 * empty string when the minimum is not met but reaching it would earn
	 * nothing, so the notice should be hidden rather than promise points.
	 *
	 * @since 1.1.0
	 * @param float $price The product (or variation) price for the basis.
	 * @return string|null Plain-text message, '' for "show nothing", null for "not applicable".
	 */
	private function get_minimum_message( $price ) {
		$calculator = EarningCalculator::get_instance();

		if ( $calculator->get_min_spend() <= 0 ) {
			return null;
		}

		$projected = $calculator->resolve_cart_basis() + (float) $price;
		$state     = $calculator->minimum_spend_state( $projected, get_current_user_id(), 'cart', false );

		if ( ! $state ) {
			return null;
		}

		return (int) $state['points'] > 0 ? (string) $state['message'] : '';
	}

	/**
	 * The price to measure points against, matching the configured basis.
	 *
	 * Subtotal mode excludes tax, so a tax-inclusive shop must not feed its
	 * display price in; total mode keeps the price the shopper sees.
	 *
	 * @since 1.1.0
	 * @param \WC_Product $product The product or variation.
	 * @return float The price.
	 */
	private function get_price_for_basis( $product ) {
		if ( 'subtotal' === EarningCalculator::get_instance()->get_basis_mode() ) {
			return (float) wc_get_price_excluding_tax( $product );
		}

		return (float) wc_get_price_to_display( $product );
	}

	/**
	 * Hands the variation lookup tables to the script, when there is anything to switch.
	 *
	 * @since 1.1.0
	 * @param EarningCalculator $calculator       The calculator, for the basis wording.
	 * @param array             $variation_points Variation ID => points.
	 * @param array             $messages         Variation ID => minimum-spend message.
	 * @return void
	 */
	private function enqueue_data( $calculator, $variation_points, $messages ) {
		if ( ! $variation_points && ! $messages ) {
			return;
		}

		wp_enqueue_script( self::HANDLE );
		wp_localize_script(
			self::HANDLE,
			'pointbay_product_earn',
			array(
				'points'   => $variation_points,
				// Plain text, only for variations under the minimum spend. An
				// empty string means "show nothing". The script writes it with
				// textContent.
				'messages' => (object) $messages,
				// The template is rendered server-side with the wording already
				// chosen for the configured basis, so the script only
				// substitutes a number.
				'selected' => 'subtotal' === $calculator->get_basis_mode()
					/* translators: %s: number of points. */
					? __( 'Earn <strong>%s</strong> points with this product.', 'pointbay-loyalty-points-referral-rewards-woo' )
					/* translators: %s: number of points. */
					: __( 'Earn at least <strong>%s</strong> points with this product.', 'pointbay-loyalty-points-referral-rewards-woo' ),
			)
		);
	}

	/**
	 * Outputs the notice on a single product page.
	 *
	 * @since 1.1.0
	 * @return void
	 */
	public function display_notice() {
		$settings = Settings::get_instance();

		if ( ! $settings->get_settings( 'display_productNoticeEnabled' ) ) {
			return;
		}

		$product = function_exists( 'wc_get_product' ) ? wc_get_product() : null;

		if ( ! $product || ! $product->is_purchasable() ) {
			return;
		}

		$price = $this->get_price_for_basis( $product );

		if ( $price <= 0 ) {
			return;
		}

		$calculator  = EarningCalculator::get_instance();
		$is_variable = $product->is_type( 'variable' );

		$messages         = array();
		$variation_points = $is_variable ? $this->get_variation_points( $product, $messages ) : array();
		$minimum_message  = $this->get_minimum_message( $price );

		if ( null !== $minimum_message ) {
			$this->enqueue_data( $calculator, $variation_points, $messages );

			if ( '' !== $minimum_message ) {
				printf(
					'<p class="pointbay-product-earn-notice pointbay-product-earn-notice--minimum">%s</p>',
					esc_html( $minimum_message )
				);
			} elseif ( $variation_points || $messages ) {
				// Nothing worth promising yet, but the element must exist for
				// the variation script to fill in.
				echo '<p class="pointbay-product-earn-notice" style="display:none"></p>';
			}

			return;
		}

		// The order-level bonuses are deliberately treated differently here. The
		// flat per-order bonus is included, because from the shopper's side
		// "buy this and you get N" is a statement about the order they are about
		// to place. The first-order bonus is not: it is a one-time incentive
		// that a returning customer would never see, and promising it on every
		// product page would be a lie to most of the people reading it.
		$points = $calculator->total(
			array(
				'amount'              => $price,
				'user_id'             => get_current_user_id(),
				'include_first_order' => false,
				'context'             => 'product',
			)
		);

		if ( $points <= 0 ) {
			return;
		}

		// With earning based on the order total, a single product's price cannot
		// account for shipping or tax, so the honest phrasing is a floor rather
		// than an exact figure. On subtotal the number is exact.
		if ( 'subtotal' === $calculator->get_basis_mode() ) {
			$message = $is_variable
				/* translators: %d: number of points. */
				? sprintf( __( 'Earn from <strong>%d</strong> points with this product.', 'pointbay-loyalty-points-referral-rewards-woo' ), $points )
				/* translators: %d: number of points. */
				: sprintf( __( 'Earn <strong>%d</strong> points with this product.', 'pointbay-loyalty-points-referral-rewards-woo' ), $points );
		} else {
			$message = $is_variable
				/* translators: %d: number of points. */
				? sprintf( __( 'Earn from <strong>%d</strong> points with this product.', 'pointbay-loyalty-points-referral-rewards-woo' ), $points )
				/* translators: %d: number of points. */
				: sprintf( __( 'Earn at least <strong>%d</strong> points with this product.', 'pointbay-loyalty-points-referral-rewards-woo' ), $points );
		}

		$this->enqueue_data( $calculator, $variation_points, $messages );

		printf(
			'<p class="pointbay-product-earn-notice" data-pointbay-default="%s">%s</p>',
			esc_attr( $points ),
			wp_kses_post( $message )
		);
	}
}
