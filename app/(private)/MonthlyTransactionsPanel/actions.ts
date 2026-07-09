"use server";

import { revalidatePath } from "next/cache";

import type { Result } from "@/definitions";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isDemoMode } from "@/lib/demo/mode";
import { updateTransactionCategoryAssignment } from "@/lib/db/transactionCategories";
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
