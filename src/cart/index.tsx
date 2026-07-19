// @ts-nocheck
const { registerPlugin } = window.wp.plugins;
const ExperimentalOrderMeta = window.wc && window.wc.blocksCheckout ? window.wc.blocksCheckout.ExperimentalOrderMeta : null;

import EarnNoticeBlock from '../checkout/EarnNoticeBlock';

const LoyaltyBayCart = () => {
    if (!ExperimentalOrderMeta) return null;
    return (
        <ExperimentalOrderMeta>
            <EarnNoticeBlock />
        </ExperimentalOrderMeta>
    );
};

registerPlugin('loyaltybay-cart', {
    render: LoyaltyBayCart,
    scope: 'woocommerce-checkout',
});
