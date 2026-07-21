import React from "react";

interface ClassicCheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  className?: string;
  id?: string;
}

export const ClassicCheckbox: React.FC<ClassicCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled,
  description,
  className = "",
  id,
}) => {
  const checkboxId =
    id || `classic-cb-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div
      className={`loyaltybay-flex loyaltybay-flex-col loyaltybay-gap-1 ${className}`}
    >
      <label
        htmlFor={checkboxId}
        className={`loyaltybay-flex loyaltybay-items-center loyaltybay-gap-2 loyaltybay-cursor-pointer ${
          disabled ? "loyaltybay-opacity-50 loyaltybay-cursor-not-allowed" : ""
        }`}
      >
        <div
          className={`
          loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center
          loyaltybay-w-4 loyaltybay-h-4 loyaltybay-rounded loyaltybay-border-2 loyaltybay-transition-all loyaltybay-duration-200
          ${
            checked
              ? "loyaltybay-border-[#2271b1] loyaltybay-bg-[#2271b1]"
              : "loyaltybay-border-[#8c8f94] loyaltybay-bg-white hover:loyaltybay-border-[#2271b1]"
          }
        `}
        >
          <svg
            className={`loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-text-white loyaltybay-transform loyaltybay-transition-transform loyaltybay-duration-200 ${
              checked ? "loyaltybay-scale-100" : "loyaltybay-scale-0"
            }`}
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
            id={checkboxId}
            type="checkbox"
            className="!loyaltybay-hidden"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </div>
        {label && <span>{label}</span>}
      </label>
      {description && (
        <p
          className="description loyaltybay-block loyaltybay-mt-0 loyaltybay-pl-6"
        >
          {description}
        </p>
      )}
    </div>
  );
};
