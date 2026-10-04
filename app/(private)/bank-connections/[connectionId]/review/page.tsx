import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBankAccountReviewView } from "@/lib/views/bankAccountReviewView";
import { confirmAccountReview } from "./actions";

export default async function BankAccountReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { connectionId } = await params;
  const { status } = await searchParams;
  const review = /^[0-9a-f-]{36}$/i.test(connectionId)
    ? await getBankAccountReviewView(connectionId)
    : null;
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">
        Revisar cuentas{review ? ` de ${review.institutionName}` : ""}
      </h1>
      {!review ? (
        <p>
          Este intento ya no está disponible. Vuelve al panel e inicia de nuevo
          la reconexión.
        </p>
      ) : (
        <>
          <p>
            El banco ha autorizado el acceso. Necesitamos que identifiques qué
            cuenta guardada corresponde a cada cuenta autorizada para conservar
            su histórico.
          </p>
          <p className="text-sm text-muted-foreground">
            Esta revisión está disponible hasta 15 minutos desde la
            autorización. Si no puedes distinguir las cuentas con seguridad,
            vuelve al panel y autoriza solo una cuenta cada vez.
          </p>
          {status ? (
            <p role="alert" className="text-destructive">
              No se pudo guardar la correspondencia. Revisa que cada cuenta
              guardada se utilice una sola vez y que las selecciones sean
              correctas. Si el intento ha caducado, reconecta desde el panel.
            </p>
          ) : null}
          <form action={confirmAccountReview} className="grid gap-6">
            <input type="hidden" name="connectionId" value={connectionId} />
            <input type="hidden" name="reviewId" value={review.reviewId} />
            {review.returnedAccounts.map((account, index) => (
              <label key={index} className="grid gap-2">
                <span className="font-medium">
                  {account.name} · {account.currency}
                  {account.ibanLast4
                    ? ` · termina en ${account.ibanLast4}`
                    : ""}
                </span>
                <select
                  name="accountMatch"
                  required
                  defaultValue=""
                  className="h-10 w-full border border-input bg-background px-3 text-sm"
                >
                  <option value="" disabled>
                    Selecciona la cuenta guardada correspondiente
                  </option>
                  {review.storedAccounts.map((stored) => (
                    <option key={stored.id} value={stored.id}>
                      {stored.name} · {stored.currency}
                      {stored.ibanLast4
                        ? ` · termina en ${stored.ibanLast4}`
                        : ""}
                    </option>
                  ))}
                  <option value="new">
                    Es una cuenta nueva, sin histórico guardado
                  </option>
                </select>
              </label>
            ))}
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="confirmed"
                required
                className="mt-1"
              />
              Confirmo que he comprobado la correspondencia. Las cuentas
              guardadas que no seleccione conservarán su histórico y quedarán
              inactivas.
            </label>
            <Button type="submit">Guardar correspondencia y reconectar</Button>
          </form>
        </>
      )}
      <Link href="/" className="text-primary underline">
        Volver al panel
      </Link>
    </main>
  );
}
