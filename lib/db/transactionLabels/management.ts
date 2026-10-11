import "server-only";

import type { TransactionLabelSummary } from "@/definitions";
import {
  cleanTransactionLabelName,
  isValidTransactionLabelName
} from "@/lib/domain/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class TransactionLabelManagementError extends Error {
  constructor(public readonly reason: "duplicate" | "unavailable" | "invalid") {
    super(`Transaction label management failed: ${reason}.`);
  }
}

function prepareName(name: string) {
  if (!isValidTransactionLabelName(name)) {
    throw new TransactionLabelManagementError("invalid");
  }
  return cleanTransactionLabelName(name);
}

function readSavedLabel(
  data: TransactionLabelSummary | null,
  error: { code?: string } | null
): TransactionLabelSummary {
  if (error?.code === "23505") {
    throw new TransactionLabelManagementError("duplicate");
  }
  if (error || !data) {
    throw new TransactionLabelManagementError("unavailable");
  }
  return data;
}

export async function createTransactionLabel({
  userId,
  name
}: {
  userId: string;
  name: string;
}): Promise<TransactionLabelSummary> {
  const cleanName = prepareName(name);
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("transaction_labels")
    .insert({ user_id: userId, name: cleanName })
    .select("id, name")
    .maybeSingle();
  return readSavedLabel(data, error);
}

export async function renameTransactionLabel({
  userId,
  labelId,
  name
}: {
  userId: string;
  labelId: string;
  name: string;
}): Promise<TransactionLabelSummary> {
  const cleanName = prepareName(name);
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("transaction_labels")
    .update({ name: cleanName })
    .eq("id", labelId)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .select("id, name")
    .maybeSingle();
  return readSavedLabel(data, error);
}

export async function deleteTransactionLabel({
  userId,
  labelId
}: {
  userId: string;
  labelId: string;
}): Promise<void> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("transaction_labels")
    .delete()
    .eq("id", labelId)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    throw new TransactionLabelManagementError("unavailable");
  }
}
