import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getPrivateLayoutView } from "@/lib/views/private-layout-view";

export default async function PrivateLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const view = await getPrivateLayoutView();

  if (view.kind === "unauthenticated") {
    redirect("/login");
  }

  if (view.kind === "forbidden") {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 pt-6">
        <p className="text-sm text-muted-foreground">
          {view.isDemo ? "Modo demo local como " : "Sesión iniciada como "}
          <span className="font-medium text-foreground">{view.user.email}</span>
        </p>
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="outline" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </header>
      {children}
    </>
  );
}
