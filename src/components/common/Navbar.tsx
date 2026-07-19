import { useState, useEffect, FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { __ } from "@wordpress/i18n";
import { useWpabStore } from "../../store/wpabStore";

interface MenuLink {
  label: string;
  path: string;
}

const Navbar: FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const store = useWpabStore();

  const menus: MenuLink[] = [
    {
      label: __("Dashboard", "loyaltybay"),
      path: "/",
    },
    // Add your menu items here
    {
      label: __("Logs", "loyaltybay"),
      path: "/logs",
    },
    {
      label: __("Components", "loyaltybay"),
      path: "/components",
    },
    {
      label: __("Components (Classic)", "loyaltybay"),
      path: "/components-classic",
    },
    // {
    //   label: __("Settings", "loyaltybay"),
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
      <div className="lb-bg-white lb-p-0 !lb-border-0 !lb-border-b !lb-border-gray-300 lb-z-50 lb-relative">
        <div className="lb-flex lb-px-[12px] lb-justify-between lb-items-center lb-flex-wrap md:lb-flex-nowrap lb-gap-[4px] lb-relative">
          <div className="lb-flex lb-items-center lb-gap-[4px] lb-py-[12px]">
            <span className="lb-font-[700] lb-text-[16px] lb-text-gray-900">
              {store.pluginData?.plugin_name || "LoyaltyBay"}
            </span>
          </div>
          <div
            className={`lb-flex-1 md:lb-flex-none lb-flex-col md:lb-flex-row lb-justify-stretch md:lb-items-center lb-absolute md:lb-relative lb-top-[102%] md:lb-top-auto lb-left-0 lb-w-full md:lb-w-auto lb-gap-0 md:lb-gap-[6px] lb-bg-white !lb-border-0 ${
              isMobileMenuOpen
                ? "lb-flex"
                : "lb-hidden md:lb-flex"
            }`}
          >
            <nav className="lb-items-stretch md:lb-items-center lb-gap-0 lb-flex lb-flex-col md:lb-flex-row lb-w-full">
              {menus.map((menu) => (
                <span
                  key={menu.path}
                  className={`lb-text-default lb-font-[700]
                    lb-cursor-pointer lb-py-[8px] lb-px-[16px] lb-border-b md:lb-border-b-0 lb-border-gray-300 last:lb-border-gray-300 ${
                      activeTab === menu.path
                        ? "lb-text-blue-800 lb-bg-gray-100 lb-rounded-[0] md:lb-rounded-[8px]"
                        : "lb-text-gray-800 hover:lb-text-blue-800"
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
            className="lb-flex md:lb-hidden lb-items-center lb-gap-[2px] lb-text-gray-800 hover:lb-text-blue-800"
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
              className="lb-transition-all lb-duration-300 lb-ease-in-out"
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
          className="lb-fixed lb-top-0 lb-left-0 lb-w-full lb-h-full lb-bg-black lb-opacity-60 lb-z-40 md:lb-hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
