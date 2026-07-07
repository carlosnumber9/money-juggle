import Image from "next/image";

import type { LoginPageProps } from "@/definitions";
import { requestMagicLink } from "@/lib/auth/requestMagicLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginView } from "@/lib/views/loginView";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { email, status } = await searchParams;
  const view = getLoginView({ email, status });

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <section
        className="grid w-full max-w-sm justify-items-center gap-8"
        aria-labelledby="login-title"
      >
        <div className="grid justify-items-center gap-3">
          <Image
            src="/assets/brand/money-juggle-logo.png"
            alt=""
            width={112}
            height={114}
            priority
          />
          <h1 id="login-title" className="text-3xl font-semibold">
            Money Juggle
          </h1>
        </div>

        <form
          action={requestMagicLink}
          className="grid w-full gap-4"
          noValidate={view.isDemo}
        >
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type={view.isDemo ? "text" : "email"}
            autoComplete="email"
            placeholder="Email"
            required={!view.isDemo}
          />

          {view.message ? (
            <p
              className={
                view.message.tone === "success"
                  ? "text-center text-sm text-foreground"
                  : "text-center text-sm text-destructive"
              }
              role="status"
            >
              {view.message.text}
            </p>
          ) : null}

          <Button type="submit" className="w-full">
            {view.isDemo ? "Entrar en demo" : "Enviar enlace"}
          </Button>
        </form>
      </section>
    </main>
  );
}
