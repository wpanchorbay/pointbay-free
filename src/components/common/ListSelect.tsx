import React from "react";

export interface ListItem {
  label: string;
  value: string;
}

interface ListSelectProps {
  items: ListItem[];
  selectedValues: string[];
  onChange: (value: string) => void;
  className?: string;
  size?: "small" | "medium" | "large";
  classNames?: {
    root?: string;
    item?: string;
    iconWrapper?: string;
    icon?: string;
    label?: string;
  };
}

export const ListSelect: React.FC<ListSelectProps> = ({
  items,
  selectedValues,
  onChange,
  className = "",
  size = "medium",
  classNames,
}) => {
  const sizeStyles = {
    small: {
      item: "loyaltybay-px-3 loyaltybay-py-2",
      label: "loyaltybay-text-xs",
      iconWrapper: "loyaltybay-w-4",
      icon: "loyaltybay-w-3 loyaltybay-h-3",
    },
    medium: {
      item: "loyaltybay-px-4 loyaltybay-py-3",
      label: "loyaltybay-text-sm",
      iconWrapper: "loyaltybay-w-5",
      icon: "loyaltybay-w-4 loyaltybay-h-4",
    },
    large: {
      item: "loyaltybay-px-5 loyaltybay-py-4",
      label: "loyaltybay-text-base",
      iconWrapper: "loyaltybay-w-6",
      icon: "loyaltybay-w-5 loyaltybay-h-5",
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <div
      className={`loyaltybay-flex loyaltybay-flex-col loyaltybay-border loyaltybay-border-default loyaltybay-rounded-lg loyaltybay-bg-white loyaltybay-overflow-hidden ${className} ${
        classNames?.root || ""
      }`}
    >
      {items.map((item, index) => {
        const isSelected = selectedValues.includes(item.value);
        return (
          <div
            key={item.value}
            onClick={() => onChange(item.value)}
            className={`
              loyaltybay-flex loyaltybay-items-center loyaltybay-gap-3 
              loyaltybay-cursor-pointer loyaltybay-transition-colors
              hover:loyaltybay-bg-gray-50
              ${currentSize.item}
              ${
                index !== items.length - 1
                  ? "loyaltybay-border-b loyaltybay-border-gray-100"
                  : ""
              }
              ${classNames?.item || ""}
            `}
          >
            <div
              className={`loyaltybay-flex loyaltybay-justify-center ${
                currentSize.iconWrapper
              } ${classNames?.iconWrapper || ""}`}
            >
              {isSelected && (
                <svg
                  className={`loyaltybay-text-gray-900 ${currentSize.icon} ${
                    classNames?.icon || ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <span
              className={`${currentSize.label} ${
                isSelected
                  ? "loyaltybay-text-gray-900 loyaltybay-font-medium"
                  : "loyaltybay-text-gray-500"
              } ${classNames?.label || ""}`}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
