import "server-only";

import { randomUUID } from "node:crypto";
import type { EnableBankingAccountResource } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";
import { mapEnableBankingAccountToRow } from "./accountRow";
import { matchSessionAccounts } from "./accountMatching";
import { getRecord } from "./records";
import { recoverAccountIdentifications } from "./recoverAccountIdentifications";
import type { AccountIdentifiers } from "./pendingSession";

export async function persistSessionAccounts(input: {
  userId: string;
  bankConnectionId: string;
  accounts: EnableBankingAccountResource[];
  providerMetadata: Record<string, unknown>;
  previousSessionId?: string | null;
  aspsp?: { name: string; country: string };
  confirmedMatches?: Array<string | null>;
  identifiers?: AccountIdentifiers[];
}): Promise<Record<string, string[]>> {
  if (input.accounts.length === 0)
    throw new Error("No authorized accounts were returned.");
  const supabase = createSupabaseServiceRoleClient();
  const { data: stored, error: lookupError } = await supabase
    .from("accounts")
    .select("id,provider_account_id,iban_fingerprint,iban_last4")
    .eq("user_id", input.userId)
    .eq("bank_connection_id", input.bankConnectionId);
  if (lookupError)
    throw new Error(
      `Could not load account identities: ${lookupError.message}`
    );
  let storedHashes = getRecord(input.providerMetadata.account_identifications);
  if (input.aspsp)
    storedHashes = await recoverAccountIdentifications({
      sessionId: input.previousSessionId,
      aspsp: input.aspsp,
      accounts: stored ?? [],
      identities: storedHashes
    });
  const mappedRows = input.accounts.map((account, index) => ({
    ...mapEnableBankingAccountToRow({ ...input, account }),
    ...input.identifiers?.[index]
  }));
  const hashes = input.accounts.map((account) =>
    account.identification_hash
      ? [
          ...new Set(
            [
              account.identification_hash,
              ...(account.identification_hashes ?? [])
            ].filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0
            )
          )
        ]
      : []
  );
  const matches = matchSessionAccounts(
    (stored ?? []).map((account) => ({
      ...account,
      identificationHashes: readHashes(storedHashes[account.id])
    })),
    mappedRows.map((row, index) => ({
      ...row,
      identificationHashes: hashes[index]
    })),
    input.confirmedMatches
  );
  const rows = mappedRows.map((row, index) => ({
    ...row,
    id: matches[index] ?? randomUUID()
  }));
  rows.forEach((row) => {
    const previous = (stored ?? []).find((account) => account.id === row.id);
    row.iban_fingerprint ??= previous?.iban_fingerprint ?? null;
    row.iban_last4 ??= previous?.iban_last4 ?? null;
  });
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
      ...new Set([...hashes[index], ...readHashes(storedHashes[row.id])])
    ];
  });
  return identities;
}

function readHashes(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
