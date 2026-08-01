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
      className={`pointbay-flex pointbay-items-center pointbay-gap-3 pointbay-cursor-pointer ${
        disabled ? "pointbay-opacity-50 pointbay-cursor-not-allowed" : ""
      } ${classNames?.root || ""}`}
    >
      <div
        className={`
        pointbay-flex pointbay-items-center pointbay-justify-center
        pointbay-w-4 pointbay-h-4 pointbay-rounded pointbay-border-2 pointbay-transition-all pointbay-duration-200
        ${
          checked
            ? "pointbay-border-primary pointbay-bg-primary"
            : "pointbay-border-[#949494] pointbay-bg-transparent hover:pointbay-border-primary"
        }
        ${classNames?.box || ""}
      `}
      >
        <svg
          className={`pointbay-w-3.5 pointbay-h-3.5 pointbay-text-white pointbay-transform pointbay-transition-transform pointbay-duration-200 ${
            checked ? "pointbay-scale-100" : "pointbay-scale-0"
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
          className="!pointbay-hidden"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      </div>
      {label && (
        <span
          className={`pointbay-text-[13px] pointbay-font-[400] pointbay-leading-[20px] pointbay-text-[#1e1e1e] ${
            classNames?.label || ""
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
};
