import React, { useState, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";
import { LockKeyhole } from "lucide-react";
import { __ } from "@wordpress/i18n";
import { useWpabStore } from "../../store/wpabStore";

interface BuyProTooltipProps {
  children: ReactNode;
  className?: string;
}

export const BuyProTooltip: React.FC<BuyProTooltipProps> = ({
  children,
  className = "",
}) => {
  const store = useWpabStore();
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    top: number;
    left: number;
  } | null>(null);

  const hoverTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipState({
      visible: true,
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setTooltipState(null);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setTooltipState(null);
    }, 150);
  };

  return (
    <>
      <div
        className={`lb-relative lb-inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        <div className="lb-absolute lb-right-2 lb-top-1/2 -lb-translate-y-1/2 lb-pointer-events-none">
          <LockKeyhole className="lb-w-3.5 lb-h-3.5 lb-text-[#f02a74]" />
        </div>
      </div>
      {tooltipState?.visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="lb-fixed lb-z-[50001] lb-flex lb-flex-col lb-items-center lb-gap-1.5 lb-bg-gray-900 lb-text-white lb-text-xs lb-p-2 lb-min-w-[140px]"
            style={{
              top: tooltipState.top + 5, // Adjusted to user preference
              left: tooltipState.left,
              transform: "translate(-50%, -100%)",
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <span className="lb-font-medium lb-whitespace-nowrap">
              {__("Upgrade to unlock", "loyaltybay")}
            </span>
            <a
              href={store.pluginData?.support_uri || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="lb-w-full lb-bg-[#f02a74] hover:!lb-bg-[#e71161] lb-text-white hover:!lb-text-white lb-font-bold lb-py-1.5 lb-px-3 lb-transition-colors focus:lb-outline-none focus:lb-ring-0 lb-cursor-pointer lb-text-center lb-no-underline"
            >
              {__("Buy Pro", "loyaltybay")}
            </a>
            {/* Tooltip Arrow */}
            <div className="lb-absolute lb-top-full lb-left-1/2 -lb-translate-x-1/2 lb-border-4 lb-border-transparent lb-border-t-gray-900"></div>
          </div>,
          document.body,
        )}
    </>
  );
};
