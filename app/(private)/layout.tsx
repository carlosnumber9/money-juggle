import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PrivateLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isEmailAllowed(user.email)) {
    redirect("/auth/sign-out?status=not-allowed");
  }

  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 pt-6">
        <p className="text-sm text-muted-foreground">
          Sesión iniciada como{" "}
          <span className="font-medium text-foreground">{user.email}</span>
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
