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
  const context = (window as any).loyaltyBay_Localize?.context || "options";

  if (context === "settings") {
    return null;
  }

  const menus: MenuLink[] = [
    {
      label: __("Dashboard", "loyaltybay"),
      path: "/",
    },
    {
      label: __("Items", "loyaltybay"),
      path: "/items",
    },
    {
      label: __("Logs", "loyaltybay"),
      path: "/logs",
    },
  ];

  const isActive = (path: string) => {
    // if (path === "/" && currentPath === "/") return true;
    // if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="lb-flex lb-items-center lb-gap-6 lb-border-b lb-border-gray-200 lb-mb-8 lb-ignore-preflight lb-p-x-page-default lb-bg-white lb-overflow-x-auto lb-whitespace-nowrap lb-scrollbar-hide">
      {menus.map((menu) => (
        <a
          key={menu.path}
          href={`#${menu.path}`}
          className={`
            lb-pb-3 lb-text-[14px] lb-transition-all lb-no-underline lb-relative focus:lb-outline-none
            focus:lb-border-t-0 focus:lb-border-l-0 focus:lb-border-r-0 focus:lb-shadow-none
            ${
              isActive(menu.path)
                ? "lb-text-gray-900 lb-font-bold"
                : "lb-text-gray-600 lb-font-normal hover:lb-text-[#2271b1]"
            }
          `}
          onClick={(e) => {
            e.preventDefault();
            navigate(menu.path);
          }}
        >
          {menu.label}
          {isActive(menu.path) && (
            <div className="lb-absolute lb-bottom-[-1px] lb-left-0 lb-w-full lb-h-[3px] lb-bg-[#2271b1]" />
          )}
        </a>
      ))}
    </nav>
  );
};

export default ClassicNavbar;
