import { FC, ReactNode } from "react";
import { __ } from "@wordpress/i18n";
import { usePointBayStore } from "../../store/pointbayStore";

interface ClassicLayoutProps {
  children: ReactNode;
  title?: string;
}

const ClassicLayout: FC<ClassicLayoutProps> = ({ children, title }) => {
  const store = usePointBayStore();

  const getPageTitle = () => {
    if (title) return title;
    return store.pluginData?.plugin_name || __("PointBay", "pointbay-loyalty-points-referral-rewards-woo");
  };

  const context = (window as any).pointbay_Localize?.context || "admin";

  return (
    <div className="">
      {context !== "settings" && (
        <h1 className="pointbay-ignore-preflight pointbay-font-[600] pointbay-text-[16px] pointbay-p-x-page-default pointbay-bg-white pointbay-m-0 pointbay-py-[18px]">
          {getPageTitle()}
        </h1>
      )}
      <div className="pointbay-mt-2 pointbay-p-x-page-default">
        {children}
      </div>
    </div>
  );
};

export default ClassicLayout;
