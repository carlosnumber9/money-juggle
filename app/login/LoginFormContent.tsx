"use client";

import type { KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { LoginView } from "@/definitions";

type LoginFormContentProps = {
  view: LoginView;
};

export function LoginFormContent({ view }: LoginFormContentProps) {
  const { pending } = useFormStatus();

  if (pending) {
    return (
      <div
        className="flex min-h-40 w-full items-center justify-center"
        aria-busy="true"
      >
        <Spinner className="size-8" />
      </div>
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "Enter" ||
      event.repeat ||
      event.nativeEvent.isComposing ||
      !(event.target instanceof HTMLInputElement)
    ) {
      return;
    }

    const form = event.currentTarget.closest("form");

    if (!form) {
      return;
    }

    event.preventDefault();

    if (form.reportValidity()) {
      form.requestSubmit();
    }
  }

  return (
    <div className="grid w-full gap-4" onKeyDown={handleKeyDown}>
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

      {!view.isDemo ? (
        <>
          <label className="sr-only" htmlFor="password">
            Contraseña
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            required
          />
        </>
      ) : null}

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
        {view.isDemo ? "Entrar en demo" : "Iniciar sesión"}
      </Button>
    </div>
  );
}
