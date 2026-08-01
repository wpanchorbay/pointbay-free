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
        "pointbay-bottom-full pointbay-mb-2 pointbay-left-1/2 pointbay--translate-x-1/2";
      originClass = "pointbay-origin-bottom";
      break;
    case "top-left":
      positionClasses = "pointbay-bottom-full pointbay-mb-2 pointbay-left-0";
      originClass = "pointbay-origin-bottom-left";
      break;
    case "top-right":
      positionClasses =
        "pointbay-bottom-full pointbay-mb-2 pointbay-right-0";
      originClass = "pointbay-origin-bottom-right";
      break;
    case "bottom":
      positionClasses =
        "pointbay-top-full pointbay-mt-2 pointbay-left-1/2 pointbay--translate-x-1/2";
      originClass = "pointbay-origin-top";
      break;
    case "bottom-left":
      positionClasses = "pointbay-top-full pointbay-mt-2 pointbay-left-0";
      originClass = "pointbay-origin-top-left";
      break;
    case "bottom-right":
      positionClasses = "pointbay-top-full pointbay-mt-2 pointbay-right-0";
      originClass = "pointbay-origin-top-right";
      break;
    case "left":
      positionClasses =
        "pointbay-right-full pointbay-mr-2 pointbay-top-1/2 pointbay--translate-y-1/2";
      originClass = "pointbay-origin-right";
      break;
    case "right":
      positionClasses =
        "pointbay-left-full pointbay-ml-2 pointbay-top-1/2 pointbay--translate-y-1/2";
      originClass = "pointbay-origin-left";
      break;
    default:
      positionClasses = "pointbay-top-full pointbay-mt-2 pointbay-left-0";
      originClass = "pointbay-origin-top-left";
  }

  // Transition classes (Opacity + Scale)
  const transitionClasses = isOpen
    ? "pointbay-opacity-100 pointbay-scale-100 pointbay-pointer-events-auto"
    : "pointbay-opacity-0 pointbay-scale-95 pointbay-pointer-events-none";

  return (
    <div
      ref={containerRef}
      className={`pointbay-relative pointbay-inline-block ${className} ${
        classNames?.root || ""
      }`}
    >
      {/* Trigger Wrapper */}
      <div
        onClick={toggle}
        className={`pointbay-cursor-pointer pointbay-inline-flex ${
          classNames?.triggerWrapper || ""
        }`}
      >
        {trigger}
      </div>

      {/* Dropdown Content */}
      <div
        className={`
          pointbay-absolute pointbay-z-50 pointbay-w-48
          pointbay-bg-white pointbay-rounded-xl pointbay-shadow-xl pointbay-border pointbay-border-default
          pointbay-transition-all pointbay-duration-200 pointbay-ease-out
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
