import React, { useEffect, useRef } from "react";
import Button from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  autoFocus?: "confirm" | "cancel";
  classNames?: {
    overlay?: string;
    content?: string;
    title?: string;
    message?: string;
    footer?: string;
    button?: {
      cancelClassName?: string;
      confirmClassName?: string;
      cancelVariant?: "solid" | "outline" | "ghost";
      confirmVariant?: "solid" | "outline" | "ghost";
      cancelColor?: "primary" | "secondary" | "danger";
      confirmColor?: "primary" | "secondary" | "danger";
    };
  };
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  autoFocus = "confirm",
  classNames = {},
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (autoFocus === "cancel") {
        cancelRef.current?.focus();
      } else {
        confirmRef.current?.focus();
      }
    }
  }, [isOpen, autoFocus]);

  if (!isOpen) return null;

  return (
    <div
      className={`loyaltybay-fixed loyaltybay-inset-0 loyaltybay-z-[60000] loyaltybay-flex loyaltybay-items-center loyaltybay-justify-center loyaltybay-bg-black/50 loyaltybay-backdrop-blur-sm loyaltybay-transition-opacity ${
        classNames.overlay || ""
      }`}
    >
      <div
        className={`loyaltybay-bg-white loyaltybay-rounded-lg loyaltybay-shadow-xl loyaltybay-pt-6 loyaltybay-pb-3 loyaltybay-px-8 loyaltybay-max-w-sm loyaltybay-w-full loyaltybay-mx-4 loyaltybay-transform loyaltybay-transition-all loyaltybay-scale-100 ${
          classNames.content || ""
        }`}
      >
        <h3
          className={`loyaltybay-text-lg loyaltybay-font-bold loyaltybay-text-gray-900 loyaltybay-mb-2 loyaltybay-text-nowrap ${
            classNames.title || ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`loyaltybay-text-gray-600 loyaltybay-mb-6 loyaltybay-text-sm loyaltybay-leading-relaxed ${
            classNames.message || ""
          }`}
        >
          {message}
        </p>
        <div
          className={`loyaltybay-flex loyaltybay-justify-end loyaltybay-gap-3 ${
            classNames.footer || ""
          }`}
        >
          <Button
            ref={cancelRef}
            className={classNames.button?.cancelClassName || ""}
            variant={classNames.button?.cancelVariant || "ghost"}
            color={classNames.button?.cancelColor || "secondary"}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            className={classNames.button?.confirmClassName || ""}
            variant={classNames.button?.confirmVariant || "solid"}
            color={classNames.button?.confirmColor || "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
