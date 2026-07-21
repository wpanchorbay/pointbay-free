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
    <div className={`loyaltybay-relative loyaltybay-inline-block loyaltybay-w-10 loyaltybay-align-middle loyaltybay-select-none loyaltybay-transition loyaltybay-duration-200 loyaltybay-ease-in ${className}`}>
      <input
        type="checkbox"
        id={toggleId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="loyaltybay-toggle-checkbox loyaltybay-absolute loyaltybay-block loyaltybay-w-5 loyaltybay-h-5 loyaltybay-rounded-full loyaltybay-bg-white loyaltybay-border-4 loyaltybay-appearance-none loyaltybay-cursor-pointer checked:loyaltybay-right-0 checked:loyaltybay-border-[#2271b1] loyaltybay-right-5 loyaltybay-border-[#8c8f94] loyaltybay-transition-all loyaltybay-duration-200"
      />
      <label
        htmlFor={toggleId}
        className={`loyaltybay-toggle-label loyaltybay-block loyaltybay-overflow-hidden loyaltybay-h-5 loyaltybay-rounded-full loyaltybay-cursor-pointer transition-colors duration-200 ${
          checked ? "loyaltybay-bg-[#2271b1]" : "loyaltybay-bg-[#8c8f94]"
        } ${disabled ? "loyaltybay-opacity-50 loyaltybay-cursor-not-allowed" : ""}`}
      ></label>
      <style>{`
        .loyaltybay-toggle-checkbox:checked {
          right: 0;
          border-color: #2271b1;
        }
        .loyaltybay-toggle-checkbox:focus {
            outline: none;
        }
      `}</style>
    </div>
  );
};
