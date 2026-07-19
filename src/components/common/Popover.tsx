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
        "lb-bottom-full lb-mb-2 lb-left-1/2 lb--translate-x-1/2";
      originClass = "lb-origin-bottom";
      break;
    case "top-left":
      positionClasses = "lb-bottom-full lb-mb-2 lb-left-0";
      originClass = "lb-origin-bottom-left";
      break;
    case "top-right":
      positionClasses =
        "lb-bottom-full lb-mb-2 lb-right-0";
      originClass = "lb-origin-bottom-right";
      break;
    case "bottom":
      positionClasses =
        "lb-top-full lb-mt-2 lb-left-1/2 lb--translate-x-1/2";
      originClass = "lb-origin-top";
      break;
    case "bottom-left":
      positionClasses = "lb-top-full lb-mt-2 lb-left-0";
      originClass = "lb-origin-top-left";
      break;
    case "bottom-right":
      positionClasses = "lb-top-full lb-mt-2 lb-right-0";
      originClass = "lb-origin-top-right";
      break;
    case "left":
      positionClasses =
        "lb-right-full lb-mr-2 lb-top-1/2 lb--translate-y-1/2";
      originClass = "lb-origin-right";
      break;
    case "right":
      positionClasses =
        "lb-left-full lb-ml-2 lb-top-1/2 lb--translate-y-1/2";
      originClass = "lb-origin-left";
      break;
    default:
      positionClasses = "lb-top-full lb-mt-2 lb-left-0";
      originClass = "lb-origin-top-left";
  }

  // Transition classes (Opacity + Scale)
  const transitionClasses = isOpen
    ? "lb-opacity-100 lb-scale-100 lb-pointer-events-auto"
    : "lb-opacity-0 lb-scale-95 lb-pointer-events-none";

  return (
    <div
      ref={containerRef}
      className={`lb-relative lb-inline-block ${className} ${
        classNames?.root || ""
      }`}
    >
      {/* Trigger Wrapper */}
      <div
        onClick={toggle}
        className={`lb-cursor-pointer lb-inline-flex ${
          classNames?.triggerWrapper || ""
        }`}
      >
        {trigger}
      </div>

      {/* Dropdown Content */}
      <div
        className={`
          lb-absolute lb-z-50 lb-w-48
          lb-bg-white lb-rounded-xl lb-shadow-xl lb-border lb-border-default
          lb-transition-all lb-duration-200 lb-ease-out
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
