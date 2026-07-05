import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
import { hasAllowedEmails, isEmailAllowed } from "@/lib/auth/allowlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/url/request-origin";

type LoginPageProps = {
  searchParams: Promise<{
    email?: string;
    status?: string;
  }>;
};

async function requestMagicLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/login?status=missing-email");
  }

  if (!hasAllowedEmails()) {
    redirect("/login?status=allowlist-missing");
  }

  if (!isEmailAllowed(email)) {
    redirect("/login?status=not-allowed");
  }

  const headerStore = await headers();
  const origin = getRequestOrigin(headerStore);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: false
    }
  });

  if (error) {
    if (isEmailRateLimitError(error)) {
      redirect("/login?status=email-rate-limit");
    }

    redirect("/login?status=error");
  }

  redirect(`/login?status=sent&email=${encodeURIComponent(email)}`);
}

function isEmailRateLimitError(error: { message: string; status?: number }) {
  const message = error.message.toLowerCase();

  return (
    error.status === 429 ||
    message.includes("rate limit") ||
    message.includes("email rate") ||
    message.includes("smtp")
  );
}

function getStatusMessage(status?: string, email?: string) {
  if (status === "sent") {
    return {
      tone: "success",
      text: email
        ? `Te hemos enviado un enlace mágico a ${email}.`
        : "Te hemos enviado un enlace mágico."
    };
  }

  if (status === "missing-email") {
    return {
      tone: "error",
      text: "Introduce tu email para recibir el enlace mágico."
    };
  }

  if (status === "allowlist-missing") {
    return {
      tone: "error",
      text: "Configura ALLOWED_EMAILS en .env.local antes de pedir enlaces mágicos."
    };
  }

  if (status === "not-allowed") {
    return {
      tone: "error",
      text: "Este email no está autorizado para acceder a money-juggle."
    };
  }

  if (status === "signed-out") {
    return {
      tone: "success",
      text: "Has cerrado sesión correctamente."
    };
  }

  if (status === "callback-error") {
    return {
      tone: "error",
      text: "El enlace no se ha podido validar. Pide un enlace nuevo e inténtalo de nuevo."
    };
  }

  if (status === "email-rate-limit") {
    return {
      tone: "error",
      text: "Supabase ha limitado temporalmente el envío de emails con su SMTP por defecto. Espera unos minutos o configura un proveedor SMTP propio."
    };
  }

  if (status === "error") {
    return {
      tone: "error",
      text: "No se ha podido enviar el enlace. Revisa que el usuario exista en Supabase y vuelve a intentarlo."
    };
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { email, status } = await searchParams;
  const message = getStatusMessage(status, email);

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

            {message ? (
              <p
                className={
                  message.tone === "success"
                    ? "text-sm text-foreground"
                    : "text-sm text-destructive"
                }
                role="status"
              >
                {message.text}
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
