import { Suspense } from "react";

import {
  InitialLoadProvider,
  InitialLoadCheckpoint
} from "./InitialLoadProvider";

import { redirect } from "next/navigation";

import type { PrivateLayoutProps } from "@/definitions";
import { Button } from "@/components/ui/button";
import { getPrivateLayoutView } from "@/lib/views/privateLayoutView";

import { PrivateQueryProvider, PrivateSignOut } from "./PrivateQueryProvider";

import { SyncActivityProvider } from "./SyncActivityProvider";
import { SyncingAppLogo } from "./SyncingAppLogo";

// The streamed shell must resolve the real cookie-backed session per request.
export const dynamic = "force-dynamic";

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return (
    <InitialLoadProvider>
      <Suspense fallback={null}>
        <AuthenticatedPrivateLayout>{children}</AuthenticatedPrivateLayout>
      </Suspense>
    </InitialLoadProvider>
  );
}

async function AuthenticatedPrivateLayout({ children }: PrivateLayoutProps) {
  const view = await getPrivateLayoutView();

  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <PrivateQueryProvider key={view.user.id} userId={view.user.id}>
      <SyncActivityProvider>
        <InitialLoadCheckpoint phase="layout" />
        <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 pt-6">
          <SyncingAppLogo />
          <PrivateSignOut>
            <Button type="submit" variant="outline" size="sm">
              Cerrar sesión
            </Button>
          </PrivateSignOut>
        </header>
        {children}
      </SyncActivityProvider>
    </PrivateQueryProvider>
  );
}
