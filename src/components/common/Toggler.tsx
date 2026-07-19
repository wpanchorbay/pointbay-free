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
    small: "lb-px-[8px] lb-py-[2px] lb-text-[11px]",
    medium: "lb-px-[18px] lb-py-[5px] lb-text-default",
    large: "lb-px-[20px] lb-py-[12px] lb-text-[15px]",
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
        lb-relative lb-inline-flex lb-items-center
        lb-bg-white lb-border ${borderClasses} lb-rounded-[8px]
        lb-p-[4px] lb-select-none
        ${fullWidth ? "lb-flex lb-w-full" : ""}
        ${
          disabled
            ? "lb-opacity-50 lb-cursor-not-allowed lb-pointer-events-none"
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
            lb-absolute lb-top-[4px] lb-bottom-[4px]
            lb-bg-primary lb-rounded-[6px] lb-shadow-sm
            lb-transition-all lb-duration-300 lb-ease-[cubic-bezier(0.4,0,0.2,1)]
            lb-pointer-events-none
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
              lb-relative lb-z-10 lb-flex-1
              lb-font-medium lb-text-nowrap lb-rounded-[6px]
              lb-transition-colors lb-duration-300
              focus:lb-outline-none focus-visible:lb-ring-2 focus-visible:lb-ring-primary/20
              ${sizeClasses[size]}
              ${
                isSelected
                  ? "lb-text-white"
                  : "lb-text-secondary hover:lb-text-gray-700"
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
