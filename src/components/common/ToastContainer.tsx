import { FC } from "react";
import { useToast } from "../../store/toast/use-toast";
import { Toast } from "./Toast";

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToast();
  return (
    <div className="loyaltybay-fixed loyaltybay-bottom-[30px] loyaltybay-right-[10px] loyaltybay-z-[999999] loyaltybay-flex loyaltybay-flex-col loyaltybay-gap-[10px] loyaltybay-min-w-[200px] loyaltybay-pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
