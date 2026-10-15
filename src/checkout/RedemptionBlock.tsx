// @ts-nocheck
// Imported rather than destructured off window.wp.i18n: webpack renames a
// destructured local, so `wp i18n make-pot` stops recognising the __() calls
// and silently drops those strings from the .pot.
import { __, sprintf } from '@wordpress/i18n';

const { useState, useEffect } = window.wp.element;
const { useDispatch } = window.wp.data;

const RedemptionBlock = () => {
    const data = {
        ...((window.wc && window.wc.wcSettings ? window.wc.wcSettings.getSetting( 'pointbay_checkout_data' ) : null) || {}),
        ...(window.pointbay_checkout_data || {})
    };
    window.pointbay_checkout_data = data;

    const maxPoints = parseInt(data.max_points, 10) || 0;
    const appliedPoints = parseInt(data.applied_points, 10) || 0;
    const balance = parseInt(data.balance, 10) || 0;
    const pointsValue = parseFloat(data.points_value) || 0;
    // Off means all-or-nothing: no slider, no amount field, one button that
    // spends the whole allowance.
    const allowPartial = data.allow_partial !== false;

    // Hooks must always run in the same order regardless of data/props, so
    // they're called unconditionally before any early returns below.
    const [points, setPoints] = useState(maxPoints > 0 ? maxPoints : appliedPoints);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const cartDispatch = useDispatch('wc/store/cart');

    // WooCommerce bakes `couponsEnabled` into the page at render time and never
    // re-reads it, so applying points over AJAX would otherwise leave the coupon
    // panel on screen. The server has already stopped accepting coupons at that
    // point (CartApplyCoupon checks wc_coupons_enabled), so this only hides a
    // form whose submissions are rejected anyway.
    useEffect(() => {
        if (!data.hide_coupon_form) return;
        document.body.classList.toggle('pointbay-points-applied', appliedPoints > 0);
    }, [appliedPoints, data.hide_coupon_form]);

    if (!data.is_logged_in) return null;

    // A customer who is not permitted to redeem is shown nothing at all, rather
    // than a control that would fail on submit.
    if (data.can_redeem === false) return null;

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
            const res = await window.jQuery.ajax({
                url: data.rest_url,
                method: 'POST',
                beforeSend: (xhr) => xhr.setRequestHeader('X-WP-Nonce', data.nonce),
                data: { points: points },
            });
            window.pointbay_checkout_data.applied_points = points;
            if (res && res.discount !== undefined) window.pointbay_checkout_data.applied_discount = res.discount;
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
            window.pointbay_checkout_data.applied_points = 0;
            window.pointbay_checkout_data.applied_discount = 0;
            triggerCartUpdate();
        } catch (e) {
            setError('An error occurred.');
        }
        setLoading(false);
    };

    if (appliedPoints > 0) {
        const discountStr = formatPrice(data.applied_discount !== undefined ? parseFloat(data.applied_discount) : appliedPoints * pointsValue);
        return (
            <div className="wc-block-components-totals-wrapper">
                <div className="wc-block-components-totals-item">
                    <span className="wc-block-components-totals-item__label">
                        {sprintf(__('Awesome! You have redeemed %d points for a %s discount.', 'pointbay-loyalty-points-referral-rewards-woo'), appliedPoints, discountStr)}
                    </span>
                    <button 
                        onClick={removePoints} 
                        disabled={loading}
                        className="components-button is-link wc-block-components-totals-item__value"
                        style={{ color: '#ef4444', textDecoration: 'none', fontWeight: 500 }}
                    >
                        {loading ? __('Removing...', 'pointbay-loyalty-points-referral-rewards-woo') : __('Remove', 'pointbay-loyalty-points-referral-rewards-woo')}
                    </button>
                </div>
            </div>
        );
    }

    const discount = formatPrice(points === maxPoints && data.max_discount !== undefined ? parseFloat(data.max_discount) : points * pointsValue);

    return (
        <div className="wc-block-components-totals-wrapper">
            <div className="wc-block-components-panel wc-block-components-totals-coupon">
                <h3 className="wc-block-components-panel__title" style={{ fontSize: '1em' }}>
                    {__('Redeem Loyalty Points', 'pointbay-loyalty-points-referral-rewards-woo')}
                </h3>
                <div className="wc-block-components-panel__content">
                    <p style={{ marginBottom: '12px', fontSize: '0.875em' }}>
                        {sprintf(__('You have %d points available. (Max %d points for this order).', 'pointbay-loyalty-points-referral-rewards-woo'), balance, maxPoints)}
                    </p>
                    
                    {allowPartial && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875em' }}>
                            <span>{__('Slide to adjust points:', 'pointbay-loyalty-points-referral-rewards-woo')}</span>
                            <span>{sprintf(__('1 pt = %s', 'pointbay-loyalty-points-referral-rewards-woo'), formatPrice(pointsValue))}</span>
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
                    )}

                    <div className="wc-block-components-totals-coupon__form">
                        {allowPartial && (
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
                            <label className="wc-block-components-text-input__label">{__('Points to redeem', 'pointbay-loyalty-points-referral-rewards-woo')}</label>
                        </div>
                        )}
                        <button 
                            className="wc-block-components-button wp-element-button wc-block-components-totals-coupon__button contained"
                            onClick={applyPoints}
                            disabled={loading}
                        >
                            <span className="wc-block-components-button__text">
                                {loading ? __('Applying...', 'pointbay-loyalty-points-referral-rewards-woo') : sprintf(__('Apply %s Discount', 'pointbay-loyalty-points-referral-rewards-woo'), discount)}
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
