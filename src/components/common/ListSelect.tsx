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
      item: "lb-px-3 lb-py-2",
      label: "lb-text-xs",
      iconWrapper: "lb-w-4",
      icon: "lb-w-3 lb-h-3",
    },
    medium: {
      item: "lb-px-4 lb-py-3",
      label: "lb-text-sm",
      iconWrapper: "lb-w-5",
      icon: "lb-w-4 lb-h-4",
    },
    large: {
      item: "lb-px-5 lb-py-4",
      label: "lb-text-base",
      iconWrapper: "lb-w-6",
      icon: "lb-w-5 lb-h-5",
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <div
      className={`lb-flex lb-flex-col lb-border lb-border-default lb-rounded-lg lb-bg-white lb-overflow-hidden ${className} ${
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
              lb-flex lb-items-center lb-gap-3 
              lb-cursor-pointer lb-transition-colors
              hover:lb-bg-gray-50
              ${currentSize.item}
              ${
                index !== items.length - 1
                  ? "lb-border-b lb-border-gray-100"
                  : ""
              }
              ${classNames?.item || ""}
            `}
          >
            <div
              className={`lb-flex lb-justify-center ${
                currentSize.iconWrapper
              } ${classNames?.iconWrapper || ""}`}
            >
              {isSelected && (
                <svg
                  className={`lb-text-gray-900 ${currentSize.icon} ${
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
                  ? "lb-text-gray-900 lb-font-medium"
                  : "lb-text-gray-500"
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
