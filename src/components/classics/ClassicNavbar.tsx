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
  const context = (window as any).loyaltybay_Localize?.context || "options";

  if (context === "settings") {
    return null;
  }

  const menus: MenuLink[] = [
    {
      label: __("Dashboard", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/",
    },
    {
      label: __("Items", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/items",
    },
    {
      label: __("Logs", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/logs",
    },
  ];

  const isActive = (path: string) => {
    // if (path === "/" && currentPath === "/") return true;
    // if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="loyaltybay-flex loyaltybay-items-center loyaltybay-gap-6 loyaltybay-border-b loyaltybay-border-gray-200 loyaltybay-mb-8 loyaltybay-ignore-preflight loyaltybay-p-x-page-default loyaltybay-bg-white loyaltybay-overflow-x-auto loyaltybay-whitespace-nowrap loyaltybay-scrollbar-hide">
      {menus.map((menu) => (
        <a
          key={menu.path}
          href={`#${menu.path}`}
          className={`
            loyaltybay-pb-3 loyaltybay-text-[14px] loyaltybay-transition-all loyaltybay-no-underline loyaltybay-relative focus:loyaltybay-outline-none
            focus:loyaltybay-border-t-0 focus:loyaltybay-border-l-0 focus:loyaltybay-border-r-0 focus:loyaltybay-shadow-none
            ${
              isActive(menu.path)
                ? "loyaltybay-text-gray-900 loyaltybay-font-bold"
                : "loyaltybay-text-gray-600 loyaltybay-font-normal hover:loyaltybay-text-[#2271b1]"
            }
          `}
          onClick={(e) => {
            e.preventDefault();
            navigate(menu.path);
          }}
        >
          {menu.label}
          {isActive(menu.path) && (
            <div className="loyaltybay-absolute loyaltybay-bottom-[-1px] loyaltybay-left-0 loyaltybay-w-full loyaltybay-h-[3px] loyaltybay-bg-[#2271b1]" />
          )}
        </a>
      ))}
    </nav>
  );
};

export default ClassicNavbar;
