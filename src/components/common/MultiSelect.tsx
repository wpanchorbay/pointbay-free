import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from "react";
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

export interface MultiSelectOption {
  value: string | number;
  label: string;
  className?: string;
  disabled?: boolean;
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
  errorClassName = "pointbay-border-danger",
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
  const interactionType = useRef<"mouse" | "keyboard">("keyboard");

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

      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
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
    if (option.disabled) {
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
          className={`pointbay-block pointbay-text-sm pointbay-font-bold pointbay-text-gray-900 pointbay-mb-2 ${
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
          pointbay-relative pointbay-flex pointbay-flex-wrap pointbay-items-center pointbay-gap-2 pointbay-w-full pointbay-px-4 pointbay-text-left !pointbay-cursor-text
          pointbay-transition-all pointbay-duration-200 pointbay-ease-in-out pointbay-border pointbay-rounded-[8px] pointbay-bg-white
          ${borderClasses}
          ${isCompact ? "pointbay-py-[4px]" : "pointbay-py-[7px]"}
          ${
            disabled
              ? "pointbay-bg-gray-50 pointbay-cursor-not-allowed pointbay-text-gray-400 pointbay-border-gray-200"
              : `hover:!pointbay-border-primary`
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
                pointbay-inline-flex pointbay-items-center pointbay-gap-1 pointbay-bg-gray-100 pointbay-text-gray-800 pointbay-px-2 pointbay-py-[2px] pointbay-rounded-none pointbay-text-[13px] pointbay-leading-[20px] pointbay-font-[400]
                ${classNames.tag || ""}
            `}
          >
            {option.label}
            <button
              type="button"
              onClick={(e) => handleRemove(option.value, e)}
              className="pointbay-flex pointbay-items-center pointbay-justify-center pointbay-w-4 pointbay-h-4 pointbay-rounded-full hover:pointbay-bg-gray-200 pointbay-transition-colors pointbay-text-gray-500"
              aria-label={`Remove ${option.label}`}
            >
              <X className="pointbay-w-3 pointbay-h-3" />
            </button>
          </span>
        ))}

        {/* Search Input */}
        <input
          ref={searchInputRef}
          type="text"
          className={`
            pointbay-flex-1 pointbay-min-w-[80px] pointbay-bg-transparent !pointbay-border-none !pointbay-shadow-none pointbay-outline-none pointbay-px-1 pointbay-py-[2px]  !pointbay-text-[13px] !pointbay-leading-[20px] pointbay-font-[400] pointbay-text-gray-900 pointbay-placeholder-gray-400 !pointbay-min-h-[24px]
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
        <span className="pointbay-flex-shrink-0 pointbay-ml-auto pointbay-flex pointbay-items-center">
          <ChevronDown
            className={`pointbay-h-4 pointbay-w-4 pointbay-text-gray-500 pointbay-transition-transform pointbay-duration-200 ${
              isOpen ? "pointbay-transform pointbay-rotate-180" : ""
            }`}
          />
        </span>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
                pointbay-absolute pointbay-z-[50000] pointbay-w-full pointbay-bg-white pointbay-border pointbay-border-gray-200 pointbay-rounded-[12px] pointbay-p-[4px] pointbay-shadow-[0_4px_12px_rgba(0,0,0,0.1)] pointbay-top-full pointbay-left-0 -pointbay-mt-[1px]
                ${classNames.dropdown || ""}
            `}
        >
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="pointbay-max-h-[204px] pointbay-overflow-auto focus:pointbay-outline-none"
            style={{ scrollbarWidth: "none" }}
          >
            {isLoading ? (
              <li className="pointbay-px-3 pointbay-py-2 pointbay-text-gray-500 pointbay-text-sm pointbay-text-center pointbay-italic !pointbay-mb-0 pointbay-rounded-[8px]">
                Loading...
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="pointbay-px-3 pointbay-py-2 pointbay-text-gray-500 pointbay-text-sm pointbay-text-center pointbay-italic !pointbay-mb-0 pointbay-rounded-[8px]">
                {searchQuery ? "No results found" : "No more options"}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isHighlighted = highlightedIndex === index;
                const isDisabled = option.disabled;

                return (
                  <li
                    key={`${option.value}-${index}`}
                    role="option"
                    aria-selected={false}
                    onMouseEnter={() => handleOptionMouseEnter(index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option);
                    }}
                    className={`
                        pointbay-group pointbay-relative pointbay-cursor-pointer pointbay-select-none pointbay-px-4 pointbay-py-2.5 pointbay-text-sm pointbay-transition-colors pointbay-border-b pointbay-border-gray-50 last:pointbay-border-0 !pointbay-mb-0 pointbay-rounded-[8px]
                        pointbay-flex pointbay-flex-nowrap pointbay-justify-between pointbay-items-center
                        ${
                          isDisabled
                            ? "pointbay-opacity-100 !pointbay-cursor-not-allowed pointbay-text-gray-500 pointbay-bg-gray-100/50"
                            : ""
                        }
                        ${
                          isHighlighted && !isDisabled
                            ? "pointbay-bg-blue-600 pointbay-text-white"
                            : "pointbay-text-gray-700"
                        }
                        ${option.className || ""}
                        ${classNames.option || ""}
                        `}
                  >
                    <div className="pointbay-flex pointbay-items-center pointbay-min-w-0 pointbay-gap-4">
                      <span className="pointbay-block pointbay-truncate">
                        {renderOption ? renderOption(option) : option.label}
                      </span>
                    </div>
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

export default MultiSelect;
