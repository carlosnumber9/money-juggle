import Image from "next/image";

import type { LoginPageProps } from "@/definitions";
import { signInWithPassword } from "@/lib/auth/signInWithPassword";
import { getLoginView } from "@/lib/views/loginView";

import { LoginFormContent } from "./LoginFormContent";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { status } = await searchParams;
  const view = getLoginView({ status });

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

        <form action={signInWithPassword} className="w-full">
          <LoginFormContent view={view} />
        </form>
      </section>
    </main>
  );
}
