import React from "react";
import { __ } from "@wordpress/i18n";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import { ClassicCheckbox } from "../classics/ClassicCheckbox";
import { BuyProLock } from "../common/BuyProLock";
import { ProBadge } from "../common/ProBadge";

/**
 * Non-interactive snapshot of PointBayPro's TiersSettings.tsx, shown to free
 * users so they can see what the real Pro editor looks like before buying.
 * Static — not wired to live settings, since Pro isn't installed here.
 */
const STARTER_TIERS = [
  { name: "Bronze", threshold: 0, multiplier: 1.0 },
  { name: "Silver", threshold: 500, multiplier: 1.2 },
  { name: "Gold", threshold: 2000, multiplier: 1.5 },
];

export const VipTiersPreview: React.FC = () => (
  <ClassicSettingsTable
    title={
      <>
        {__("VIP Tiers", "pointbay-loyalty-points-referral-rewards-woo")}
        <ProBadge />
      </>
    }
    description={__(
      "Group customers into tiers with earning multipliers based on annual points.",
      "pointbay-loyalty-points-referral-rewards-woo",
    )}
    fields={[
      {
        id: "tiers_enabled_preview",
        label: __(
          "Enable VIP Tiers",
          "pointbay-loyalty-points-referral-rewards-woo",
        ),
        render: () => (
          <BuyProLock
            feature={__(
              "Reward repeat customers with a faster earning rate — only in PointBay Pro",
              "pointbay-loyalty-points-referral-rewards-woo",
            )}
          >
            <ClassicCheckbox
              checked={false}
              disabled
              onChange={() => {}}
              label={__(
                "Enable automatic tier recalculation",
                "pointbay-loyalty-points-referral-rewards-woo",
              )}
            />
            <div className="pointbay-mt-4 pointbay-border pointbay-p-4 pointbay-rounded pointbay-bg-gray-50">
              <h4 className="pointbay-font-medium pointbay-mb-2">
                {__(
                  "Tiers Configuration",
                  "pointbay-loyalty-points-referral-rewards-woo",
                )}
              </h4>
              <div className="pointbay-flex pointbay-flex-col pointbay-gap-2">
                {STARTER_TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className="pointbay-flex pointbay-gap-2 pointbay-items-center"
                  >
                    <input
                      type="text"
                      value={tier.name}
                      disabled
                      readOnly
                      className="components-text-control__input"
                    />
                    <input
                      type="number"
                      value={tier.threshold}
                      disabled
                      readOnly
                      className="components-text-control__input"
                    />
                    <input
                      type="number"
                      value={tier.multiplier}
                      disabled
                      readOnly
                      className="components-text-control__input"
                    />
                  </div>
                ))}
              </div>
            </div>
          </BuyProLock>
        ),
      },
    ]}
  />
);
