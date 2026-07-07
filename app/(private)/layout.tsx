import { redirect } from "next/navigation";
import Image from "next/image";

import type { PrivateLayoutProps } from "@/definitions";
import { Button } from "@/components/ui/button";
import { getPrivateLayoutView } from "@/lib/views/privateLayoutView";

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
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
        <Image
          src="/assets/brand/money-juggle-logo.png"
          alt="Money Juggle"
          width={40}
          height={41}
          priority
        />
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
