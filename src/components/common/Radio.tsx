import React from "react";

interface RadioProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  classNames?: {
    root?: string;
    circle?: string;
    dot?: string;
    label?: string;
  };
}

export const Radio: React.FC<RadioProps> = ({
  label,
  checked,
  onChange,
  disabled,
  classNames,
}) => {
  return (
    <label
      className={`pointbay-flex pointbay-items-center pointbay-gap-3 pointbay-cursor-pointer ${
        disabled ? "pointbay-opacity-50 pointbay-cursor-not-allowed" : ""
      } ${classNames?.root || ""}`}
    >
      <div
        className={`
        pointbay-relative pointbay-flex pointbay-items-center pointbay-justify-center
        pointbay-w-5 pointbay-h-5 pointbay-rounded-full pointbay-border-2 pointbay-transition-all pointbay-duration-200
        ${
          checked
            ? "pointbay-border-primary pointbay-bg-primary"
            : "pointbay-border-gray-300 pointbay-bg-white hover:pointbay-border-primary"
        }
        ${classNames?.circle || ""}
      `}
      >
        {/* Inner white dot for selected state */}
        <div
          className={`
                pointbay-w-2 pointbay-h-2 pointbay-bg-white pointbay-rounded-full pointbay-transform pointbay-transition-transform pointbay-duration-200
                ${checked ? "pointbay-scale-100" : "pointbay-scale-0"}
                ${classNames?.dot || ""}
            `}
        />
        <input
          type="radio"
          className="pointbay-hidden"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <span
        className={`pointbay-text-[15px] pointbay-font-semibold ${
          checked ? "pointbay-text-gray-900" : "pointbay-text-gray-700"
        } ${classNames?.label || ""}`}
      >
        {label}
      </span>
    </label>
  );
};
