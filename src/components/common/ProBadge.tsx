import React from "react";
import { __ } from "@wordpress/i18n";

/**
 * Small "PRO" pill placed next to a locked section's title so the
 * upsell reads as intentional at a glance, not a broken/missing feature.
 */
export const ProBadge: React.FC = () => (
  <span className="pointbay-inline-flex pointbay-items-center pointbay-ml-2 pointbay-px-2 pointbay-py-0.5 pointbay-rounded-full pointbay-text-[10px] pointbay-font-bold pointbay-tracking-wide pointbay-align-middle pointbay-bg-[#8a5cf6] pointbay-text-white">
    {__("PRO", "pointbay-loyalty-points-referral-rewards-woo")}
  </span>
);
