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
  controlsTarget: HTMLDivElement | null;
  setControlsTarget: (target: HTMLDivElement | null) => void;
};

const SyncActivityContext = createContext<SyncActivityContextValue | null>(
  null
);

export function SyncActivityProvider({ children }: { children: ReactNode }) {
  const activeCountRef = useRef(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [controlsTarget, setControlsTarget] = useState<HTMLDivElement | null>(
    null
  );
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
    () => ({ isSyncing, beginSync, controlsTarget, setControlsTarget }),
    [beginSync, isSyncing, controlsTarget]
  );

  return (
    <SyncActivityContext.Provider value={value}>
      {children}
    </SyncActivityContext.Provider>
  );
}

export function SyncControlsSlot() {
  const { setControlsTarget } = useSyncActivity();
  return <div ref={setControlsTarget} className="min-w-0" />;
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
