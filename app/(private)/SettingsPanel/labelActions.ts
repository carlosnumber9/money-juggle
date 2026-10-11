"use server";

import { revalidatePath } from "next/cache";
import type { Result, TransactionLabelSummary } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import {
  createTransactionLabel,
  renameTransactionLabel,
  deleteTransactionLabel,
  TransactionLabelManagementError
} from "@/lib/db/transactionLabels/management";
import { isValidTransactionLabelName } from "@/lib/domain/labels";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasName(
  input: Record<string, unknown>
): input is Record<string, unknown> & { name: string } {
  return (
    typeof input.name === "string" && isValidTransactionLabelName(input.name)
  );
}

function hasLabelId(
  input: Record<string, unknown>
): input is Record<string, unknown> & { labelId: string } {
  return typeof input.labelId === "string" && UUID_PATTERN.test(input.labelId);
}

async function mutateLabel<T>(
  operation: (userId: string) => Promise<T>
): Promise<Result<T>> {
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed) {
    return {
      ok: false,
      reason: "Inicia sesión de nuevo para gestionar etiquetas.",
      status: user ? 403 : 401
    };
  }
  try {
    const value = await operation(user.id);
    revalidatePath("/");
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof TransactionLabelManagementError &&
        error.reason === "duplicate"
          ? "Ya existe una etiqueta con ese nombre."
          : "No se pudo guardar el cambio. Recarga e inténtalo de nuevo."
    };
  }
}

export async function createTransactionLabelAction(
  input: unknown
): Promise<Result<TransactionLabelSummary>> {
  if (!isRecord(input) || !hasName(input)) {
    return {
      ok: false,
      reason: "Escribe un nombre de entre 1 y 80 caracteres."
    };
  }
  return mutateLabel((userId) =>
    createTransactionLabel({ userId, name: input.name })
  );
}

export async function renameTransactionLabelAction(
  input: unknown
): Promise<Result<TransactionLabelSummary>> {
  if (!isRecord(input) || !hasLabelId(input) || !hasName(input)) {
    return {
      ok: false,
      reason: "Revisa la etiqueta y su nombre (entre 1 y 80 caracteres)."
    };
  }
  return mutateLabel((userId) =>
    renameTransactionLabel({ userId, labelId: input.labelId, name: input.name })
  );
}

export async function deleteTransactionLabelAction(
  input: unknown
): Promise<Result<null>> {
  if (!isRecord(input) || !hasLabelId(input)) {
    return { ok: false, reason: "La etiqueta seleccionada no es válida." };
  }
  return mutateLabel(async (userId) => {
    await deleteTransactionLabel({ userId, labelId: input.labelId });
    return null;
  });
}
