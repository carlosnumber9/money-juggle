import "server-only";

import type { TransactionLabelSummary } from "@/definitions";
import {
  cleanTransactionLabelName,
  normalizeTransactionLabelName
} from "@/lib/domain/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function assignTransactionLabel({
  userId,
  transactionId,
  labelId
}: {
  userId: string;
  transactionId: string;
  labelId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await ensureTransactionBelongsToUser(supabase, userId, transactionId);
  await ensureLabelBelongsToUser(supabase, userId, labelId, true);

  const { error } = await supabase
    .from("transaction_label_assignments")
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      label_id: labelId
    });

  if (error && error.code !== "23505") {
    throw new Error(`Could not assign transaction label: ${error.message}`);
  }
}

export async function createAndAssignTransactionLabel({
  userId,
  transactionId,
  name
}: {
  userId: string;
  transactionId: string;
  name: string;
}): Promise<TransactionLabelSummary> {
  const supabase = await createSupabaseServerClient();
  const cleanName = cleanTransactionLabelName(name);

  await ensureTransactionBelongsToUser(supabase, userId, transactionId);

  const { data: createdLabel, error: creationError } = await supabase
    .from("transaction_labels")
    .insert({ user_id: userId, name: cleanName })
    .select("id, name")
    .maybeSingle();

  let label = createdLabel as TransactionLabelSummary | null;

  if (creationError?.code === "23505") {
    const { data: existingLabel, error: lookupError } = await supabase
      .from("transaction_labels")
      .select("id, name")
      .eq("user_id", userId)
      .eq("normalized_name", normalizeTransactionLabelName(cleanName))
      .eq("is_archived", false)
      .maybeSingle();

    if (lookupError) {
      throw new Error(
        `Could not lookup existing transaction label: ${lookupError.message}`
      );
    }

    label = existingLabel as TransactionLabelSummary | null;
  } else if (creationError) {
    throw new Error(
      `Could not create transaction label: ${creationError.message}`
    );
  }

  if (!label) {
    throw new Error("Could not create transaction label: label not found.");
  }

  await assignTransactionLabel({ userId, transactionId, labelId: label.id });

  return label;
}

export async function removeTransactionLabelAssignment({
  userId,
  transactionId,
  labelId
}: {
  userId: string;
  transactionId: string;
  labelId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await ensureTransactionBelongsToUser(supabase, userId, transactionId);
  await ensureLabelBelongsToUser(supabase, userId, labelId, false);

  const { error } = await supabase
    .from("transaction_label_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("transaction_id", transactionId)
    .eq("label_id", labelId);

  if (error) {
    throw new Error(
      `Could not remove transaction label assignment: ${error.message}`
    );
  }
}

async function ensureTransactionBelongsToUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  transactionId: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not verify transaction: ${error.message}`);
  }

  if (!data) {
    throw new Error("Could not verify transaction: transaction not found.");
  }
}

async function ensureLabelBelongsToUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  labelId: string,
  requireActive: boolean
) {
  let query = supabase
    .from("transaction_labels")
    .select("id")
    .eq("id", labelId)
    .eq("user_id", userId);

  if (requireActive) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Could not verify transaction label: ${error.message}`);
  }

  if (!data) {
    throw new Error("Could not verify transaction label: label not found.");
  }
}
