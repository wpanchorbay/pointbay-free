import { useState, useEffect, FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { __ } from "@wordpress/i18n";
import { useLoyaltyBayStore } from "../../store/loyaltybayStore";

interface MenuLink {
  label: string;
  path: string;
}

const Navbar: FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const store = useLoyaltyBayStore();

  const menus: MenuLink[] = [
    {
      label: __("Dashboard", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/",
    },
    // Add your menu items here
    {
      label: __("Logs", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/logs",
    },
    {
      label: __("Components", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/components",
    },
    {
      label: __("Components (Classic)", "loyaltybay-loyalty-points-referral-rewards-woo"),
      path: "/components-classic",
    },
    // {
    //   label: __("Settings", "loyaltybay-loyalty-points-referral-rewards-woo"),
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
      <div className="loyaltybay-bg-white loyaltybay-p-0 !loyaltybay-border-0 !loyaltybay-border-b !loyaltybay-border-gray-300 loyaltybay-z-50 loyaltybay-relative">
        <div className="loyaltybay-flex loyaltybay-px-[12px] loyaltybay-justify-between loyaltybay-items-center loyaltybay-flex-wrap md:loyaltybay-flex-nowrap loyaltybay-gap-[4px] loyaltybay-relative">
          <div className="loyaltybay-flex loyaltybay-items-center loyaltybay-gap-[4px] loyaltybay-py-[12px]">
            <span className="loyaltybay-font-[700] loyaltybay-text-[16px] loyaltybay-text-gray-900">
              {store.pluginData?.plugin_name || "LoyaltyBay"}
            </span>
          </div>
          <div
            className={`loyaltybay-flex-1 md:loyaltybay-flex-none loyaltybay-flex-col md:loyaltybay-flex-row loyaltybay-justify-stretch md:loyaltybay-items-center loyaltybay-absolute md:loyaltybay-relative loyaltybay-top-[102%] md:loyaltybay-top-auto loyaltybay-left-0 loyaltybay-w-full md:loyaltybay-w-auto loyaltybay-gap-0 md:loyaltybay-gap-[6px] loyaltybay-bg-white !loyaltybay-border-0 ${
              isMobileMenuOpen
                ? "loyaltybay-flex"
                : "loyaltybay-hidden md:loyaltybay-flex"
            }`}
          >
            <nav className="loyaltybay-items-stretch md:loyaltybay-items-center loyaltybay-gap-0 loyaltybay-flex loyaltybay-flex-col md:loyaltybay-flex-row loyaltybay-w-full">
              {menus.map((menu) => (
                <span
                  key={menu.path}
                  className={`loyaltybay-text-default loyaltybay-font-[700]
                    loyaltybay-cursor-pointer loyaltybay-py-[8px] loyaltybay-px-[16px] loyaltybay-border-b md:loyaltybay-border-b-0 loyaltybay-border-gray-300 last:loyaltybay-border-gray-300 ${
                      activeTab === menu.path
                        ? "loyaltybay-text-blue-800 loyaltybay-bg-gray-100 loyaltybay-rounded-[0] md:loyaltybay-rounded-[8px]"
                        : "loyaltybay-text-gray-800 hover:loyaltybay-text-blue-800"
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
            className="loyaltybay-flex md:loyaltybay-hidden loyaltybay-items-center loyaltybay-gap-[2px] loyaltybay-text-gray-800 hover:loyaltybay-text-blue-800"
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
              className="loyaltybay-transition-all loyaltybay-duration-300 loyaltybay-ease-in-out"
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
          className="loyaltybay-fixed loyaltybay-top-0 loyaltybay-left-0 loyaltybay-w-full loyaltybay-h-full loyaltybay-bg-black loyaltybay-opacity-60 loyaltybay-z-40 md:loyaltybay-hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
