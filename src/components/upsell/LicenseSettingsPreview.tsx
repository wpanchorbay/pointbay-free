import React from "react";
import { __ } from "@wordpress/i18n";
import { ClassicSettingsTable } from "../classics/ClassicSettingsTable";
import { ClassicInput } from "../classics/ClassicInput";
import { BuyProLock } from "../common/BuyProLock";
import { ProBadge } from "../common/ProBadge";

/**
 * Non-interactive snapshot of PointBayPro's LicenseSettings.tsx, shown to
 * free users so they can see the license activation screen before buying.
 */
export const LicenseSettingsPreview: React.FC = () => (
  <ClassicSettingsTable
    title={
      <>
        {__(
          "License Settings",
          "pointbay-loyalty-points-referral-rewards-woo",
        )}
        <ProBadge />
      </>
    }
    description={__(
      "Activate your license key to enable automatic updates.",
      "pointbay-loyalty-points-referral-rewards-woo",
    )}
    fields={[
      {
        id: "license_status_preview",
        label: __(
          "License Status",
          "pointbay-loyalty-points-referral-rewards-woo",
        ),
        render: () => (
          <BuyProLock
            feature={__(
              "Unlock automatic updates and support — only in PointBay Pro",
              "pointbay-loyalty-points-referral-rewards-woo",
            )}
          >
            <span className="pointbay-px-2.5 pointbay-py-0.5 pointbay-rounded-full pointbay-text-xs pointbay-font-medium pointbay-bg-red-100 pointbay-text-red-800">
              {__(
                "INACTIVE",
                "pointbay-loyalty-points-referral-rewards-woo",
              )}
            </span>
          </BuyProLock>
        ),
      },
      {
        id: "license_key_preview",
        label: __(
          "License Key",
          "pointbay-loyalty-points-referral-rewards-woo",
        ),
        render: () => (
          <BuyProLock
            feature={__(
              "Unlock automatic updates and support — only in PointBay Pro",
              "pointbay-loyalty-points-referral-rewards-woo",
            )}
          >
            <div className="pointbay-flex pointbay-flex-col pointbay-gap-2">
              <div className="pointbay-flex pointbay-gap-2 pointbay-items-center">
                <ClassicInput
                  type="text"
                  disabled
                  readOnly
                  value=""
                  placeholder="WPAB-XXXXX-XXXXX-XXXXX"
                  size="large"
                />
                <button
                  type="button"
                  className="button button-primary"
                  disabled
                >
                  {__("Activate", "pointbay-loyalty-points-referral-rewards-woo")}
                </button>
              </div>
              <p className="description">
                {__(
                  "Enter your WPAnchorBay license key. You can find it in your purchase receipt.",
                  "pointbay-loyalty-points-referral-rewards-woo",
                )}
              </p>
            </div>
          </BuyProLock>
        ),
      },
    ]}
  />
);
