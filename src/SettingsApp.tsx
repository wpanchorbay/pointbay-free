import { PointBayProvider } from "./store/pointbayStore";
import { ToastProvider } from "./store/toast/use-toast";
import Settings from "./pages/Settings";
import { ToastContainer } from "./components/common/ToastContainer";

function SettingsApp() {
  return (
    <PointBayProvider>
      <ToastProvider>
        <ToastContainer />
        <div className="">
           <Settings />
        </div>
      </ToastProvider>
    </PointBayProvider>
  );
}

export default SettingsApp;
