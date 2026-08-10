import { __ } from "@wordpress/i18n";
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
        {/* LedgerAdmin renders its own "Points History" <h1>, so the layout must not add a second one. */}
        <ClassicLayout
          title={__("Loyalty Points", "pointbay-loyalty-points-referral-rewards-woo")}
          showTitle={false}
        >
          <LedgerAdmin />
        </ClassicLayout>
      </ToastProvider>
    </PointBayProvider>
  );
}

export default AdminApp;
