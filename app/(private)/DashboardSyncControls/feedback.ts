import type { SyncResponse, SyncFeedback } from "@/definitions";

export type SyncOperation = "refresh" | "backfill";
export type SyncNotice = {
  tone: "error" | "warning" | "info";
  message: string;
};

export const NETWORK_SYNC_FAILURE: SyncResponse = {
  hasErrors: true,
  incomplete: false,
  retryPending: false,
  feedback: []
};

export function resolveTransactionFeedback(
  previous: SyncResponse | null,
  completedBanks: string[]
): SyncResponse | null {
  if (!previous?.feedback.length || completedBanks.length === 0)
    return previous;
  const feedback = previous.feedback.filter(
    (issue) =>
      issue.resource !== "transactions" ||
      !completedBanks.includes(issue.bankName)
  );
  return {
    ...previous,
    feedback,
    hasErrors: feedback.some((issue) => issue.kind === "error"),
    incomplete: feedback.some((issue) => issue.kind === "partial"),
    retryPending: feedback.some((issue) => issue.kind === "deferred")
  };
}

export function getSyncNotices(
  result: SyncResponse | null,
  operation: SyncOperation
): SyncNotice[] {
  if (!result) return [];
  const notices: SyncNotice[] = result.feedback.map((issue) => ({
    tone:
      issue.kind === "error"
        ? "error"
        : issue.kind === "partial"
          ? "warning"
          : "info",
    message: getIssueMessage(issue, operation)
  }));
  if (
    result.hasErrors &&
    !result.feedback.some((issue) => issue.kind === "error")
  )
    notices.push({
      tone: "error",
      message:
        operation === "backfill"
          ? "No se pudo importar el historial de movimientos. Los datos guardados se conservan."
          : "No se pudo completar la actualización. Los datos guardados se conservan."
    });
  if (
    result.incomplete &&
    !result.feedback.some((issue) => issue.kind === "partial")
  )
    notices.push({
      tone: "warning",
      message:
        operation === "backfill"
          ? "El historial de movimientos está incompleto. Los datos recibidos se han guardado."
          : "La descarga de movimientos está incompleta. Los datos recibidos se han guardado."
    });
  if (
    result.retryPending &&
    !result.feedback.some((issue) => issue.kind === "deferred" || issue.retryAt)
  )
    notices.push({
      tone: "info",
      message: "Hay descargas aplazadas. Espera antes de volver a actualizar."
    });
  if (result.syncInProgress)
    notices.push({
      tone: "info",
      message:
        "Otra actualización sigue en curso. Vuelve a actualizar cuando termine."
    });
  return notices;
}

function getIssueMessage(issue: SyncFeedback, operation: SyncOperation) {
  const resource =
    issue.resource === "balances"
      ? "los saldos"
      : operation === "backfill"
        ? "el historial de movimientos"
        : "los movimientos";
  const retry = getRetryMessage(issue.retryAt);
  if (issue.kind === "error") {
    const fullResource =
      issue.resource === "balances"
        ? "todos los saldos"
        : operation === "backfill"
          ? "todo el historial de movimientos"
          : "todos los movimientos";
    return `No se pudieron actualizar ${fullResource} de ${issue.bankName}. Los datos guardados se conservan.${retry}`;
  }
  if (issue.kind === "partial")
    return `La descarga de ${resource} de ${issue.bankName} está incompleta. Los datos recibidos se han guardado; puede faltar información.${retry}`;
  return `La actualización de ${resource} de ${issue.bankName} está aplazada tras un intento anterior.${retry || " Espera antes de reintentar."}`;
}

function getRetryMessage(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  const time = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
  return ` Puedes reintentar a partir del ${time}.`;
}
