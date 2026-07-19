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
  maxWidth = "lb-max-w-2xl",
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
    <div className="lb-fixed lb-inset-0 lb-z-[9998] lb-flex lb-items-center lb-justify-center lb-p-4 lb-bg-black/75 lb-transition-opacity lb-duration-300">
      {/* Backdrop click handler */}
      <div
        className="lb-absolute lb-inset-0"
        onClick={closeOnOutsideClick ? onClose : undefined}
      />

      {/* Modal Content */}
      <div
        className={`
          lb-relative lb-w-full ${maxWidth} 
          lb-bg-white lb-shadow-2xl lb-rounded-xl 
          lb-flex lb-flex-col lb-max-h-[90vh]
          lb-animate-in lb-fade-in lb-zoom-in-95 lb-duration-200
          ${className}
        `}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {showHeader && (
          <div
            className={`lb-flex lb-items-center lb-justify-between lb-px-6 lb-py-4 lb-border-b lb-border-gray-100 ${classNames.header}`}
          >
            <h3 className="lb-text-lg lb-font-semibold lb-text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="lb-p-1.5 lb-text-gray-400 hover:lb-text-gray-600 lb-transition-colors hover:lb-bg-gray-100 lb-rounded-full"
              aria-label="Close modal"
            >
              <X className="lb-w-5 lb-h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className={`lb-p-6 lb-overflow-y-auto lb-flex-1 ${classNames.body}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`lb-flex lb-items-center lb-justify-end lb-gap-3 lb-px-6 lb-py-4 lb-bg-gray-50 lb-border-t lb-border-gray-100 lb-rounded-b-xl ${classNames.footer}`}
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
