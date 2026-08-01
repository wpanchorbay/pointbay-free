import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
  classNames?: {
    root?: string;
    thumb?: string;
  };
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled,
  size = "medium",
  className = "",
  classNames,
}) => {
  const sizeConfig = {
    small: {
      switch: "pointbay-h-4 pointbay-w-7",
      thumb: "pointbay-h-3 pointbay-w-3",
      translate: "pointbay-translate-x-3",
    },
    medium: {
      switch: "pointbay-h-6 pointbay-w-11",
      thumb: "pointbay-h-5 pointbay-w-5",
      translate: "pointbay-translate-x-5",
    },
    large: {
      switch: "pointbay-h-7 pointbay-w-14",
      thumb: "pointbay-h-6 pointbay-w-6",
      translate: "pointbay-translate-x-7",
    },
  };

  const currentSize = sizeConfig[size];
  

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        pointbay-group pointbay-relative pointbay-inline-flex pointbay-shrink-0 pointbay-cursor-pointer pointbay-items-center pointbay-rounded-full pointbay-border-2 pointbay-border-transparent pointbay-transition-colors pointbay-duration-200 pointbay-ease-in-out focus:pointbay-outline-none focus:pointbay-ring-2 focus:pointbay-ring-primary focus:pointbay-ring-offset-2
        ${currentSize.switch}
        ${checked ? "pointbay-bg-green-500" : "pointbay-bg-black"}
        ${disabled ? "pointbay-opacity-50 pointbay-cursor-not-allowed" : ""}
        ${className}
        ${classNames?.root || ""}
      `}
    >
      <span className="pointbay-sr-only">Toggle setting</span>
      <span
        aria-hidden="true"
        className={`
          pointbay-pointer-events-none pointbay-inline-block pointbay-transform pointbay-rounded-full pointbay-bg-white pointbay-shadow pointbay-ring-0 pointbay-transition pointbay-duration-200 pointbay-ease-in-out
          ${currentSize.thumb}
          ${checked ? currentSize.translate : "pointbay-translate-x-0"}
          ${classNames?.thumb || ""}
        `}
      />
    </button>
  );
};
