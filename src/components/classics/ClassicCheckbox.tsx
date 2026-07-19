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
      className={`lb-flex lb-flex-col lb-gap-1 ${className}`}
    >
      <label
        htmlFor={checkboxId}
        className={`lb-flex lb-items-center lb-gap-2 lb-cursor-pointer ${
          disabled ? "lb-opacity-50 lb-cursor-not-allowed" : ""
        }`}
      >
        <div
          className={`
          lb-flex lb-items-center lb-justify-center
          lb-w-4 lb-h-4 lb-rounded lb-border-2 lb-transition-all lb-duration-200
          ${
            checked
              ? "lb-border-[#2271b1] lb-bg-[#2271b1]"
              : "lb-border-[#8c8f94] lb-bg-white hover:lb-border-[#2271b1]"
          }
        `}
        >
          <svg
            className={`lb-w-3.5 lb-h-3.5 lb-text-white lb-transform lb-transition-transform lb-duration-200 ${
              checked ? "lb-scale-100" : "lb-scale-0"
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
            className="!lb-hidden"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </div>
        {label && <span>{label}</span>}
      </label>
      {description && (
        <p
          className="description lb-block lb-mt-0 lb-pl-6"
        >
          {description}
        </p>
      )}
    </div>
  );
};
