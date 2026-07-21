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
      className={`loyaltybay-flex loyaltybay-items-center loyaltybay-gap-3 loyaltybay-cursor-pointer ${
        disabled ? "loyaltybay-opacity-50 loyaltybay-cursor-not-allowed" : ""
      } ${classNames?.root || ""}`}
    >
      <div
        className={`
        loyaltybay-relative loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center
        loyaltybay-w-5 loyaltybay-h-5 loyaltybay-rounded-full loyaltybay-border-2 loyaltybay-transition-all loyaltybay-duration-200
        ${
          checked
            ? "loyaltybay-border-primary loyaltybay-bg-primary"
            : "loyaltybay-border-gray-300 loyaltybay-bg-white hover:loyaltybay-border-primary"
        }
        ${classNames?.circle || ""}
      `}
      >
        {/* Inner white dot for selected state */}
        <div
          className={`
                loyaltybay-w-2 loyaltybay-h-2 loyaltybay-bg-white loyaltybay-rounded-full loyaltybay-transform loyaltybay-transition-transform loyaltybay-duration-200
                ${checked ? "loyaltybay-scale-100" : "loyaltybay-scale-0"}
                ${classNames?.dot || ""}
            `}
        />
        <input
          type="radio"
          className="loyaltybay-hidden"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <span
        className={`loyaltybay-text-[15px] loyaltybay-font-semibold ${
          checked ? "loyaltybay-text-gray-900" : "loyaltybay-text-gray-700"
        } ${classNames?.label || ""}`}
      >
        {label}
      </span>
    </label>
  );
};
