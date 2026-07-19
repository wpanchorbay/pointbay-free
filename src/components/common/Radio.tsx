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
      className={`lb-flex lb-items-center lb-gap-3 lb-cursor-pointer ${
        disabled ? "lb-opacity-50 lb-cursor-not-allowed" : ""
      } ${classNames?.root || ""}`}
    >
      <div
        className={`
        lb-relative lb-flex lb-items-center lb-justify-center
        lb-w-5 lb-h-5 lb-rounded-full lb-border-2 lb-transition-all lb-duration-200
        ${
          checked
            ? "lb-border-primary lb-bg-primary"
            : "lb-border-gray-300 lb-bg-white hover:lb-border-primary"
        }
        ${classNames?.circle || ""}
      `}
      >
        {/* Inner white dot for selected state */}
        <div
          className={`
                lb-w-2 lb-h-2 lb-bg-white lb-rounded-full lb-transform lb-transition-transform lb-duration-200
                ${checked ? "lb-scale-100" : "lb-scale-0"}
                ${classNames?.dot || ""}
            `}
        />
        <input
          type="radio"
          className="lb-hidden"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <span
        className={`lb-text-[15px] lb-font-semibold ${
          checked ? "lb-text-gray-900" : "lb-text-gray-700"
        } ${classNames?.label || ""}`}
      >
        {label}
      </span>
    </label>
  );
};
