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
      className={`pointbay-fixed pointbay-inset-0 pointbay-z-[60000] pointbay-flex pointbay-items-center pointbay-justify-center pointbay-bg-black/50 pointbay-backdrop-blur-sm pointbay-transition-opacity ${
        classNames.overlay || ""
      }`}
    >
      <div
        className={`pointbay-bg-white pointbay-rounded-lg pointbay-shadow-xl pointbay-pt-6 pointbay-pb-3 pointbay-px-8 pointbay-max-w-sm pointbay-w-full pointbay-mx-4 pointbay-transform pointbay-transition-all pointbay-scale-100 ${
          classNames.content || ""
        }`}
      >
        <h3
          className={`pointbay-text-lg pointbay-font-bold pointbay-text-gray-900 pointbay-mb-2 pointbay-text-nowrap ${
            classNames.title || ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`pointbay-text-gray-600 pointbay-mb-6 pointbay-text-sm pointbay-leading-relaxed ${
            classNames.message || ""
          }`}
        >
          {message}
        </p>
        <div
          className={`pointbay-flex pointbay-justify-end pointbay-gap-3 ${
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
