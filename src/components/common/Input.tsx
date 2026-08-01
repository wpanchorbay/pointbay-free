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
      "pointbay-px-[8px] !pointbay-py-[7px] pointbay-text-[13px] pointbay-leading-[20px]",
    medium:
      "pointbay-px-[12px] !pointbay-py-[9px] !pointbay-text-[13px] !pointbay-leading-[20px]",
    large:
      "pointbay-px-[12px] !pointbay-py-[11px] pointbay-text-[13px] pointbay-leading-[20px]",
  };

  return (
    <div className={`pointbay-w-full ${classNames?.root || ""}`}>
      {label && (
        <label
          className={`pointbay-block pointbay-text-sm pointbay-font-bold pointbay-text-gray-900 pointbay-mb-2 ${
            classNames?.label || ""
          }`}
        >
          {label}
        </label>
      )}
      <input
        className={`
          pointbay-w-full pointbay-outline-none
          pointbay-bg-white pointbay-border pointbay-rounded-[8px]
          pointbay-text-[#1e1e1e] pointbay-placeholder-gray-400
          ${sizeClasses[size]}
          ${borderClasses}
          ${transitionClasses}
          ${error ? errorClasses : hoverClasses}
          ${
            props.disabled
              ? "pointbay-opacity-50 pointbay-cursor-not-allowed"
              : ""
          }
          ${className}
          ${classNames?.input || ""}
        `}
        {...props}
      />
      {error && (
        <span
          className={`pointbay-mt-1 pointbay-text-xs pointbay-text-red-500 ${
            classNames?.error || ""
          }`}
        >
          {error}
        </span>
      )}
    </div>
  );
};
