import { redirect } from "next/navigation";

import type { LoginPageProps } from "@/definitions";
import { requestMagicLink } from "@/lib/auth/request-magic-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLoginView } from "@/lib/views/login-view";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { email, status } = await searchParams;
  const view = getLoginView({ email, status });

  if (view.isDemo) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-[72px] max-sm:px-[18px] max-sm:py-12">
      <section className="max-w-3xl" aria-labelledby="login-title">
        <p className="mb-4 text-sm font-bold tracking-widest text-primary uppercase">
          money-juggle
        </p>
        <h1
          id="login-title"
          className="max-w-2xl text-4xl leading-none sm:text-6xl"
        >
          Accede con tu email.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Te enviaremos un enlace mágico para entrar sin contraseña. Por ahora,
          el usuario debe existir previamente en Supabase.
        </p>
      </section>

      <Card className="mt-14 max-w-xl" aria-labelledby="login-card-title">
        <CardHeader>
          <CardTitle id="login-card-title">Enlace mágico</CardTitle>
          <CardDescription>
            Introduce el email autorizado para solicitar el acceso.
          </CardDescription>
        </CardHeader>
        <form action={requestMagicLink}>
          <CardContent className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium" htmlFor="email">
              Email
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                required
              />
            </label>

            {view.message ? (
              <p
                className={
                  view.message.tone === "success"
                    ? "text-sm text-foreground"
                    : "text-sm text-destructive"
                }
                role="status"
              >
                {view.message.text}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit">Enviar enlace</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
