// @ts-nocheck
// Imported rather than destructured off window.wp.i18n: webpack renames a
// destructured local, so `wp i18n make-pot` stops recognising the __() calls
// and silently drops those strings from the .pot.
import { __, sprintf } from '@wordpress/i18n';

const { useSelect } = window.wp.data;

const EarnNoticeBlock = () => {
    // Get cart data from the WooCommerce data store
    const cart = useSelect((select) => {
        const store = select('wc/store/cart');
        return store ? store.getCartData() : null;
    }, []);

    if (!cart || !cart.totals) return null;

    // Cart totals are typically in minor units (e.g., cents).
    const subtotalMinor = parseInt(cart.totals.total_items, 10) || 0; 
    const minorUnit = cart.totals.currency_minor_unit !== undefined ? cart.totals.currency_minor_unit : 2;
    const divisor = Math.pow(10, minorUnit);
    
    const cartSubtotal = subtotalMinor / divisor;

    const data = {
        ...((window.wc && window.wc.wcSettings ? window.wc.wcSettings.getSetting( 'pointbay_checkout_data' ) : null) || {}),
        ...((window.wc && window.wc.wcSettings ? window.wc.wcSettings.getSetting( 'pointbay_cart_data' ) : null) || {}),
        ...(window.pointbay_checkout_data || {}),
        ...(window.pointbay_cart_data || {})
    };

    // Mirrors the server-side calculation in app/Checkout/EarnNotice.php and
    // app/Hooks/OrderHooks.php, using the admin-configured rate and the
    // customer's tier multiplier instead of a hardcoded ratio, so the estimate
    // shown here matches what will actually be awarded.
    const points_per_dollar = parseInt(data.points_per_dollar, 10) || 1;
    const earning_multiplier = parseFloat(data.earning_multiplier) || 1;

    const appliedPoints = parseInt(data.applied_points, 10) || 0;
    const pointsValue = parseFloat(data.points_value) || 0;
    let finalSubtotal = cartSubtotal;

    if (appliedPoints > 0) {
        finalSubtotal -= (appliedPoints * pointsValue);
        if (finalSubtotal < 0) finalSubtotal = 0;
    }

    const points_to_award = Math.floor(finalSubtotal * points_per_dollar * earning_multiplier);

    if (points_to_award <= 0) return null;

    const isLoggedIn = data.is_logged_in;

    if (!isLoggedIn) {
        return (
            <div className="wc-block-components-totals-wrapper">
                <div className="wc-block-components-totals-item">
                    <span className="wc-block-components-totals-item__label" style={{ color: '#374151' }}>
                        {sprintf(
                            __('Create an account to earn %d points on this order!', 'pointbay-loyalty-points-referral-rewards-woo'),
                            points_to_award
                        )}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="wc-block-components-totals-wrapper">
            <div className="wc-block-components-totals-item">
                <span className="wc-block-components-totals-item__label" style={{ color: '#111827', fontWeight: 500 }}>
                    {sprintf(
                        __('Complete this order to earn %d points!', 'pointbay-loyalty-points-referral-rewards-woo'),
                        points_to_award
                    )}
                </span>
            </div>
        </div>
    );
};

export default EarnNoticeBlock;
