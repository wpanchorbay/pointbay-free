/* eslint-disable */
import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Lock, Hourglass } from 'lucide-react';
import { SelectOption } from '../common/Select';

// Hook for click outside
function useClickOutside(
  refs: React.RefObject<HTMLElement>[],
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // If any ref contains the target, don't trigger handler
      const isInside = refs.some(
        (ref) =>
          ref.current && ref.current.contains(event.target as Node)
      );
      if (isInside) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [refs, handler]);
}

export interface ClassicSelectClassNames {
  container?: string;
  label?: string;
  innerContainer?: string;
  trigger?: string;
  triggerOpen?: string;
  triggerDisabled?: string;
  value?: string;
  dropdown?: string;
  searchContainer?: string;
  searchInput?: string;
  list?: string;
  option?: string;
  optionHighlighted?: string;
  optionSelected?: string;
  description?: string;
}

interface ClassicSelectProps {
  id?: string;
  value: SelectOption['value'] | null;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  classNames?: ClassicSelectClassNames;
  label?: string;
  description?: string;
  enableSearch?: boolean;
  size?: 'short' | 'regular';
  renderOption?: (option: SelectOption) => React.ReactNode;
  differentDropdownWidth?: boolean;
}

export const ClassicSelect: React.FC<ClassicSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  classNames,
  label,
  description,
  enableSearch = false,
  size = 'short',
  renderOption,
  differentDropdownWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const interactionType = useRef<'mouse' | 'keyboard'>('keyboard');

  // Portal coordinates
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Tooltip state for buy_pro
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number | 'max-content';
    text: string;
  } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useClickOutside([containerRef, dropdownRef], () => {
    setIsOpen(false);
    setTooltipState(null);
  });

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!enableSearch || !searchQuery) {
      return options;
    }
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, enableSearch]);

  const updateCoords = () => {
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (enableSearch && searchInputRef.current) {
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      const selectedIndex = value
        ? filteredOptions.findIndex((opt) => opt.value === value)
        : 0;
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      interactionType.current = 'keyboard';
    } else {
      setSearchQuery('');
      setTooltipState(null);
    }
  }, [isOpen, value, enableSearch, filteredOptions.length]);

  useEffect(() => {
    if (
      isOpen &&
      listRef.current &&
      highlightedIndex >= 0 &&
      interactionType.current === 'keyboard'
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
      option.variant === 'buy_pro' ||
      option.variant === 'coming_soon'
    ) {
      return;
    }
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
    setTooltipState(null);
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    if (isOpen && enableSearch) {
      return;
    }

    interactionType.current = 'keyboard';
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
    }
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    interactionType.current = 'keyboard';
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleOptionHover = (
    e: React.MouseEvent<HTMLLIElement>,
    index: number,
    option: SelectOption
  ) => {
    interactionType.current = 'mouse';
    setHighlightedIndex(index);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (
      option.variant === 'buy_pro' ||
      option.variant === 'coming_soon'
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipState({
        visible: true,
        top: rect.top,
        left: rect.left + rect.width / 2,
        width: rect.width,
        text:
          option.variant === 'buy_pro'
            ? 'Available in Pro Version'
            : 'Coming Soon',
      });
    } else {
      setTooltipState(null);
    }
  };

  const selectId =
    id || `classic-select-${Math.random().toString(36).slice(2, 9)}`;
  const sizeClass = size === 'short' ? 'min-content' : '';
  const explicitWidth =
    size === 'short' ? 'min-content' : size === 'regular' ? 'auto' : '100%';

  return (
    <div
      className={`${sizeClass} ${className} ${classNames?.container || ''
        } loyaltybay-align-middle`.trim()}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={selectId}
          className={`loyaltybay-block loyaltybay-mb-1 ${classNames?.label || ''
            }`.trim()}
        >
          {label}
        </label>
      )}

      <div
        className={`loyaltybay-relative ${classNames?.innerContainer}`}
        style={{ width: explicitWidth }}
      >
        { /* Trigger that looks like WP native select */}
        <div
          id={selectId}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleTriggerKeyDown}
          className={`
            loyaltybay-flex loyaltybay-items-center loyaltybay-justify-between 
            loyaltybay-min-h-[40px]
            loyaltybay-appearance-none loyaltybay-border loyaltybay-border-[#8c8f94] 
            loyaltybay-rounded-[3px] loyaltybay-px-2 loyaltybay-pr-6 loyaltybay-min-h-[30px] 
            loyaltybay-leading-loose loyaltybay-transition-all loyaltybay-duration-100 
            loyaltybay-select-none loyaltybay-relative loyaltybay-box-border loyaltybay-w-full 
            ${disabled
              ? `loyaltybay-cursor-not-allowed loyaltybay-bg-[#f0f0f1] loyaltybay-text-[#a7aaad] ${classNames?.triggerDisabled || ''
              }`
              : `loyaltybay-cursor-pointer loyaltybay-bg-white loyaltybay-text-[#2c3338]`
            } 
            ${isOpen
              ? `!loyaltybay-border-[#2271b1] loyaltybay-shadow-[0_0_0_1px_#2271b1] loyaltybay-outline-none ${classNames?.triggerOpen || ''
              }`
              : 'loyaltybay-shadow-none'
            } 
            ${classNames?.trigger || ''}
          `.trim()}
        >
          <span
            className={`loyaltybay-overflow-hidden loyaltybay-text-ellipsis loyaltybay-whitespace-nowrap loyaltybay-flex-1 ${classNames?.value || ''
              }`.trim()}
          >
            {selectedOption
              ? renderOption
                ? renderOption(selectedOption)
                : selectedOption.label
              : placeholder}
          </span>

          { /* Native-looking arrow */}
          <span className="loyaltybay-absolute loyaltybay-right-1.5 loyaltybay-flex loyaltybay-items-center loyaltybay-pointer-events-none">
            <ChevronDown size={14} color="#50575e" />
          </span>
        </div>

        { /* Dropdown Menu */}
        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className={`loyaltybay-fixed loyaltybay-z-[999999] loyaltybay-bg-white loyaltybay-border-2 loyaltybay-border-[#2271b1] ${differentDropdownWidth
                ? 'loyaltybay-rounded-[3px]'
                : 'loyaltybay-border-t-0 loyaltybay-mt-[-3px] loyaltybay-rounded-b-[3px]'
                } 
              loyaltybay-rounded-b-[3px] loyaltybay-shadow-[0_3px_5px_rgba(0,0,0,0.2)] loyaltybay-p-0 loyaltybay-box-border ${classNames?.dropdown || ''
                }`.trim()}
              style={{
                top: coords.top,
                left: coords.left - 1, // Offset for border alignment
                width: coords.width + 2, // Compensate for border
                ...(differentDropdownWidth
                  ? { width: 'max-content' }
                  : {}),
              }}
            >
              {enableSearch && (
                <div
                  className={`loyaltybay-p-1.5 ${classNames?.searchContainer || ''
                    }`.trim()}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Search..."
                    className={`loyaltybay-w-full loyaltybay-px-2 loyaltybay-leading-loose loyaltybay-min-h-[26px] loyaltybay-border loyaltybay-border-[#aaaaaa] loyaltybay-bg-[#fcfcfc] loyaltybay-rounded-[3px] loyaltybay-box-border loyaltybay-text-[13px] focus:loyaltybay-outline-none focus:loyaltybay-shadow-none ${classNames?.searchInput || ''
                      }`.trim()}
                  />
                </div>
              )}

              <ul
                ref={listRef}
                role="listbox"
                className={`loyaltybay-max-h-[220px] loyaltybay-overflow-y-auto loyaltybay-m-0 loyaltybay-p-0 loyaltybay-list-none ${classNames?.list || ''
                  }`.trim()}
                style={{
                  scrollbarWidth: 'thin',
                }}
              >
                {filteredOptions.length === 0 ? (
                  <li className="loyaltybay-px-3 loyaltybay-py-1.5 loyaltybay-text-[#646970] loyaltybay-italic loyaltybay-text-[13px] loyaltybay-m-0">
                    {searchQuery
                      ? 'No results found'
                      : 'No options available'}
                  </li>
                ) : (
                  filteredOptions.map((opt, index) => {
                    const isSelected =
                      selectedOption?.value === opt.value;
                    const isHighlighted =
                      highlightedIndex === index;
                    const isPro = opt.variant === 'buy_pro';
                    const isComingSoon =
                      opt.variant === 'coming_soon';
                    const isDisabled =
                      opt.disabled ||
                      isPro ||
                      isComingSoon;

                    return (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={(e) =>
                          handleOptionHover(
                            e,
                            index,
                            opt
                          )
                        }
                        onMouseLeave={() => {
                          hoverTimeoutRef.current =
                            window.setTimeout(
                              () =>
                                setTooltipState(
                                  null
                                ),
                              150
                            );
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt);
                        }}
                        className={`
                        loyaltybay-px-3 loyaltybay-py-1.5 loyaltybay-flex loyaltybay-items-center 
                        loyaltybay-justify-between loyaltybay-text-[13px] loyaltybay-m-0 
                        ${isDisabled
                            ? 'loyaltybay-cursor-not-allowed'
                            : 'loyaltybay-cursor-pointer'
                          } 
                        ${isHighlighted
                            ? `loyaltybay-bg-[#2271b1] loyaltybay-text-white ${classNames?.optionHighlighted || ''
                            }`
                            : isDisabled
                              ? 'loyaltybay-bg-transparent loyaltybay-text-[#a7aaad]'
                              : `loyaltybay-bg-transparent loyaltybay-text-[#2c3338]`
                          } 
                        ${isSelected ? classNames?.optionSelected || '' : ''}
                        ${classNames?.option || ''}
                      `.trim()}
                      >
                        <span className="loyaltybay-flex loyaltybay-items-center loyaltybay-gap-2 loyaltybay-overflow-hidden loyaltybay-text-ellipsis loyaltybay-whitespace-nowrap">
                          {renderOption
                            ? renderOption(opt)
                            : opt.label}
                        </span>

                        { /* Icons for variants */}
                        {isPro && (
                          <span
                            className={`loyaltybay-flex ${isHighlighted
                              ? 'loyaltybay-text-white'
                              : 'loyaltybay-text-[#ffb900]'
                              }`}
                          >
                            <Lock size={14} />
                          </span>
                        )}
                        {isComingSoon && (
                          <span
                            className={`loyaltybay-text-[10px] loyaltybay-uppercase loyaltybay-px-1.5 loyaltybay-py-0.5 loyaltybay-rounded-[10px] loyaltybay-font-semibold loyaltybay-flex loyaltybay-items-center loyaltybay-gap-1 ${isHighlighted
                              ? 'loyaltybay-bg-white/20 loyaltybay-text-white'
                              : 'loyaltybay-bg-[#f0f0f1] loyaltybay-text-[#646970]'
                              }`}
                          >
                            <Hourglass
                              size={10}
                            />
                            Soon
                          </span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body
          )}
      </div>

      {description && (
        <p
          className={`description loyaltybay-mt-1 ${classNames?.description || ''
            }`.trim()}
        >
          {description}
        </p>
      )}

      { /* Portal Tooltip or absolute Tooltip for variants */}
      {tooltipState?.visible && (
        <div
          className="loyaltybay-fixed loyaltybay-bg-[#1d2327] loyaltybay-text-white loyaltybay-px-2.5 loyaltybay-py-1 loyaltybay-rounded-[3px] loyaltybay-text-[12px] loyaltybay-pointer-events-none loyaltybay-z-[100000] loyaltybay-whitespace-nowrap"
          style={{
            top: tooltipState.top - 8,
            left: tooltipState.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltipState.text}
          { /* Tooltip caret */}
          <div className="loyaltybay-absolute -loyaltybay-bottom-1 loyaltybay-left-1/2 -loyaltybay-translate-x-1/2 loyaltybay-border-x-4 loyaltybay-border-t-4 loyaltybay-border-x-transparent loyaltybay-border-b-transparent loyaltybay-border-t-[#1d2327]" />
        </div>
      )}
    </div>
  );
};
