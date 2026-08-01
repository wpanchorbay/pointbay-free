/* eslint-disable */
import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
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

  useClickOutside([containerRef, dropdownRef], () => {
    setIsOpen(false);
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
    if (option.disabled) {
      return;
    }
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
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

  const handleOptionHover = (index: number) => {
    interactionType.current = 'mouse';
    setHighlightedIndex(index);
  };

  const selectId =
    id || `classic-select-${Math.random().toString(36).slice(2, 9)}`;
  const sizeClass = size === 'short' ? 'min-content' : '';
  const explicitWidth =
    size === 'short' ? 'min-content' : size === 'regular' ? 'auto' : '100%';

  return (
    <div
      className={`${sizeClass} ${className} ${classNames?.container || ''
        } pointbay-align-middle`.trim()}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={selectId}
          className={`pointbay-block pointbay-mb-1 ${classNames?.label || ''
            }`.trim()}
        >
          {label}
        </label>
      )}

      <div
        className={`pointbay-relative ${classNames?.innerContainer}`}
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
            pointbay-flex pointbay-items-center pointbay-justify-between 
            pointbay-min-h-[40px]
            pointbay-appearance-none pointbay-border pointbay-border-[#8c8f94] 
            pointbay-rounded-[3px] pointbay-px-2 pointbay-pr-6 pointbay-min-h-[30px] 
            pointbay-leading-loose pointbay-transition-all pointbay-duration-100 
            pointbay-select-none pointbay-relative pointbay-box-border pointbay-w-full 
            ${disabled
              ? `pointbay-cursor-not-allowed pointbay-bg-[#f0f0f1] pointbay-text-[#a7aaad] ${classNames?.triggerDisabled || ''
              }`
              : `pointbay-cursor-pointer pointbay-bg-white pointbay-text-[#2c3338]`
            } 
            ${isOpen
              ? `!pointbay-border-[#2271b1] pointbay-shadow-[0_0_0_1px_#2271b1] pointbay-outline-none ${classNames?.triggerOpen || ''
              }`
              : 'pointbay-shadow-none'
            } 
            ${classNames?.trigger || ''}
          `.trim()}
        >
          <span
            className={`pointbay-overflow-hidden pointbay-text-ellipsis pointbay-whitespace-nowrap pointbay-flex-1 ${classNames?.value || ''
              }`.trim()}
          >
            {selectedOption
              ? renderOption
                ? renderOption(selectedOption)
                : selectedOption.label
              : placeholder}
          </span>

          { /* Native-looking arrow */}
          <span className="pointbay-absolute pointbay-right-1.5 pointbay-flex pointbay-items-center pointbay-pointer-events-none">
            <ChevronDown size={14} color="#50575e" />
          </span>
        </div>

        { /* Dropdown Menu */}
        {isOpen &&
          createPortal(
            <div
              ref={dropdownRef}
              className={`pointbay-fixed pointbay-z-[999999] pointbay-bg-white pointbay-border-2 pointbay-border-[#2271b1] ${differentDropdownWidth
                ? 'pointbay-rounded-[3px]'
                : 'pointbay-border-t-0 pointbay-mt-[-3px] pointbay-rounded-b-[3px]'
                } 
              pointbay-rounded-b-[3px] pointbay-shadow-[0_3px_5px_rgba(0,0,0,0.2)] pointbay-p-0 pointbay-box-border ${classNames?.dropdown || ''
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
                  className={`pointbay-p-1.5 ${classNames?.searchContainer || ''
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
                    className={`pointbay-w-full pointbay-px-2 pointbay-leading-loose pointbay-min-h-[26px] pointbay-border pointbay-border-[#aaaaaa] pointbay-bg-[#fcfcfc] pointbay-rounded-[3px] pointbay-box-border pointbay-text-[13px] focus:pointbay-outline-none focus:pointbay-shadow-none ${classNames?.searchInput || ''
                      }`.trim()}
                  />
                </div>
              )}

              <ul
                ref={listRef}
                role="listbox"
                className={`pointbay-max-h-[220px] pointbay-overflow-y-auto pointbay-m-0 pointbay-p-0 pointbay-list-none ${classNames?.list || ''
                  }`.trim()}
                style={{
                  scrollbarWidth: 'thin',
                }}
              >
                {filteredOptions.length === 0 ? (
                  <li className="pointbay-px-3 pointbay-py-1.5 pointbay-text-[#646970] pointbay-italic pointbay-text-[13px] pointbay-m-0">
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
                    const isDisabled = opt.disabled;

                    return (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => handleOptionHover(index)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt);
                        }}
                        className={`
                        pointbay-px-3 pointbay-py-1.5 pointbay-flex pointbay-items-center 
                        pointbay-justify-between pointbay-text-[13px] pointbay-m-0 
                        ${isDisabled
                            ? 'pointbay-cursor-not-allowed'
                            : 'pointbay-cursor-pointer'
                          } 
                        ${isHighlighted
                            ? `pointbay-bg-[#2271b1] pointbay-text-white ${classNames?.optionHighlighted || ''
                            }`
                            : isDisabled
                              ? 'pointbay-bg-transparent pointbay-text-[#a7aaad]'
                              : `pointbay-bg-transparent pointbay-text-[#2c3338]`
                          } 
                        ${isSelected ? classNames?.optionSelected || '' : ''}
                        ${classNames?.option || ''}
                      `.trim()}
                      >
                        <span className="pointbay-flex pointbay-items-center pointbay-gap-2 pointbay-overflow-hidden pointbay-text-ellipsis pointbay-whitespace-nowrap">
                          {renderOption
                            ? renderOption(opt)
                            : opt.label}
                        </span>
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
          className={`description pointbay-mt-1 ${classNames?.description || ''
            }`.trim()}
        >
          {description}
        </p>
      )}
    </div>
  );
};
