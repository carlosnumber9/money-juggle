"use client";

import { InitialLoadCheckpoint } from "./InitialLoadProvider";
import { Button } from "@/components/ui/button";

export default function PrivatePageError() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6">
      <InitialLoadCheckpoint phase="mounted" />
      <p role="alert">No se pudo cargar el panel</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Reintentar
      </Button>
    </main>
  );
}
