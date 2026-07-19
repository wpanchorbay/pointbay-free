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
      switch: "lb-h-4 lb-w-7",
      thumb: "lb-h-3 lb-w-3",
      translate: "lb-translate-x-3",
    },
    medium: {
      switch: "lb-h-6 lb-w-11",
      thumb: "lb-h-5 lb-w-5",
      translate: "lb-translate-x-5",
    },
    large: {
      switch: "lb-h-7 lb-w-14",
      thumb: "lb-h-6 lb-w-6",
      translate: "lb-translate-x-7",
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
        lb-group lb-relative lb-inline-flex lb-shrink-0 lb-cursor-pointer lb-items-center lb-rounded-full lb-border-2 lb-border-transparent lb-transition-colors lb-duration-200 lb-ease-in-out focus:lb-outline-none focus:lb-ring-2 focus:lb-ring-primary focus:lb-ring-offset-2
        ${currentSize.switch}
        ${checked ? "lb-bg-green-500" : "lb-bg-black"}
        ${disabled ? "lb-opacity-50 lb-cursor-not-allowed" : ""}
        ${className}
        ${classNames?.root || ""}
      `}
    >
      <span className="lb-sr-only">Toggle setting</span>
      <span
        aria-hidden="true"
        className={`
          lb-pointer-events-none lb-inline-block lb-transform lb-rounded-full lb-bg-white lb-shadow lb-ring-0 lb-transition lb-duration-200 lb-ease-in-out
          ${currentSize.thumb}
          ${checked ? currentSize.translate : "lb-translate-x-0"}
          ${classNames?.thumb || ""}
        `}
      />
    </button>
  );
};
