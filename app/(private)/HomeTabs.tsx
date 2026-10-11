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
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  ChartPie,
  Settings
} from "lucide-react";
import { useTabMagnification } from "./HomeTabs/useTabMagnification";
import type { HomeTab } from "@/definitions";
import { LoadingOverlay } from "./LoadingOverlay";
import { createHomeTabNavigation } from "./homeTabNavigation";

const sections = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "transactions", label: "Transacciones", icon: ArrowLeftRight },
  { value: "evolution", label: "Evolución", icon: ChartNoAxesCombined },
  { value: "investments", label: "Inversiones", icon: ChartPie },
  { value: "settings", label: "Configuración", icon: Settings }
] as const;

export function HomeTabs({
  selectedTab,
  status,
  children
}: {
  selectedTab: HomeTab;
  status: ReactNode;
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
  const tabsRef = useTabMagnification(loading);

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
      <div className="flex min-w-0 items-center gap-2">
        {status}
        <TabsList
          ref={tabsRef}
          aria-label="Secciones de tus cuentas"
          aria-busy={loading}
          className="h-11 gap-1 md:h-10 md:gap-1 [&_[data-slot=tabs-indicator]]:hidden md:[&_[data-slot=tabs-indicator]]:block"
        >
          {sections.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              aria-label={label}
              disabled={loading && activeTab !== value}
              className="h-11 w-11 border-0 bg-transparent px-0 shadow-none md:h-10 md:w-auto md:px-4"
            >
              <span
                data-tab-content
                className="inline-flex origin-center items-center justify-center"
              >
                <Icon className="size-7 md:hidden" aria-hidden />
                <span className="hidden md:inline">{label}</span>
              </span>
            </TabsTrigger>
          ))}
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
