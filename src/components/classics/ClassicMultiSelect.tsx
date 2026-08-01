import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from "react";
import { ChevronDown, X, Hourglass } from "lucide-react";
import { MultiSelectOption } from "../common/MultiSelect";
import apiFetch from "@wordpress/api-fetch";

// Hook for click outside
function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

interface ClassicMultiSelectProps {
  id?: string;
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options?: MultiSelectOption[];
  endpoint?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string | React.ReactNode;
  enableSearch?: boolean;
  size?: "short" | "regular";
  renderOption?: (option: MultiSelectOption) => React.ReactNode;
  description?: string;
  differentDropdownWidth?: boolean;
}

export const ClassicMultiSelect: React.FC<ClassicMultiSelectProps> = ({
  id,
  value,
  onChange,
  options = [],
  endpoint,
  placeholder = "Select options...",
  disabled = false,
  className = "",
  label,
  enableSearch = true,
  size = "short",
  renderOption,
  description,
  differentDropdownWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiOptions, setApiOptions] = useState<MultiSelectOption[]>([]);
  const [allSeenOptions, setAllSeenOptions] = useState<MultiSelectOption[]>(
    options || [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const initialFetchDone = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const interactionType = useRef<"mouse" | "keyboard">("keyboard");

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setSearchQuery("");
  });

  // Merge fetched options into allSeenOptions so selected items keep their labels
  useEffect(() => {
    if (apiOptions.length > 0) {
      setAllSeenOptions((prev) => {
        const map = new Map(prev.map((o) => [o.value, o]));
        apiOptions.forEach((o) => map.set(o.value, o));
        return Array.from(map.values());
      });
    }
  }, [apiOptions]);

  // Initial fetch when component mounts with pre-selected values
  // Uses the `ids` parameter so the API returns exactly these items
  useEffect(() => {
    if (!endpoint || initialFetchDone.current || value.length === 0) return;
    initialFetchDone.current = true;

    const separator = endpoint.includes("?") ? "&" : "?";
    const path = `${endpoint}${separator}ids=${value.join(",")}`;

    apiFetch({ path, method: "GET" })
      .then((res: any) => {
        const data = res?.data || res || [];
        setAllSeenOptions((prev) => {
          const map = new Map(prev.map((o) => [o.value, o]));
          data.forEach((o: MultiSelectOption) => map.set(o.value, o));
          return Array.from(map.values());
        });
      })
      .catch(() => { });
  }, [endpoint, value]);

  const effectiveOptions = endpoint ? apiOptions : options;

  useEffect(() => {
    if (!endpoint) return;
    if (!isOpen) return; // Only fetch when opened

    let active = true;
    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsLoading(true);
        const separator = endpoint.includes("?") ? "&" : "?";
        const path = `${endpoint}${separator}search=${encodeURIComponent(
          searchQuery,
        )}`;

        const res: any = await apiFetch({ path, method: "GET" });

        if (active) {
          setApiOptions(res?.data || res || []);
          setIsLoading(false);
        }
      } catch {
        if (active) setIsLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [endpoint, searchQuery, isOpen]);

  const filteredOptions = useMemo(() => {
    if (endpoint) return effectiveOptions;
    if (!enableSearch || !searchQuery) return effectiveOptions;
    return effectiveOptions.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [effectiveOptions, searchQuery, enableSearch, endpoint]);

  // Selected values — use allSeenOptions for endpoint mode so labels persist
  const selectedOptions = useMemo(() => {
    const lookupSource = endpoint ? allSeenOptions : effectiveOptions;
    return value.map((v) => {
      const found = lookupSource.find((opt) => opt.value === v);
      return found || { value: v, label: `${v}` };
    });
  }, [effectiveOptions, allSeenOptions, value, endpoint]);

  useEffect(() => {
    if (isOpen) {
      if (enableSearch && searchInputRef.current) {
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      setHighlightedIndex(0);
      interactionType.current = "keyboard";
    } else {
      setSearchQuery("");
    }
  }, [isOpen, enableSearch, filteredOptions.length]);

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
        if (elementTop < listTop) list.scrollTop = elementTop;
        else if (elementBottom > listBottom)
          list.scrollTop = elementBottom - list.clientHeight;
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: MultiSelectOption) => {
    if (option.disabled) return;

    if (value.includes(option.value)) {
      onChange(value.filter((v) => v !== option.value));
    } else {
      onChange([...value, option.value]);
    }

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleRemove = (e: React.MouseEvent, valToRemove: string | number) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== valToRemove));
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (isOpen && enableSearch) return;

    interactionType.current = "keyboard";
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0,
          );
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1,
          );
        break;
      case "Escape":
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    interactionType.current = "keyboard";
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex])
          handleSelect(filteredOptions[highlightedIndex]);
        break;
      case "Backspace":
        if (!searchQuery && value.length > 0) {
          onChange(value.slice(0, -1));
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const selectId =
    id || `classic-multi-${Math.random().toString(36).slice(2, 9)}`;
  const sizeClass = size === "short" ? "" : "";
  const explicitWidth =
    size === "short" ? "min-content" : size === "regular" ? "auto" : "100%";

  return (
    <div
      className={`${sizeClass} ${className} pointbay-align-middle`}
      ref={containerRef}
    >
      {label && (
        <label htmlFor={selectId} className="pointbay-block pointbay-mb-1">
          {label}
        </label>
      )}

      <div className="pointbay-relative" style={{ width: explicitWidth }}>
        <div
          id={selectId}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          onClick={(e) => {
            if (disabled) return;
            // Don't toggle closed if clicking inside the search input while already open
            if (isOpen && (e.target as HTMLElement).tagName === "INPUT") return;
            setIsOpen(!isOpen);
          }}
          onKeyDown={handleTriggerKeyDown}
          className={`pointbay-flex pointbay-flex-wrap pointbay-items-center pointbay-gap-1 pointbay-min-h-[40px] pointbay-bg-white pointbay-border pointbay-border-[#8c8f94] pointbay-rounded-[3px] pointbay-p-[3px_24px_3px_6px] pointbay-min-h-[30px] pointbay-transition-shadow pointbay-duration-100 pointbay-relative pointbay-box-border pointbay-w-full ${disabled
            ? "pointbay-cursor-not-allowed pointbay-bg-[#f0f0f1]"
            : "pointbay-cursor-text"
            } ${isOpen
              ? "pointbay-border-[#2271b1] pointbay-shadow-[0_0_0_1px_#2271b1] pointbay-outline-none"
              : "pointbay-shadow-none"
            }`}
        >
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="pointbay-bg-[#f0f0f1] pointbay-border pointbay-border-[#c3c4c7] pointbay-rounded-[3px] pointbay-px-1 pointbay-flex pointbay-items-center pointbay-gap-1 pointbay-text-xs pointbay-text-[#3c434a] pointbay-leading-[20px]"
            >
              {opt.label}
              <button
                onClick={(e) => handleRemove(e, opt.value)}
                className="pointbay-bg-transparent pointbay-border-none pointbay-p-0 pointbay-cursor-pointer pointbay-text-[#8c8f94] pointbay-flex pointbay-items-center"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {!enableSearch && value.length === 0 && (
            <span className="pointbay-text-[#8c8f94] pointbay-text-[13px] pointbay-pl-1">
              {placeholder}
            </span>
          )}

          {/* Chevron icon pointing down */}
          <span className="pointbay-absolute pointbay-right-1.5 pointbay-top-1/2 -pointbay-translate-y-1/2 pointbay-flex pointbay-pointer-events-none">
            <ChevronDown size={14} color="#50575e" />
          </span>
        </div>

        {isOpen && (
          <div
            className="pointbay-absolute pointbay-z-[99999] pointbay-bg-white pointbay-border-2 pointbay-border-[#2271b1] pointbay-border-t-0  pointbay-rounded-b-[3px] pointbay-shadow-[0_3px_5px_rgba(0,0,0,0.2)] pointbay-p-0 pointbay-box-border pointbay-top-full pointbay-left-[-1px] pointbay-mt-[-3px]"
            style={{
              ...(differentDropdownWidth
                ? { minWidth: "calc(100% + 2px)" }
                : { width: "calc(100% + 2px)" }),
            }}
          >
            {enableSearch && (
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (!disabled && !isOpen) setIsOpen(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={value.length === 0 ? placeholder : ""}
                disabled={disabled}
                className="pointbay-w-[calc(100%-8px)] pointbay-px-2 pointbay-leading-loose pointbay-min-h-[26px] pointbay-border pointbay-border-[#aaaaaa] pointbay-bg-[#fcfcfc] pointbay-rounded-[3px] pointbay-box-border pointbay-text-[13px] focus:pointbay-outline-none focus:pointbay-shadow-none pointbay-m-[4px]"
              />
            )}
            {isLoading ? (
              <div className="pointbay-py-2 pointbay-px-3 pointbay-text-[#646970] pointbay-text-[13px] pointbay-flex pointbay-items-center pointbay-gap-2">
                <Hourglass size={14} className="pointbay-animate-spin" />{" "}
                Loading...
              </div>
            ) : (
              <ul
                ref={listRef}
                role="listbox"
                className="pointbay-max-h-[220px] pointbay-overflow-y-auto pointbay-m-0 pointbay-p-0 pointbay-list-none"
              >
                {filteredOptions.length === 0 ? (
                  <li className="pointbay-px-3 pointbay-py-1.5 pointbay-text-[#646970] pointbay-italic pointbay-text-[13px] pointbay-m-0">
                    {searchQuery ? "No results found" : "No options available"}
                  </li>
                ) : (
                  filteredOptions.map((opt, index) => {
                    const isSelected = value.includes(opt.value);
                    const isHighlighted = highlightedIndex === index;
                    const isDisabled = opt.disabled;

                    return (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => {
                          interactionType.current = "mouse";
                          setHighlightedIndex(index);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt);
                        }}
                        className={`pointbay-px-3 pointbay-py-1.5 pointbay-flex pointbay-items-center pointbay-justify-between pointbay-text-[13px] pointbay-m-0 ${isDisabled
                          ? "pointbay-cursor-not-allowed"
                          : "pointbay-cursor-pointer"
                          } ${isHighlighted
                            ? "pointbay-bg-[#2271b1] pointbay-text-white"
                            : isDisabled
                              ? "pointbay-bg-transparent pointbay-text-[#a7aaad]"
                              : "pointbay-bg-transparent pointbay-text-[#2c3338]"
                          }`}
                      >
                        <div className="pointbay-flex pointbay-items-center pointbay-gap-2">
                          <div
                            className={`
                            pointbay-flex pointbay-items-center pointbay-justify-center
                            pointbay-w-4 pointbay-h-4 pointbay-rounded pointbay-border-2 pointbay-transition-all pointbay-duration-200
                            ${isSelected
                                ? isHighlighted
                                  ? "pointbay-border-white pointbay-bg-white"
                                  : "pointbay-border-[#2271b1] pointbay-bg-[#2271b1]"
                                : isHighlighted
                                  ? "pointbay-border-white pointbay-bg-transparent"
                                  : "pointbay-border-[#8c8f94] pointbay-bg-white"
                              }
                          `}
                          >
                            <svg
                              className={`pointbay-w-3.5 pointbay-h-3.5 pointbay-transform pointbay-transition-transform pointbay-duration-200 ${isSelected
                                ? "pointbay-scale-100"
                                : "pointbay-scale-0"
                                } ${isHighlighted && isSelected
                                  ? "pointbay-text-[#2271b1]"
                                  : "pointbay-text-white"
                                }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <span>
                            {renderOption ? renderOption(opt) : opt.label}
                          </span>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {description && (
        <p className="description pointbay-mt-1">{description}</p>
      )}
    </div>
  );
};
