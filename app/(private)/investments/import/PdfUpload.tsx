"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PdfUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const file = new FormData(event.currentTarget).get("pdf");
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > 4 * 1024 * 1024
        ) {
          setError("Selecciona un PDF de hasta 4 MiB.");
          return;
        }
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/investments/imports/preview", {
            method: "POST",
            headers: { "Content-Type": "application/pdf" },
            body: file
          });
          const result = await response.json();
          if (!response.ok || typeof result.reviewUrl !== "string") {
            setError(result.reason ?? "No se pudo preparar la importación.");
            setBusy(false);
            return;
          }
          router.push(result.reviewUrl);
        } catch {
          setError("No se pudo subir el PDF. Inténtalo de nuevo.");
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-2">
        <span>Extracto de patrimonio neto</span>
        <Input
          type="file"
          name="pdf"
          accept="application/pdf,.pdf"
          required
          disabled={busy}
        />
      </label>
      <p className="text-sm text-muted-foreground">
        PDF en EUR de Trade Republic. Máximo 4 MiB y 20 páginas. El archivo se
        descarta después de leer los datos.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="justify-self-start">
        {busy ? "Leyendo PDF…" : "Leer y revisar"}
      </Button>
    </form>
  );
}
