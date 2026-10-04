import "server-only";

import { randomUUID } from "node:crypto";
import type { EnableBankingAccountResource } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { mapEnableBankingAccountToRow } from "./accountRow";
import { matchSessionAccounts } from "./accountMatching";
import { getRecord } from "./records";

export async function persistSessionAccounts(input: {
  userId: string;
  bankConnectionId: string;
  accounts: EnableBankingAccountResource[];
  providerMetadata: Record<string, unknown>;
}): Promise<Record<string, string[]>> {
  if (input.accounts.length === 0)
    throw new Error("No authorized accounts were returned.");
  const supabase = createSupabaseServiceRoleClient();
  const { data: stored, error: lookupError } = await supabase
    .from("accounts")
    .select("id,provider_account_id,iban_fingerprint")
    .eq("user_id", input.userId)
    .eq("bank_connection_id", input.bankConnectionId);
  if (lookupError)
    throw new Error(
      `Could not load account identities: ${lookupError.message}`
    );
  const storedHashes = getRecord(
    input.providerMetadata.account_identifications
  );
  const mappedRows = input.accounts.map((account) =>
    mapEnableBankingAccountToRow({ ...input, account })
  );
  const hashes = input.accounts.map((account) => [
    ...new Set(
      [
        account.identification_hash,
        ...(account.identification_hashes ?? [])
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    )
  ]);
  const matches = matchSessionAccounts(
    (stored ?? []).map((account) => ({
      ...account,
      identificationHashes: readHashes(storedHashes[account.id])
    })),
    mappedRows.map((row, index) => ({
      ...row,
      identificationHashes: hashes[index]
    }))
  );
  const rows = mappedRows.map((row, index) => ({
    ...row,
    id: matches[index] ?? randomUUID()
  }));
  const { error } = await supabase
    .from("accounts")
    .upsert(rows, { onConflict: "id", defaultToNull: false });
  if (error)
    throw new Error(`Could not store connected accounts: ${error.message}`);

  const inactiveIds = (stored ?? [])
    .filter((account) => !rows.some((row) => row.id === account.id))
    .map((account) => account.id);
  if (inactiveIds.length > 0) {
    const { error: inactiveError } = await supabase
      .from("accounts")
      .update({ status: "inactive" })
      .eq("user_id", input.userId)
      .eq("bank_connection_id", input.bankConnectionId)
      .in("id", inactiveIds);
    if (inactiveError)
      throw new Error(
        `Could not deactivate omitted accounts: ${inactiveError.message}`
      );
  }
  const identities: Record<string, string[]> = Object.fromEntries(
    Object.entries(storedHashes).map(([id, value]) => [id, readHashes(value)])
  );
  rows.forEach((row, index) => {
    identities[row.id] = [
      ...new Set([...readHashes(storedHashes[row.id]), ...hashes[index]])
    ];
  });
  return identities;
}

function readHashes(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
