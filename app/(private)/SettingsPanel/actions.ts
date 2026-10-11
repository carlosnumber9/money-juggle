"use server";
import { revalidatePath } from "next/cache";
import type { Result } from "@/definitions";
import { bankingDataSource } from "@/lib/data/bankingDataSource";
import {
  saveCategoryRule,
  changeCategoryRuleStatus
} from "@/lib/db/categoryRules/writes";
import {
  isCategoryRuleInput,
  RULE_UUID_PATTERN
} from "@/lib/domain/categoryRules";

async function mutateRule(
  operation: (userId: string) => Promise<void>
): Promise<Result<null>> {
  const user = await bankingDataSource.getCurrentUser();
  if (!user || !user.isAllowed)
    return {
      ok: false,
      reason: "Inicia sesión de nuevo para gestionar reglas.",
      status: user ? 403 : 401
    };
  try {
    await operation(user.id);
    revalidatePath("/");
    return { ok: true, value: null };
  } catch {
    return {
      ok: false,
      reason:
        "No se pudo guardar la regla. Recarga y comprueba categoría, cuenta y versión."
    };
  }
}
export async function saveCategoryRuleAction(
  input: unknown
): Promise<Result<null>> {
  if (!isCategoryRuleInput(input))
    return { ok: false, reason: "Revisa los datos de la regla." };
  return mutateRule((userId) => saveCategoryRule(userId, input));
}
export async function changeCategoryRuleStatusAction(input: {
  id: string;
  version: number;
  status: "paused" | "dismissed" | "deleted";
}): Promise<Result<null>> {
  if (
    !input ||
    typeof input.id !== "string" ||
    !RULE_UUID_PATTERN.test(input.id) ||
    !Number.isSafeInteger(input.version) ||
    input.version < 1 ||
    !["paused", "dismissed", "deleted"].includes(input.status)
  )
    return { ok: false, reason: "La regla seleccionada no es válida." };
  return mutateRule((userId) =>
    changeCategoryRuleStatus(userId, input.id, input.version, input.status)
  );
}
