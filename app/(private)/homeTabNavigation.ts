import type { HomeTab } from "@/definitions";

export function createHomeTabNavigation(selectedTab: HomeTab) {
  let snapshot = { selectedTab, loading: false };
  const listeners = new Set<() => void>();
  const update = (tab: HomeTab, loading: boolean) => {
    if (snapshot.selectedTab === tab && snapshot.loading === loading) return;
    snapshot = { selectedTab: tab, loading };
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    select(tab: unknown): tab is HomeTab {
      if (
        (tab !== "dashboard" &&
          tab !== "transactions" &&
          tab !== "evolution") ||
        snapshot.loading ||
        tab === snapshot.selectedTab
      )
        return false;
      update(tab, true);
      return true;
    },
    synchronize(tab: HomeTab, pending: boolean) {
      // A settled transition also restores the server tab after interruption.
      if (!pending) update(tab, false);
    }
  };
}
