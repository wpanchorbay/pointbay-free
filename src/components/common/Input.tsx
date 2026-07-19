import React from "react";
import {
  borderClasses,
  errorClasses,
  hoverClasses,
  transitionClasses,
} from "./classes";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  size?: "small" | "medium" | "large";
  classNames?: {
    root?: string;
    label?: string;
    input?: string;
    error?: string;
  };
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  size = "medium",
  className = "",
  classNames,
  ...props
}) => {
  const sizeClasses = {
    small:
      "lb-px-[8px] !lb-py-[7px] lb-text-[13px] lb-leading-[20px]",
    medium:
      "lb-px-[12px] !lb-py-[9px] !lb-text-[13px] !lb-leading-[20px]",
    large:
      "lb-px-[12px] !lb-py-[11px] lb-text-[13px] lb-leading-[20px]",
  };

  return (
    <div className={`lb-w-full ${classNames?.root || ""}`}>
      {label && (
        <label
          className={`lb-block lb-text-sm lb-font-bold lb-text-gray-900 lb-mb-2 ${
            classNames?.label || ""
          }`}
        >
          {label}
        </label>
      )}
      <input
        className={`
          lb-w-full lb-outline-none
          lb-bg-white lb-border lb-rounded-[8px]
          lb-text-[#1e1e1e] lb-placeholder-gray-400
          ${sizeClasses[size]}
          ${borderClasses}
          ${transitionClasses}
          ${error ? errorClasses : hoverClasses}
          ${
            props.disabled
              ? "lb-opacity-50 lb-cursor-not-allowed"
              : ""
          }
          ${className}
          ${classNames?.input || ""}
        `}
        {...props}
      />
      {error && (
        <span
          className={`lb-mt-1 lb-text-xs lb-text-red-500 ${
            classNames?.error || ""
          }`}
        >
          {error}
        </span>
      )}
    </div>
  );
};
