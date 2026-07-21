import { check, edit, Icon } from "@wordpress/icons";
import React, { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  classNames?: {
    root?: string;
    text?: string;
    input?: string;
    iconButton?: string;
    icon?: string;
  };
  error?: string | undefined;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  placeholder = "Click to edit...",
  className = "",
  disabled = false,
  classNames,
  error,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const handleSave = () => {
    if (localValue !== (value ?? "")) {
      onChange(localValue);
    }
    setIsEditing(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setLocalValue(value ?? "");
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const onFocus = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const onBlur = () => {
    // Trigger save on blur
    handleSave();
  };

  return (
    <div>
      <div
        className={`loyaltybay-flex loyaltybay-items-center loyaltybay-gap-2 ${className} ${
          classNames?.root || ""
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          readOnly={disabled}
          placeholder={placeholder}
          className={`
          !loyaltybay-bg-transparent !loyaltybay-shadow-none
          loyaltybay-text-[#1e1e1e] loyaltybay-font-[700] loyaltybay-text-[20px] loyaltybay-leading-[32px]
          loyaltybay-px-1 loyaltybay-py-0.5
          loyaltybay-w-auto 
          !loyaltybay-border-t-0 !loyaltybay-border-l-0 !loyaltybay-border-r-0 !loyaltybay-border-b-2
           !loyaltybay-rounded-[0px]
          focus:loyaltybay-outline-none
          loyaltybay-transition-colors loyaltybay-duration-200 placeholder:loyaltybay-italic
          ${
            error
              ? "!loyaltybay-border-red-500"
              : "!loyaltybay-border-transparent focus:!loyaltybay-border-[#3858e9]"
          }
          ${isEditing ? "" : "loyaltybay-cursor-pointer"}
          ${disabled ? "loyaltybay-cursor-not-allowed loyaltybay-opacity-60" : ""}
          ${isEditing ? classNames?.input || "" : classNames?.text || ""}
        `}
        />

        {!disabled && (
          <button
            type="button"
            // Prevent blur on mousedown so click event fires properly
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                handleSave();
              } else {
                inputRef.current?.focus();
              }
            }}
            className={`
            loyaltybay-p-1 loyaltybay-rounded-full loyaltybay-transition-colors
            ${
              isEditing
                ? "loyaltybay-text-primary hover:loyaltybay-bg-blue-50"
                : "loyaltybay-text-gray-400 hover:loyaltybay-text-primary hover:loyaltybay-bg-gray-100"
            }
            ${classNames?.iconButton || ""}
          `}
            aria-label={isEditing ? "Save" : "Edit"}
          >
            {isEditing ? (
              <Icon icon={check} fill="currentColor" />
            ) : (
              <Icon icon={edit} fill="currentColor" />
            )}
          </button>
        )}
      </div>
      {error && (
        <span className="loyaltybay-text-red-500 loyaltybay-text-sm loyaltybay-mt-1">
          {error}
        </span>
      )}
    </div>
  );
};
