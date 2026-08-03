"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

type SyncActivityContextValue = {
  isSyncing: boolean;
  beginSync: () => () => void;
};

const SyncActivityContext = createContext<SyncActivityContextValue | null>(
  null
);

export function SyncActivityProvider({ children }: { children: ReactNode }) {
  const activeCountRef = useRef(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const beginSync = useCallback(() => {
    let finished = false;

    activeCountRef.current += 1;
    setIsSyncing(true);

    return () => {
      if (finished) {
        return;
      }

      finished = true;
      activeCountRef.current = Math.max(0, activeCountRef.current - 1);
      setIsSyncing(activeCountRef.current > 0);
    };
  }, []);
  const value = useMemo(
    () => ({ isSyncing, beginSync }),
    [beginSync, isSyncing]
  );

  return (
    <SyncActivityContext.Provider value={value}>
      {children}
    </SyncActivityContext.Provider>
  );
}

export function useSyncActivity() {
  const value = useContext(SyncActivityContext);

  if (!value) {
    throw new Error(
      "useSyncActivity must be used inside SyncActivityProvider."
    );
  }

  return value;
}
