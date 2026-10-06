"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { HomeTab } from "@/definitions";

export function HomeTabs({
  selectedTab,
  children
}: {
  selectedTab: HomeTab;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <Tabs
      value={selectedTab}
      onValueChange={(tab) => {
        if (tab === selectedTab) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", String(tab));
        router.push(`${pathname}?${params}`, { scroll: false });
      }}
    >
      {children}
    </Tabs>
  );
}
