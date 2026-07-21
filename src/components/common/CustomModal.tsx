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
  maxWidth = "loyaltybay-max-w-2xl",
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
    <div className="loyaltybay-fixed loyaltybay-inset-0 loyaltybay-z-[9998] loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center loyaltybay-p-4 loyaltybay-bg-black/75 loyaltybay-transition-opacity loyaltybay-duration-300">
      {/* Backdrop click handler */}
      <div
        className="loyaltybay-absolute loyaltybay-inset-0"
        onClick={closeOnOutsideClick ? onClose : undefined}
      />

      {/* Modal Content */}
      <div
        className={`
          loyaltybay-relative loyaltybay-w-full ${maxWidth} 
          loyaltybay-bg-white loyaltybay-shadow-2xl loyaltybay-rounded-xl 
          loyaltybay-flex loyaltybay-flex-col loyaltybay-max-h-[90vh]
          loyaltybay-animate-in loyaltybay-fade-in loyaltybay-zoom-in-95 loyaltybay-duration-200
          ${className}
        `}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {showHeader && (
          <div
            className={`loyaltybay-flex loyaltybay-items-center loyaltybay-justify-between loyaltybay-px-6 loyaltybay-py-4 loyaltybay-border-b loyaltybay-border-gray-100 ${classNames.header}`}
          >
            <h3 className="loyaltybay-text-lg loyaltybay-font-semibold loyaltybay-text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="loyaltybay-p-1.5 loyaltybay-text-gray-400 hover:loyaltybay-text-gray-600 loyaltybay-transition-colors hover:loyaltybay-bg-gray-100 loyaltybay-rounded-full"
              aria-label="Close modal"
            >
              <X className="loyaltybay-w-5 loyaltybay-h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className={`loyaltybay-p-6 loyaltybay-overflow-y-auto loyaltybay-flex-1 ${classNames.body}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`loyaltybay-flex loyaltybay-items-center loyaltybay-justify-end loyaltybay-gap-3 loyaltybay-px-6 loyaltybay-py-4 loyaltybay-bg-gray-50 loyaltybay-border-t loyaltybay-border-gray-100 loyaltybay-rounded-b-xl ${classNames.footer}`}
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
