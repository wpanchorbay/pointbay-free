import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { SelectionCard } from "./SelectionCard";

export interface CardOption {
  value: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "buy_pro" | "coming_soon";
}

interface CardRadioGroupProps {
  options: CardOption[];
  value: string;
  onChange: (value: string) => void;
  layout?: "vertical" | "horizontal" | "responsive";
  className?: string;
  classNames?: {
    root?: string;
    card?: {
      root?: string;
      iconWrapper?: string;
      circle?: string;
      dot?: string;
      textWrapper?: string;
      title?: string;
      description?: string;
    };
  };
}

export const CardRadioGroup: React.FC<CardRadioGroupProps> = ({
  options,
  value,
  onChange,
  layout = "responsive",
  className = "",
  classNames,
}) => {
  let containerClass = "";

  switch (layout) {
    case "vertical":
      containerClass = "loyaltybay-flex loyaltybay-flex-col loyaltybay-gap-4";
      break;
    case "horizontal":
      containerClass =
        "loyaltybay-flex loyaltybay-flex-row loyaltybay-gap-4 loyaltybay-overflow-x-auto loyaltybay-pb-2"; // Added overflow handling for safe horizontal scrolling if needed
      break;
    case "responsive":
    default:
      containerClass =
        "loyaltybay-grid loyaltybay-grid-cols-1 md:!loyaltybay-grid-cols-2 loyaltybay-gap-4";
      break;
  }

  // Tooltip State
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const hoverTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleCardMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    isPro: boolean,
  ) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (isPro) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Calculate center position
      const centerX = rect.left + rect.width / 2;
      // Position above the card
      const topY = rect.top;

      setTooltipState({
        visible: true,
        top: topY,
        left: centerX,
        width: rect.width,
      });
    } else {
      setTooltipState(null);
    }
  };

  const handleCardMouseLeave = () => {
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
        className={`${containerClass} ${className} ${classNames?.root || ""}`}
      >
        {options.map((option) => (
          <SelectionCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
            icon={option.icon}
            disabled={option.disabled}
            variant={option.variant}
            onMouseEnter={(e) =>
              handleCardMouseEnter(e, option.variant === "buy_pro")
            }
            onMouseLeave={handleCardMouseLeave}
            classNames={classNames?.card}
          />
        ))}
      </div>

      {/* Tooltip Portal */}
      {tooltipState?.visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="loyaltybay-fixed loyaltybay-z-[50001] loyaltybay-flex loyaltybay-flex-col loyaltybay-items-center loyaltybay-gap-1.5 loyaltybay-bg-gray-900 loyaltybay-text-white loyaltybay-text-xs loyaltybay-p-2 loyaltybay-min-w-[140px] loyaltybay-rounded-md loyaltybay-shadow-lg"
            style={{
              top: tooltipState.top - 10, // Slight offset upwards from the card top
              left: tooltipState.left,
              transform: "translate(-50%, -100%)",
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <span className="loyaltybay-font-medium loyaltybay-whitespace-nowrap">
              Locked
            </span>
            {/* Tooltip Arrow */}
            <div className="loyaltybay-absolute loyaltybay-top-full loyaltybay-left-1/2 -loyaltybay-translate-x-1/2 loyaltybay-border-4 loyaltybay-border-transparent loyaltybay-border-t-gray-900"></div>
          </div>,
          document.body,
        )}
    </>
  );
};
