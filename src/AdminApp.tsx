import LedgerAdmin from "./pages/LedgerAdmin";
import { PointBayProvider } from "./store/pointbayStore";
import { ToastProvider } from "./store/toast/use-toast";
import { ToastContainer } from "./components/common/ToastContainer";
import { ClassicLayout } from "./components/classics";

function AdminApp() {
  return (
    <PointBayProvider>
      <ToastProvider>
        <ToastContainer />
        <ClassicLayout title="Loyalty Points">
          <LedgerAdmin />
        </ClassicLayout>
      </ToastProvider>
    </PointBayProvider>
  );
}

export default AdminApp;
