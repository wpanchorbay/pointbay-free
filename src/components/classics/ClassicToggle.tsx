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
    <div className={`lb-relative lb-inline-block lb-w-10 lb-align-middle lb-select-none lb-transition lb-duration-200 lb-ease-in ${className}`}>
      <input
        type="checkbox"
        id={toggleId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="lb-toggle-checkbox lb-absolute lb-block lb-w-5 lb-h-5 lb-rounded-full lb-bg-white lb-border-4 lb-appearance-none lb-cursor-pointer checked:lb-right-0 checked:lb-border-[#2271b1] lb-right-5 lb-border-[#8c8f94] lb-transition-all lb-duration-200"
      />
      <label
        htmlFor={toggleId}
        className={`lb-toggle-label lb-block lb-overflow-hidden lb-h-5 lb-rounded-full lb-cursor-pointer transition-colors duration-200 ${
          checked ? "lb-bg-[#2271b1]" : "lb-bg-[#8c8f94]"
        } ${disabled ? "lb-opacity-50 lb-cursor-not-allowed" : ""}`}
      ></label>
      <style>{`
        .lb-toggle-checkbox:checked {
          right: 0;
          border-color: #2271b1;
        }
        .lb-toggle-checkbox:focus {
            outline: none;
        }
      `}</style>
    </div>
  );
};
