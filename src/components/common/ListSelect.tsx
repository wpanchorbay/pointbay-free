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
      item: "pointbay-px-3 pointbay-py-2",
      label: "pointbay-text-xs",
      iconWrapper: "pointbay-w-4",
      icon: "pointbay-w-3 pointbay-h-3",
    },
    medium: {
      item: "pointbay-px-4 pointbay-py-3",
      label: "pointbay-text-sm",
      iconWrapper: "pointbay-w-5",
      icon: "pointbay-w-4 pointbay-h-4",
    },
    large: {
      item: "pointbay-px-5 pointbay-py-4",
      label: "pointbay-text-base",
      iconWrapper: "pointbay-w-6",
      icon: "pointbay-w-5 pointbay-h-5",
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <div
      className={`pointbay-flex pointbay-flex-col pointbay-border pointbay-border-default pointbay-rounded-lg pointbay-bg-white pointbay-overflow-hidden ${className} ${
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
              pointbay-flex pointbay-items-center pointbay-gap-3 
              pointbay-cursor-pointer pointbay-transition-colors
              hover:pointbay-bg-gray-50
              ${currentSize.item}
              ${
                index !== items.length - 1
                  ? "pointbay-border-b pointbay-border-gray-100"
                  : ""
              }
              ${classNames?.item || ""}
            `}
          >
            <div
              className={`pointbay-flex pointbay-justify-center ${
                currentSize.iconWrapper
              } ${classNames?.iconWrapper || ""}`}
            >
              {isSelected && (
                <svg
                  className={`pointbay-text-gray-900 ${currentSize.icon} ${
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
                  ? "pointbay-text-gray-900 pointbay-font-medium"
                  : "pointbay-text-gray-500"
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
