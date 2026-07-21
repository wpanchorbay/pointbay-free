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
      "loyaltybay-px-[8px] !loyaltybay-py-[7px] loyaltybay-text-[13px] loyaltybay-leading-[20px]",
    medium:
      "loyaltybay-px-[12px] !loyaltybay-py-[9px] !loyaltybay-text-[13px] !loyaltybay-leading-[20px]",
    large:
      "loyaltybay-px-[12px] !loyaltybay-py-[11px] loyaltybay-text-[13px] loyaltybay-leading-[20px]",
  };

  return (
    <div className={`loyaltybay-w-full ${classNames?.root || ""}`}>
      {label && (
        <label
          className={`loyaltybay-block loyaltybay-text-sm loyaltybay-font-bold loyaltybay-text-gray-900 loyaltybay-mb-2 ${
            classNames?.label || ""
          }`}
        >
          {label}
        </label>
      )}
      <input
        className={`
          loyaltybay-w-full loyaltybay-outline-none
          loyaltybay-bg-white loyaltybay-border loyaltybay-rounded-[8px]
          loyaltybay-text-[#1e1e1e] loyaltybay-placeholder-gray-400
          ${sizeClasses[size]}
          ${borderClasses}
          ${transitionClasses}
          ${error ? errorClasses : hoverClasses}
          ${
            props.disabled
              ? "loyaltybay-opacity-50 loyaltybay-cursor-not-allowed"
              : ""
          }
          ${className}
          ${classNames?.input || ""}
        `}
        {...props}
      />
      {error && (
        <span
          className={`loyaltybay-mt-1 loyaltybay-text-xs loyaltybay-text-red-500 ${
            classNames?.error || ""
          }`}
        >
          {error}
        </span>
      )}
    </div>
  );
};
