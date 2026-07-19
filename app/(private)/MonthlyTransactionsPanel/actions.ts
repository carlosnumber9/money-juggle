"use server";

import { revalidatePath } from "next/cache";

import type { Result, TransactionLabelSummary } from "@/definitions";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { updateTransactionCategoryAssignment } from "@/lib/db/transactionCategories";
import {
  assignTransactionLabel,
  createAndAssignTransactionLabel,
  removeTransactionLabelAssignment
} from "@/lib/db/transactionLabels";
import { isValidTransactionLabelName } from "@/lib/domain/labels";
import { getCurrentSupabaseUser } from "@/lib/supabase/currentUser";

export type UpdateTransactionCategoryActionInput = {
  transactionId: string;
  categoryId: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateTransactionCategoryAction(
  input: UpdateTransactionCategoryActionInput
): Promise<Result<null>> {
  if (!isValidInput(input)) {
    return { ok: false, reason: "La categoría seleccionada no es válida." };
  }

  if (isDemoMode()) {
    return { ok: true, value: null };
  }

  const user = await getCurrentSupabaseUser();

  if (!user || !isEmailAllowed(user.email)) {
    return {
      ok: false,
      reason: "Inicia sesión de nuevo para guardar la categoría."
    };
  }

  try {
    await updateTransactionCategoryAssignment({
      userId: user.id,
      transactionId: input.transactionId,
      categoryId: input.categoryId
    });
    revalidatePath("/");

    return { ok: true, value: null };
  } catch (error) {
    console.error("Transaction category assignment failed.", {
      message: error instanceof Error ? error.message : "Unknown error."
    });

    return {
      ok: false,
      reason: "No se pudo guardar la categoría. Inténtalo de nuevo."
    };
  }
}

function isValidInput(input: UpdateTransactionCategoryActionInput): boolean {
  return (
    UUID_PATTERN.test(input.transactionId) &&
    (input.categoryId === null || UUID_PATTERN.test(input.categoryId))
  );
}

export async function assignTransactionLabelAction(input: {
  transactionId: string;
  labelId: string;
}): Promise<Result<null>> {
  if (
    !UUID_PATTERN.test(input.transactionId) ||
    !UUID_PATTERN.test(input.labelId)
  ) {
    return { ok: false, reason: "La etiqueta seleccionada no es válida." };
  }

  if (isDemoMode()) {
    return { ok: true, value: null };
  }

  const user = await getAllowedUser("guardar la etiqueta");

  if (!user.ok) {
    return user;
  }

  try {
    await assignTransactionLabel({
      userId: user.value.id,
      transactionId: input.transactionId,
      labelId: input.labelId
    });
    revalidatePath("/");

    return { ok: true, value: null };
  } catch (error) {
    logLabelMutationError("assignment", error);
    return getLabelSaveError();
  }
}

export async function createAndAssignTransactionLabelAction(input: {
  transactionId: string;
  name: string;
}): Promise<Result<TransactionLabelSummary>> {
  if (
    !UUID_PATTERN.test(input.transactionId) ||
    !isValidTransactionLabelName(input.name)
  ) {
    return { ok: false, reason: "El nombre de la etiqueta no es válido." };
  }

  if (isDemoMode()) {
    return {
      ok: true,
      value: {
        id: crypto.randomUUID(),
        name: input.name.trim().replace(/\s+/g, " ")
      }
    };
  }

  const user = await getAllowedUser("guardar la etiqueta");

  if (!user.ok) {
    return user;
  }

  try {
    const label = await createAndAssignTransactionLabel({
      userId: user.value.id,
      transactionId: input.transactionId,
      name: input.name
    });
    revalidatePath("/");

    return { ok: true, value: label };
  } catch (error) {
    logLabelMutationError("creation and assignment", error);
    return getLabelSaveError();
  }
}

export async function removeTransactionLabelAction(input: {
  transactionId: string;
  labelId: string;
}): Promise<Result<null>> {
  if (
    !UUID_PATTERN.test(input.transactionId) ||
    !UUID_PATTERN.test(input.labelId)
  ) {
    return { ok: false, reason: "La etiqueta seleccionada no es válida." };
  }

  if (isDemoMode()) {
    return { ok: true, value: null };
  }

  const user = await getAllowedUser("quitar la etiqueta");

  if (!user.ok) {
    return user;
  }

  try {
    await removeTransactionLabelAssignment({
      userId: user.value.id,
      transactionId: input.transactionId,
      labelId: input.labelId
    });
    revalidatePath("/");

    return { ok: true, value: null };
  } catch (error) {
    logLabelMutationError("removal", error);
    return getLabelSaveError();
  }
}

async function getAllowedUser(action: string) {
  const user = await getCurrentSupabaseUser();

  if (!user || !isEmailAllowed(user.email)) {
    return {
      ok: false,
      reason: `Inicia sesión de nuevo para ${action}.`
    } as const;
  }

  return { ok: true, value: user } as const;
}

function logLabelMutationError(operation: string, error: unknown) {
  console.error(`Transaction label ${operation} failed.`, {
    message: error instanceof Error ? error.message : "Unknown error."
  });
}

function getLabelSaveError(): Result<never> {
  return {
    ok: false,
    reason: "No se pudo guardar la etiqueta. Inténtalo de nuevo."
  };
}
