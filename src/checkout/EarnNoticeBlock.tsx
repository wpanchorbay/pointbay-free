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

    if (!cart) return null;

    // The figure is computed on the server by EarningCalculator — the same
    // class that writes the award — and published on the cart through the Store
    // API, so WooCommerce refreshes it on every cart mutation.
    //
    // This block deliberately does no arithmetic of its own. It used to
    // multiply a rate by a tier multiplier here, which silently stopped being
    // the whole story once earning could also come from a band table, a flat
    // per-order bonus or a first-order bonus. Rendering nothing when the
    // extension data is absent is the right failure: a missing notice is
    // recoverable, a confidently wrong number is not.
    const pointbay = cart.extensions && cart.extensions.pointbay;

    if (!pointbay) return null;

    const points_to_award = parseInt(pointbay.earn_points, 10) || 0;

    const data = {
        ...((window.wc && window.wc.wcSettings ? window.wc.wcSettings.getSetting( 'pointbay_checkout_data' ) : null) || {}),
        ...((window.wc && window.wc.wcSettings ? window.wc.wcSettings.getSetting( 'pointbay_cart_data' ) : null) || {}),
        ...(window.pointbay_checkout_data || {}),
        ...(window.pointbay_cart_data || {})
    };

    const isLoggedIn = data.is_logged_in;

    // Under the minimum spend the server sends a ready-made message instead of
    // a points figure; it is plain text, rendered as such.
    if (isLoggedIn && pointbay.below_minimum === true && pointbay.min_spend_message) {
        return (
            <div className="wc-block-components-totals-wrapper pointbay-earn-notice--minimum">
                <div className="wc-block-components-totals-item">
                    <span className="wc-block-components-totals-item__label" style={{ color: '#111827', fontWeight: 500 }}>
                        {pointbay.min_spend_message}
                    </span>
                </div>
            </div>
        );
    }

    if (points_to_award <= 0) return null;

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
