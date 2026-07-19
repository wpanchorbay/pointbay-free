import LedgerAdmin from "./pages/LedgerAdmin";
import { WpabProvider } from "./store/wpabStore";
import { ToastProvider } from "./store/toast/use-toast";
import { ToastContainer } from "./components/common/ToastContainer";
import { ClassicLayout } from "./components/classics";

function AdminApp() {
  return (
    <WpabProvider>
      <ToastProvider>
        <ToastContainer />
        <ClassicLayout title="Loyalty Points">
          <LedgerAdmin />
        </ClassicLayout>
      </ToastProvider>
    </WpabProvider>
  );
}

export default AdminApp;
