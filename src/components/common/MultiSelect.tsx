import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import apiFetch from "@wordpress/api-fetch";
import { borderClasses, hoverBorderClasses } from "./classes";

// Inline Icons to replace lucide-react
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

const X = ({ className }: { className?: string }) => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
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

export interface MultiSelectOption {
  value: string | number;
  label: string;
  className?: string;
  disabled?: boolean;
  variant?: "buy_pro" | "coming_soon";
}

export interface MultiSelectProps {
  id?: string;
  ref?: React.Ref<HTMLDivElement>;
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options?: MultiSelectOption[];
  endpoint?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string | React.ReactNode;
  enableSearch?: boolean;
  isError?: boolean;
  errorClassName?: string;
  classNames?: {
    wrapper?: string;
    label?: string;
    container?: string;
    tag?: string;
    dropdown?: string;
    option?: string;
    search?: string;
    error?: string;
  };
  isCompact?: boolean;

  /**
   * Custom render function for option display.
   * Receives the option object and returns a ReactNode.
   */
  renderOption?: (option: MultiSelectOption) => React.ReactNode;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  id,
  ref,
  value = [],
  onChange,
  options = [],
  endpoint,
  placeholder = "Select options...",
  disabled = false,
  className = "",
  label,
  enableSearch = true,
  isError = false,
  errorClassName = "loyaltybay-border-danger",
  classNames = {},
  isCompact = false,
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const interactionType = useRef<"mouse" | "keyboard">("keyboard");

