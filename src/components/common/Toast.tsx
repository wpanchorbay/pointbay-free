import React, { useEffect, useState, FC } from "react";

import { Toast as ToastType } from "../../store/toast/use-toast";
import { close, Icon } from "@wordpress/icons";

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: number) => void;
}
export const Toast: FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // 300ms animation
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000); // 5 seconds
    return () => {
      clearTimeout(timer);
    };
  }, [toast.id]);

  const getToastTypeClasses = () => {
    switch (toast.type) {
      case "success":
        return "lb-bg-[#f0fff4] lb-border-l-[#228b22] lb-text-[#1a472a]";
      case "error":
        return "lb-bg-[#fff5f5] lb-border-l-[#cc0000] lb-text-[#5c2121]";
      case "info":
      default:
        return "lb-bg-white lb-border-l-[#2271b1] lb-text-[#1d2327]";
    }
  };

  const toastClasses = `
    lb-relative lb-p-5 lb-rounded-[4px] lb-shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
    lb-flex lb-items-center lb-justify-between lb-gap-[15px] 
    lb-border-l-[5px] lb-backdrop-blur-[3px]
    ${isClosing ? "lb-animate-slide-out" : "lb-animate-slide-in"}
    ${getToastTypeClasses()}
  `;

  return (
    <div className={toastClasses}>
      <p className="lb-m-0 lb-text-[14px] lb-leading-[1.5] lb-flex-1 ">
        {toast.message}
      </p>
      <button
        className="lb-bg-none lb-border-none lb-text-inherit lb-opacity-60 hover:lb-opacity-100 lb-cursor-pointer lb-text-[20px] lb-leading-none lb-px-[5px] lb-self-start -lb-mt-[5px] -lb-mr-[5px] -lb-mb-[5px] lb-ml-0"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <Icon icon={close} />
      </button>
    </div>
  );
};

export default Toast;
