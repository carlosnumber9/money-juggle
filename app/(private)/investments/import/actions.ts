"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PortfolioImportState } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import {
  confirmPortfolioImport,
  getPortfolioSnapshotForDate,
  PortfolioImportError
} from "@/lib/db/portfolio/imports";
import {
  validatePortfolioValues,
  PortfolioValidationError
} from "@/lib/domain/portfolio/values";

const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function confirmPortfolioImportAction(
  _previous: PortfolioImportState,
  form: FormData
): Promise<PortfolioImportState> {
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed)
    return { error: "Inicia sesión con una cuenta autorizada para guardar." };
  const draftId = String(form.get("draftId") ?? "");
  const expectedRevision = String(form.get("expectedRevision") ?? "") || null;
  if (
    !UUID.test(draftId) ||
    (expectedRevision !== null && !UUID.test(expectedRevision))
  )
    return { error: "La importación no es válida." };
  let reportDate = "";
  try {
    const raw = String(form.get("values") ?? "");
    if (raw.length > 400_000)
      return { error: "Demasiados datos para importar." };
    const values = validatePortfolioValues(JSON.parse(raw));
    reportDate = values.reportDate;
    if (form.get("reviewedDate") !== reportDate) {
      const existing = await getPortfolioSnapshotForDate(user.id, reportDate);
      return {
        error: "Has cambiado la fecha. Revisa los datos y confirma de nuevo.",
        existing,
        reviewedDate: reportDate
      };
    }
    await confirmPortfolioImport({
      draftId,
      values,
      expectedRevision,
      replace: form.get("replace") === "on"
    });
  } catch (error) {
    if (error instanceof PortfolioImportError && error.reason === "conflict") {
      try {
        return {
          error:
            "Ya existe una foto o ha cambiado durante la revisión. Comprueba el aviso y confirma de nuevo.",
          existing: await getPortfolioSnapshotForDate(user.id, reportDate),
          reviewedDate: reportDate
        };
      } catch {
        return {
          error: "No se pudo actualizar la revisión. Inténtalo de nuevo."
        };
      }
    }
    if (error instanceof PortfolioImportError && error.reason === "expired")
      return { error: "La revisión ha caducado. Vuelve a subir el PDF." };
    if (
      error instanceof PortfolioValidationError ||
      error instanceof SyntaxError
    )
      return {
        error:
          "Revisa fechas, ISIN y números. Usa hasta seis decimales; la fecha de cotización no puede superar la del informe."
      };
    return { error: "No se pudo guardar la foto. Inténtalo de nuevo." };
  }
  revalidatePath("/");
  revalidatePath("/investments/import");
  redirect("/?tab=investments");
}
