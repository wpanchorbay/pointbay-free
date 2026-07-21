import React from "react";

interface CheckboxProps {
  label?: string | React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  classNames?: {
    root?: string;
    box?: string;
    icon?: string;
    label?: string;
  };
}

export const Checkbox: React.FC<CheckboxProps> = ({
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
        loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center
        loyaltybay-w-4 loyaltybay-h-4 loyaltybay-rounded loyaltybay-border-2 loyaltybay-transition-all loyaltybay-duration-200
        ${
          checked
            ? "loyaltybay-border-primary loyaltybay-bg-primary"
            : "loyaltybay-border-[#949494] loyaltybay-bg-transparent hover:loyaltybay-border-primary"
        }
        ${classNames?.box || ""}
      `}
      >
        <svg
          className={`loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-text-white loyaltybay-transform loyaltybay-transition-transform loyaltybay-duration-200 ${
            checked ? "loyaltybay-scale-100" : "loyaltybay-scale-0"
          } ${classNames?.icon || ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <input
          type="checkbox"
          className="!loyaltybay-hidden"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      </div>
      {label && (
        <span
          className={`loyaltybay-text-[13px] loyaltybay-font-[400] loyaltybay-leading-[20px] loyaltybay-text-[#1e1e1e] ${
            classNames?.label || ""
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
};
