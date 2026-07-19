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
      className={`lb-flex lb-items-center lb-gap-3 lb-cursor-pointer ${
        disabled ? "lb-opacity-50 lb-cursor-not-allowed" : ""
      } ${classNames?.root || ""}`}
    >
      <div
        className={`
        lb-flex lb-items-center lb-justify-center
        lb-w-4 lb-h-4 lb-rounded lb-border-2 lb-transition-all lb-duration-200
        ${
          checked
            ? "lb-border-primary lb-bg-primary"
            : "lb-border-[#949494] lb-bg-transparent hover:lb-border-primary"
        }
        ${classNames?.box || ""}
      `}
      >
        <svg
          className={`lb-w-3.5 lb-h-3.5 lb-text-white lb-transform lb-transition-transform lb-duration-200 ${
            checked ? "lb-scale-100" : "lb-scale-0"
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
          className="!lb-hidden"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      </div>
      {label && (
        <span
          className={`lb-text-[13px] lb-font-[400] lb-leading-[20px] lb-text-[#1e1e1e] ${
            classNames?.label || ""
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
};
