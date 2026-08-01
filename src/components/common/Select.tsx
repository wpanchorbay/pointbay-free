import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from "react";
import { useClickOutside } from "./hooks/useClickOutside";
import {
  borderClasses,
  errorClasses,
  errorClassesManual,
  hoverBorderClasses,
  hoverClassesManual,
} from "./classes";

// SVGs replacement for lucide-react
const ChevronDown = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export interface SelectOption {
  value: string | number;
  label: string;
  /**
   * Optional custom classes for this specific option.
   * Useful for multi-color dropdowns (e.g., badges, status colors).
   */
  className?: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  /**
   * The current selected value(s)
   */
  value: SelectOption["value"] | null;
  /**
   * Callback when an option is selected
   */
  onChange: (value: string | number) => void;
  /**
   * List of available options
   */
  options: SelectOption[];
  /**
   * Placeholder text when no value is selected
   */
  placeholder?: string;

  /**
   * Font size for the select options
   */
  fontSize?: number;

  /**
   * Font weight for the select options
   */
  fontWeight?: number;
  /**
   * Disable the entire interaction
   */
  disabled?: boolean;
  /**
   * Custom class for the container
   */
  className?: string;
  /**
   * Helper text or label (optional)
   */
  label?: string;

  /**
   * Enable search functionality within the dropdown
   */
  enableSearch?: boolean;
  /**
   * Reference to the container element
   */
  con_ref?: React.Ref<HTMLDivElement>;
  /**
   * Custom border class
   */
  border?: string;
  /**
   * Custom hover border class
   */
  hoverBorder?: string;
  /**
   * Custom text color class
   */
  color?: string;

  isError?: boolean;

  errorClassName?: string;

  differentDropdownWidth?: boolean;

  hideIcon?: boolean;

  isCompact?: boolean;

  classNames?: {
    wrapper?: string;
    container?: string;
    label?: string;
    select?: string;
    option?: string;
    dropdown?: string;
    search?: string;
    error?: string;
  };

  /**
   * Custom render function for option display.
   * Receives the option object and returns a ReactNode.
   * Used for both the selected display and the dropdown list.
   */
  renderOption?: (option: SelectOption) => React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  id,
  value,
  con_ref,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  className = "",
  fontSize = 13,
  fontWeight = 500,
  label,
  enableSearch = false,
  border = borderClasses,
  hoverBorder = hoverBorderClasses,
  color = "pointbay-text-[#0a4b78]",
  isError = false,
  errorClassName = errorClasses,
  differentDropdownWidth = false,
  hideIcon = false,
  isCompact = false,
  classNames = {} as NonNullable<SelectProps["classNames"]>,
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track interaction type to prevent auto-scrolling on mouse hover
  const interactionType = useRef<"mouse" | "keyboard">("keyboard");

  // Close dropdown when clicking outside
  useClickOutside(containerRef, () => {
    setIsOpen(false);
  });

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!enableSearch || !searchQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery, enableSearch]);

  // Reset search and highlighted index when opening/closing
  useEffect(() => {
    if (isOpen) {
      if (enableSearch && searchInputRef.current) {
        // Wait for render, then focus
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }

      // Highlight the currently selected item in the filtered list if present
      const selectedIndex = value
        ? filteredOptions.findIndex((opt) => opt.value === value)
        : 0;
      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      setHighlightedIndex(initialIndex);

      // Ensure we allow scrolling to the initial selection
      interactionType.current = "keyboard";
    } else {
      // Clear search when closed
      setSearchQuery("");
    }
  }, [isOpen, value, enableSearch, filteredOptions.length]);

  // Scroll highlighted item into view (Only if interaction was keyboard or initial open)
  useEffect(() => {
    if (
      isOpen &&
      listRef.current &&
      highlightedIndex >= 0 &&
      interactionType.current === "keyboard"
    ) {
      const list = listRef.current;
      const element = list.children[highlightedIndex] as HTMLElement;
      if (element) {
        const listTop = list.scrollTop;
        const listBottom = listTop + list.clientHeight;
        const elementTop = element.offsetTop;
        const elementBottom = elementTop + element.offsetHeight;

        if (elementTop < listTop) {
          list.scrollTop = elementTop;
        } else if (elementBottom > listBottom) {
          list.scrollTop = elementBottom - list.clientHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Keyboard handler for the Main Trigger Div
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    // If search is enabled and open, the input handles keys, not this div
    // But if closed, or if search is disabled, this handles keys.
    if (isOpen && enableSearch) return;

    interactionType.current = "keyboard";

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen) {
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
        } else {
          setIsOpen((prev) => !prev);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          // Navigation when open but search disabled
          setHighlightedIndex((prev) => {
            const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
            return next;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          // Navigation when open but search disabled
          setHighlightedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
            return next;
          });
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      case "Escape":
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  // Keyboard handler for the Search Input
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    interactionType.current = "keyboard";
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return next;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        // Return focus to the trigger
        if (containerRef.current) {
          const trigger = containerRef.current.querySelector(
            '[role="combobox"]',
          ) as HTMLElement;
          trigger?.focus();
        }
        break;
      default:
        break;
    }
  };

  // Track hover highlight for mouse interaction
  const handleOptionMouseEnter = (index: number) => {
    interactionType.current = "mouse";
    setHighlightedIndex(index);
  };
  return (
    <div
      className={`pointbay-relative pointbay-w-full ${className} ${
        classNames.wrapper || ""
      }`}
      ref={containerRef}
    >
      {label && (
        <label
          className={`pointbay-block pointbay-text-sm pointbay-font-medium pointbay-text-gray-700 pointbay-mb-1 ${
            classNames.label || ""
          }`}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div
        id={id}
        ref={con_ref}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="custom-select-list"
        aria-disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`
          pointbay-ring-1 pointbay-ring-transparent
          pointbay-relative pointbay-flex pointbay-flex-wrap  pointbay-items-center pointbay-justify-between pointbay-w-full pointbay-gap-0 pointbay-px-4  pointbay-text-left !pointbay-cursor-pointer 
          pointbay-transition-all pointbay-duration-200 pointbay-ease-in-out pointbay-border pointbay-rounded-[8px] pointbay-bg-white ${border} 
          ${isCompact ? "pointbay-py-[5px]" : "pointbay-py-[9px]"}
          ${!disabled && !isOpen ? ` ${color} ` : ""}
          ${
            disabled
              ? "pointbay-bg-gray-100 pointbay-cursor-not-allowed pointbay-text-gray-400 pointbay-border-gray-200"
              : isError
              ? ""
              : "hover:!pointbay-border-[#3858e9]"
          }
          ${isOpen ? (isError ? errorClassesManual : hoverClassesManual) : ""}
          ${isError ? `${errorClassName} ${classNames.error || ""}` : ""}
          ${classNames.select || ""} ${classNames.container || ""}
        `}
      >
        <div className="pointbay-flex-1 pointbay-min-w-0">
          {enableSearch && isOpen ? (
            <input
              ref={searchInputRef}
              type="text"
              className={`pointbay-w-full !pointbay-bg-transparent !pointbay-border-none !pointbay-shadow-none !pointbay-outline-none !pointbay-p-0 !pointbay-font-[${fontWeight}] !pointbay-text-[${fontSize}px] !pointbay-leading-[20px] !pointbay-min-h-[unset] ${
                classNames.search || ""
              }`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0); // Reset highlight on search
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
            />
          ) : (
            <span
              className={`pointbay-block pointbay-truncate ${color} hover:!pointbay-text-[#3858e9] pointbay-text-[${fontSize}px] pointbay-font-[${fontWeight}]`}
            >
              {value ? (
                <span
                  className={`pointbay-flex pointbay-items-center pointbay-gap-2 `}
                >
                  {renderOption && selectedOption
                    ? renderOption(selectedOption)
                    : selectedOption?.label}
                </span>
              ) : (
                placeholder
              )}
            </span>
          )}
        </div>

        {/* Chevron Icon */}
        {!hideIcon ? (
          <span className="pointbay-flex-shrink-0 pointbay-ml-2 pointbay-flex pointbay-items-center">
            <ChevronDown
              className={`pointbay-h-4 pointbay-w-4 pointbay-text-gray-700 pointbay-transition-transform pointbay-duration-200 ${
                isOpen ? "pointbay-transform pointbay-rotate-180" : ""
              }`}
            />
          </span>
        ) : null}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`pointbay-absolute pointbay-z-[50000] pointbay-bg-white pointbay-border pointbay-border-gray-200 pointbay-rounded-[12px] pointbay-shadow-[0_2px_2px_rgba(0,0,0,0.3)] -pointbay-mt-[1px] pointbay-p-1 ${
            differentDropdownWidth ? "" : "pointbay-w-full"
          } ${classNames.dropdown || ""}`}
        >
          {/* Options List */}
          <ul
            ref={listRef}
            id="custom-select-list"
            role="listbox"
            tabIndex={-1}
            className={`pointbay-max-h-60 pointbay-overflow-auto focus:pointbay-outline-none pointbay-scrollbar-hide pointbay-relative ${color} pointbay-font-[${fontWeight}] pointbay-text-[${fontSize}px]`}
            style={{ scrollbarWidth: "none" }}
          >
            {filteredOptions.length === 0 ? (
              <li className="pointbay-relative pointbay-cursor-default pointbay-select-none pointbay-p-1  pointbay-italic pointbay-text-center pointbay-rounded-[8px]">
                {searchQuery ? "No results found" : "No options available"}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedOption?.value === option.value;
                const isHighlighted = highlightedIndex === index;
                const isDisabled = option.disabled;

                return (
                  <li
                    key={`${option.value}-${index}`}
                    id={`option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => handleOptionMouseEnter(index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                    className={`
                      pointbay-group pointbay-relative pointbay-cursor-pointer pointbay-select-none pointbay-px-3  pointbay-flex pointbay-flex-nowrap pointbay-justify-between pointbay-min-h-[36px]pointbay-font-medium pointbay-transition-colors pointbay-duration-150 !pointbay-mb-0 pointbay-border-b-[1px] pointbay-border-gray-100  pointbay-rounded-[8px] 
                      ${
                        isDisabled
                          ? "pointbay-opacity-100 !pointbay-cursor-not-allowed pointbay-text-gray-500 pointbay-bg-gray-200"
                          : ""
                      }
                      ${
                        isHighlighted && !isDisabled
                          ? "pointbay-bg-blue-600 pointbay-text-white"
                          : isDisabled
                          ? "pointbay-text-gray-400"
                          : ""
                      }
                      ${
                        !isHighlighted && !isDisabled
                          ? option.className || ""
                          : ""
                      }
                      ${classNames.option || ""}
                    `}
                  >
                    <div className="pointbay-flex pointbay-items-center pointbay-justify-between pointbay-min-h-[36px] pointbay-w-full pointbay-gap-4">
                      <span
                        className={`pointbay-block pointbay-truncate ${
                          isSelected
                            ? "pointbay-font-semibold"
                            : "pointbay-font-normal"
                        }`}
                      >
                        {renderOption ? renderOption(option) : option.label}
                      </span>
                    </div>

                    {/* Checkmark for selected item */}
                    {isSelected && (
                      <span
                        className={`pointbay-px-3 pointbay-pr-0 pointbay-flex-nowrap pointbay-flex pointbay-items-center pointbay-pr-4 ${
                          isHighlighted && !isDisabled
                            ? "pointbay-text-white"
                            : "pointbay-text-blue-600"
                        }`}
                      >
                        <svg
                          className="pointbay-h-5 pointbay-w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Select;
