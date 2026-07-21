import React, { useState, useRef, useEffect } from "react";

export type PopoverAlign =
  | "top"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right";

interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: PopoverAlign;
  className?: string;
  classNames?: {
    root?: string;
    triggerWrapper?: string;
    content?: string;
  };
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = "bottom-left",
  className = "",
  classNames,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggle = () => setIsOpen(!isOpen);

  // Position & Origin Logic
  let positionClasses = "";
  let originClass = "";

  switch (align) {
    case "top":
      positionClasses =
        "loyaltybay-bottom-full loyaltybay-mb-2 loyaltybay-left-1/2 loyaltybay--translate-x-1/2";
      originClass = "loyaltybay-origin-bottom";
      break;
    case "top-left":
      positionClasses = "loyaltybay-bottom-full loyaltybay-mb-2 loyaltybay-left-0";
      originClass = "loyaltybay-origin-bottom-left";
      break;
    case "top-right":
      positionClasses =
        "loyaltybay-bottom-full loyaltybay-mb-2 loyaltybay-right-0";
      originClass = "loyaltybay-origin-bottom-right";
      break;
    case "bottom":
      positionClasses =
        "loyaltybay-top-full loyaltybay-mt-2 loyaltybay-left-1/2 loyaltybay--translate-x-1/2";
      originClass = "loyaltybay-origin-top";
      break;
    case "bottom-left":
      positionClasses = "loyaltybay-top-full loyaltybay-mt-2 loyaltybay-left-0";
      originClass = "loyaltybay-origin-top-left";
      break;
    case "bottom-right":
      positionClasses = "loyaltybay-top-full loyaltybay-mt-2 loyaltybay-right-0";
      originClass = "loyaltybay-origin-top-right";
      break;
    case "left":
      positionClasses =
        "loyaltybay-right-full loyaltybay-mr-2 loyaltybay-top-1/2 loyaltybay--translate-y-1/2";
      originClass = "loyaltybay-origin-right";
      break;
    case "right":
      positionClasses =
        "loyaltybay-left-full loyaltybay-ml-2 loyaltybay-top-1/2 loyaltybay--translate-y-1/2";
      originClass = "loyaltybay-origin-left";
      break;
    default:
      positionClasses = "loyaltybay-top-full loyaltybay-mt-2 loyaltybay-left-0";
      originClass = "loyaltybay-origin-top-left";
  }

  // Transition classes (Opacity + Scale)
  const transitionClasses = isOpen
    ? "loyaltybay-opacity-100 loyaltybay-scale-100 loyaltybay-pointer-events-auto"
    : "loyaltybay-opacity-0 loyaltybay-scale-95 loyaltybay-pointer-events-none";

  return (
    <div
      ref={containerRef}
      className={`loyaltybay-relative loyaltybay-inline-block ${className} ${
        classNames?.root || ""
      }`}
    >
      {/* Trigger Wrapper */}
      <div
        onClick={toggle}
        className={`loyaltybay-cursor-pointer loyaltybay-inline-flex ${
          classNames?.triggerWrapper || ""
        }`}
      >
        {trigger}
      </div>

      {/* Dropdown Content */}
      <div
        className={`
          loyaltybay-absolute loyaltybay-z-50 loyaltybay-w-48
          loyaltybay-bg-white loyaltybay-rounded-xl loyaltybay-shadow-xl loyaltybay-border loyaltybay-border-default
          loyaltybay-transition-all loyaltybay-duration-200 loyaltybay-ease-out
          ${positionClasses}
          ${originClass}
          ${transitionClasses}
          ${classNames?.content || ""}
        `}
      >
        {content}
      </div>
    </div>
  );
};
