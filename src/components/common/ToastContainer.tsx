import { FC } from "react";
import { useToast } from "../../store/toast/use-toast";
import { Toast } from "./Toast";

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToast();
  return (
    <div className="pointbay-fixed pointbay-bottom-[30px] pointbay-right-[10px] pointbay-z-[999999] pointbay-flex pointbay-flex-col pointbay-gap-[10px] pointbay-min-w-[200px] pointbay-pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
