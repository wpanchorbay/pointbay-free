import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from "react";
import { ChevronDown, X, Lock, Hourglass } from "lucide-react";
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

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    top: number;
    left: number;
    text: string;
  } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setSearchQuery("");
    setTooltipState(null);
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
      setTooltipState(null);
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
    // @ts-ignore - sharing variant types from Select for consistency
    const variant = option.variant;
    if (option.disabled || variant === "buy_pro" || variant === "coming_soon")
      return;

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
      className={`${sizeClass} ${className} loyaltybay-align-middle`}
      ref={containerRef}
    >
      {label && (
        <label htmlFor={selectId} className="loyaltybay-block loyaltybay-mb-1">
          {label}
        </label>
      )}

      <div className="loyaltybay-relative" style={{ width: explicitWidth }}>
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
          className={`loyaltybay-flex loyaltybay-flex-wrap loyaltybay-items-center loyaltybay-gap-1 loyaltybay-min-h-[40px] loyaltybay-bg-white loyaltybay-border loyaltybay-border-[#8c8f94] loyaltybay-rounded-[3px] loyaltybay-p-[3px_24px_3px_6px] loyaltybay-min-h-[30px] loyaltybay-transition-shadow loyaltybay-duration-100 loyaltybay-relative loyaltybay-box-border loyaltybay-w-full ${disabled
            ? "loyaltybay-cursor-not-allowed loyaltybay-bg-[#f0f0f1]"
            : "loyaltybay-cursor-text"
            } ${isOpen
              ? "loyaltybay-border-[#2271b1] loyaltybay-shadow-[0_0_0_1px_#2271b1] loyaltybay-outline-none"
              : "loyaltybay-shadow-none"
            }`}
        >
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="loyaltybay-bg-[#f0f0f1] loyaltybay-border loyaltybay-border-[#c3c4c7] loyaltybay-rounded-[3px] loyaltybay-px-1 loyaltybay-flex loyaltybay-items-center loyaltybay-gap-1 loyaltybay-text-xs loyaltybay-text-[#3c434a] loyaltybay-leading-[20px]"
            >
              {opt.label}
              <button
                onClick={(e) => handleRemove(e, opt.value)}
                className="loyaltybay-bg-transparent loyaltybay-border-none loyaltybay-p-0 loyaltybay-cursor-pointer loyaltybay-text-[#8c8f94] loyaltybay-flex loyaltybay-items-center"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {!enableSearch && value.length === 0 && (
            <span className="loyaltybay-text-[#8c8f94] loyaltybay-text-[13px] loyaltybay-pl-1">
              {placeholder}
            </span>
          )}

          {/* Chevron icon pointing down */}
          <span className="loyaltybay-absolute loyaltybay-right-1.5 loyaltybay-top-1/2 -loyaltybay-translate-y-1/2 loyaltybay-flex loyaltybay-pointer-events-none">
            <ChevronDown size={14} color="#50575e" />
          </span>
        </div>

        {isOpen && (
          <div
            className="loyaltybay-absolute loyaltybay-z-[99999] loyaltybay-bg-white loyaltybay-border-2 loyaltybay-border-[#2271b1] loyaltybay-border-t-0  loyaltybay-rounded-b-[3px] loyaltybay-shadow-[0_3px_5px_rgba(0,0,0,0.2)] loyaltybay-p-0 loyaltybay-box-border loyaltybay-top-full loyaltybay-left-[-1px] loyaltybay-mt-[-3px]"
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
                className="loyaltybay-w-[calc(100%-8px)] loyaltybay-px-2 loyaltybay-leading-loose loyaltybay-min-h-[26px] loyaltybay-border loyaltybay-border-[#aaaaaa] loyaltybay-bg-[#fcfcfc] loyaltybay-rounded-[3px] loyaltybay-box-border loyaltybay-text-[13px] focus:loyaltybay-outline-none focus:loyaltybay-shadow-none loyaltybay-m-[4px]"
              />
            )}
            {isLoading ? (
              <div className="loyaltybay-py-2 loyaltybay-px-3 loyaltybay-text-[#646970] loyaltybay-text-[13px] loyaltybay-flex loyaltybay-items-center loyaltybay-gap-2">
                <Hourglass size={14} className="loyaltybay-animate-spin" />{" "}
                Loading...
              </div>
            ) : (
              <ul
                ref={listRef}
                role="listbox"
                className="loyaltybay-max-h-[220px] loyaltybay-overflow-y-auto loyaltybay-m-0 loyaltybay-p-0 loyaltybay-list-none"
              >
                {filteredOptions.length === 0 ? (
                  <li className="loyaltybay-px-3 loyaltybay-py-1.5 loyaltybay-text-[#646970] loyaltybay-italic loyaltybay-text-[13px] loyaltybay-m-0">
                    {searchQuery ? "No results found" : "No options available"}
                  </li>
                ) : (
                  filteredOptions.map((opt, index) => {
                    const isSelected = value.includes(opt.value);
                    const isHighlighted = highlightedIndex === index;
                    // @ts-ignore
                    const variant = opt.variant;
                    const isPro = variant === "buy_pro";
                    const isComingSoon = variant === "coming_soon";
                    const isDisabled = opt.disabled || isPro || isComingSoon;

                    return (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={(e) => {
                          interactionType.current = "mouse";
                          setHighlightedIndex(index);
                          if (isPro || isComingSoon) {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setTooltipState({
                              visible: true,
                              top: rect.top,
                              left: rect.left + rect.width / 2,
                              text: isPro ? "Available in Pro" : "Coming Soon",
                            });
                          } else {
                            setTooltipState(null);
                          }
                        }}
                        onMouseLeave={() => setTooltipState(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt);
                        }}
                        className={`loyaltybay-px-3 loyaltybay-py-1.5 loyaltybay-flex loyaltybay-items-center loyaltybay-justify-between loyaltybay-text-[13px] loyaltybay-m-0 ${isDisabled
                          ? "loyaltybay-cursor-not-allowed"
                          : "loyaltybay-cursor-pointer"
                          } ${isHighlighted
                            ? "loyaltybay-bg-[#2271b1] loyaltybay-text-white"
                            : isDisabled
                              ? "loyaltybay-bg-transparent loyaltybay-text-[#a7aaad]"
                              : "loyaltybay-bg-transparent loyaltybay-text-[#2c3338]"
                          }`}
                      >
                        <div className="loyaltybay-flex loyaltybay-items-center loyaltybay-gap-2">
                          <div
                            className={`
                            loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center
                            loyaltybay-w-4 loyaltybay-h-4 loyaltybay-rounded loyaltybay-border-2 loyaltybay-transition-all loyaltybay-duration-200
                            ${isSelected
                                ? isHighlighted
                                  ? "loyaltybay-border-white loyaltybay-bg-white"
                                  : "loyaltybay-border-[#2271b1] loyaltybay-bg-[#2271b1]"
                                : isHighlighted
                                  ? "loyaltybay-border-white loyaltybay-bg-transparent"
                                  : "loyaltybay-border-[#8c8f94] loyaltybay-bg-white"
                              }
                          `}
                          >
                            <svg
                              className={`loyaltybay-w-3.5 loyaltybay-h-3.5 loyaltybay-transform loyaltybay-transition-transform loyaltybay-duration-200 ${isSelected
                                ? "loyaltybay-scale-100"
                                : "loyaltybay-scale-0"
                                } ${isHighlighted && isSelected
                                  ? "loyaltybay-text-[#2271b1]"
                                  : "loyaltybay-text-white"
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

                        {/* Icons for variants */}
                        {isPro && (
                          <span
                            className={`loyaltybay-flex ${isHighlighted
                              ? "loyaltybay-text-white"
                              : "loyaltybay-text-[#ffb900]"
                              }`}
                          >
                            <Lock size={14} />
                          </span>
                        )}
                        {isComingSoon && (
                          <span
                            className={`loyaltybay-text-[10px] loyaltybay-uppercase loyaltybay-px-1.5 loyaltybay-py-0.5 loyaltybay-rounded-[10px] loyaltybay-font-semibold loyaltybay-flex loyaltybay-items-center loyaltybay-gap-1 ${isHighlighted
                              ? "loyaltybay-bg-white/20 loyaltybay-text-white"
                              : "loyaltybay-bg-[#f0f0f1] loyaltybay-text-[#646970]"
                              }`}
                          >
                            <Hourglass size={10} />
                            Soon
                          </span>
                        )}
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
        <p className="description loyaltybay-mt-1">{description}</p>
      )}

      {tooltipState?.visible && (
        <div
          className="loyaltybay-fixed loyaltybay-bg-[#1d2327] loyaltybay-text-white loyaltybay-px-2.5 loyaltybay-py-1 loyaltybay-rounded-[3px] loyaltybay-text-[12px] loyaltybay-pointer-events-none loyaltybay-z-[100000] loyaltybay-whitespace-nowrap"
          style={{
            top: tooltipState.top - 8,
            left: tooltipState.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltipState.text}
          <div className="loyaltybay-absolute -loyaltybay-bottom-1 loyaltybay-left-1/2 -loyaltybay-translate-x-1/2 loyaltybay-border-x-4 loyaltybay-border-t-4 loyaltybay-border-x-transparent loyaltybay-border-b-transparent loyaltybay-border-t-[#1d2327]" />
        </div>
      )}
    </div>
  );
};
