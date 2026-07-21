import React, { useState, useRef, useEffect } from "react";
import { borderClasses } from "./classes";

export interface TogglerOption {
  label: React.ReactNode;
  value: string | number;
}

interface TogglerProps {
  options: TogglerOption[];
  value: string | number;
  onChange: (value: any) => void;
  className?: string;
  fullWidth?: boolean;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  classNames?: {
    root?: string;
    pill?: string;
    button?: string;
  };
}

export const Toggler: React.FC<TogglerProps> = ({
  options,
  value,
  onChange,
  className = "",
  fullWidth = false,
  size = "medium",
  disabled = false,
  classNames = {},
}) => {
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Size configuration
  const sizeClasses = {
    small: "loyaltybay-px-[8px] loyaltybay-py-[2px] loyaltybay-text-[11px]",
    medium: "loyaltybay-px-[18px] loyaltybay-py-[5px] loyaltybay-text-default",
    large: "loyaltybay-px-[20px] loyaltybay-py-[12px] loyaltybay-text-[15px]",
  };

  useEffect(() => {
    // Find the currently selected element
    const activeIndex = options.findIndex((opt) => opt.value === value);
    const activeEl = itemsRef.current[activeIndex];

    if (activeEl) {
      // Update pill position and width based on the active element's dimensions
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [value, options, size]); // Recalculate when value, options, or size changes

  return (
    <div
      className={`
        loyaltybay-relative loyaltybay-inline-flex loyaltybay-items-center
        loyaltybay-bg-white loyaltybay-border ${borderClasses} loyaltybay-rounded-[8px]
        loyaltybay-p-[4px] loyaltybay-select-none
        ${fullWidth ? "loyaltybay-flex loyaltybay-w-full" : ""}
        ${
          disabled
            ? "loyaltybay-opacity-50 loyaltybay-cursor-not-allowed loyaltybay-pointer-events-none"
            : ""
        }
        ${className}
        ${classNames.root || ""}
      `}
      role="group"
      aria-disabled={disabled}
    >
      {/* Sliding Background Pill */}
      <div
        className={`
            loyaltybay-absolute loyaltybay-top-[4px] loyaltybay-bottom-[4px]
            loyaltybay-bg-primary loyaltybay-rounded-[6px] loyaltybay-shadow-sm
            loyaltybay-transition-all loyaltybay-duration-300 loyaltybay-ease-[cubic-bezier(0.4,0,0.2,1)]
            loyaltybay-pointer-events-none
            ${classNames.pill || ""}
        `}
        style={{
          left: pillStyle?.left ?? 0,
          width: pillStyle?.width ?? 0,
          opacity: pillStyle ? 1 : 0, // Prevent initial flash at wrong position
        }}
      />

      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(option.value)}
            className={`
              loyaltybay-relative loyaltybay-z-10 loyaltybay-flex-1
              loyaltybay-font-medium loyaltybay-text-nowrap loyaltybay-rounded-[6px]
              loyaltybay-transition-colors loyaltybay-duration-300
              focus:loyaltybay-outline-none focus-visible:loyaltybay-ring-2 focus-visible:loyaltybay-ring-primary/20
              ${sizeClasses[size]}
              ${
                isSelected
                  ? "loyaltybay-text-white"
                  : "loyaltybay-text-secondary hover:loyaltybay-text-gray-700"
              }
              ${classNames.button || ""}
            `}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
