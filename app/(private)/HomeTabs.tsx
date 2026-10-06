"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HomeTab } from "@/definitions";
import { LoadingOverlay } from "./LoadingOverlay";
import { createHomeTabNavigation } from "./homeTabNavigation";

export function HomeTabs({
  selectedTab,
  heading,
  children
}: {
  selectedTab: HomeTab;
  heading: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [navigation] = useState(() => createHomeTabNavigation(selectedTab));
  const snapshot = useSyncExternalStore(
    navigation.subscribe,
    navigation.getSnapshot,
    navigation.getSnapshot
  );
  useEffect(() => {
    navigation.synchronize(selectedTab, isPending);
  }, [navigation, selectedTab, isPending]);
  const loading = snapshot.loading;
  const activeTab = loading ? snapshot.selectedTab : selectedTab;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(tab) => {
        if (!navigation.select(tab)) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        startTransition(() => {
          router.push(`${pathname}?${params}`, { scroll: false });
        });
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {heading}
        <TabsList aria-label="Secciones de tus cuentas" aria-busy={loading}>
          <TabsTrigger
            value="dashboard"
            disabled={loading && activeTab !== "dashboard"}
          >
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            disabled={loading && activeTab !== "transactions"}
          >
            Transacciones
          </TabsTrigger>
          <TabsTrigger
            value="evolution"
            disabled={loading && activeTab !== "evolution"}
          >
            Evolución
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value={activeTab}
        className={activeTab === "dashboard" ? "mt-0" : undefined}
      >
        <LoadingOverlay
          loading={loading}
          label="Contenido de la sección"
          loadingLabel="Cargando sección"
        >
          {loading ? null : children}
        </LoadingOverlay>
      </TabsContent>
    </Tabs>
  );
}
