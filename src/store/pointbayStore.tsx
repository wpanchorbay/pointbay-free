import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import apiFetch from "@wordpress/api-fetch";
import { PointBayStore, PluginSettings } from "../utils/types";
import { date, getSettings as getDateSettings } from "@wordpress/date";

interface PointBayStoreContextType {
  store: PointBayStore;
  updateStore: <K extends keyof PointBayStore>(
    key: K,
    value: PointBayStore[K],
  ) => void;
  updateSettings: <K extends keyof PluginSettings>(
    key: K,
    value: PluginSettings[K],
  ) => void;
  serverDate: Date;
  serverDateLoaded: boolean;
}

const PointBayStoreContext = createContext<PointBayStoreContextType | null>(null);

declare const pointbay_Localize: PointBayStore;

export const PointBayProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const initialValue: PointBayStore =
    typeof pointbay_Localize !== "undefined"
      ? pointbay_Localize
      : ({} as PointBayStore);

  const [store, setStore] = useState<PointBayStore>(initialValue);
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

  const updateStore = <K extends keyof PointBayStore>(
    key: K,
    value: PointBayStore[K],
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

  const contextValue: PointBayStoreContextType = {
    store,
    updateStore,
    updateSettings,
    serverDate,
    serverDateLoaded,
  };

  return (
    <PointBayStoreContext.Provider value={contextValue}>
      {children}
    </PointBayStoreContext.Provider>
  );
};

export const usePointBayStore = (): PointBayStore => {
  const context = useContext(PointBayStoreContext);

  if (!context) {
    throw new Error("usePointBayStore must be used within a PointBayProvider");
  }

  return context.store;
};

export const usePointBayStoreActions = () => {
  const context = useContext(PointBayStoreContext);

  if (!context) {
    throw new Error("usePointBayStoreActions must be used within a PointBayProvider");
  }

  return {
    store: context.store,
    updateStore: context.updateStore,
    updateSettings: context.updateSettings,
    serverDate: context.serverDate,
    serverDateLoaded: context.serverDateLoaded,
  };
};

export default PointBayStoreContext;
