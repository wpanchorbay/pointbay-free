import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import apiFetch from "@wordpress/api-fetch";
import { LoyaltyBayStore, PluginSettings } from "../utils/types";
import { date, getSettings as getDateSettings } from "@wordpress/date";

interface LoyaltyBayStoreContextType {
  store: LoyaltyBayStore;
  updateStore: <K extends keyof LoyaltyBayStore>(
    key: K,
    value: LoyaltyBayStore[K],
  ) => void;
  updateSettings: <K extends keyof PluginSettings>(
    key: K,
    value: PluginSettings[K],
  ) => void;
  serverDate: Date;
  serverDateLoaded: boolean;
}

const LoyaltyBayStoreContext = createContext<LoyaltyBayStoreContextType | null>(null);

declare const loyaltybay_Localize: LoyaltyBayStore;

export const LoyaltyBayProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const initialValue: LoyaltyBayStore =
    typeof loyaltybay_Localize !== "undefined"
      ? loyaltybay_Localize
      : ({} as LoyaltyBayStore);

  const [store, setStore] = useState<LoyaltyBayStore>(initialValue);
  const isInitialized = useRef(false);

  const [serverDate, setServerDate] = useState(new Date());
  const [serverDateLoaded, setServerDateLoaded] = useState<boolean>(false);

  const { timezone } = getDateSettings();
  useEffect(() => {
    const updateServerTime = () => {
      const format = `${store.wpSettings?.dateFormat} ${store.wpSettings?.timeFormat}`;
      const localNow = new Date();
      const dateString = date(format, localNow, timezone?.offset);
      const d = new Date(dateString);

      if (!isNaN(d.getTime())) {
        setServerDate(d);
        if (!serverDateLoaded) {
          setServerDateLoaded(true);
        }
      }
    };

    updateServerTime();
    const timer = setInterval(updateServerTime, 60000);
    return () => clearInterval(timer);
  }, [store.wpSettings, timezone]);

  // Setup API fetch middleware only once
  useEffect(() => {
    if (!isInitialized.current) {
      apiFetch.use(apiFetch.createNonceMiddleware(initialValue.nonce));
      apiFetch.use(apiFetch.createRootURLMiddleware(initialValue.rest_url));
      isInitialized.current = true;
    }
  }, [initialValue.nonce, initialValue.rest_url]);

  const updateStore = <K extends keyof LoyaltyBayStore>(
    key: K,
    value: LoyaltyBayStore[K],
  ) => {
    setStore((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateSettings = <K extends keyof PluginSettings>(
    key: K,
    value: PluginSettings[K],
  ) => {
    setStore((prev) => ({
      ...prev,
      plugin_settings: {
        ...prev.plugin_settings,
        [key]: value,
      },
    }));
  };

  const contextValue: LoyaltyBayStoreContextType = {
    store,
    updateStore,
    updateSettings,
    serverDate,
    serverDateLoaded,
  };

  return (
    <LoyaltyBayStoreContext.Provider value={contextValue}>
      {children}
    </LoyaltyBayStoreContext.Provider>
  );
};

export const useLoyaltyBayStore = (): LoyaltyBayStore => {
  const context = useContext(LoyaltyBayStoreContext);

  if (!context) {
    throw new Error("useLoyaltyBayStore must be used within a LoyaltyBayProvider");
  }

  return context.store;
};

export const useLoyaltyBayStoreActions = () => {
  const context = useContext(LoyaltyBayStoreContext);

  if (!context) {
    throw new Error("useLoyaltyBayStoreActions must be used within a LoyaltyBayProvider");
  }

  return {
    store: context.store,
    updateStore: context.updateStore,
    updateSettings: context.updateSettings,
    serverDate: context.serverDate,
    serverDateLoaded: context.serverDateLoaded,
  };
};

export default LoyaltyBayStoreContext;
