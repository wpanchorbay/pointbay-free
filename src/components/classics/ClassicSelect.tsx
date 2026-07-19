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
        } lb-align-middle`.trim()}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={selectId}
          className={`lb-block lb-mb-1 ${classNames?.label || ''
            }`.trim()}
        >
          {label}
        </label>
      )}

      <div
        className={`lb-relative ${classNames?.innerContainer}`}
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
            lb-flex lb-items-center lb-justify-between 
            lb-min-h-[40px]
            lb-appearance-none lb-border lb-border-[#8c8f94] 
            lb-rounded-[3px] lb-px-2 lb-pr-6 lb-min-h-[30px] 
            lb-leading-loose lb-transition-all lb-duration-100 
            lb-select-none lb-relative lb-box-border lb-w-full 
            ${disabled
              ? `lb-cursor-not-allowed lb-bg-[#f0f0f1] lb-text-[#a7aaad] ${classNames?.triggerDisabled || ''
              }`
              : `lb-cursor-pointer lb-bg-white lb-text-[#2c3338]`
            } 
            ${isOpen
              ? `!lb-border-[#2271b1] lb-shadow-[0_0_0_1px_#2271b1] lb-outline-none ${classNames?.triggerOpen || ''
              }`
              : 'lb-shadow-none'
            } 
            ${classNames?.trigger || ''}
          `.trim()}
        >
          <span
            className={`lb-overflow-hidden lb-text-ellipsis lb-whitespace-nowrap lb-flex-1 ${classNames?.value || ''
              }`.trim()}
          >
            {selectedOption
              ? renderOption
                ? renderOption(selectedOption)
                : selectedOption.label
              : placeholder}
          </span>

          { /* Native-looking arrow */}
          <span className="lb-absolute lb-right-1.5 lb-flex lb-items-center lb-pointer-events-none">
            <ChevronDown size={14} color="#50575e" />
          </span>
        </div>

        { /* Dropdown Menu */}
        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className={`lb-fixed lb-z-[999999] lb-bg-white lb-border-2 lb-border-[#2271b1] ${differentDropdownWidth
                ? 'lb-rounded-[3px]'
                : 'lb-border-t-0 lb-mt-[-3px] lb-rounded-b-[3px]'
                } 
              lb-rounded-b-[3px] lb-shadow-[0_3px_5px_rgba(0,0,0,0.2)] lb-p-0 lb-box-border ${classNames?.dropdown || ''
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
                  className={`lb-p-1.5 ${classNames?.searchContainer || ''
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
                    className={`lb-w-full lb-px-2 lb-leading-loose lb-min-h-[26px] lb-border lb-border-[#aaaaaa] lb-bg-[#fcfcfc] lb-rounded-[3px] lb-box-border lb-text-[13px] focus:lb-outline-none focus:lb-shadow-none ${classNames?.searchInput || ''
                      }`.trim()}
                  />
                </div>
              )}

              <ul
                ref={listRef}
                role="listbox"
                className={`lb-max-h-[220px] lb-overflow-y-auto lb-m-0 lb-p-0 lb-list-none ${classNames?.list || ''
                  }`.trim()}
                style={{
                  scrollbarWidth: 'thin',
                }}
              >
                {filteredOptions.length === 0 ? (
                  <li className="lb-px-3 lb-py-1.5 lb-text-[#646970] lb-italic lb-text-[13px] lb-m-0">
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
                        lb-px-3 lb-py-1.5 lb-flex lb-items-center 
                        lb-justify-between lb-text-[13px] lb-m-0 
                        ${isDisabled
                            ? 'lb-cursor-not-allowed'
                            : 'lb-cursor-pointer'
                          } 
                        ${isHighlighted
                            ? `lb-bg-[#2271b1] lb-text-white ${classNames?.optionHighlighted || ''
                            }`
                            : isDisabled
                              ? 'lb-bg-transparent lb-text-[#a7aaad]'
                              : `lb-bg-transparent lb-text-[#2c3338]`
                          } 
                        ${isSelected ? classNames?.optionSelected || '' : ''}
                        ${classNames?.option || ''}
                      `.trim()}
                      >
                        <span className="lb-flex lb-items-center lb-gap-2 lb-overflow-hidden lb-text-ellipsis lb-whitespace-nowrap">
                          {renderOption
                            ? renderOption(opt)
                            : opt.label}
                        </span>

                        { /* Icons for variants */}
                        {isPro && (
                          <span
                            className={`lb-flex ${isHighlighted
                              ? 'lb-text-white'
                              : 'lb-text-[#ffb900]'
                              }`}
                          >
                            <Lock size={14} />
                          </span>
                        )}
                        {isComingSoon && (
                          <span
                            className={`lb-text-[10px] lb-uppercase lb-px-1.5 lb-py-0.5 lb-rounded-[10px] lb-font-semibold lb-flex lb-items-center lb-gap-1 ${isHighlighted
                              ? 'lb-bg-white/20 lb-text-white'
                              : 'lb-bg-[#f0f0f1] lb-text-[#646970]'
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
          className={`description lb-mt-1 ${classNames?.description || ''
            }`.trim()}
        >
          {description}
        </p>
      )}

      { /* Portal Tooltip or absolute Tooltip for variants */}
      {tooltipState?.visible && (
        <div
          className="lb-fixed lb-bg-[#1d2327] lb-text-white lb-px-2.5 lb-py-1 lb-rounded-[3px] lb-text-[12px] lb-pointer-events-none lb-z-[100000] lb-whitespace-nowrap"
          style={{
            top: tooltipState.top - 8,
            left: tooltipState.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltipState.text}
          { /* Tooltip caret */}
          <div className="lb-absolute -lb-bottom-1 lb-left-1/2 -lb-translate-x-1/2 lb-border-x-4 lb-border-t-4 lb-border-x-transparent lb-border-b-transparent lb-border-t-[#1d2327]" />
        </div>
      )}
    </div>
  );
};
