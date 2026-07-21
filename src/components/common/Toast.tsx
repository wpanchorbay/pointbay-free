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
        return "loyaltybay-bg-[#f0fff4] loyaltybay-border-l-[#228b22] loyaltybay-text-[#1a472a]";
      case "error":
        return "loyaltybay-bg-[#fff5f5] loyaltybay-border-l-[#cc0000] loyaltybay-text-[#5c2121]";
      case "info":
      default:
        return "loyaltybay-bg-white loyaltybay-border-l-[#2271b1] loyaltybay-text-[#1d2327]";
    }
  };

  const toastClasses = `
    loyaltybay-relative loyaltybay-p-5 loyaltybay-rounded-[4px] loyaltybay-shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
    loyaltybay-flex loyaltybay-items-center loyaltybay-justify-between loyaltybay-gap-[15px] 
    loyaltybay-border-l-[5px] loyaltybay-backdrop-blur-[3px]
    ${isClosing ? "loyaltybay-animate-slide-out" : "loyaltybay-animate-slide-in"}
    ${getToastTypeClasses()}
  `;

  return (
    <div className={toastClasses}>
      <p className="loyaltybay-m-0 loyaltybay-text-[14px] loyaltybay-leading-[1.5] loyaltybay-flex-1 ">
        {toast.message}
      </p>
      <button
        className="loyaltybay-bg-none loyaltybay-border-none loyaltybay-text-inherit loyaltybay-opacity-60 hover:loyaltybay-opacity-100 loyaltybay-cursor-pointer loyaltybay-text-[20px] loyaltybay-leading-none loyaltybay-px-[5px] loyaltybay-self-start -loyaltybay-mt-[5px] -loyaltybay-mr-[5px] -loyaltybay-mb-[5px] loyaltybay-ml-0"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <Icon icon={close} />
      </button>
    </div>
  );
};

export default Toast;
