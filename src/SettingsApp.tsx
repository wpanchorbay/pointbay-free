import { LoyaltyBayProvider } from "./store/loyaltybayStore";
import { ToastProvider } from "./store/toast/use-toast";
import Settings from "./pages/Settings";
import { ToastContainer } from "./components/common/ToastContainer";

function SettingsApp() {
  return (
    <LoyaltyBayProvider>
      <ToastProvider>
        <ToastContainer />
        <div className="">
           <Settings />
        </div>
      </ToastProvider>
    </LoyaltyBayProvider>
  );
}

export default SettingsApp;
