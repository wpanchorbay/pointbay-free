import React, { useCallback, useState, useEffect } from "react";
import {
  borderClasses,
  errorWithInClasses,
  hoverWithInClasses,
  transitionClasses,
} from "./classes";

interface NumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  classNames?: {
    wrapper?: string;
    root?: string;
    label?: string;
    input?: string;
    buttonContainer?: string;
    incrementButton?: string;
    decrementButton?: string;
    error?: string;
  };
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  error,
  className = "",
  disabled = false,
  placeholder = "0",
  classNames,
}) => {
  // Local state to handle string input (allows empty string, trailing decimals, etc.)
  const [localValue, setLocalValue] = useState<string | number>(value ?? "");

  // Sync local state when prop value changes externally
  useEffect(() => {
    setLocalValue((prev) => {
      if (value === null || value === undefined) {
        return "";
      }
      // If the current local value numerically matches the new prop value,
      // keep the local string to preserve cursor position and formatting (e.g. "1.0" vs 1).
      const parsed = parseFloat(prev.toString());
      if (!isNaN(parsed) && parsed === value) {
        return prev;
      }
      return value;
    });
  }, [value]);

  const handleIncrement = useCallback(() => {
    if (!disabled) {
      const currentValue = value === null || value === undefined ? 0 : value;
      let newValue = Number(currentValue) + Number(step);

      if (newValue < min) newValue = min;
      if (newValue > max) newValue = max;

      onChange(newValue);
    }
  }, [value, step, max, min, onChange, disabled]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      const currentValue = value === null || value === undefined ? 0 : value;
      let newValue = Number(currentValue) - Number(step);

      if (newValue < min) newValue = min;
      if (newValue > max) newValue = max;

      onChange(newValue);
    }
  }, [value, step, min, max, onChange, disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);

    if (inputValue === "") {
      onChange(null);
      return;
    }

    if (inputValue === "-") {
      // We allow the input to be just a minus sign locally
      return;
    }

    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue)) {
      if (newValue <= max && newValue >= min) {
        onChange(newValue);
      }
    }
  };

  const handleBlur = () => {
    // On blur, reset to the prop value if the local input is invalid.
    // If local is empty, ensure prop value is respected (which might be null).
    if (localValue === "" || localValue === "-") {
      if (value !== null && value !== undefined) {
        setLocalValue(value);
      } else {
        setLocalValue("");
      }
      return;
    }

    const parsed = parseFloat(localValue.toString());

    if (isNaN(parsed)) {
      // Should not happen given regex checks usually, but safety fallback
      setLocalValue(value ?? "");
      return;
    }

    let finalValue = parsed;

    // Clamp value on blur if it exceeds bounds
    if (parsed > max) {
      finalValue = max;
    } else if (parsed < min) {
      finalValue = min;
    }

    setLocalValue(finalValue);

    // If the value changed due to clamping or was not synced yet (because it was out of bounds during typing), update parent
    if (finalValue !== value) {
      onChange(finalValue);
    }
  };

  return (
    <div className={`pointbay-w-full ${classNames?.wrapper || ""}`}>
      {label && (
        <label
          className={`pointbay-block pointbay-text-sm pointbay-font-bold pointbay-text-gray-900 pointbay-mb-2 ${
            classNames?.label || ""
          }`}
        >
          {label}
        </label>
      )}

      <div
        className={`
          pointbay-flex pointbay-items-center pointbay-justify-between pointbay-overflow-hidden
          pointbay-rounded-[8px] pointbay-bg-white pointbay-min-w-min pointbay-py-[1px]
          ${borderClasses}
          ${transitionClasses}
          ${error ? errorWithInClasses : hoverWithInClasses}
          ${
            disabled
              ? "pointbay-opacity-50 pointbay-cursor-not-allowed pointbay-bg-gray-50"
              : ""
          }
          ${className}
          ${classNames?.root || ""}
        `}
      >
        <input
          type="number"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            !pointbay-border-none !pointbay-outline-none 
            focus:!pointbay-outline-none focus:!pointbay-border-none focus:!pointbay-shadow-none
            pointbay-px-[12px] pointbay-py-[9px] 
            pointbay-text-[13px] pointbay-leading-[20px] 
            pointbay-text-[#1e1e1e] pointbay-font-[400] 
            pointbay-min-w-[60px] pointbay-w-full 
            pointbay-bg-transparent pointbay-border-none pointbay-outline-none 
            pointbay-placeholder-gray-400
            hide-spin-button
            ${disabled ? "pointbay-cursor-not-allowed" : ""}
            ${classNames?.input || ""}
          `}
          placeholder={placeholder}
        />

        <div
          className={`pointbay-flex pointbay-items-center pointbay-px-2 !pointbay-pl-0.5 pointbay-space-x-1 pointbay-select-none ${
            classNames?.buttonContainer || ""
          }`}
        >
          <button
            type="button"
            onClick={handleIncrement}
            disabled={
              disabled ||
              (value !== null && value !== undefined && value >= max)
            }
            className={`
              pointbay-p-2 !pointbay-pr-0.5 pointbay-text-gray-500 pointbay-transition-colors pointbay-duration-150
              hover:pointbay-text-gray-900 focus:pointbay-outline-none active:pointbay-scale-95
              disabled:pointbay-opacity-30 disabled:hover:pointbay-text-gray-500
              ${classNames?.incrementButton || ""}
            `}
            aria-label="Increase value"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          <button
            type="button"
            onClick={handleDecrement}
            disabled={
              disabled ||
              (value !== null && value !== undefined && value <= min)
            }
            className={`
              pointbay-p-2 pointbay-text-gray-500 pointbay-transition-colors pointbay-duration-150
              hover:pointbay-text-gray-900 focus:pointbay-outline-none active:pointbay-scale-95
              disabled:pointbay-opacity-30 disabled:hover:pointbay-text-gray-500
              ${classNames?.decrementButton || ""}
            `}
            aria-label="Decrease value"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

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
