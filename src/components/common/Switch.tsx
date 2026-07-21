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
      switch: "loyaltybay-h-4 loyaltybay-w-7",
      thumb: "loyaltybay-h-3 loyaltybay-w-3",
      translate: "loyaltybay-translate-x-3",
    },
    medium: {
      switch: "loyaltybay-h-6 loyaltybay-w-11",
      thumb: "loyaltybay-h-5 loyaltybay-w-5",
      translate: "loyaltybay-translate-x-5",
    },
    large: {
      switch: "loyaltybay-h-7 loyaltybay-w-14",
      thumb: "loyaltybay-h-6 loyaltybay-w-6",
      translate: "loyaltybay-translate-x-7",
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
        loyaltybay-group loyaltybay-relative loyaltybay-inline-flex loyaltybay-shrink-0 loyaltybay-cursor-pointer loyaltybay-items-center loyaltybay-rounded-full loyaltybay-border-2 loyaltybay-border-transparent loyaltybay-transition-colors loyaltybay-duration-200 loyaltybay-ease-in-out focus:loyaltybay-outline-none focus:loyaltybay-ring-2 focus:loyaltybay-ring-primary focus:loyaltybay-ring-offset-2
        ${currentSize.switch}
        ${checked ? "loyaltybay-bg-green-500" : "loyaltybay-bg-black"}
        ${disabled ? "loyaltybay-opacity-50 loyaltybay-cursor-not-allowed" : ""}
        ${className}
        ${classNames?.root || ""}
      `}
    >
      <span className="loyaltybay-sr-only">Toggle setting</span>
      <span
        aria-hidden="true"
        className={`
          loyaltybay-pointer-events-none loyaltybay-inline-block loyaltybay-transform loyaltybay-rounded-full loyaltybay-bg-white loyaltybay-shadow loyaltybay-ring-0 loyaltybay-transition loyaltybay-duration-200 loyaltybay-ease-in-out
          ${currentSize.thumb}
          ${checked ? currentSize.translate : "loyaltybay-translate-x-0"}
          ${classNames?.thumb || ""}
        `}
      />
    </button>
  );
};
