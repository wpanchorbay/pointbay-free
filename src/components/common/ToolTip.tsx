import React, { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  disabled?: boolean;
  classNames?: {
    root?: string;
    trigger?: string;
    content?: string;
    arrow?: string;
  };
  docLink?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "top",
  delay = 200,
  className = "",
  disabled = false,
  classNames,
  docLink,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (disabled) return;

    // If there's a timeout to hide the tooltip, cancel it
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Set a timeout to show the tooltip if it's not already visible
    if (!showTimeoutRef.current && !isVisible) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    }
  };

  const handleMouseLeave = () => {
    // If there's a timeout to show the tooltip, cancel it
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Set a short timeout to hide the tooltip, allowing the user to move their cursor to it
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100); // A small delay before hiding
  };

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Boundary collision checks to keep the tooltip within the viewport
    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();

      const handleResizeOrScroll = () => calculatePosition();
      window.addEventListener("resize", handleResizeOrScroll);
      window.addEventListener("scroll", handleResizeOrScroll, true);

      return () => {
        window.removeEventListener("resize", handleResizeOrScroll);
        window.removeEventListener("scroll", handleResizeOrScroll, true);
      };
    }
  }, [isVisible, position]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const arrowClasses = {
    top: "loyaltybay-top-full loyaltybay-left-1/2 loyaltybay--translate-x-1/2 loyaltybay-border-t-gray-900",
    bottom:
      "loyaltybay-bottom-full loyaltybay-left-1/2 loyaltybay--translate-x-1/2 loyaltybay-border-b-gray-900",
    left: "loyaltybay-left-full loyaltybay-top-1/2 loyaltybay--translate-y-1/2 loyaltybay-border-l-gray-900",
    right:
      "loyaltybay-right-full loyaltybay-top-1/2 loyaltybay--translate-y-1/2 loyaltybay-border-r-gray-900",
  }[position];

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        className={`loyaltybay-inline-block ${classNames?.trigger || ""}`}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
            loyaltybay-fixed loyaltybay-z-[60] loyaltybay-max-w-[300px]
            ${className}
            ${classNames?.root || ""}
          `}
            style={{
              top: coords.top,
              left: coords.left,
            }}
          >
            <div
              className={`loyaltybay-animate-tooltip loyaltybay-relative loyaltybay-px-2.5 loyaltybay-py-1.5 loyaltybay-bg-gray-900 loyaltybay-text-white loyaltybay-text-xs loyaltybay-rounded loyaltybay-shadow-lg ${
                classNames?.content || ""
              }`}
            >
              {content}
              {docLink && (
                <>
                  {" "}
                  <a
                    href={docLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="loyaltybay-text-blue-400 hover:loyaltybay-text-blue-300 loyaltybay-underline"
                  >
                    Read More
                  </a>
                </>
              )}
              <div
                className={`
                loyaltybay-absolute loyaltybay-border-[5px] loyaltybay-border-transparent
                ${arrowClasses}
                ${classNames?.arrow || ""}
              `}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
