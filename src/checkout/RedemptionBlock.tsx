// @ts-nocheck
// Imported rather than destructured off window.wp.i18n: webpack renames a
// destructured local, so `wp i18n make-pot` stops recognising the __() calls
// and silently drops those strings from the .pot.
import { __, sprintf } from '@wordpress/i18n';

const { useState } = window.wp.element;
const { useDispatch } = window.wp.data;

const RedemptionBlock = () => {
    const data = {
        ...((window.wc && window.wc.wcSettings ? window.wc.wcSettings.getSetting( 'loyaltybay_checkout_data' ) : null) || {}),
        ...(window.loyaltybay_checkout_data || {})
    };
    window.loyaltybay_checkout_data = data;

    const maxPoints = parseInt(data.max_points, 10) || 0;
    const appliedPoints = parseInt(data.applied_points, 10) || 0;
    const balance = parseInt(data.balance, 10) || 0;
    const pointsValue = parseFloat(data.points_value) || 0;

    // Hooks must always run in the same order regardless of data/props, so
    // they're called unconditionally before any early returns below.
    const [points, setPoints] = useState(maxPoints > 0 ? maxPoints : appliedPoints);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const cartDispatch = useDispatch('wc/store/cart');

    if (!data.is_logged_in) return null;

    // We must return early if there are no points to redeem, UNLESS points are already applied (so they can be removed)
    if (maxPoints <= 0 && appliedPoints <= 0) return null;

    const formatPrice = (amount) => {
        const pos = data.currency_pos;
        const sym = data.currency_sym;
        const formatted = parseFloat(amount).toFixed(2);
        if (pos === 'left') return sym + formatted;
        if (pos === 'right') return formatted + sym;
        if (pos === 'left_space') return sym + ' ' + formatted;
        if (pos === 'right_space') return formatted + ' ' + sym;
        return sym + formatted;
    };

    const triggerCartUpdate = () => {
        // Ask the WC Store API cart store to re-fetch totals in place, instead
        // of reloading the page and discarding any in-progress checkout form
        // state (e.g. a partially filled shipping address).
        if (cartDispatch && typeof cartDispatch.invalidateResolutionForStoreSelector === 'function') {
            cartDispatch.invalidateResolutionForStoreSelector('getCartData');
        } else {
            window.location.reload();
        }
    };

    const applyPoints = async () => {
        setLoading(true);
        setError('');
        try {
            await window.jQuery.ajax({
                url: data.rest_url,
                method: 'POST',
                beforeSend: (xhr) => xhr.setRequestHeader('X-WP-Nonce', data.nonce),
                data: { points: points },
            });
            window.loyaltybay_checkout_data.applied_points = points;
            triggerCartUpdate();
        } catch (e) {
            setError(e.responseJSON?.message || 'An error occurred.');
        }
        setLoading(false);
    };

    const removePoints = async () => {
        setLoading(true);
        setError('');
        try {
            await window.jQuery.ajax({
                url: data.rest_url,
                method: 'DELETE',
                beforeSend: (xhr) => xhr.setRequestHeader('X-WP-Nonce', data.nonce),
            });
            window.loyaltybay_checkout_data.applied_points = 0;
            triggerCartUpdate();
        } catch (e) {
            setError('An error occurred.');
        }
        setLoading(false);
    };

    if (appliedPoints > 0) {
        const discountStr = formatPrice(appliedPoints * pointsValue);
        return (
            <div className="wc-block-components-totals-wrapper">
                <div className="wc-block-components-totals-item">
                    <span className="wc-block-components-totals-item__label">
                        {sprintf(__('Awesome! You have redeemed %d points for a %s discount.', 'loyaltybay-loyalty-points-referral-rewards-woo'), appliedPoints, discountStr)}
                    </span>
                    <button 
                        onClick={removePoints} 
                        disabled={loading}
                        className="components-button is-link wc-block-components-totals-item__value"
                        style={{ color: '#ef4444', textDecoration: 'none', fontWeight: 500 }}
                    >
                        {loading ? __('Removing...', 'loyaltybay-loyalty-points-referral-rewards-woo') : __('Remove', 'loyaltybay-loyalty-points-referral-rewards-woo')}
                    </button>
                </div>
            </div>
        );
    }

    const discount = formatPrice(points * pointsValue);

    return (
        <div className="wc-block-components-totals-wrapper">
            <div className="wc-block-components-panel wc-block-components-totals-coupon">
                <h3 className="wc-block-components-panel__title" style={{ fontSize: '1em' }}>
                    {__('Redeem Loyalty Points', 'loyaltybay-loyalty-points-referral-rewards-woo')}
                </h3>
                <div className="wc-block-components-panel__content">
                    <p style={{ marginBottom: '12px', fontSize: '0.875em' }}>
                        {sprintf(__('You have %d points available. (Max %d points for this order).', 'loyaltybay-loyalty-points-referral-rewards-woo'), balance, maxPoints)}
                    </p>
                    
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875em' }}>
                            <span>{__('Slide to adjust points:', 'loyaltybay-loyalty-points-referral-rewards-woo')}</span>
                            <span>{sprintf(__('1 pt = %s', 'loyaltybay-loyalty-points-referral-rewards-woo'), formatPrice(pointsValue))}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max={maxPoints} 
                            value={points} 
                            onChange={(e) => setPoints(parseInt(e.target.value, 10))}
                            style={{ width: '100%', cursor: 'pointer' }} 
                        />
                    </div>

                    <div className="wc-block-components-totals-coupon__form">
                        <div className={`wc-block-components-text-input wc-block-components-totals-coupon__input ${points !== '' && points !== null ? 'is-active' : ''}`}>
                            <input 
                                type="number" 
                                className="wc-block-components-text-input__input"
                                min="0" 
                                max={maxPoints} 
                                value={points} 
                                onChange={(e) => {
                                    let val = parseInt(e.target.value, 10);
                                    if (isNaN(val)) val = 0;
                                    if (val > maxPoints) val = maxPoints;
                                    if (val < 0) val = 0;
                                    setPoints(val);
                                }}
                            />
                            <label className="wc-block-components-text-input__label">{__('Points to redeem', 'loyaltybay-loyalty-points-referral-rewards-woo')}</label>
                        </div>
                        <button 
                            className="wc-block-components-button wp-element-button wc-block-components-totals-coupon__button contained"
                            onClick={applyPoints}
                            disabled={loading}
                        >
                            <span className="wc-block-components-button__text">
                                {loading ? __('Applying...', 'loyaltybay-loyalty-points-referral-rewards-woo') : sprintf(__('Apply %s Discount', 'loyaltybay-loyalty-points-referral-rewards-woo'), discount)}
                            </span>
                        </button>
                    </div>
                    {error && (
                        <div className="wc-block-components-notice-banner is-error">
                            <svg className="wc-block-components-notice-banner__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 4.3l7.9 13.4H4.1L12 4.3zm0-2.6L1.4 19h21.2L12 1.7z"></path><path d="M11 9h2v5h-2zm1 8c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"></path></svg>
                            <div className="wc-block-components-notice-banner__content">{error}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RedemptionBlock;
