"use server";

import { revalidatePath } from "next/cache";

import type {
  Result,
  SaveTransactionReconciliationInput,
  SaveTransactionReconciliationResult,
  TransactionReconciliationCandidateCursor,
  TransactionReconciliationCandidatePage,
  TransactionReconciliationDetail
} from "@/definitions";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import {
  deleteTransactionReconciliation,
  getTransactionReconciliationDetail,
  saveTransactionReconciliation,
  searchTransactionReconciliationCandidates
} from "@/lib/db/transactionReconciliations";
import {
  isUuid,
  isValidSaveTransactionReconciliationInput
} from "@/lib/domain/reconciliations";
import { isValidReportingDate } from "@/lib/domain/transactionDates";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

export async function searchReconciliationCandidatesAction(input: {
  currency: string;
  query: string;
  cursor: TransactionReconciliationCandidateCursor | null;
  reconciliationId: string | null;
}): Promise<Result<TransactionReconciliationCandidatePage>> {
  if (
    !/^[A-Z]{3}$/.test(input.currency) ||
    input.query.length > 200 ||
    (input.reconciliationId !== null && !isUuid(input.reconciliationId)) ||
    (input.cursor !== null &&
      (!isUuid(input.cursor.id) ||
        !isValidReportingDate(input.cursor.reportingDate)))
  ) {
    return { ok: false, reason: "La búsqueda no es válida." };
  }

  const user = await getAllowedUser();

  if (!user.ok) {
    return user;
  }

  try {
    return {
      ok: true,
      value: await searchTransactionReconciliationCandidates({
        userId: user.value.id,
        currency: input.currency,
        query: input.query,
        cursor: input.cursor,
        reconciliationId: input.reconciliationId
      })
    };
  } catch (error) {
    logReconciliationError("search", error);
    return {
      ok: false,
      reason: "No se pudieron buscar movimientos. Inténtalo de nuevo."
    };
  }
}

export async function getReconciliationDetailAction(input: {
  reconciliationId: string;
}): Promise<Result<TransactionReconciliationDetail>> {
  if (!isUuid(input.reconciliationId)) {
    return { ok: false, reason: "La compensación no es válida." };
  }

  const user = await getAllowedUser();

  if (!user.ok) {
    return user;
  }

  try {
    return {
      ok: true,
      value: await getTransactionReconciliationDetail({
        userId: user.value.id,
        reconciliationId: input.reconciliationId
      })
    };
  } catch (error) {
    logReconciliationError("detail", error);
    return {
      ok: false,
      reason: "No se pudo cargar la compensación."
    };
  }
}

export async function saveReconciliationAction(
  input: SaveTransactionReconciliationInput
): Promise<Result<SaveTransactionReconciliationResult>> {
  if (!isValidSaveTransactionReconciliationInput(input)) {
    return {
      ok: false,
      reason: "Revisa los movimientos y los datos de la compensación."
    };
  }

  const user = await getAllowedUser();

  if (!user.ok) {
    return user;
  }

  try {
    const saved = await saveTransactionReconciliation({
      ...input,
      userId: user.value.id
    });
    revalidatePath("/");
    return { ok: true, value: saved };
  } catch (error) {
    logReconciliationError("save", error);
    return {
      ok: false,
      reason: getSaveErrorReason(error)
    };
  }
}

export async function deleteReconciliationAction(input: {
  reconciliationId: string;
}): Promise<Result<null>> {
  if (!isUuid(input.reconciliationId)) {
    return { ok: false, reason: "La compensación no es válida." };
  }

  const user = await getAllowedUser();

  if (!user.ok) {
    return user;
  }

  try {
    await deleteTransactionReconciliation({
      reconciliationId: input.reconciliationId
    });
    revalidatePath("/");
    return { ok: true, value: null };
  } catch (error) {
    logReconciliationError("delete", error);
    return {
      ok: false,
      reason: "No se pudo eliminar la compensación. Inténtalo de nuevo."
    };
  }
}

async function getAllowedUser() {
  const user = await getCurrentSupabaseUser();

  if (!user || !isEmailAllowed(user.email)) {
    return {
      ok: false,
      reason: "Inicia sesión de nuevo para gestionar compensaciones."
    } as const;
  }

  return { ok: true, value: user } as const;
}

function getSaveErrorReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("changed while editing")) {
    return "Los importes han cambiado. Revisa el balance antes de guardar.";
  }

  if (message.includes("already belongs")) {
    return "Uno de los movimientos ya pertenece a otra compensación.";
  }

  if (message.includes("internal transfer")) {
    return "Una transferencia interna no puede añadirse a la compensación.";
  }

  return "No se pudo guardar la compensación. Inténtalo de nuevo.";
}

function logReconciliationError(operation: string, error: unknown) {
  console.error(`Transaction reconciliation ${operation} failed.`, {
    message: error instanceof Error ? error.message : "Unknown error."
  });
}
