import React, { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  closeOnOutsideClick?: boolean;
  className?: string;
  showHeader?: boolean;
  classNames?: {
    header?: string;
    body?: string;
    footer?: string;
  };
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "pointbay-max-w-2xl",
  closeOnOutsideClick = true,
  className = "",
  showHeader = true,
  classNames = {
    header: "",
    body: "",
    footer: "",
  },
}) => {
  // Handle Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      // Prevent scrolling on body when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="pointbay-fixed pointbay-inset-0 pointbay-z-[9998] pointbay-flex pointbay-items-center pointbay-justify-center pointbay-p-4 pointbay-bg-black/75 pointbay-transition-opacity pointbay-duration-300">
      {/* Backdrop click handler */}
      <div
        className="pointbay-absolute pointbay-inset-0"
        onClick={closeOnOutsideClick ? onClose : undefined}
      />

      {/* Modal Content */}
      <div
        className={`
          pointbay-relative pointbay-w-full ${maxWidth} 
          pointbay-bg-white pointbay-shadow-2xl pointbay-rounded-xl 
          pointbay-flex pointbay-flex-col pointbay-max-h-[90vh]
          pointbay-animate-in pointbay-fade-in pointbay-zoom-in-95 pointbay-duration-200
          ${className}
        `}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {showHeader && (
          <div
            className={`pointbay-flex pointbay-items-center pointbay-justify-between pointbay-px-6 pointbay-py-4 pointbay-border-b pointbay-border-gray-100 ${classNames.header}`}
          >
            <h3 className="pointbay-text-lg pointbay-font-semibold pointbay-text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="pointbay-p-1.5 pointbay-text-gray-400 hover:pointbay-text-gray-600 pointbay-transition-colors hover:pointbay-bg-gray-100 pointbay-rounded-full"
              aria-label="Close modal"
            >
              <X className="pointbay-w-5 pointbay-h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className={`pointbay-p-6 pointbay-overflow-y-auto pointbay-flex-1 ${classNames.body}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`pointbay-flex pointbay-items-center pointbay-justify-end pointbay-gap-3 pointbay-px-6 pointbay-py-4 pointbay-bg-gray-50 pointbay-border-t pointbay-border-gray-100 pointbay-rounded-b-xl ${classNames.footer}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default CustomModal;
