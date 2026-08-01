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
        className={`pointbay-flex pointbay-items-center pointbay-gap-2 ${className} ${
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
          !pointbay-bg-transparent !pointbay-shadow-none
          pointbay-text-[#1e1e1e] pointbay-font-[700] pointbay-text-[20px] pointbay-leading-[32px]
          pointbay-px-1 pointbay-py-0.5
          pointbay-w-auto 
          !pointbay-border-t-0 !pointbay-border-l-0 !pointbay-border-r-0 !pointbay-border-b-2
           !pointbay-rounded-[0px]
          focus:pointbay-outline-none
          pointbay-transition-colors pointbay-duration-200 placeholder:pointbay-italic
          ${
            error
              ? "!pointbay-border-red-500"
              : "!pointbay-border-transparent focus:!pointbay-border-[#3858e9]"
          }
          ${isEditing ? "" : "pointbay-cursor-pointer"}
          ${disabled ? "pointbay-cursor-not-allowed pointbay-opacity-60" : ""}
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
            pointbay-p-1 pointbay-rounded-full pointbay-transition-colors
            ${
              isEditing
                ? "pointbay-text-primary hover:pointbay-bg-blue-50"
                : "pointbay-text-gray-400 hover:pointbay-text-primary hover:pointbay-bg-gray-100"
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
        <span className="pointbay-text-red-500 pointbay-text-sm pointbay-mt-1">
          {error}
        </span>
      )}
    </div>
  );
};