  // Tooltip state
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
    index: number;
  } | null>(null);

  // Endpoint fetching state
  const [fetchedOptions, setFetchedOptions] = useState<MultiSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allSeenOptions, setAllSeenOptions] = useState<MultiSelectOption[]>(
    options || [],
  );

  useEffect(() => {
    if (options && options.length > 0) {
      setAllSeenOptions((prev) => {
        const unique = new Map(prev.map((o) => [o.value, o]));
        options.forEach((o) => unique.set(o.value, o));
        return Array.from(unique.values());
      });
    }
  }, [options]);

  useEffect(() => {
    if (fetchedOptions.length > 0) {
      setAllSeenOptions((prev) => {
        const unique = new Map(prev.map((o) => [o.value, o]));
        fetchedOptions.forEach((o) => unique.set(o.value, o));
        return Array.from(unique.values());
      });
    }
  }, [fetchedOptions]);

  // Fetch from endpoint with debounce
  useEffect(() => {
    if (!endpoint) return;

    let isMounted = true;
    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsLoading(true);
        const separator = endpoint.includes("?") ? "&" : "?";
        const path = `${endpoint}${separator}search=${encodeURIComponent(
          searchQuery,
        )}`;

        const response: any = await apiFetch({
          path,
          method: "GET",
        });

        if (isMounted && Array.isArray(response)) {
          const newOptions = response.map((item: any) => ({
            label: item.name,
            value: item.id,
          }));
          setFetchedOptions(newOptions);
        }
      } catch (error) {
        console.error("MultiSelect fetch error:", error);
        if (isMounted) setFetchedOptions([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery, endpoint]);

  // Handle outside click logic including Portal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;

      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (tooltipRef.current && tooltipRef.current.contains(target)) {
        return;
      }

      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
        setTooltipState(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Get selected options objects
  const selectedOptions = useMemo(() => {
    const combinedOptions = endpoint ? allSeenOptions : options || [];
    return value.map((val) => {
      const found = combinedOptions.find((opt) => opt.value === val);
      return found ? found : { value: val, label: `${val}` };
    });
  }, [options, value, endpoint, allSeenOptions]);

  // Filter options based on search query (exclude already selected)
  const filteredOptions = useMemo(() => {
    const baseOptions = endpoint ? fetchedOptions : options || [];
    let filtered = baseOptions.filter((opt) => !value.includes(opt.value));

    // Process local search only if no endpoint is specified
    if (!endpoint && enableSearch && searchQuery) {
      filtered = filtered.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return filtered;
  }, [options, value, searchQuery, enableSearch, endpoint, fetchedOptions]);

  // Reset search and highlighted index when opening/closing
  useEffect(() => {
    if (isOpen) {
      if (enableSearch && searchInputRef.current) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
      setHighlightedIndex(0);
      interactionType.current = "keyboard";
    } else {
      setSearchQuery("");
      setTooltipState(null);
    }
  }, [isOpen, enableSearch]);

  // Scroll highlighted item into view
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

  const handleSelect = (option: MultiSelectOption) => {
    if (
      option.disabled ||
      option.variant === "buy_pro" ||
      option.variant === "coming_soon"
    ) {
      return;
    }
    const newValue = [...value, option.value];
    onChange(newValue);
    setSearchQuery("");
    // Keep dropdown open for multi-select convenience
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleRemove = (optionValue: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newValue = value.filter((v) => v !== optionValue);
    onChange(newValue);
  };

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
      case "Backspace":
        if (searchQuery === "" && value.length > 0) {
          handleRemove(value[value.length - 1]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(true);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  };

  const handleOptionMouseEnter = (
    e: React.MouseEvent<HTMLLIElement>,
    index: number,
    isPro: boolean,
  ) => {
    interactionType.current = "mouse";
    setHighlightedIndex(index);

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (isPro) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({
        visible: true,
        top: rect.top,
        left: rect.left + rect.width / 2,
        width: rect.width,
        index,
      });
    } else {
      setTooltipState(null);
    }
  };

  const handleOptionMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setTooltipState((prev) => (prev ? { ...prev, visible: false } : null));
    }, 100);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setTooltipState((prev) => (prev ? { ...prev, visible: true } : null));
  };

  const handleTooltipMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setTooltipState(null);
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
          className={`loyaltybay-block loyaltybay-text-sm loyaltybay-font-bold loyaltybay-text-gray-900 loyaltybay-mb-2 ${
            classNames.label || ""
          }`}
        >
          {label}
        </label>
      )}

      {/* Trigger / Selected Items Container */}
      <div
        id={id}
        ref={ref}
        onClick={handleTriggerClick}
        className={`
          loyaltybay-relative loyaltybay-flex loyaltybay-flex-wrap loyaltybay-items-center loyaltybay-gap-2 loyaltybay-w-full loyaltybay-px-4 loyaltybay-text-left !loyaltybay-cursor-text
          loyaltybay-transition-all loyaltybay-duration-200 loyaltybay-ease-in-out loyaltybay-border loyaltybay-rounded-[8px] loyaltybay-bg-white
          ${borderClasses}
          ${isCompact ? "loyaltybay-py-[4px]" : "loyaltybay-py-[7px]"}
          ${
            disabled
              ? "loyaltybay-bg-gray-50 loyaltybay-cursor-not-allowed loyaltybay-text-gray-400 loyaltybay-border-gray-200"
              : `hover:!loyaltybay-border-primary`
          }
          ${isOpen ? hoverBorderClasses : ""}
          ${isError ? errorClassName : ""}
          ${classNames.container || ""}
        `}
      >
        {/* Selected Tags */}
        {selectedOptions.map((option) => (
          <span
            key={option.value}
            className={`
                loyaltybay-inline-flex loyaltybay-items-center loyaltybay-gap-1 loyaltybay-bg-gray-100 loyaltybay-text-gray-800 loyaltybay-px-2 loyaltybay-py-[2px] loyaltybay-rounded-none loyaltybay-text-[13px] loyaltybay-leading-[20px] loyaltybay-font-[400]
                ${classNames.tag || ""}
            `}
          >
            {option.label}
            <button
              type="button"
              onClick={(e) => handleRemove(option.value, e)}
              className="loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center loyaltybay-w-4 loyaltybay-h-4 loyaltybay-rounded-full hover:loyaltybay-bg-gray-200 loyaltybay-transition-colors loyaltybay-text-gray-500"
              aria-label={`Remove ${option.label}`}
            >
              <X className="loyaltybay-w-3 loyaltybay-h-3" />
            </button>
          </span>
        ))}

        {/* Search Input */}
        <input
          ref={searchInputRef}
          type="text"
          className={`
            loyaltybay-flex-1 loyaltybay-min-w-[80px] loyaltybay-bg-transparent !loyaltybay-border-none !loyaltybay-shadow-none loyaltybay-outline-none loyaltybay-px-1 loyaltybay-py-[2px]  !loyaltybay-text-[13px] !loyaltybay-leading-[20px] loyaltybay-font-[400] loyaltybay-text-gray-900 loyaltybay-placeholder-gray-400 !loyaltybay-min-h-[24px]
            ${classNames.search || ""}
          `}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          disabled={disabled}
        />

        {/* Chevron Icon */}
        <span className="loyaltybay-flex-shrink-0 loyaltybay-ml-auto loyaltybay-flex loyaltybay-items-center">
          <ChevronDown
            className={`loyaltybay-h-4 loyaltybay-w-4 loyaltybay-text-gray-500 loyaltybay-transition-transform loyaltybay-duration-200 ${
              isOpen ? "loyaltybay-transform loyaltybay-rotate-180" : ""
            }`}
          />
        </span>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
                loyaltybay-absolute loyaltybay-z-[50000] loyaltybay-w-full loyaltybay-bg-white loyaltybay-border loyaltybay-border-gray-200 loyaltybay-rounded-[12px] loyaltybay-p-[4px] loyaltybay-shadow-[0_4px_12px_rgba(0,0,0,0.1)] loyaltybay-top-full loyaltybay-left-0 -loyaltybay-mt-[1px]
                ${classNames.dropdown || ""}
            `}
        >
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="loyaltybay-max-h-[204px] loyaltybay-overflow-auto focus:loyaltybay-outline-none"
            style={{ scrollbarWidth: "none" }}
          >
            {isLoading ? (
              <li className="loyaltybay-px-3 loyaltybay-py-2 loyaltybay-text-gray-500 loyaltybay-text-sm loyaltybay-text-center loyaltybay-italic !loyaltybay-mb-0 loyaltybay-rounded-[8px]">
                Loading...
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="loyaltybay-px-3 loyaltybay-py-2 loyaltybay-text-gray-500 loyaltybay-text-sm loyaltybay-text-center loyaltybay-italic !loyaltybay-mb-0 loyaltybay-rounded-[8px]">
                {searchQuery ? "No results found" : "No more options"}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isHighlighted = highlightedIndex === index;
                const isDisabled = option.disabled;
                const isPro = option.variant === "buy_pro";
                const isComingSoon = option.variant === "coming_soon";

                return (
                  <li
                    key={`${option.value}-${index}`}
                    role="option"
                    aria-selected={false}
                    onMouseEnter={(e) => {
                      handleOptionMouseEnter(e, index, !!isPro);
                    }}
                    onMouseLeave={handleOptionMouseLeave}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                    className={`
                        loyaltybay-group loyaltybay-relative loyaltybay-cursor-pointer loyaltybay-select-none loyaltybay-px-4 loyaltybay-py-2.5 loyaltybay-text-sm loyaltybay-transition-colors loyaltybay-border-b loyaltybay-border-gray-50 last:loyaltybay-border-0 !loyaltybay-mb-0 loyaltybay-rounded-[8px]
                        loyaltybay-flex loyaltybay-flex-nowrap loyaltybay-justify-between loyaltybay-items-center
                        ${
                          isDisabled || isPro || isComingSoon
                            ? "loyaltybay-opacity-100 !loyaltybay-cursor-not-allowed loyaltybay-text-gray-500 loyaltybay-bg-gray-100/50"
                            : ""
                        }
                        ${
                          isHighlighted &&
                          !isDisabled &&
                          !isPro &&
                          !isComingSoon
                            ? "loyaltybay-bg-blue-600 loyaltybay-text-white"
                            : "loyaltybay-text-gray-700"
                        }
                        ${
                          isComingSoon
                            ? "hover:!loyaltybay-text-pink-600 !loyaltybay-text-pink-500"
                            : ""
                        }
                        ${option.className || ""}
                        ${classNames.option || ""}
                        `}
                  >
                    <div className="loyaltybay-flex loyaltybay-items-center loyaltybay-min-w-0 loyaltybay-gap-4">
                      <span className="loyaltybay-block loyaltybay-truncate">
                        {renderOption ? renderOption(option) : option.label}
                      </span>
                    </div>

                    {/* Lock Icon for Buy Pro */}
                    {isPro && (
                      <LockKeyhole className="loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-text-[#f02a74] loyaltybay-flex-shrink-0" />
                    )}
                    {isComingSoon && (
                      <span className="loyaltybay-bg-pink-600 loyaltybay-text-white loyaltybay-p-1 loyaltybay-px-2 loyaltybay-rounded-full loyaltybay-text-xs loyaltybay-flex loyaltybay-items-center loyaltybay-gap-1 loyaltybay-flex-nowrap loyaltybay-flex-shrink-0">
                        <Hourglass className="loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-text-white" />
                        <span className="loyaltybay-whitespace-nowrap">
                          Coming Soon
                        </span>
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
              top: tooltipState.top + 5,
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

export default MultiSelect;
