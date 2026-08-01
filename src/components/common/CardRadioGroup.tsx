import React from "react";
import { SelectionCard } from "./SelectionCard";

export interface CardOption {
  value: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  disabled?: boolean;
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
      containerClass = "pointbay-flex pointbay-flex-col pointbay-gap-4";
      break;
    case "horizontal":
      containerClass =
        "pointbay-flex pointbay-flex-row pointbay-gap-4 pointbay-overflow-x-auto pointbay-pb-2"; // Added overflow handling for safe horizontal scrolling if needed
      break;
    case "responsive":
    default:
      containerClass =
        "pointbay-grid pointbay-grid-cols-1 md:!pointbay-grid-cols-2 pointbay-gap-4";
      break;
  }

  return (
    <div className={`${containerClass} ${className} ${classNames?.root || ""}`}>
      {options.map((option) => (
        <SelectionCard
          key={option.value}
          title={option.title}
          description={option.description}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
          icon={option.icon}
          disabled={option.disabled}
          classNames={classNames?.card}
        />
      ))}
    </div>
  );
};
