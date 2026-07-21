import LedgerAdmin from "./pages/LedgerAdmin";
import { LoyaltyBayProvider } from "./store/loyaltybayStore";
import { ToastProvider } from "./store/toast/use-toast";
import { ToastContainer } from "./components/common/ToastContainer";
import { ClassicLayout } from "./components/classics";

function AdminApp() {
  return (
    <LoyaltyBayProvider>
      <ToastProvider>
        <ToastContainer />
        <ClassicLayout title="Loyalty Points">
          <LedgerAdmin />
        </ClassicLayout>
      </ToastProvider>
    </LoyaltyBayProvider>
  );
}

export default AdminApp;
