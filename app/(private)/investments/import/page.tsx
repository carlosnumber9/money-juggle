import Link from "next/link";
import { getPortfolioImportView } from "@/lib/views/portfolioImportView";
import { PdfUpload } from "./PdfUpload";
import { PortfolioReview } from "./PortfolioReview";

export default async function PortfolioImportPage({
  searchParams
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft } = await searchParams;
  let review = null;
  let failed = false;
  if (draft) {
    try {
      review = await getPortfolioImportView(draft);
    } catch {
      failed = true;
    }
  }
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-6 py-10">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          {review
            ? "Paso 2 de 2 · Revisar y confirmar"
            : "Paso 1 de 2 · Subir PDF"}
        </p>
        <h1 className="text-2xl font-semibold">Importar portfolio</h1>
      </div>
      {review ? (
        <PortfolioReview key={review.draft.id} review={review} />
      ) : (
        <>
          {draft && (
            <p role="alert" className="text-sm text-destructive">
              {failed
                ? "No se pudo cargar la revisión. Inténtalo de nuevo."
                : "Esta revisión ha caducado o ya se confirmó. Puedes subir otro PDF."}
            </p>
          )}
          <PdfUpload />
        </>
      )}
      <Link href="/?tab=investments" className="text-sm text-primary underline">
        Volver a Inversiones
      </Link>
    </main>
  );
}
