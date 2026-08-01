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
    small: "pointbay-px-[8px] pointbay-py-[2px] pointbay-text-[11px]",
    medium: "pointbay-px-[18px] pointbay-py-[5px] pointbay-text-default",
    large: "pointbay-px-[20px] pointbay-py-[12px] pointbay-text-[15px]",
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
        pointbay-relative pointbay-inline-flex pointbay-items-center
        pointbay-bg-white pointbay-border ${borderClasses} pointbay-rounded-[8px]
        pointbay-p-[4px] pointbay-select-none
        ${fullWidth ? "pointbay-flex pointbay-w-full" : ""}
        ${
          disabled
            ? "pointbay-opacity-50 pointbay-cursor-not-allowed pointbay-pointer-events-none"
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
            pointbay-absolute pointbay-top-[4px] pointbay-bottom-[4px]
            pointbay-bg-primary pointbay-rounded-[6px] pointbay-shadow-sm
            pointbay-transition-all pointbay-duration-300 pointbay-ease-[cubic-bezier(0.4,0,0.2,1)]
            pointbay-pointer-events-none
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
              pointbay-relative pointbay-z-10 pointbay-flex-1
              pointbay-font-medium pointbay-text-nowrap pointbay-rounded-[6px]
              pointbay-transition-colors pointbay-duration-300
              focus:pointbay-outline-none focus-visible:pointbay-ring-2 focus-visible:pointbay-ring-primary/20
              ${sizeClasses[size]}
              ${
                isSelected
                  ? "pointbay-text-white"
                  : "pointbay-text-secondary hover:pointbay-text-gray-700"
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
