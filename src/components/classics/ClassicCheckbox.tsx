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
      className={`pointbay-flex pointbay-flex-col pointbay-gap-1 ${className}`}
    >
      <label
        htmlFor={checkboxId}
        className={`pointbay-flex pointbay-items-center pointbay-gap-2 pointbay-cursor-pointer ${
          disabled ? "pointbay-opacity-50 pointbay-cursor-not-allowed" : ""
        }`}
      >
        <div
          className={`
          pointbay-flex pointbay-items-center pointbay-justify-center
          pointbay-w-4 pointbay-h-4 pointbay-rounded pointbay-border-2 pointbay-transition-all pointbay-duration-200
          ${
            checked
              ? "pointbay-border-[#2271b1] pointbay-bg-[#2271b1]"
              : "pointbay-border-[#8c8f94] pointbay-bg-white hover:pointbay-border-[#2271b1]"
          }
        `}
        >
          <svg
            className={`pointbay-w-3.5 pointbay-h-3.5 pointbay-text-white pointbay-transform pointbay-transition-transform pointbay-duration-200 ${
              checked ? "pointbay-scale-100" : "pointbay-scale-0"
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
            className="!pointbay-hidden"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </div>
        {label && <span>{label}</span>}
      </label>
      {description && (
        <p
          className="description pointbay-block pointbay-mt-0 pointbay-pl-6"
        >
          {description}
        </p>
      )}
    </div>
  );
};
