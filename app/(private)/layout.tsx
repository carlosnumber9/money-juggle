import { redirect } from "next/navigation";

import type { PrivateLayoutProps } from "@/definitions";
import { Button } from "@/components/ui/button";
import { getPrivateLayoutView } from "@/lib/views/privateLayoutView";

import { SyncActivityProvider } from "./SyncActivityProvider";
import { SyncingAppLogo } from "./SyncingAppLogo";

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const view = await getPrivateLayoutView();

  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <SyncActivityProvider>
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 pt-6">
        <SyncingAppLogo />
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="outline" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </header>
      {children}
    </SyncActivityProvider>
  );
}
