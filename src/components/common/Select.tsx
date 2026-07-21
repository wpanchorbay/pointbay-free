import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
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

const LockKeyhole = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="16" r="1" />
    <rect x="3" y="10" width="18" height="12" rx="2" />
    <path d="M7 10V7a5 5 0 0 1 10 0v3" />
  </svg>
);

const Hourglass = ({ className }: { className?: string }) => (
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
    <path d="M5 22h14" />
    <path d="M5 2h14" />
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
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
  /**
   * Special variants for the option.
   * 'buy_pro' will disable the option and show a tooltip.
   */
  variant?: "buy_pro" | "coming_soon";
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
  color = "loyaltybay-text-[#0a4b78]",
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

  // Tooltip state
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
    index: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Track interaction type to prevent auto-scrolling on mouse hover
  const interactionType = useRef<"mouse" | "keyboard">("keyboard");

  // Close dropdown when clicking outside
  useClickOutside(containerRef, (event) => {
    if (
      tooltipRef.current &&
      tooltipRef.current.contains(event.target as Node)
    ) {
      return;
    }
    setIsOpen(false);
    setTooltipState(null);
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
      setTooltipState(null);
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
    if (
      option.disabled ||
      option.variant === "buy_pro" ||
      option.variant === "coming_soon"
    )
      return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery("");
    setTooltipState(null);
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

  // Handle showing tooltip with delay logic
  const handleOptionMouseEnter = (
    e: React.MouseEvent<HTMLLIElement>,
    index: number,
    isPro: boolean,
  ) => {
    interactionType.current = "mouse";
    setHighlightedIndex(index);

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (isPro) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({
        visible: true,
        top: rect.top,
        left: rect.left + rect.width / 2,
        width: rect.width,
        index: index,
      });
    } else {
      // If moving to a non-pro item, close tooltip immediately
      setTooltipState(null);
    }
  };

  const handleOptionMouseLeave = () => {
    // Delay hiding tooltip to allow moving mouse into the tooltip itself
    hoverTimeoutRef.current = window.setTimeout(() => {
      setTooltipState(null);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setTooltipState(null);
    }, 150);
  };
  return (
    <div
      className={`loyaltybay-relative loyaltybay-w-full ${className} ${
        classNames.wrapper || ""
      }`}
      ref={containerRef}
    >
      {label && (
        <label
          className={`loyaltybay-block loyaltybay-text-sm loyaltybay-font-medium loyaltybay-text-gray-700 loyaltybay-mb-1 ${
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
          loyaltybay-ring-1 loyaltybay-ring-transparent
          loyaltybay-relative loyaltybay-flex loyaltybay-flex-wrap  loyaltybay-items-center loyaltybay-justify-between loyaltybay-w-full loyaltybay-gap-0 loyaltybay-px-4  loyaltybay-text-left !loyaltybay-cursor-pointer 
          loyaltybay-transition-all loyaltybay-duration-200 loyaltybay-ease-in-out loyaltybay-border loyaltybay-rounded-[8px] loyaltybay-bg-white ${border} 
          ${isCompact ? "loyaltybay-py-[5px]" : "loyaltybay-py-[9px]"}
          ${!disabled && !isOpen ? ` ${color} ` : ""}
          ${
            disabled
              ? "loyaltybay-bg-gray-100 loyaltybay-cursor-not-allowed loyaltybay-text-gray-400 loyaltybay-border-gray-200"
              : isError
              ? ""
              : "hover:!loyaltybay-border-[#3858e9]"
          }
          ${isOpen ? (isError ? errorClassesManual : hoverClassesManual) : ""}
          ${isError ? `${errorClassName} ${classNames.error || ""}` : ""}
          ${classNames.select || ""} ${classNames.container || ""}
        `}
      >
        <div className="loyaltybay-flex-1 loyaltybay-min-w-0">
          {enableSearch && isOpen ? (
            <input
              ref={searchInputRef}
              type="text"
              className={`loyaltybay-w-full !loyaltybay-bg-transparent !loyaltybay-border-none !loyaltybay-shadow-none !loyaltybay-outline-none !loyaltybay-p-0 !loyaltybay-font-[${fontWeight}] !loyaltybay-text-[${fontSize}px] !loyaltybay-leading-[20px] !loyaltybay-min-h-[unset] ${
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
              className={`loyaltybay-block loyaltybay-truncate ${color} hover:!loyaltybay-text-[#3858e9] loyaltybay-text-[${fontSize}px] loyaltybay-font-[${fontWeight}]`}
            >
              {value ? (
                <span
                  className={`loyaltybay-flex loyaltybay-items-center loyaltybay-gap-2 `}
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
          <span className="loyaltybay-flex-shrink-0 loyaltybay-ml-2 loyaltybay-flex loyaltybay-items-center">
            <ChevronDown
              className={`loyaltybay-h-4 loyaltybay-w-4 loyaltybay-text-gray-700 loyaltybay-transition-transform loyaltybay-duration-200 ${
                isOpen ? "loyaltybay-transform loyaltybay-rotate-180" : ""
              }`}
            />
          </span>
        ) : null}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`loyaltybay-absolute loyaltybay-z-[50000] loyaltybay-bg-white loyaltybay-border loyaltybay-border-gray-200 loyaltybay-rounded-[12px] loyaltybay-shadow-[0_2px_2px_rgba(0,0,0,0.3)] -loyaltybay-mt-[1px] loyaltybay-p-1 ${
            differentDropdownWidth ? "" : "loyaltybay-w-full"
          } ${classNames.dropdown || ""}`}
        >
          {/* Options List */}
          <ul
            ref={listRef}
            id="custom-select-list"
            role="listbox"
            tabIndex={-1}
            onScroll={() => setTooltipState(null)} // Hide tooltip on scroll to prevent detachment
            className={`loyaltybay-max-h-60 loyaltybay-overflow-auto focus:loyaltybay-outline-none loyaltybay-scrollbar-hide loyaltybay-relative ${color} loyaltybay-font-[${fontWeight}] loyaltybay-text-[${fontSize}px]`}
            style={{ scrollbarWidth: "none" }}
          >
            {filteredOptions.length === 0 ? (
              <li className="loyaltybay-relative loyaltybay-cursor-default loyaltybay-select-none loyaltybay-p-1  loyaltybay-italic loyaltybay-text-center loyaltybay-rounded-[8px]">
                {searchQuery ? "No results found" : "No options available"}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedOption?.value === option.value;
                // Highlight if matched index OR if it's the item keeping the tooltip open
                const isHighlighted =
                  highlightedIndex === index ||
                  (tooltipState?.visible && tooltipState.index === index);
                const isPro = option.variant === "buy_pro";
                const isComingSoon = option.variant === "coming_soon";
                const isDisabled = option.disabled || isPro;

                return (
                  <li
                    key={`${option.value}-${index}`}
                    id={`option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={(e) =>
                      handleOptionMouseEnter(e, index, !!isPro)
                    }
                    onMouseLeave={handleOptionMouseLeave}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                    className={`
                      loyaltybay-group loyaltybay-relative loyaltybay-cursor-pointer loyaltybay-select-none loyaltybay-px-3  loyaltybay-flex loyaltybay-flex-nowrap loyaltybay-justify-between loyaltybay-min-h-[36px]loyaltybay-font-medium loyaltybay-transition-colors loyaltybay-duration-150 !loyaltybay-mb-0 loyaltybay-border-b-[1px] loyaltybay-border-gray-100  loyaltybay-rounded-[8px] 
                      ${
                        isDisabled
                          ? "loyaltybay-opacity-100 !loyaltybay-cursor-not-allowed loyaltybay-text-gray-500 loyaltybay-bg-gray-200"
                          : ""
                      }
                      ${
                        isComingSoon
                          ? "loyaltybay-opacity-100 !loyaltybay-cursor-not-allowed !loyaltybay-text-pink-500 hover:!loyaltybay-text-pink-600 loyaltybay-bg-gray-200"
                          : ""
                      }
                      ${
                        isHighlighted && !isDisabled
                          ? "loyaltybay-bg-blue-600 loyaltybay-text-white"
                          : isDisabled
                          ? "loyaltybay-text-gray-400"
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
                    <div className="loyaltybay-flex loyaltybay-items-center loyaltybay-justify-between loyaltybay-min-h-[36px] loyaltybay-w-full loyaltybay-gap-4">
                      <span
                        className={`loyaltybay-block loyaltybay-truncate ${
                          isSelected
                            ? "loyaltybay-font-semibold"
                            : "loyaltybay-font-normal"
                        }`}
                      >
                        {renderOption ? renderOption(option) : option.label}
                      </span>

                      {/* Lock Icon for Buy Pro */}
                      {isPro && (
                        <LockKeyhole className="loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-text-[#f02a74]" />
                      )}
                      {isComingSoon && (
                        <span className="loyaltybay-bg-pink-600 loyaltybay-text-white loyaltybay-p-1 loyaltybay-px-2 loyaltybay-rounded-full loyaltybay-text-xs loyaltybay-flex loyaltybay-items-center loyaltybay-gap-1 loyaltybay-flex-nowrap">
                          <Hourglass className="loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-text-white" />
                          <span className="loyaltybay-whitespace-nowrap">
                            Coming Soon
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Checkmark for selected item */}
                    {isSelected && !isPro && !isComingSoon && (
                      <span
                        className={`loyaltybay-px-3 loyaltybay-pr-0 loyaltybay-flex-nowrap loyaltybay-flex loyaltybay-items-center loyaltybay-pr-4 ${
                          isHighlighted && !isDisabled
                            ? "loyaltybay-text-white"
                            : "loyaltybay-text-blue-600"
                        }`}
                      >
                        <svg
                          className="loyaltybay-h-5 loyaltybay-w-5"
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

      {/* Tooltip Portal - Renders to body to avoid clipping and stacking issues */}
      {isOpen &&
        tooltipState?.visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="loyaltybay-fixed loyaltybay-z-[50001] loyaltybay-flex loyaltybay-flex-col loyaltybay-items-center loyaltybay-gap-1.5 loyaltybay-bg-gray-900 loyaltybay-text-white loyaltybay-text-xs loyaltybay-p-2 loyaltybay-min-w-[140px] loyaltybay-rounded-md loyaltybay-shadow-lg"
            style={{
              top: tooltipState.top + 5, // Adjusted to user preference
              left: tooltipState.left,
              transform: "translate(-50%, -100%)",
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <span className="loyaltybay-font-medium loyaltybay-whitespace-nowrap">
              Upgrade to unlock
            </span>
            <a
              href="#"
              target="_blank"
              onClick={(e) => e.preventDefault()}
              className="loyaltybay-w-full loyaltybay-bg-[#f02a74] hover:!loyaltybay-bg-[#e71161] loyaltybay-text-white hover:!loyaltybay-text-white loyaltybay-font-bold loyaltybay-py-1.5 loyaltybay-px-3 loyaltybay-transition-colors focus:loyaltybay-outline-none focus:loyaltybay-ring-0 loyaltybay-cursor-pointer loyaltybay-text-center loyaltybay-rounded"
            >
              Buy Pro
            </a>
            {/* Tooltip Arrow */}
            <div className="loyaltybay-absolute loyaltybay-top-full loyaltybay-left-1/2 -loyaltybay-translate-x-1/2 loyaltybay-border-4 loyaltybay-border-transparent loyaltybay-border-t-gray-900"></div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Select;
