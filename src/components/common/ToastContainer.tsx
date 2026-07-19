import { FC } from "react";
import { useToast } from "../../store/toast/use-toast";
import { Toast } from "./Toast";

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToast();
  return (
    <div className="lb-fixed lb-bottom-[30px] lb-right-[10px] lb-z-[999999] lb-flex lb-flex-col lb-gap-[10px] lb-min-w-[200px] lb-pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
