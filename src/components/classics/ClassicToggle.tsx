import React from "react";

interface ClassicToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const ClassicToggle: React.FC<ClassicToggleProps> = ({
  checked,
  onChange,
  disabled,
  className = "",
  id,
}) => {
  const toggleId = id || `classic-toggle-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={`pointbay-relative pointbay-inline-block pointbay-w-10 pointbay-align-middle pointbay-select-none pointbay-transition pointbay-duration-200 pointbay-ease-in ${className}`}>
      <input
        type="checkbox"
        id={toggleId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="pointbay-toggle-checkbox pointbay-absolute pointbay-block pointbay-w-5 pointbay-h-5 pointbay-rounded-full pointbay-bg-white pointbay-border-4 pointbay-appearance-none pointbay-cursor-pointer checked:pointbay-right-0 checked:pointbay-border-[#2271b1] pointbay-right-5 pointbay-border-[#8c8f94] pointbay-transition-all pointbay-duration-200"
      />
      <label
        htmlFor={toggleId}
        className={`pointbay-toggle-label pointbay-block pointbay-overflow-hidden pointbay-h-5 pointbay-rounded-full pointbay-cursor-pointer transition-colors duration-200 ${
          checked ? "pointbay-bg-[#2271b1]" : "pointbay-bg-[#8c8f94]"
        } ${disabled ? "pointbay-opacity-50 pointbay-cursor-not-allowed" : ""}`}
      ></label>
      <style>{`
        .pointbay-toggle-checkbox:checked {
          right: 0;
          border-color: #2271b1;
        }
        .pointbay-toggle-checkbox:focus {
            outline: none;
        }
      `}</style>
    </div>
  );
};
