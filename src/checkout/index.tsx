// @ts-nocheck
const { registerPlugin } = window.wp.plugins;
const ExperimentalOrderMeta = window.wc && window.wc.blocksCheckout ? window.wc.blocksCheckout.ExperimentalOrderMeta : null;

import { registerPointsCouponLabel } from '../utils/couponLabel';
import EarnNoticeBlock from './EarnNoticeBlock';
import RedemptionBlock from './RedemptionBlock';

const PointBayCheckout = () => {
    if (!ExperimentalOrderMeta) return null;
    
    return (
        <ExperimentalOrderMeta>
            <EarnNoticeBlock />
            <RedemptionBlock />
        </ExperimentalOrderMeta>
    );
};

registerPointsCouponLabel();

registerPlugin('pointbay-checkout', {
    render: PointBayCheckout,
    scope: 'woocommerce-checkout',
});
