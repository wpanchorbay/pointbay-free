import { FC, ReactNode } from "react";
import { __ } from "@wordpress/i18n";
import { useWpabStore } from "../../store/wpabStore";

interface ClassicLayoutProps {
  children: ReactNode;
  title?: string;
}

const ClassicLayout: FC<ClassicLayoutProps> = ({ children, title }) => {
  const store = useWpabStore();

  const getPageTitle = () => {
    if (title) return title;
    return store.pluginData?.plugin_name || __("LoyaltyBay", "loyaltybay");
  };

  const context = (window as any).loyaltyBay_Localize?.context || "admin";

  return (
    <div className="">
      {context !== "settings" && (
        <h1 className="lb-ignore-preflight lb-font-[600] lb-text-[16px] lb-p-x-page-default lb-bg-white lb-m-0 lb-py-[18px]">
          {getPageTitle()}
        </h1>
      )}
      <div className="lb-mt-2 lb-p-x-page-default">
        {children}
      </div>
    </div>
  );
};

export default ClassicLayout;
