import { FC, ReactNode } from "react";
import { __ } from "@wordpress/i18n";
import { useLoyaltyBayStore } from "../../store/loyaltybayStore";

interface ClassicLayoutProps {
  children: ReactNode;
  title?: string;
}

const ClassicLayout: FC<ClassicLayoutProps> = ({ children, title }) => {
  const store = useLoyaltyBayStore();

  const getPageTitle = () => {
    if (title) return title;
    return store.pluginData?.plugin_name || __("LoyaltyBay", "loyaltybay-loyalty-points-referral-rewards-woo");
  };

  const context = (window as any).loyaltybay_Localize?.context || "admin";

  return (
    <div className="">
      {context !== "settings" && (
        <h1 className="loyaltybay-ignore-preflight loyaltybay-font-[600] loyaltybay-text-[16px] loyaltybay-p-x-page-default loyaltybay-bg-white loyaltybay-m-0 loyaltybay-py-[18px]">
          {getPageTitle()}
        </h1>
      )}
      <div className="loyaltybay-mt-2 loyaltybay-p-x-page-default">
        {children}
      </div>
    </div>
  );
};

export default ClassicLayout;
