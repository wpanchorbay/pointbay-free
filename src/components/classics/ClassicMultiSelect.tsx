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
      className={`${sizeClass} ${className} lb-align-middle`}
      ref={containerRef}
    >
      {label && (
        <label htmlFor={selectId} className="lb-block lb-mb-1">
          {label}
        </label>
      )}

      <div className="lb-relative" style={{ width: explicitWidth }}>
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
          className={`lb-flex lb-flex-wrap lb-items-center lb-gap-1 lb-min-h-[40px] lb-bg-white lb-border lb-border-[#8c8f94] lb-rounded-[3px] lb-p-[3px_24px_3px_6px] lb-min-h-[30px] lb-transition-shadow lb-duration-100 lb-relative lb-box-border lb-w-full ${disabled
            ? "lb-cursor-not-allowed lb-bg-[#f0f0f1]"
            : "lb-cursor-text"
            } ${isOpen
              ? "lb-border-[#2271b1] lb-shadow-[0_0_0_1px_#2271b1] lb-outline-none"
              : "lb-shadow-none"
            }`}
        >
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="lb-bg-[#f0f0f1] lb-border lb-border-[#c3c4c7] lb-rounded-[3px] lb-px-1 lb-flex lb-items-center lb-gap-1 lb-text-xs lb-text-[#3c434a] lb-leading-[20px]"
            >
              {opt.label}
              <button
                onClick={(e) => handleRemove(e, opt.value)}
                className="lb-bg-transparent lb-border-none lb-p-0 lb-cursor-pointer lb-text-[#8c8f94] lb-flex lb-items-center"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {!enableSearch && value.length === 0 && (
            <span className="lb-text-[#8c8f94] lb-text-[13px] lb-pl-1">
              {placeholder}
            </span>
          )}

          {/* Chevron icon pointing down */}
          <span className="lb-absolute lb-right-1.5 lb-top-1/2 -lb-translate-y-1/2 lb-flex lb-pointer-events-none">
            <ChevronDown size={14} color="#50575e" />
          </span>
        </div>

        {isOpen && (
          <div
            className="lb-absolute lb-z-[99999] lb-bg-white lb-border-2 lb-border-[#2271b1] lb-border-t-0  lb-rounded-b-[3px] lb-shadow-[0_3px_5px_rgba(0,0,0,0.2)] lb-p-0 lb-box-border lb-top-full lb-left-[-1px] lb-mt-[-3px]"
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
                className="lb-w-[calc(100%-8px)] lb-px-2 lb-leading-loose lb-min-h-[26px] lb-border lb-border-[#aaaaaa] lb-bg-[#fcfcfc] lb-rounded-[3px] lb-box-border lb-text-[13px] focus:lb-outline-none focus:lb-shadow-none lb-m-[4px]"
              />
            )}
            {isLoading ? (
              <div className="lb-py-2 lb-px-3 lb-text-[#646970] lb-text-[13px] lb-flex lb-items-center lb-gap-2">
                <Hourglass size={14} className="lb-animate-spin" />{" "}
                Loading...
              </div>
            ) : (
              <ul
                ref={listRef}
                role="listbox"
                className="lb-max-h-[220px] lb-overflow-y-auto lb-m-0 lb-p-0 lb-list-none"
              >
                {filteredOptions.length === 0 ? (
                  <li className="lb-px-3 lb-py-1.5 lb-text-[#646970] lb-italic lb-text-[13px] lb-m-0">
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
                        className={`lb-px-3 lb-py-1.5 lb-flex lb-items-center lb-justify-between lb-text-[13px] lb-m-0 ${isDisabled
                          ? "lb-cursor-not-allowed"
                          : "lb-cursor-pointer"
                          } ${isHighlighted
                            ? "lb-bg-[#2271b1] lb-text-white"
                            : isDisabled
                              ? "lb-bg-transparent lb-text-[#a7aaad]"
                              : "lb-bg-transparent lb-text-[#2c3338]"
                          }`}
                      >
                        <div className="lb-flex lb-items-center lb-gap-2">
                          <div
                            className={`
                            lb-flex lb-items-center lb-justify-center
                            lb-w-4 lb-h-4 lb-rounded lb-border-2 lb-transition-all lb-duration-200
                            ${isSelected
                                ? isHighlighted
                                  ? "lb-border-white lb-bg-white"
                                  : "lb-border-[#2271b1] lb-bg-[#2271b1]"
                                : isHighlighted
                                  ? "lb-border-white lb-bg-transparent"
                                  : "lb-border-[#8c8f94] lb-bg-white"
                              }
                          `}
                          >
                            <svg
                              className={`lb-w-3.5 lb-h-3.5 lb-transform lb-transition-transform lb-duration-200 ${isSelected
                                ? "lb-scale-100"
                                : "lb-scale-0"
                                } ${isHighlighted && isSelected
                                  ? "lb-text-[#2271b1]"
                                  : "lb-text-white"
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
                            className={`lb-flex ${isHighlighted
                              ? "lb-text-white"
                              : "lb-text-[#ffb900]"
                              }`}
                          >
                            <Lock size={14} />
                          </span>
                        )}
                        {isComingSoon && (
                          <span
                            className={`lb-text-[10px] lb-uppercase lb-px-1.5 lb-py-0.5 lb-rounded-[10px] lb-font-semibold lb-flex lb-items-center lb-gap-1 ${isHighlighted
                              ? "lb-bg-white/20 lb-text-white"
                              : "lb-bg-[#f0f0f1] lb-text-[#646970]"
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
        <p className="description lb-mt-1">{description}</p>
      )}

      {tooltipState?.visible && (
        <div
          className="lb-fixed lb-bg-[#1d2327] lb-text-white lb-px-2.5 lb-py-1 lb-rounded-[3px] lb-text-[12px] lb-pointer-events-none lb-z-[100000] lb-whitespace-nowrap"
          style={{
            top: tooltipState.top - 8,
            left: tooltipState.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltipState.text}
          <div className="lb-absolute -lb-bottom-1 lb-left-1/2 -lb-translate-x-1/2 lb-border-x-4 lb-border-t-4 lb-border-x-transparent lb-border-b-transparent lb-border-t-[#1d2327]" />
        </div>
      )}
    </div>
  );
};
