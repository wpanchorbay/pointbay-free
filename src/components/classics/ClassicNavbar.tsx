import { FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { __ } from "@wordpress/i18n";

interface MenuLink {
  label: string;
  path: string;
}

const ClassicNavbar: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const context = (window as any).pointbay_Localize?.context || "options";

  if (context === "settings") {
    return null;
  }

  const menus: MenuLink[] = [
    {
      label: __("Dashboard", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/",
    },
    {
      label: __("Items", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/items",
    },
    {
      label: __("Logs", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/logs",
    },
  ];

  const isActive = (path: string) => {
    // if (path === "/" && currentPath === "/") return true;
    // if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="pointbay-flex pointbay-items-center pointbay-gap-6 pointbay-border-b pointbay-border-gray-200 pointbay-mb-8 pointbay-ignore-preflight pointbay-p-x-page-default pointbay-bg-white pointbay-overflow-x-auto pointbay-whitespace-nowrap pointbay-scrollbar-hide">
      {menus.map((menu) => (
        <a
          key={menu.path}
          href={`#${menu.path}`}
          className={`
            pointbay-pb-3 pointbay-text-[14px] pointbay-transition-all pointbay-no-underline pointbay-relative focus:pointbay-outline-none
            focus:pointbay-border-t-0 focus:pointbay-border-l-0 focus:pointbay-border-r-0 focus:pointbay-shadow-none
            ${
              isActive(menu.path)
                ? "pointbay-text-gray-900 pointbay-font-bold"
                : "pointbay-text-gray-600 pointbay-font-normal hover:pointbay-text-[#2271b1]"
            }
          `}
          onClick={(e) => {
            e.preventDefault();
            navigate(menu.path);
          }}
        >
          {menu.label}
          {isActive(menu.path) && (
            <div className="pointbay-absolute pointbay-bottom-[-1px] pointbay-left-0 pointbay-w-full pointbay-h-[3px] pointbay-bg-[#2271b1]" />
          )}
        </a>
      ))}
    </nav>
  );
};

export default ClassicNavbar;
