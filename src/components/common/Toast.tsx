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
        return "pointbay-bg-[#f0fff4] pointbay-border-l-[#228b22] pointbay-text-[#1a472a]";
      case "error":
        return "pointbay-bg-[#fff5f5] pointbay-border-l-[#cc0000] pointbay-text-[#5c2121]";
      case "info":
      default:
        return "pointbay-bg-white pointbay-border-l-[#2271b1] pointbay-text-[#1d2327]";
    }
  };

  const toastClasses = `
    pointbay-relative pointbay-p-5 pointbay-rounded-[4px] pointbay-shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
    pointbay-flex pointbay-items-center pointbay-justify-between pointbay-gap-[15px] 
    pointbay-border-l-[5px] pointbay-backdrop-blur-[3px]
    ${isClosing ? "pointbay-animate-slide-out" : "pointbay-animate-slide-in"}
    ${getToastTypeClasses()}
  `;

  return (
    <div className={toastClasses}>
      <p className="pointbay-m-0 pointbay-text-[14px] pointbay-leading-[1.5] pointbay-flex-1 ">
        {toast.message}
      </p>
      <button
        className="pointbay-bg-none pointbay-border-none pointbay-text-inherit pointbay-opacity-60 hover:pointbay-opacity-100 pointbay-cursor-pointer pointbay-text-[20px] pointbay-leading-none pointbay-px-[5px] pointbay-self-start -pointbay-mt-[5px] -pointbay-mr-[5px] -pointbay-mb-[5px] pointbay-ml-0"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <Icon icon={close} />
      </button>
    </div>
  );
};

export default Toast;
