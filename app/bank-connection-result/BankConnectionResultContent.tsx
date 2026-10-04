"use client";

import { useEffect } from "react";
import Image from "next/image";
import { CircleCheckIcon, CircleXIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import type { BankConnectionResult } from "./result";

export function BankConnectionResultContent({
  result,
  reviewUrl
}: {
  result: BankConnectionResult;
  reviewUrl?: string;
}) {
  useEffect(() => {
    if (!result.success) return;
    const timeout = window.setTimeout(() => window.close(), 750);

    return () => window.clearTimeout(timeout);
  }, [result.success]);

  const ResultIcon = result.success ? CircleCheckIcon : CircleXIcon;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <section
        className="grid w-full max-w-sm justify-items-center gap-6 text-center"
        aria-labelledby="bank-connection-result-title"
        aria-live="polite"
      >
        <Image
          src="/assets/brand/money-juggle-logo.png"
          alt=""
          width={88}
          height={90}
          priority
        />
        <ResultIcon
          className={
            result.success ? "size-12 text-primary" : "size-12 text-destructive"
          }
          aria-hidden
        />
        <div className="grid gap-3">
          <h1
            id="bank-connection-result-title"
            className="text-2xl font-semibold"
          >
            {result.title}
          </h1>
          <p className="text-muted-foreground">{result.message}</p>
          {reviewUrl ? (
            <Link href={reviewUrl} className="text-primary underline">
              Revisar correspondencia de cuentas
            </Link>
          ) : null}
          {!result.success ? (
            <>
              <Link href="/" className="text-primary underline">
                Volver al panel
              </Link>
              <Button variant="outline" onClick={() => window.close()}>
                Cerrar ventana
              </Button>
            </>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {result.success
              ? "Si esta ventana no se cierra sola, vuelve a Money Juggle desde su icono de la pantalla de inicio. La conexión se actualizará al abrir la app."
              : "Esta ventana permanecerá abierta para que puedas revisar el resultado."}
          </p>
        </div>
      </section>
    </main>
  );
}
