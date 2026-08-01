import { useState, useEffect, FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { __ } from "@wordpress/i18n";
import { usePointBayStore } from "../../store/pointbayStore";

interface MenuLink {
  label: string;
  path: string;
}

const Navbar: FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const store = usePointBayStore();

  const menus: MenuLink[] = [
    {
      label: __("Dashboard", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/",
    },
    // Add your menu items here
    {
      label: __("Logs", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/logs",
    },
    {
      label: __("Components", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/components",
    },
    {
      label: __("Components (Classic)", "pointbay-loyalty-points-referral-rewards-woo"),
      path: "/components-classic",
    },
    // {
    //   label: __("Settings", "pointbay-loyalty-points-referral-rewards-woo"),
    //   path: "/settings",
    // },
  ];

  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  useEffect(() => {
    const basePath = "/" + (currentPath.split("/")[1] || "");
    setActiveTab(basePath);
  }, [currentPath]);

  return (
    <>
      <div className="pointbay-bg-white pointbay-p-0 !pointbay-border-0 !pointbay-border-b !pointbay-border-gray-300 pointbay-z-50 pointbay-relative">
        <div className="pointbay-flex pointbay-px-[12px] pointbay-justify-between pointbay-items-center pointbay-flex-wrap md:pointbay-flex-nowrap pointbay-gap-[4px] pointbay-relative">
          <div className="pointbay-flex pointbay-items-center pointbay-gap-[4px] pointbay-py-[12px]">
            <span className="pointbay-font-[700] pointbay-text-[16px] pointbay-text-gray-900">
              {store.pluginData?.plugin_name || "PointBay"}
            </span>
          </div>
          <div
            className={`pointbay-flex-1 md:pointbay-flex-none pointbay-flex-col md:pointbay-flex-row pointbay-justify-stretch md:pointbay-items-center pointbay-absolute md:pointbay-relative pointbay-top-[102%] md:pointbay-top-auto pointbay-left-0 pointbay-w-full md:pointbay-w-auto pointbay-gap-0 md:pointbay-gap-[6px] pointbay-bg-white !pointbay-border-0 ${
              isMobileMenuOpen
                ? "pointbay-flex"
                : "pointbay-hidden md:pointbay-flex"
            }`}
          >
            <nav className="pointbay-items-stretch md:pointbay-items-center pointbay-gap-0 pointbay-flex pointbay-flex-col md:pointbay-flex-row pointbay-w-full">
              {menus.map((menu) => (
                <span
                  key={menu.path}
                  className={`pointbay-text-default pointbay-font-[700]
                    pointbay-cursor-pointer pointbay-py-[8px] pointbay-px-[16px] pointbay-border-b md:pointbay-border-b-0 pointbay-border-gray-300 last:pointbay-border-gray-300 ${
                      activeTab === menu.path
                        ? "pointbay-text-blue-800 pointbay-bg-gray-100 pointbay-rounded-[0] md:pointbay-rounded-[8px]"
                        : "pointbay-text-gray-800 hover:pointbay-text-blue-800"
                    }`}
                  onClick={() => {
                    navigate(menu.path);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {menu.label}
                </span>
              ))}
            </nav>
          </div>
          <button
            className="pointbay-flex md:pointbay-hidden pointbay-items-center pointbay-gap-[2px] pointbay-text-gray-800 hover:pointbay-text-blue-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="pointbay-transition-all pointbay-duration-300 pointbay-ease-in-out"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <>
                  <path
                    d="M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 18L18 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M3 12H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 6H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 18H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div
          className="pointbay-fixed pointbay-top-0 pointbay-left-0 pointbay-w-full pointbay-h-full pointbay-bg-black pointbay-opacity-60 pointbay-z-40 md:pointbay-hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
