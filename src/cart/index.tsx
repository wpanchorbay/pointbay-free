// @ts-nocheck
const { registerPlugin } = window.wp.plugins;
const ExperimentalOrderMeta = window.wc && window.wc.blocksCheckout ? window.wc.blocksCheckout.ExperimentalOrderMeta : null;

import { registerPointsCouponLabel } from '../utils/couponLabel';
import EarnNoticeBlock from '../checkout/EarnNoticeBlock';

const PointBayCart = () => {
    if (!ExperimentalOrderMeta) return null;
    return (
        <ExperimentalOrderMeta>
            <EarnNoticeBlock />
        </ExperimentalOrderMeta>
    );
};

registerPointsCouponLabel();

registerPlugin('pointbay-cart', {
    render: PointBayCart,
    scope: 'woocommerce-checkout',
});
